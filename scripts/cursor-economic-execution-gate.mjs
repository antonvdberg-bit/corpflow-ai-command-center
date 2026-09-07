#!/usr/bin/env node
import fs from 'node:fs';
import { authorizeCursorRemoteExecution } from '../lib/server/cursor-economic-execution-gate.js';

const result = authorizeCursorRemoteExecution({
  mode: process.env.CORPFLOW_CURSOR_MODE,
  action: process.env.CURSOR_ECONOMIC_ACTION || 'workflow_remote_execution',
});

const outputPath = process.env.GITHUB_OUTPUT;
if (outputPath) {
  fs.appendFileSync(outputPath, `allowed=${result.allowed ? '1' : '0'}\n`);
  fs.appendFileSync(outputPath, `mode=${result.mode}\n`);
  fs.appendFileSync(outputPath, `reason=${result.reason}\n`);
}

console.log(
  JSON.stringify({
    schema: 'corpflow.cursor_economic_execution_gate.v1',
    allowed: result.allowed,
    mode: result.mode,
    action: result.action,
    reason: result.reason,
  }),
);
