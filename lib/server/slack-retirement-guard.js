/**
 * Permanent Slack-retirement guard (issue #658).
 *
 * Slack is not an approved CorpFlowAI ops channel. This scanner fails closed
 * when supported runtime/config/CI/package paths reintroduce Slack senders,
 * MCP servers, env keys, n8n Slack nodes, or GitHub Slack actions.
 *
 * Historical docs may still mention Slack retirement. Those are not scanned.
 *
 * @see docs/operations/SLACK_TELEGRAM_DEPENDENCY_AUDIT_658.md
 */

import fs from 'node:fs';
import path from 'node:path';

export const SLACK_RETIREMENT_ISSUE = 658;

const SKIP_DIR_NAMES = new Set([
  '.git',
  '.next',
  'node_modules',
  'coverage',
  'dist',
  '.smoke-screenshots',
]);

const SCAN_ROOTS = [
  'api',
  'lib',
  'pages',
  'scripts',
  'ops',
  'config',
  '.github/workflows',
  'docs/n8n/templates',
];

const SCAN_FILES = [
  'mcp_servers.json',
  '.env.template',
  'package.json',
  'package-lock.json',
  'vercel.json',
  'middleware.js',
];

const SELF_RELATIVE = new Set([
  'lib/server/slack-retirement-guard.js',
  'scripts/check-slack-retirement.mjs',
  'node-tests/slack-retirement-guard.test.mjs',
]);

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.json',
  '.yml',
  '.yaml',
  '.html',
  '.sh',
]);

/** Patterns that mean an active Slack dependency, not a historical mention. */
export const FORBIDDEN_SLACK_PATTERNS = [
  { id: 'env_slack_bot_token', source: 'SLACK_BOT_TOKEN' },
  { id: 'env_slack_team_id', source: 'SLACK_TEAM_ID' },
  { id: 'env_slack_webhook', source: 'SLACK_WEBHOOK' },
  { id: 'env_slack_app_prefix', source: 'SLACK_APP_' },
  { id: 'process_env_slack', source: 'process.env.SLACK_' },
  { id: 'mcp_server_slack_package', source: '@modelcontextprotocol/server-slack' },
  { id: 'npm_slack_org', source: '@slack/' },
  { id: 'hooks_slack_com', source: 'hooks.slack.com' },
  { id: 'slack_api_host', source: 'slack.com/api/' },
  { id: 'n8n_slack_node', source: 'n8n-nodes-base.slack' },
  { id: 'github_slack_action', source: 'slackapi/slack-github-action' },
];

const COMPILED = FORBIDDEN_SLACK_PATTERNS.map((row) => ({
  id: row.id,
  source: row.source,
  re: new RegExp(escapeRegExp(row.source), 'g'),
}));

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} relativePath
 * @returns {boolean}
 */
function isSelfFile(relativePath) {
  return SELF_RELATIVE.has(String(relativePath || '').replaceAll('\\', '/'));
}

/**
 * @param {string} text
 * @returns {Array<{ id: string, source: string, index: number }>}
 */
export function detectForbiddenSlackPatterns(text) {
  const haystack = String(text || '');
  /** @type {Array<{ id: string, source: string, index: number }>} */
  const hits = [];
  for (const row of COMPILED) {
    row.re.lastIndex = 0;
    const match = row.re.exec(haystack);
    if (match) {
      hits.push({ id: row.id, source: row.source, index: match.index });
    }
  }
  return hits;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function detectSlackEnvAssignmentKeys(text) {
  const keys = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(SLACK_[A-Z0-9_]*)=/);
    if (match) keys.push(match[1]);
  }
  return keys;
}

/**
 * @param {unknown} parsed
 * @returns {string[]}
 */
export function detectSlackMcpServers(parsed) {
  const servers = parsed && typeof parsed === 'object' ? /** @type {{ servers?: unknown }} */ (parsed).servers : null;
  if (!Array.isArray(servers)) return [];
  /** @type {string[]} */
  const names = [];
  for (const server of servers) {
    if (!server || typeof server !== 'object') continue;
    const name = String(/** @type {{ name?: unknown }} */ (server).name || '')
      .trim()
      .toLowerCase();
    const args = Array.isArray(/** @type {{ args?: unknown }} */ (server).args)
      ? /** @type {{ args: unknown[] }} */ (server).args.map((a) => String(a))
      : [];
    const usesSlackPackage = args.some((a) => a.includes('server-slack'));
    if (name === 'slack' || usesSlackPackage) {
      names.push(name || 'unnamed-slack-mcp');
    }
  }
  return names;
}

/**
 * @param {unknown} parsed
 * @returns {string[]}
 */
export function detectSlackNpmDependencies(parsed) {
  if (!parsed || typeof parsed !== 'object') return [];
  const buckets = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  /** @type {string[]} */
  const hits = [];
  for (const bucket of buckets) {
    const map = /** @type {Record<string, unknown>} */ (parsed)[bucket];
    if (!map || typeof map !== 'object') continue;
    for (const name of Object.keys(map)) {
      const lower = name.toLowerCase();
      if (lower === 'slack' || lower.startsWith('@slack/') || lower.includes('server-slack')) {
        hits.push(name);
      }
    }
  }
  return hits;
}

/**
 * @param {string} filePath
 * @param {number} index
 * @param {string} text
 * @returns {string}
 */
function excerptAt(filePath, index, text) {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + 80);
  const snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${filePath}: ${snippet}`;
}

/**
 * @param {string} rootDir
 * @param {string} relativeDir
 * @param {(rel: string, abs: string) => void} visit
 */
function walkDir(rootDir, relativeDir, visit) {
  const absDir = path.join(rootDir, relativeDir);
  if (!fs.existsSync(absDir)) return;
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    const rel = path.join(relativeDir, entry.name).replaceAll('\\', '/');
    const abs = path.join(rootDir, rel);
    if (entry.isDirectory()) {
      walkDir(rootDir, rel, visit);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!TEXT_EXTENSIONS.has(ext) && entry.name !== '.env.template') continue;
    visit(rel, abs);
  }
}

/**
 * Scan supported runtime/config/CI paths for active Slack dependencies.
 *
 * @param {string} [rootDir]
 * @returns {{
 *   ok: boolean,
 *   issue: number,
 *   findings: Array<{ path: string, id: string, detail: string }>,
 *   scannedFileCount: number,
 * }}
 */
export function scanSlackRetirement(rootDir = process.cwd()) {
  const root = path.resolve(rootDir);
  /** @type {Array<{ path: string, id: string, detail: string }>} */
  const findings = [];
  let scannedFileCount = 0;
  const seen = new Set();

  /**
   * @param {string} rel
   * @param {string} abs
   */
  function inspectFile(rel, abs) {
    const normalized = rel.replaceAll('\\', '/');
    if (seen.has(normalized) || isSelfFile(normalized)) return;
    seen.add(normalized);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return;
    scannedFileCount += 1;
    const text = fs.readFileSync(abs, 'utf8');

    if (normalized === '.env.template') {
      for (const key of detectSlackEnvAssignmentKeys(text)) {
        findings.push({
          path: normalized,
          id: 'env_template_assignment',
          detail: `${normalized} assigns ${key} (forbidden after issue #658)`,
        });
      }
    }

    if (normalized === 'mcp_servers.json') {
      try {
        const names = detectSlackMcpServers(JSON.parse(text));
        for (const name of names) {
          findings.push({
            path: normalized,
            id: 'mcp_slack_server',
            detail: `${normalized} declares Slack MCP server "${name}"`,
          });
        }
      } catch {
        findings.push({
          path: normalized,
          id: 'mcp_parse_error',
          detail: `${normalized} is not valid JSON`,
        });
      }
    }

    if (normalized === 'package.json') {
      try {
        const deps = detectSlackNpmDependencies(JSON.parse(text));
        for (const dep of deps) {
          findings.push({
            path: normalized,
            id: 'npm_slack_dependency',
            detail: `${normalized} depends on ${dep}`,
          });
        }
      } catch {
        findings.push({
          path: normalized,
          id: 'package_parse_error',
          detail: `${normalized} is not valid JSON`,
        });
      }
    }

    for (const hit of detectForbiddenSlackPatterns(text)) {
      findings.push({
        path: normalized,
        id: hit.id,
        detail: excerptAt(normalized, hit.index, text),
      });
    }
  }

  for (const rel of SCAN_FILES) {
    inspectFile(rel, path.join(root, rel));
  }
  for (const relDir of SCAN_ROOTS) {
    walkDir(root, relDir, inspectFile);
  }

  return {
    ok: findings.length === 0,
    issue: SLACK_RETIREMENT_ISSUE,
    findings,
    scannedFileCount,
  };
}

/**
 * @param {{ findings: Array<{ path: string, id: string, detail: string }>, scannedFileCount: number, ok: boolean }} result
 * @returns {string}
 */
export function formatSlackRetirementReport(result) {
  if (result.ok) {
    return `Slack retirement guard: PASS (scanned ${result.scannedFileCount} files; issue #${SLACK_RETIREMENT_ISSUE})`;
  }
  const lines = [
    `Slack retirement guard: FAIL (${result.findings.length} finding(s); scanned ${result.scannedFileCount} files; issue #${SLACK_RETIREMENT_ISSUE})`,
    'Active Slack dependencies are forbidden in supported runtime/config/CI paths.',
  ];
  for (const finding of result.findings) {
    lines.push(`- [${finding.id}] ${finding.detail}`);
  }
  return lines.join('\n');
}
