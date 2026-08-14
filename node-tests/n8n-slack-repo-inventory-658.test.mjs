import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const N8N_JSON_ROOTS = [
  'docs/n8n/templates',
  'docs/execution/n8n-templates',
  'ops/n8n',
];

const SLACK_NODE_TYPE_RE = /slack/i;
const SLACK_WEBHOOK_HOST_RE = /hooks\.slack\.com/i;

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

function walk(value, visit) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (value && typeof value === 'object') {
    visit(value);
    for (const nested of Object.values(value)) walk(nested, visit);
  }
}

function inspectWorkflow(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);
  const slackNodeTypes = [];
  const slackWebhookHits = [];

  walk(json, (obj) => {
    if (typeof obj.type === 'string' && SLACK_NODE_TYPE_RE.test(obj.type)) {
      slackNodeTypes.push({ name: obj.name || null, type: obj.type });
    }
    for (const nested of Object.values(obj)) {
      if (typeof nested === 'string' && SLACK_WEBHOOK_HOST_RE.test(nested)) {
        slackWebhookHits.push(nested.replace(/https?:\/\/[^\s"'\\]+/gi, '[redacted-url]'));
      }
    }
  });

  return {
    filePath,
    active: json.active === true,
    slackNodeTypes,
    slackWebhookHits,
  };
}

const workflowFiles = N8N_JSON_ROOTS.flatMap(listJsonFiles);
const inventories = workflowFiles.map(inspectWorkflow);

test('#658 repo n8n JSON inventory includes the known tracked workflow files', () => {
  assert.ok(workflowFiles.length >= 6, `expected tracked n8n JSON files, found ${workflowFiles.length}`);
  const names = workflowFiles.map((file) => path.basename(file)).sort();
  assert.ok(names.includes('github-heartbeat-checker.template.json'));
  assert.ok(names.includes('production-pulse-v1.workflow.json'));
});

test('#658 tracked n8n JSON has no Slack node types and no Slack incoming-webhook hosts', () => {
  const offenders = inventories.filter(
    (row) => row.slackNodeTypes.length > 0 || row.slackWebhookHits.length > 0,
  );
  assert.deepEqual(
    offenders,
    [],
    `Slack sender/read nodes must stay out of tracked n8n JSON: ${JSON.stringify(offenders)}`,
  );
});

test('#658 tracked n8n JSON workflows are inactive snapshots, not live n8n proof', () => {
  const liveFlags = inventories.filter((row) => row.active);
  assert.deepEqual(
    liveFlags.map((row) => row.filePath),
    [],
    'Tracked n8n JSON must remain inactive templates/skeletons',
  );
});
