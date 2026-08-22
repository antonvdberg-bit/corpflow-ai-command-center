import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  APPROVED_OPS_NOTIFICATION_CHANNELS,
  FORBIDDEN_OPS_NOTIFICATION_CHANNELS,
} from '../lib/server/ops-notification-policy.js';
import {
  detectForbiddenSlackPatterns,
  detectSlackEnvAssignmentKeys,
  detectSlackMcpServers,
  detectSlackNpmDependencies,
  formatSlackRetirementReport,
  scanSlackRetirement,
  SLACK_RETIREMENT_ISSUE,
} from '../lib/server/slack-retirement-guard.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('slack retirement guard / #658', () => {
  it('detects operational Slack tokens, hosts, packages, and n8n nodes', () => {
    const hits = detectForbiddenSlackPatterns(
      [
        'const x = process.env.SLACK_BOT_TOKEN',
        'hooks.slack.com/services/example',
        'n8n-nodes-base.slack',
        '@modelcontextprotocol/server-slack',
      ].join('\n'),
    );
    const ids = hits.map((h) => h.id).sort();
    assert.ok(ids.includes('env_slack_bot_token'));
    assert.ok(ids.includes('process_env_slack'));
    assert.ok(ids.includes('hooks_slack_com'));
    assert.ok(ids.includes('n8n_slack_node'));
    assert.ok(ids.includes('mcp_server_slack_package'));
  });

  it('does not treat historical "Slack retired" prose as an active dependency', () => {
    const hits = detectForbiddenSlackPatterns(
      'Slack is retired from CorpFlow ops (issue #658). Use Telegram exception-only.',
    );
    assert.equal(hits.length, 0);
  });

  it('flags Slack env assignments and MCP/npm dependency shapes', () => {
    assert.deepEqual(detectSlackEnvAssignmentKeys('SLACK_BOT_TOKEN=\n# SLACK_TEAM_ID=\nFOO=bar\n'), [
      'SLACK_BOT_TOKEN',
    ]);
    assert.deepEqual(
      detectSlackMcpServers({
        servers: [
          {
            name: 'slack',
            args: ['-y', '@modelcontextprotocol/server-slack'],
            enabled: false,
          },
        ],
      }),
      ['slack'],
    );
    assert.deepEqual(
      detectSlackNpmDependencies({ dependencies: { '@slack/web-api': '1.0.0' } }),
      ['@slack/web-api'],
    );
  });

  it('repo supported runtime/config/CI paths have no active Slack dependency', () => {
    const result = scanSlackRetirement(ROOT);
    assert.equal(
      result.ok,
      true,
      formatSlackRetirementReport(result),
    );
    assert.equal(result.issue, SLACK_RETIREMENT_ISSUE);
    assert.ok(result.scannedFileCount > 10);
  });

  it('mcp_servers.json no longer declares a Slack server', () => {
    const parsed = JSON.parse(readFileSync(path.join(ROOT, 'mcp_servers.json'), 'utf8'));
    assert.deepEqual(detectSlackMcpServers(parsed), []);
    const names = (parsed.servers || []).map((s) => String(s.name || '').toLowerCase());
    assert.ok(!names.includes('slack'));
  });

  it('CLI check:slack-retirement exits 0 on the current tree', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-slack-retirement.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /Slack retirement guard: PASS/);
  });

  it('approved ops channels exclude Slack', () => {
    assert.deepEqual([...APPROVED_OPS_NOTIFICATION_CHANNELS], ['github', 'telegram']);
    assert.deepEqual([...FORBIDDEN_OPS_NOTIFICATION_CHANNELS], ['slack']);
    assert.ok(!APPROVED_OPS_NOTIFICATION_CHANNELS.includes('slack'));
  });
});
