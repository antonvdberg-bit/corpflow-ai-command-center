import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ENTRYPOINT = 'scripts/factory-cloud-agents-executor.mjs';

test('Cloud Agents executor entrypoint loads its import graph before validating runtime env', () => {
  const env = { ...process.env };
  delete env.SOURCE_ISSUE;
  delete env.HANDOFF_RUN_ID;
  delete env.GITHUB_REPOSITORY;
  delete env.GITHUB_TOKEN;
  delete env.CURSOR_API_KEY;

  const result = spawnSync(process.execPath, [ENTRYPOINT], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
  });

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.notEqual(result.status, 0);
  assert.match(
    output,
    /SOURCE_ISSUE, HANDOFF_RUN_ID, GITHUB_REPOSITORY, and GITHUB_TOKEN are required/,
  );
  assert.doesNotMatch(output, /does not provide an export named 'listGitHubIssueComments'/);
  assert.doesNotMatch(output, /SyntaxError:/);
});
