/**
 * OpenHands dynamic sandbox-spawn policy — asserts the CorpFlowAI Option D
 * override file encodes the required isolation boundary.
 *
 * Tests must cover the *dynamic* spawn path (agent-server containers created
 * by DockerSandboxService.start_sandbox), not only the compose control-plane
 * service. This module reads the override source as text.
 *
 * Controlling issue: #743 / PR #747 remediation.
 */

/**
 * @param {string} overrideSource
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function auditSandboxSpawnOverride(overrideSource) {
  const text = String(overrideSource ?? '');
  /** @type {string[]} */
  const findings = [];

  if (!text.includes('CORPFLOWAI_SANDBOX_NETWORK')) {
    findings.push('override missing CORPFLOWAI_SANDBOX_NETWORK constant');
  }
  if (!/network\s*=\s*CORPFLOWAI_SANDBOX_NETWORK/.test(text)) {
    findings.push('override must pass network=CORPFLOWAI_SANDBOX_NETWORK to containers.run');
  }
  if (!/extra_hosts\s*=\s*None/.test(text)) {
    findings.push('override must pass extra_hosts=None to containers.run');
  }
  if (!/ports\s*=\s*None/.test(text)) {
    findings.push('override must pass ports=None (no published host ports)');
  }
  if (!/mem_limit\s*=\s*CORPFLOWAI_SANDBOX_MEM_LIMIT/.test(text)) {
    findings.push('override must set mem_limit=CORPFLOWAI_SANDBOX_MEM_LIMIT');
  }
  if (!/nano_cpus\s*=\s*CORPFLOWAI_SANDBOX_NANO_CPUS/.test(text)) {
    findings.push('override must set nano_cpus=CORPFLOWAI_SANDBOX_NANO_CPUS');
  }
  if (!/pids_limit\s*=\s*CORPFLOWAI_SANDBOX_PIDS_LIMIT/.test(text)) {
    findings.push('override must set pids_limit=CORPFLOWAI_SANDBOX_PIDS_LIMIT');
  }
  if (!text.includes("default_factory=dict") || !text.includes('extra_hosts: dict')) {
    findings.push('injector extra_hosts default must be empty dict (not host-gateway)');
  }
  // Fail if the webhook still points at host.docker.internal
  if (/WEBHOOK_CALLBACK_VARIABLE\]\s*=\s*\(\s*\n\s*f'http:\/\/host\.docker\.internal/.test(text)) {
    findings.push('webhook still hardcodes host.docker.internal');
  }
  if (!text.includes('CORPFLOWAI_SANDBOX_WEBHOOK_BASE')) {
    findings.push('override missing CORPFLOWAI_SANDBOX_WEBHOOK_BASE');
  }
  // Must not use network_mode=None (default bridge) on the spawn path
  if (/network_mode\s*=\s*network_mode/.test(text) && /network_mode = 'host' if self.use_host_network else None/.test(text)) {
    // Allow residual mentions in comments/docs inside file only if containers.run does not use network_mode=
    if (/containers\.run\([\s\S]*?network_mode\s*=/.test(text)) {
      findings.push('containers.run still sets network_mode (must use named network= only)');
    }
  }
  if (/containers\.run\([\s\S]*?network_mode\s*=/.test(text)) {
    findings.push('containers.run still sets network_mode (must use named network= only)');
  }
  // Default ExtraHosts factory must not inject host-gateway
  if (/default_factory=lambda:\s*\{\s*['"]host\.docker\.internal['"]\s*:\s*['"]host-gateway['"]/.test(text)) {
    findings.push('extra_hosts default_factory still injects host-gateway');
  }
  if (!/host networking for sandboxes is forbidden/.test(text)) {
    findings.push('override must refuse use_host_network');
  }

  return { ok: findings.length === 0, findings };
}

/**
 * Inspect a docker-inspect-like JSON object for a dynamic sandbox and return
 * boundary violations. Used by tests with fixtures and by live probe scripts
 * (via JSON exported from `docker inspect`).
 *
 * @param {Record<string, unknown>} inspect
 * @param {{
 *   approvedNetwork?: string,
 *   memLimitBytes?: number,
 *   nanoCpus?: number,
 *   pidsLimit?: number,
 * }} [expected]
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function auditDynamicSandboxInspect(inspect, expected = {}) {
  const approvedNetwork = expected.approvedNetwork ?? 'corpflowai-openhands-net';
  const memLimitBytes = expected.memLimitBytes ?? 512 * 1024 * 1024;
  const nanoCpus = expected.nanoCpus ?? 500_000_000;
  const pidsLimit = expected.pidsLimit ?? 256;
  /** @type {string[]} */
  const findings = [];

  const hostConfig = /** @type {Record<string, unknown>} */ (inspect?.HostConfig ?? {});
  const networkSettings = /** @type {Record<string, unknown>} */ (
    inspect?.NetworkSettings ?? {}
  );
  const networks = /** @type {Record<string, unknown>} */ (networkSettings.Networks ?? {});

  const networkMode = String(hostConfig.NetworkMode ?? '');
  if (networkMode === 'bridge' || networkMode === 'default' || networkMode === '') {
    findings.push(`NetworkMode is default bridge (${networkMode || 'empty'})`);
  }
  if (networkMode === 'host') {
    findings.push('NetworkMode=host is forbidden');
  }
  if (networkMode !== approvedNetwork && !(approvedNetwork in networks)) {
    findings.push(
      `sandbox not on approved network ${approvedNetwork} (NetworkMode=${networkMode}, Networks=${Object.keys(networks).join(',')})`,
    );
  }
  for (const name of Object.keys(networks)) {
    if (name !== approvedNetwork) {
      findings.push(`unexpected network attached: ${name}`);
    }
  }

  const extraHosts = hostConfig.ExtraHosts;
  if (Array.isArray(extraHosts) && extraHosts.length > 0) {
    findings.push(`ExtraHosts must be empty, got ${JSON.stringify(extraHosts)}`);
  } else if (extraHosts && !Array.isArray(extraHosts) && extraHosts !== null) {
    findings.push(`ExtraHosts unexpected shape: ${JSON.stringify(extraHosts)}`);
  }

  const extraHostsText = JSON.stringify(extraHosts ?? []);
  if (/host\.docker\.internal/i.test(extraHostsText) || /host-gateway/i.test(extraHostsText)) {
    findings.push('ExtraHosts contains host.docker.internal or host-gateway');
  }

  const portBindings = hostConfig.PortBindings;
  if (portBindings && typeof portBindings === 'object' && Object.keys(portBindings).length > 0) {
    findings.push(`published host ports present: ${JSON.stringify(portBindings)}`);
  }

  const memory = Number(hostConfig.Memory ?? 0);
  if (memory !== memLimitBytes) {
    findings.push(`Memory limit ${memory} != approved ${memLimitBytes}`);
  }
  const nc = Number(hostConfig.NanoCpus ?? 0);
  if (nc !== nanoCpus) {
    findings.push(`NanoCpus ${nc} != approved ${nanoCpus}`);
  }
  const pids = Number(hostConfig.PidsLimit ?? 0);
  if (pids !== pidsLimit) {
    findings.push(`PidsLimit ${pids} != approved ${pidsLimit}`);
  }

  const mounts = /** @type {Array<Record<string, unknown>>} */ (inspect?.Mounts ?? []);
  for (const m of mounts) {
    const src = String(m.Source ?? m.Name ?? '');
    if (src.includes('docker.sock') || src === '/var/run/docker.sock') {
      findings.push(`forbidden docker.sock mount: ${src}`);
    }
  }

  return { ok: findings.length === 0, findings };
}
