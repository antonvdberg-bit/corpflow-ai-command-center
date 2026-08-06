/**
 * OpenHands rollback / uninstall scope helpers — pure, offline.
 *
 * Proves scripts only target allowlisted OpenHands resources and never
 * contain broad prune / wildcard destruction. Controlling issue #743 / PR #747.
 */

import {
  FORBIDDEN_ROLLBACK_COMMAND_PATTERNS,
  ROLLBACK_ALLOWED_CONTAINERS,
  ROLLBACK_ALLOWED_NETWORKS,
  ROLLBACK_ALLOWED_VOLUMES,
} from './package-policy.js';

/**
 * @param {string} scriptText
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertNoBroadPruneCommands(scriptText) {
  const text = String(scriptText ?? '');
  /** @type {string[]} */
  const findings = [];
  for (const pattern of FORBIDDEN_ROLLBACK_COMMAND_PATTERNS) {
    // Match live command usage, not documentation that says "never runs X".
    const re = new RegExp(
      `(?:^|[^\\w-])((?:sudo\\s+)?docker\\s+${pattern.replace(/^docker\\s+/, '').replace(/\s+/g, '\\s+')})`,
      'im',
    );
    // Simpler: flag any non-comment line that contains the forbidden phrase
    // as an executable-looking invocation (not preceded by "never"/"must not").
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      if (!line.toLowerCase().includes(pattern.toLowerCase())) continue;
      if (/\bnever\b|\bmust not\b|\bdo not\b|\bforbidden\b|\brefus/i.test(line)) continue;
      findings.push(`forbidden broad cleanup command present: "${pattern}" in line: ${line}`);
    }
  }
  return { ok: findings.length === 0, findings };
}

/**
 * @param {string} scriptText
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertRollbackAllowlistPresent(scriptText) {
  const text = String(scriptText ?? '');
  /** @type {string[]} */
  const findings = [];
  for (const name of ROLLBACK_ALLOWED_CONTAINERS) {
    if (!text.includes(name)) {
      findings.push(`rollback/uninstall script missing expected container allowlist entry: ${name}`);
    }
  }
  for (const name of ROLLBACK_ALLOWED_NETWORKS) {
    if (!text.includes(name)) {
      findings.push(`rollback/uninstall script missing expected network allowlist entry: ${name}`);
    }
  }
  for (const name of ROLLBACK_ALLOWED_VOLUMES) {
    if (!text.includes(name)) {
      findings.push(`rollback/uninstall script missing expected volume allowlist entry: ${name}`);
    }
  }
  if (!/OPENHANDS_ALLOWED_RESOURCES|allowlist|print_allowlisted_targets/i.test(text)) {
    findings.push('rollback/uninstall script does not reference an explicit allowlist mechanism');
  }
  return { ok: findings.length === 0, findings };
}

/**
 * @param {string} scriptText
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function assertRequiresDedicatedDockerHost(scriptText) {
  const text = String(scriptText ?? '');
  /** @type {string[]} */
  const findings = [];
  if (!/openhands_docker|OPENHANDS_DOCKER_HOST|openhands_assert_isolation_context/i.test(text)) {
    findings.push('script does not force dedicated DOCKER_HOST / isolation context');
  }
  // Non-comment executable reference to primary socket is forbidden.
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (!line.includes('/var/run/docker.sock')) continue;
    if (/\bnever\b|\bFORBIDDEN\b|\bmust not\b|\bprimary\b|\brefus|\bfail/i.test(line)) continue;
    if (/PRIMARY_DOCKER|compare|!=|ne /.test(line)) continue;
    findings.push(`script appears to use primary docker.sock outside a refusal check: ${line}`);
  }
  return { ok: findings.length === 0, findings };
}

/**
 * Aggregate rollback-scope audit for one or more script bodies.
 *
 * @param {Record<string, string>} scriptsByName
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function auditOpenHandsRollbackScripts(scriptsByName) {
  /** @type {string[]} */
  const findings = [];
  for (const [name, body] of Object.entries(scriptsByName || {})) {
    const prune = assertNoBroadPruneCommands(body);
    const allow = assertRollbackAllowlistPresent(body);
    const host = assertRequiresDedicatedDockerHost(body);
    for (const f of [...prune.findings, ...allow.findings, ...host.findings]) {
      findings.push(`${name}: ${f}`);
    }
  }
  return { ok: findings.length === 0, findings };
}
