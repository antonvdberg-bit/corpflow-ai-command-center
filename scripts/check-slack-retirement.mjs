#!/usr/bin/env node
/**
 * Fail CI when supported runtime/config/CI paths reintroduce Slack (issue #658).
 */
import {
  formatSlackRetirementReport,
  scanSlackRetirement,
} from '../lib/server/slack-retirement-guard.js';

const result = scanSlackRetirement(process.cwd());
const report = formatSlackRetirementReport(result);
if (result.ok) {
  console.log(report);
  process.exit(0);
}
console.error(report);
process.exit(1);
