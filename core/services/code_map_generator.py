"""
Code-Map generator (AST-based, router dependency graph)

Generates `vanguard/code-graph.json` for dependency awareness before
proposing any changes under `api/`.

Primary approach:
- Parse `api/cmp/router.js` with an AST parser (Babel parser when available)
- Extract:
  - static import sources
  - require() sources
  - CMP action case labels (e.g. 'ticket-create')

Fallback:
- If AST parsing isn't available, uses regex-based heuristics (still outputs
  a valid code graph).
"""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ROUTER_PATH = REPO_ROOT / "api" / "cmp" / "router.js"
OUTPUT_PATH = REPO_ROOT / "vanguard" / "code-graph.json"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _generate_with_node_ast(router_path: Path) -> Optional[Dict[str, Any]]:
    """
    Try AST parsing via Node/Babel parser.
    Returns None if parsing fails.
    """
    script = r"""
const fs = require('fs');

function tryRequire(name, fallbackNames) {
  for (const n of [name, ...(fallbackNames || [])]) {
    try { return require(n); } catch (e) {}
  }
  return null;
}

const routerPath = process.argv[2];
const code = fs.readFileSync(routerPath, 'utf8');

const parser = tryRequire('@babel/parser', ['next/dist/compiled/@babel/parser']);
if (!parser) {
  process.exit(2);
}

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: [
    'jsx',
    'typescript',
    'classProperties',
    'dynamicImport'
  ],
});

const imports = [];
const requires = [];
const actions = [];

function rec(node) {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'ImportDeclaration') {
    imports.push({
      source: node.source && node.source.value ? String(node.source.value) : '',
      specifiers: Array.isArray(node.specifiers)
        ? node.specifiers.map(s => {
            if (!s) return null;
            return {
              imported: s.imported && s.imported.name ? String(s.imported.name) : null,
              local: s.local && s.local.name ? String(s.local.name) : null,
            };
          }).filter(Boolean)
        : [],
    });
  }

  if (node.type === 'CallExpression') {
    const callee = node.callee;
    if (callee && callee.type === 'Identifier' && callee.name === 'require') {
      const arg0 = node.arguments && node.arguments[0];
      if (arg0 && arg0.type === 'StringLiteral') {
        requires.push(String(arg0.value));
      }
    }
  }

  if (node.type === 'SwitchCase') {
    // switch(action) { case 'ticket-create': ... }
    if (node.test && node.test.type === 'StringLiteral') {
      actions.push(String(node.test.value));
    }
  }

  for (const k of Object.keys(node)) {
    if (k === 'loc') continue;
    const v = node[k];
    if (Array.isArray(v)) {
      for (const it of v) rec(it);
    } else {
      rec(v);
    }
  }
}

rec(ast);

const uniq = (arr) => Array.from(new Set(arr)).sort();

const result = {
  schema_version: '1',
  generated_at: new Date().toISOString(),
  target_file: 'api/cmp/router.js',
  imports: imports,
  requires: uniq(requires),
  actions: uniq(actions),
};

process.stdout.write(JSON.stringify(result));
"""
    try:
        proc = subprocess.run(
            ["node", "-e", script, str(router_path)],
            capture_output=True,
            text=True,
            timeout=20,
        )
        if proc.returncode != 0:
            return None
        out = proc.stdout.strip()
        if not out:
            return None
        return json.loads(out)
    except Exception:
        return None


def _generate_with_regex(router_path: Path) -> Dict[str, Any]:
    code = router_path.read_text(encoding="utf-8")

    import_sources: List[str] = []
    for line in code.splitlines():
        if " from '" in line or ' from "' in line:
            import_sources.append(line.split("from")[1].split(";")[0].strip().strip("'").strip('"'))

    require_sources: List[str] = []
    # Naive: require('x') + case 'action-name':
    import re

    require_sources = re.findall(r"require\(\s*['\"]([^'\"]+)['\"]\s*\)", code)
    actions = re.findall(r"case\s+['\"]([^'\"]+)['\"]\s*:", code)

    def uniq(arr: List[str]) -> List[str]:
        return sorted(list(set([a for a in arr if a])))

    return {
        "schema_version": "1",
        "generated_at": _utc_now_iso(),
        "target_file": "api/cmp/router.js",
        "imports": [{"source": s, "specifiers": []} for s in uniq(import_sources)],
        "requires": uniq(require_sources),
        "actions": uniq(actions),
    }


def generate_code_graph(*, router_path: Path = ROUTER_PATH, output_path: Path = OUTPUT_PATH) -> Dict[str, Any]:
    router_path = Path(router_path)
    output_path = Path(output_path)

    if not router_path.exists():
        payload = {
            "schema_version": "1",
            "generated_at": _utc_now_iso(),
            "target_file": "api/cmp/router.js",
            "imports": [],
            "requires": [],
            "actions": [],
            "warning": f"Router not found: {router_path}",
        }
        _write_json(output_path, payload)
        return payload

    node_payload = _generate_with_node_ast(router_path)
    if node_payload is None:
        node_payload = _generate_with_regex(router_path)

    # Ensure stable shape for AI context.
    node_payload.setdefault("imports", [])
    node_payload.setdefault("requires", [])
    node_payload.setdefault("actions", [])
    node_payload["generated_at"] = node_payload.get("generated_at") or _utc_now_iso()

    _write_json(output_path, node_payload)
    return node_payload


def main() -> None:
    generate_code_graph()
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

