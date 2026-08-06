import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  COMMISSIONING_APPROVED_MODEL,
  COMMISSIONING_ENV_DEFAULTS,
  COMMISSIONING_GROQ_TPM_LIMIT,
  COMMISSIONING_WIRE_HARD_STOP,
  COMMISSIONING_WIRE_SOFT_TARGET,
  FIRST_REQUEST_BREAKDOWN,
  GROQ_MINIMAL_TOOLS_OBSERVED_TOKENS,
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
const wireProxyPath = 'ops/openhands/runtime-overrides/wire_capture_proxy.py';
const wireDryPath = 'scripts/ops/openhands/wire-capture-dry.sh';
const commissionPromptPath =
  'ops/openhands/runtime-overrides/commissioning_prompt.py';

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
    assert.ok(GROQ_MINIMAL_TOOLS_OBSERVED_TOKENS.low > COMMISSIONING_GROQ_TPM_LIMIT);
    assert.ok(FIRST_REQUEST_BREAKDOWN.length >= 5);
  });

  it('documents that short-prompt estimate still requires live wire capture', () => {
    const est = estimateMinimalFirstRequestTokens();
    assert.ok(est.tokens_low > 0);
    assert.ok(est.tokens_high >= est.tokens_low);
    assert.equal(est.under_70pct_of_8k, true);
    assert.match(est.note, /wire-capture-dry|live wire/i);
  });

  it('compose defaults CORPFLOWAI_MINIMAL_TOOLS to 1', () => {
    assert.match(composeText, /CORPFLOWAI_MINIMAL_TOOLS:\s*"1"/);
  });

  it('short system prompt activates only with explicit flag and normal path remains', () => {
    assert.match(liveStatus, /CORPFLOWAI_SHORT_SYSTEM_PROMPT/);
    assert.match(liveStatus, /_corpflowai_short_system_prompt\(\)/);
    assert.match(
      liveStatus,
      /overrides\['system_prompt_kwargs'\] = \{'cli_mode': False\}/,
    );
    assert.match(liveStatus, /CORPFLOWAI_COMMISSIONING_SYSTEM_PROMPT/);
  });

  it('keeps run=true commissioning harness and wire dry script', () => {
    const harness = fs.readFileSync(
      'scripts/ops/openhands/commission-arithmetic-minimal.sh',
      'utf8',
    );
    assert.match(harness, /"run": True/);
    assert.ok(fs.existsSync(wireDryPath));
    assert.ok(fs.existsSync(wireProxyPath));
    assert.ok(fs.existsSync(commissionPromptPath));
    const dry = fs.readFileSync(wireDryPath, 'utf8');
    assert.match(dry, /HARD_STOP=7500/);
    assert.match(dry, /SOFT_TARGET=6000/);
    assert.match(dry, /wire_capture_proxy/);
    assert.doesNotMatch(dry, /LLM_API_KEY=\$\(/);
  });

  it('wire hard/soft stop constants match package gate', () => {
    assert.equal(COMMISSIONING_WIRE_HARD_STOP, 7500);
    assert.equal(COMMISSIONING_WIRE_SOFT_TARGET, 6000);
    assert.ok(COMMISSIONING_WIRE_HARD_STOP < COMMISSIONING_GROQ_TPM_LIMIT);
  });

  it('sandbox security knobs remain unchanged in compose', () => {
    assert.match(composeText, /CORPFLOWAI_SANDBOX_NETWORK:\s*"corpflowai-openhands-net"/);
    assert.match(composeText, /CORPFLOWAI_SANDBOX_MEM_LIMIT:\s*"512m"/);
    assert.match(composeText, /AGENT_SERVER_USE_HOST_NETWORK:\s*"false"/);
    assert.match(composeText, /OH_WEB_URL:\s*"http:\/\/corpflowai-openhands-app:3000"/);
  });
});
