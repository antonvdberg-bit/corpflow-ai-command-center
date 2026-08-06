import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  COMMISSIONING_APPROVED_MODEL,
  COMMISSIONING_ENV_DEFAULTS,
  COMMISSIONING_GROQ_TPM_LIMIT,
  FIRST_REQUEST_BREAKDOWN,
  GROQ_OBSERVED_REQUEST_TOKENS,
  auditComposeCommissioningMounts,
  auditLiveStatusCommissioningOverride,
  auditSkillsBaseCommissioningOverride,
  estimateMinimalFirstRequestTokens,
} from '../lib/openhands/commissioning-context-policy.js';

const liveStatusPath =
  'ops/openhands/runtime-overrides/live_status_app_conversation_service.py';
const skillsBasePath =
  'ops/openhands/runtime-overrides/app_conversation_service_base.py';
const composePath = 'ops/openhands/compose.yaml';

const liveStatus = fs.readFileSync(liveStatusPath, 'utf8');
const skillsBase = fs.readFileSync(skillsBasePath, 'utf8');
const composeText = fs.readFileSync(composePath, 'utf8');

describe('openhands commissioning context reduction', () => {
  it('ships live_status and skills-base overrides', () => {
    assert.ok(fs.existsSync(liveStatusPath));
    assert.ok(fs.existsSync(skillsBasePath));
  });

  it('live_status override gates browser and default MCP', () => {
    const r = auditLiveStatusCommissioningOverride(liveStatus);
    assert.equal(r.ok, true, r.findings.join('; '));
  });

  it('skills base override gates public/user/project/org skills', () => {
    const r = auditSkillsBaseCommissioningOverride(skillsBase);
    assert.equal(r.ok, true, r.findings.join('; '));
  });

  it('compose bind-mounts commissioning overrides and sets env defaults', () => {
    const r = auditComposeCommissioningMounts(composeText);
    assert.equal(r.ok, true, r.findings.join('; '));
    for (const [key, val] of Object.entries(COMMISSIONING_ENV_DEFAULTS)) {
      assert.match(composeText, new RegExp(`${key}:\\s*"${val}"`));
    }
  });

  it('records Groq observed oversize and approved model', () => {
    assert.equal(COMMISSIONING_APPROVED_MODEL, 'groq/openai/gpt-oss-20b');
    assert.equal(COMMISSIONING_GROQ_TPM_LIMIT, 8000);
    assert.ok(GROQ_OBSERVED_REQUEST_TOKENS.high > COMMISSIONING_GROQ_TPM_LIMIT);
    assert.ok(FIRST_REQUEST_BREAKDOWN.length >= 5);
  });

  it('documents that minimal estimate may still need live measure vs 8k TPM', () => {
    const est = estimateMinimalFirstRequestTokens();
    assert.ok(est.tokens_low > 0);
    assert.ok(est.tokens_high >= est.tokens_low);
    // Low estimate should be within 70% budget; high may still exceed — live measure mandatory
    assert.equal(est.under_70pct_of_8k, true);
    assert.match(est.note, /llama-4-scout|live measure/i);
  });

  it('compose defaults CORPFLOWAI_MINIMAL_TOOLS to 1', () => {
    assert.match(composeText, /CORPFLOWAI_MINIMAL_TOOLS:\s*"1"/);
  });
});
