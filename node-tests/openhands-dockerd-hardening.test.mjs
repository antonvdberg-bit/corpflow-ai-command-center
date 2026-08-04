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
const isolationDoc = fs.readFileSync('docs/operations/OPENHANDS_DOCKER_ISOLATION.md', 'utf8');
const preflight = fs.readFileSync('scripts/ops/openhands/preflight.sh', 'utf8');

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
    assert.match(
      activeLines(dockerdUnit).join('\n'),
      /^Delegate=yes$/m,
    );
  });

  it('isolation doc records NoNewPrivileges verdict as INCOMPATIBLE', () => {
    assert.match(isolationDoc, /Verdict:\s*INCOMPATIBLE/i);
    assert.match(isolationDoc, /newuidmap/);
  });
});

describe('openhands systemd slice claim honesty', () => {
  it('slice unit states pending runtime verification', () => {
    assert.match(sliceUnit, /PENDING RUNTIME VERIFICATION/i);
  });

  it('isolation doc includes install-gate cgroup probe commands', () => {
    assert.match(isolationDoc, /corpflowai-openhands-cgroup-probe/);
    assert.match(isolationDoc, /\/proc\/\$PID\/cgroup|\/proc\/\$\{?PID\}?\/cgroup/);
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
});
