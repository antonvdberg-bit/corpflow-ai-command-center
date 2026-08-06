import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

const dockerdUnit = fs.readFileSync(
  'scripts/ops/systemd/corpflowai-openhands-dockerd.service',
  'utf8',
);
const appUnit = fs.readFileSync('scripts/ops/systemd/corpflowai-openhands.service', 'utf8');
const daemonEnvExample = fs.readFileSync('ops/openhands/daemon/daemon.env.example', 'utf8');
const sliceUnit = fs.readFileSync('scripts/ops/systemd/corpflowai-openhands.slice', 'utf8');
const containersSlice = fs.readFileSync(
  'scripts/ops/systemd/corpflowai-openhands-containers.slice',
  'utf8',
);
const daemonJsonExample = fs.readFileSync('ops/openhands/daemon/daemon.json.example', 'utf8');
const isolationDoc = fs.readFileSync('docs/operations/OPENHANDS_DOCKER_ISOLATION.md', 'utf8');
const preflight = fs.readFileSync('scripts/ops/openhands/preflight.sh', 'utf8');
const installSh = fs.readFileSync('scripts/ops/openhands/install.sh', 'utf8');
const verifyCgroup = fs.readFileSync('scripts/ops/openhands/verify-cgroup-placement.sh', 'utf8');
const commonSh = fs.readFileSync('scripts/ops/openhands/lib/common.sh', 'utf8');
const compose = fs.readFileSync('ops/openhands/compose.yaml', 'utf8');

/** Application/model secret names that must never appear as Environment= assignments in dockerd. */
const FORBIDDEN_DAEMON_SECRET_NAMES = [
  'LLM_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GITHUB_TOKEN',
  'POSTGRES_URL',
  'DATABASE_URL',
  'MASTER_ADMIN_KEY',
  'CORPFLOW_CRON_SECRET',
  'TELEGRAM_BOT_TOKEN',
];

/**
 * Active (non-comment) lines of a systemd unit / env file.
 * @param {string} text
 */
function activeLines(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

describe('openhands dockerd secret separation', () => {
  it('dockerd unit does not EnvironmentFile= ops/openhands/.env', () => {
    const hits = activeLines(dockerdUnit).filter((l) =>
      /^EnvironmentFile=.*ops\/openhands\/\.env/.test(l),
    );
    assert.equal(hits.length, 0, `forbidden EnvironmentFile lines: ${JSON.stringify(hits)}`);
  });

  it('dockerd unit may only reference daemon-only env file under OPENHANDS_HOME/docker/', () => {
    const envFiles = activeLines(dockerdUnit).filter((l) => l.startsWith('EnvironmentFile='));
    for (const line of envFiles) {
      assert.match(
        line,
        /corpflowai-openhands\/docker\/daemon\.env/,
        `unexpected EnvironmentFile: ${line}`,
      );
      assert.doesNotMatch(line, /ops\/openhands\/\.env/);
    }
  });

  it('dockerd unit does not assign application/model secret variable names', () => {
    const active = activeLines(dockerdUnit).join('\n');
    for (const name of FORBIDDEN_DAEMON_SECRET_NAMES) {
      assert.doesNotMatch(
        active,
        new RegExp(`(?:^|\\s)${name}=`),
        `dockerd unit must not set ${name}`,
      );
    }
  });

  it('daemon.env.example contains no secret assignments', () => {
    const active = activeLines(daemonEnvExample).join('\n');
    for (const name of FORBIDDEN_DAEMON_SECRET_NAMES) {
      assert.doesNotMatch(active, new RegExp(`^${name}=`));
    }
    assert.doesNotMatch(active, /sk-[A-Za-z0-9]/);
  });

  it('app unit retains ops/openhands/.env (application secrets belong there)', () => {
    assert.match(appUnit, /EnvironmentFile=-%h\/corpflow-ai-command-center\/ops\/openhands\/\.env/);
  });
});

describe('openhands dockerd NoNewPrivileges policy', () => {
  it('dockerd unit does not set NoNewPrivileges=yes (incompatible with stock rootless)', () => {
    const hits = activeLines(dockerdUnit).filter((l) => /^NoNewPrivileges=yes$/i.test(l));
    assert.equal(hits.length, 0);
  });

  it('dockerd unit documents the incompatibility and sets Delegate=yes', () => {
    assert.match(dockerdUnit, /NoNewPrivileges deliberately ABSENT|INCOMPATIBLE/i);
    assert.match(activeLines(dockerdUnit).join('\n'), /^Delegate=yes$/m);
  });

  it('isolation doc records NoNewPrivileges verdict as INCOMPATIBLE', () => {
    assert.match(isolationDoc, /Verdict:\s*INCOMPATIBLE/i);
    assert.match(isolationDoc, /newuidmap/);
  });
});

describe('openhands cgroup-parent remediation', () => {
  it('daemon.json.example requires systemd cgroup driver and containers slice parent', () => {
    assert.match(daemonJsonExample, /native\.cgroupdriver=systemd/);
    assert.match(daemonJsonExample, /"cgroup-parent":\s*"corpflowai-openhands-containers\.slice"/);
  });

  it('daemon.json.example documents CLI vs file conflict for data-root/hosts', () => {
    assert.match(daemonJsonExample, /Do NOT also set data-root or hosts/i);
  });

  it('aggregate slice uses host-safe MemoryMax=4G and CPUQuota=200%', () => {
    assert.match(activeLines(sliceUnit).join('\n'), /^MemoryMax=4G$/m);
    assert.match(activeLines(sliceUnit).join('\n'), /^MemoryHigh=3584M$/m);
    assert.match(activeLines(sliceUnit).join('\n'), /^CPUQuota=200%$/m);
    assert.match(activeLines(sliceUnit).join('\n'), /^TasksMax=1024$/m);
    assert.doesNotMatch(activeLines(sliceUnit).join('\n'), /^MemoryMax=8G$/m);
  });

  it('containers sub-slice unit exists and documents nesting under aggregate', () => {
    assert.match(containersSlice, /corpflowai-openhands\.slice/);
    assert.match(containersSlice, /cgroup-parent/i);
  });

  it('verify-cgroup-placement.sh inspects container PID cgroup and fails outside boundary', () => {
    assert.match(verifyCgroup, /\/proc\/\$\{PID\}\/cgroup/);
    assert.match(verifyCgroup, /OPENHANDS_CGROUP_PARENT_SLICE|corpflowai-openhands-containers\.slice/);
    assert.match(verifyCgroup, /OPENHANDS_MEMORY_MAX_BYTES_CEILING|4294967296/);
    assert.match(verifyCgroup, /user\.slice/);
    assert.match(verifyCgroup, /not only the dockerd process/);
    assert.doesNotMatch(verifyCgroup, /dockerd alone is sufficient/i);
  });

  it('install.sh fails closed if cgroup placement verify fails', () => {
    assert.match(installSh, /verify-cgroup-placement\.sh/);
    assert.match(installSh, /refusing to install: verify-cgroup-placement\.sh failed/);
  });

  it('preflight requires cgroup-parent and rejects MemoryMax=8G', () => {
    assert.match(preflight, /native\.cgroupdriver=systemd/);
    assert.match(preflight, /cgroup-parent/);
    assert.match(preflight, /MemoryMax=4G/);
    assert.match(preflight, /must not use MemoryMax=8G/);
  });

  it('common.sh exports cgroup constants with 4G ceiling', () => {
    assert.match(commonSh, /OPENHANDS_CGROUP_PARENT_SLICE/);
    assert.match(commonSh, /OPENHANDS_AGGREGATE_SLICE/);
    assert.match(commonSh, /OPENHANDS_MEMORY_MAX_BYTES_CEILING.*4294967296/);
  });

  it('compose control-plane mem_limit stays within aggregate ceiling', () => {
    assert.match(compose, /mem_limit:\s*1536m/);
    assert.doesNotMatch(compose, /mem_limit:\s*2g/);
  });

  it('isolation doc records Option A selected and rejects dockerd-only weaken', () => {
    assert.match(isolationDoc, /Selected design \(Option A/);
    assert.match(isolationDoc, /corpflowai-openhands-containers\.slice/);
    assert.match(isolationDoc, /verify-cgroup-placement\.sh/);
    assert.match(isolationDoc, /Fail:.*dockerd-only|dockerd-only evidence/i);
  });
});

describe('openhands rootless preflight coverage', () => {
  it('preflight.sh defines check_rootless_prerequisites', () => {
    assert.match(preflight, /check_rootless_prerequisites/);
    assert.match(preflight, /newuidmap/);
    assert.match(preflight, /newgidmap/);
    assert.match(preflight, /\/etc\/subuid/);
    assert.match(preflight, /\/etc\/subgid/);
    assert.match(preflight, /cgroup v2|cgroup\.controllers/);
    assert.match(preflight, /slirp4netns|pasta/);
    assert.match(preflight, /Linger/);
  });

  it('preflight fails closed if dockerd unit gains ops/openhands/.env again', () => {
    assert.match(preflight, /ops\/openhands\/\.env/);
    assert.match(preflight, /NoNewPrivileges=yes/);
  });

  it('common.sh allowlists Docker built-in default networks (bridge/host/none)', () => {
    assert.match(commonSh, /"bridge"/);
    assert.match(commonSh, /"host"/);
    assert.match(commonSh, /"none"/);
  });
});

describe('openhands preflight port modes', () => {
  it('preflight declares --check, --install, and --post-install modes', () => {
    assert.match(preflight, /--check\|--install\|--post-install/);
    assert.match(preflight, /MODE="post-install"/);
    assert.match(preflight, /MODE="check"/);
    assert.match(preflight, /MODE="install"/);
  });

  it('--check/--install keep port-must-be-free via check_port_free', () => {
    assert.match(preflight, /check_port_free\(\)/);
    assert.match(preflight, /pre-install modes require the port free/);
    assert.match(preflight, /check_port_for_mode/);
    assert.match(preflight, /MODE\}" == "post-install"/);
    assert.match(preflight, /check_port_post_install/);
    assert.match(preflight, /check_port_free/);
  });

  it('--post-install requires loopback-only OpenHands ownership of port 3000', () => {
    assert.match(preflight, /check_port_post_install\(\)/);
    assert.match(preflight, /not loopback-only/);
    assert.match(preflight, /corpflowai-openhands-app/);
    assert.match(preflight, /127\.0\.0\.1/);
    assert.match(preflight, /does not publish 127\.0\.0\.1/);
  });

  it('install.sh uses --post-install after compose up and for verify mode', () => {
    assert.match(installSh, /run_checks --post-install/);
    assert.match(installSh, /mode=verify \(read-only; post-install port ownership expected\)/);
    // Pre-install path must remain strict free-port / --install.
    assert.match(installSh, /preflight\.sh" --install/);
    assert.match(installSh, /run_checks --check/);
  });
});

describe('openhands CORPFLOWAI sandbox spawn boundary env', () => {
  it('compose uses Option D override env (not unread V0 SANDBOX_* knobs)', () => {
    assert.match(compose, /CORPFLOWAI_SANDBOX_NETWORK:\s*"corpflowai-openhands-net"/);
    assert.match(compose, /CORPFLOWAI_SANDBOX_WEBHOOK_BASE:\s*"http:\/\/corpflowai-openhands-app:3000"/);
    assert.match(compose, /OH_WEB_URL:\s*"http:\/\/corpflowai-openhands-app:3000"/);
    assert.match(compose, /runtime-overrides\/docker_sandbox_service\.py/);
    assert.doesNotMatch(compose, /^\s*extra_hosts:/m);
    const active = compose
      .split(/\r?\n/)
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .join('\n');
    assert.doesNotMatch(active, /host\.docker\.internal/);
    assert.doesNotMatch(active, /SANDBOX_ADDITIONAL_NETWORKS\s*:/);
    assert.doesNotMatch(active, /SANDBOX_LOCAL_RUNTIME_URL\s*:/);
  });
});
