/**
 * OpenHands compose static audit — pure, offline checks.
 *
 * Every function here reads compose YAML *text* (or an already-parsed plain
 * object) and returns findings. Nothing in this module starts a container,
 * calls Docker, or reaches a network endpoint. This is deliberately a static
 * audit, not `docker compose config` or a runtime health check.
 *
 * Parsing uses line/regex-based checks rather than a YAML parser dependency:
 * `js-yaml` is already a devDependency in this repo, but the individual
 * checks below (tag pins, loopback-only ports, `privileged:` flag, resource
 * limits, healthcheck, logging, restart policy) are all shallow, single-line
 * patterns in `ops/openhands/compose.yaml`, so a small set of regex checks on
 * the raw text is more robust to compose-file reformatting than depending on
 * a specific parsed-object shape — see controlling issue #743.
 *
 * Controlling issue: #743 — package/validation only, no live activation.
 */

/**
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {string}
 */
function toText(composeTextOrObj) {
  if (typeof composeTextOrObj === 'string') return composeTextOrObj;
  if (composeTextOrObj && typeof composeTextOrObj === 'object') {
    // Best-effort: stringify a parsed object back to a line-oriented form so
    // the same regex checks apply. Callers should prefer passing raw text.
    return JSON.stringify(composeTextOrObj, null, 2);
  }
  return String(composeTextOrObj ?? '');
}

/**
 * Splits compose text into per-service blocks by top-level service name
 * (two-space indented key directly under `services:`). Best-effort and
 * intentionally simple — sufficient for the single-service package under
 * `ops/openhands/compose.yaml` and small multi-service fixtures in tests.
 *
 * @param {string} text
 * @returns {Record<string, string>}
 */
function splitServiceBlocks(text) {
  const lines = text.split(/\r?\n/);
  const servicesStart = lines.findIndex((l) => /^services:\s*$/.test(l));
  if (servicesStart === -1) return {};

  /** @type {Record<string, string>} */
  const blocks = {};
  let currentName = null;
  /** @type {string[]} */
  let currentLines = [];

  for (let i = servicesStart + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\S/.test(line) && line.trim() !== '') break; // dedent to column 0 — end of services block
    const serviceMatch = line.match(/^ {2}([A-Za-z0-9_.-]+):\s*$/);
    if (serviceMatch) {
      if (currentName) blocks[currentName] = currentLines.join('\n');
      currentName = serviceMatch[1];
      currentLines = [];
      continue;
    }
    if (currentName) currentLines.push(line);
  }
  if (currentName) blocks[currentName] = currentLines.join('\n');
  return blocks;
}

/**
 * @param {string} text
 * @returns {Array<{ service: string, image: string }>}
 */
function extractImages(text) {
  const blocks = splitServiceBlocks(text);
  return Object.entries(blocks)
    .map(([service, block]) => {
      const m = block.match(/^\s*image:\s*["']?([^"'\s#]+)["']?/m);
      return m ? { service, image: m[1] } : null;
    })
    .filter((v) => v !== null);
}

/**
 * @param {string} text
 * @returns {Array<{ service: string, spec: string }>}
 */
function extractPorts(text) {
  const blocks = splitServiceBlocks(text);
  /** @type {Array<{ service: string, spec: string }>} */
  const out = [];
  for (const [service, block] of Object.entries(blocks)) {
    const portsSection = block.match(/^\s*ports:\s*\n((?:\s*-\s*.+\n?)+)/m);
    if (!portsSection) continue;
    const specLines = portsSection[1].split(/\r?\n/).filter((l) => l.trim().startsWith('-'));
    for (const line of specLines) {
      const specMatch = line.match(/^\s*-\s*["']?([^"'#]+)["']?/);
      if (specMatch) out.push({ service, spec: specMatch[1].trim() });
    }
  }
  return out;
}

/**
 * @param {string} text
 */
function findServicesWithFlag(text, regex) {
  const blocks = splitServiceBlocks(text);
  return Object.entries(blocks)
    .filter(([, block]) => regex.test(block))
    .map(([service]) => service);
}

// --- Individual assertions -------------------------------------------------

/**
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertNoLatestTags(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const findings = [];
  for (const { service, image } of extractImages(text)) {
    const tagPart = image.includes(':') ? image.split(':').pop() : '';
    const tag = String(tagPart ?? '').toLowerCase();
    if (!tag || tag === 'latest' || tag === 'main' || tag === 'nightly' || tag === 'edge') {
      findings.push(`service "${service}" uses an unpinned/floating image tag: "${image}"`);
    }
  }
  return { ok: findings.length === 0, findings };
}

/**
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertLoopbackOnlyPorts(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const findings = [];
  for (const { service, spec } of extractPorts(text)) {
    const parts = spec.split(':');
    const hostIp = parts.length >= 2 ? parts[0].trim() : null;
    const isLoopback = hostIp === '127.0.0.1' || hostIp === 'localhost' || hostIp === '::1';
    if (!isLoopback) {
      findings.push(`service "${service}" publishes a non-loopback port: "${spec}"`);
    }
  }
  return { ok: findings.length === 0, findings };
}

/**
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertResourceLimitsPresent(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const blocks = splitServiceBlocks(text);
  const findings = [];
  for (const [service, block] of Object.entries(blocks)) {
    const hasMem = /^\s*mem_limit:\s*\S+/m.test(block) || /^\s*memory:\s*\S+/m.test(block);
    const hasCpu = /^\s*cpus:\s*["']?[\d.]+/m.test(block) || /^\s*cpu[_-]?limit:\s*["']?[\d.]+/im.test(block);
    if (!hasMem) findings.push(`service "${service}" is missing a memory limit (mem_limit)`);
    if (!hasCpu) findings.push(`service "${service}" is missing a CPU limit (cpus)`);
  }
  return { ok: findings.length === 0, findings };
}

/**
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertNoPrivileged(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const offenders = findServicesWithFlag(text, /^\s*privileged:\s*true\s*$/m);
  return {
    ok: offenders.length === 0,
    findings: offenders.map((s) => `service "${s}" sets privileged: true`),
  };
}

/**
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertNoHostNetworkOnApp(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const blocks = splitServiceBlocks(text);
  const findings = [];
  for (const [service, block] of Object.entries(blocks)) {
    if (!/app/i.test(service)) continue;
    if (/^\s*network_mode:\s*["']?host["']?\s*$/m.test(block)) {
      findings.push(`app service "${service}" uses network_mode: host`);
    }
  }
  return { ok: findings.length === 0, findings };
}

/** Env var name fragments that indicate a production/CorpFlowAI secret leaked into this package. */
const PRODUCTION_ENV_PATTERNS = [
  /\bPOSTGRES_URL\b/,
  /\bDATABASE_URL\b/,
  /\bMASTER_ADMIN_KEY\b/,
  /\bCORPFLOW_AUTOMATION_(INGEST|FORWARD)_SECRET\b/,
  /\bCORPFLOW_CRON_SECRET\b/,
  /\bCRON_SECRET\b/,
];

/**
 * Checks only non-comment lines so documentation prose that *warns against*
 * a forbidden name (e.g. a header comment saying "must never gain
 * MASTER_ADMIN_KEY") is not itself flagged as a violation. Only an actual
 * env-style line (`NAME:` or `NAME=`) counts as a reference.
 *
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertNoProductionEnv(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const findings = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    for (const pattern of PRODUCTION_ENV_PATTERNS) {
      const match = line.match(pattern);
      if (match && /^[:=]/.test(line.slice(match.index + match[0].length).trim())) {
        findings.push(`forbidden production/secret env reference found: "${line}"`);
      }
    }
  }
  return { ok: findings.length === 0, findings };
}

/**
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertRestartPolicy(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const blocks = splitServiceBlocks(text);
  const findings = [];
  for (const [service, block] of Object.entries(blocks)) {
    const m = block.match(/^\s*restart:\s*["']?([\w-]+)["']?/m);
    const policy = m ? m[1] : null;
    if (!policy || policy === 'no') {
      findings.push(`service "${service}" has no restart policy (or restart: "no")`);
    }
  }
  return { ok: findings.length === 0, findings };
}

/**
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertHealthcheck(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const blocks = splitServiceBlocks(text);
  const findings = [];
  for (const [service, block] of Object.entries(blocks)) {
    if (!/^\s*healthcheck:\s*$/m.test(block)) {
      findings.push(`service "${service}" is missing a healthcheck`);
    }
  }
  return { ok: findings.length === 0, findings };
}

/**
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertLoggingLimits(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const blocks = splitServiceBlocks(text);
  const findings = [];
  for (const [service, block] of Object.entries(blocks)) {
    const hasLoggingBlock = /^\s*logging:\s*$/m.test(block);
    const hasMaxSize = /^\s*max-size:\s*["']?\S+/m.test(block);
    if (!hasLoggingBlock || !hasMaxSize) {
      findings.push(`service "${service}" is missing bounded logging (logging.options.max-size)`);
    }
  }
  return { ok: findings.length === 0, findings };
}

/**
 * Fail if active (non-comment) compose lines reference the primary host
 * Docker socket. Dedicated OpenHands daemon socket only.
 *
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertNoPrimaryDockerSocket(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const findings = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.includes('/var/run/docker.sock')) {
      findings.push(`primary host Docker socket referenced in active compose line: "${line}"`);
    }
  }
  return { ok: findings.length === 0, findings };
}

/**
 * Fail if host.docker.internal appears on active lines (removed; no approved need).
 *
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertNoHostDockerInternal(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const findings = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (/host\.docker\.internal/i.test(line)) {
      findings.push(`host.docker.internal present without approved exception: "${line}"`);
    }
  }
  return { ok: findings.length === 0, findings };
}

/**
 * Require official /health path in healthcheck (not bare /).
 *
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertOfficialHealthEndpoint(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const findings = [];
  if (!/healthcheck:/m.test(text)) {
    findings.push('compose is missing a healthcheck block');
    return { ok: false, findings };
  }
  if (!/127\.0\.0\.1:3000\/health|localhost:3000\/health/.test(text)) {
    findings.push('healthcheck must target official /health endpoint on loopback:3000');
  }
  // Bare UI root is not accepted as the sole health proof.
  if (/127\.0\.0\.1:3000\/["'\s\]]/.test(text) && !/127\.0\.0\.1:3000\/health/.test(text)) {
    findings.push('healthcheck appears to use bare / instead of /health');
  }
  return { ok: findings.length === 0, findings };
}

/**
 * Require concurrency pinned to one conversation/task.
 *
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertSingleConcurrency(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const findings = [];
  if (!/MAX_CONCURRENT_CONVERSATIONS:\s*["']?1["']?/.test(text)) {
    findings.push('MAX_CONCURRENT_CONVERSATIONS must be set to 1');
  }
  return { ok: findings.length === 0, findings };
}

/**
 * Require dedicated DOCKER_HOST / dedicated socket mount (variable or openhands path).
 *
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertDedicatedDockerHost(composeTextOrObj) {
  const text = toText(composeTextOrObj);
  const findings = [];
  if (!/DOCKER_HOST:\s*unix:\/\//.test(text)) {
    findings.push('compose must set DOCKER_HOST to a unix:// socket for the dedicated daemon');
  }
  if (!/OPENHANDS_DOCKER_SOCK|openhands-docker\/docker\.sock/.test(text)) {
    findings.push('compose must mount the dedicated OpenHands Docker socket (OPENHANDS_DOCKER_SOCK)');
  }
  return { ok: findings.length === 0, findings };
}

/**
 * Runs the full static-audit suite against OpenHands compose text (or a
 * parsed object) and aggregates findings from every individual assertion.
 *
 * @param {string | Record<string, unknown>} composeTextOrObj
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function auditOpenHandsCompose(composeTextOrObj) {
  const checks = [
    assertNoLatestTags,
    assertLoopbackOnlyPorts,
    assertResourceLimitsPresent,
    assertNoPrivileged,
    assertNoHostNetworkOnApp,
    assertNoProductionEnv,
    assertRestartPolicy,
    assertHealthcheck,
    assertLoggingLimits,
    assertNoPrimaryDockerSocket,
    assertNoHostDockerInternal,
    assertOfficialHealthEndpoint,
    assertSingleConcurrency,
    assertDedicatedDockerHost,
  ];

  /** @type {string[]} */
  const findings = [];
  for (const check of checks) {
    const result = check(composeTextOrObj);
    findings.push(...result.findings);
  }

  return { ok: findings.length === 0, findings };
}
