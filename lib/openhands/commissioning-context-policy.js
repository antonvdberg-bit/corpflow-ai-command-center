/**
 * OpenHands commissioning context-reduction policy — static audits for the
 * Option D conversation/skills overrides that shrink the first Groq request.
 *
 * Controlling issue: #743 / PR #747. Live validation requires L3 on
 * corpflow-exec-01; this module is offline-only.
 */

/** @type {readonly string[]} */
export const COMMISSIONING_OVERRIDE_FILES = Object.freeze([
  'ops/openhands/runtime-overrides/live_status_app_conversation_service.py',
  'ops/openhands/runtime-overrides/app_conversation_service_base.py',
]);

/** Compose bind-mount targets inside the control-plane container. */
export const LIVE_STATUS_OVERRIDE_IN_CONTAINER =
  '/app/openhands/app_server/app_conversation/live_status_app_conversation_service.py';
export const SKILLS_BASE_OVERRIDE_IN_CONTAINER =
  '/app/openhands/app_server/app_conversation/app_conversation_service_base.py';

/** Env flags — package default is minimal (all off). */
export const COMMISSIONING_ENV_DEFAULTS = Object.freeze({
  CORPFLOWAI_ENABLE_BROWSER: '0',
  CORPFLOWAI_INJECT_DEFAULT_MCP: '0',
  CORPFLOWAI_ENABLE_BUILTIN_AGENTS: '0',
  CORPFLOWAI_MINIMAL_TOOLS: '1',
  CORPFLOWAI_LOAD_PUBLIC_SKILLS: '0',
  CORPFLOWAI_LOAD_USER_SKILLS: '0',
  CORPFLOWAI_LOAD_PROJECT_SKILLS: '0',
  CORPFLOWAI_LOAD_ORG_SKILLS: '0',
});

/**
 * Approved model for the arithmetic commissioning attempt (must not change
 * silently). Alternative free-tier models require separate Anton approval.
 */
export const COMMISSIONING_APPROVED_MODEL = 'groq/openai/gpt-oss-20b';
export const COMMISSIONING_GROQ_TPM_LIMIT = 8000;
/** Pre-run gate: estimated first request must be ≤ this fraction of TPM. */
export const COMMISSIONING_TPM_MARGIN = 0.7;

/**
 * Source-measured / Groq-observed first-request breakdown (sanitised).
 * Token figures are approximations except where Groq reported them live.
 *
 * @type {ReadonlyArray<{ component: string, tokens_low: number, tokens_high: number, evidence: string }>}
 */
export const FIRST_REQUEST_BREAKDOWN = Object.freeze([
  {
    component: 'system_prompt',
    tokens_low: 4000,
    tokens_high: 4300,
    evidence:
      'OpenHands SDK prompt snapshot openai__browser-off__secana-on__cli-off.txt (~16346 chars ≈ 4086 tok)',
  },
  {
    component: 'browser_tool_schemas',
    tokens_low: 12000,
    tokens_high: 22000,
    evidence:
      'get_default_tools(enable_browser=True) hardcoded in live_status; BrowserToolSet expands to 14 tools',
  },
  {
    component: 'builtin_terminal_file_editor_task_tracker',
    tokens_low: 4000,
    tokens_high: 9000,
    evidence: 'TerminalTool + FileEditorTool + TaskTrackerTool Action Field schemas',
  },
  {
    component: 'default_mcp_tools',
    tokens_low: 5000,
    tokens_high: 15000,
    evidence:
      '_add_system_mcp_servers injects {web_url}/mcp/mcp (create_pr/mr/bitbucket/azure_devops)',
  },
  {
    component: 'public_and_global_skills',
    tokens_low: 2000,
    tokens_high: 10000,
    evidence: 'load_public=True hardcoded; SETTING_UP_SKILLS observed before READY',
  },
  {
    component: 'builtins_think_finish_framing',
    tokens_low: 500,
    tokens_high: 2000,
    evidence: 'SDK builtins + LiteLLM/OpenAI tools message framing',
  },
  {
    component: 'user_message_and_history',
    tokens_low: 50,
    tokens_high: 200,
    evidence: 'First synthetic arithmetic instruction only',
  },
]);

/** Groq live rejection sizes from issue #743 functional commissioning run. */
export const GROQ_OBSERVED_REQUEST_TOKENS = Object.freeze({
  low: 33270,
  high: 47591,
  limit_tpm: 8000,
  model: COMMISSIONING_APPROVED_MODEL,
});

/**
 * @param {string} liveStatusSource
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function auditLiveStatusCommissioningOverride(liveStatusSource) {
  const text = String(liveStatusSource ?? '');
  /** @type {string[]} */
  const findings = [];
  if (!text.includes('CORPFLOWAI COMMISSIONING')) {
    findings.push('live_status override missing CORPFLOWAI COMMISSIONING banner');
  }
  if (!text.includes('_corpflowai_enable_browser')) {
    findings.push('live_status override missing _corpflowai_enable_browser gate');
  }
  if (!text.includes('CORPFLOWAI_INJECT_DEFAULT_MCP')) {
    findings.push('live_status override missing CORPFLOWAI_INJECT_DEFAULT_MCP gate');
  }
  if (!/enable_browser\s*=\s*_cf_browser/.test(text)) {
    findings.push('live_status must pass enable_browser=_cf_browser to get_default_tools');
  }
  // Hardcoded True on the get_default_tools call site is forbidden (docstring mentions OK)
  if (/tools = get_default_tools\(\s*\n\s*enable_browser=True/.test(text)) {
    findings.push('get_default_tools still hardcodes enable_browser=True');
  }
  if (!text.includes('skipping default MCP server injection')) {
    findings.push('default MCP injection must be skippable');
  }
  if (!text.includes('CORPFLOWAI_MINIMAL_TOOLS') || !text.includes('FileEditorTool')) {
    findings.push('live_status must support CORPFLOWAI_MINIMAL_TOOLS (terminal+file_editor)');
  }
  return { ok: findings.length === 0, findings };
}

/**
 * @param {string} skillsBaseSource
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function auditSkillsBaseCommissioningOverride(skillsBaseSource) {
  const text = String(skillsBaseSource ?? '');
  /** @type {string[]} */
  const findings = [];
  if (!text.includes('CORPFLOWAI COMMISSIONING')) {
    findings.push('skills base override missing CORPFLOWAI COMMISSIONING banner');
  }
  if (!text.includes('CORPFLOWAI_LOAD_PUBLIC_SKILLS')) {
    findings.push('skills base missing CORPFLOWAI_LOAD_PUBLIC_SKILLS gate');
  }
  if (/load_public=True/.test(text) && !/hardcodes load_public=True/.test(text)) {
    findings.push('skills base still passes load_public=True');
  }
  if (/load_public=_corpflowai_env_flag\('CORPFLOWAI_LOAD_PUBLIC_SKILLS'/.test(text) === false) {
    findings.push('load_public must use CORPFLOWAI_LOAD_PUBLIC_SKILLS env flag');
  }
  return { ok: findings.length === 0, findings };
}

/**
 * @param {string} composeText
 * @returns {{ ok: boolean, findings: string[] }}
 */
export function auditComposeCommissioningMounts(composeText) {
  const text = String(composeText ?? '');
  /** @type {string[]} */
  const findings = [];
  if (!text.includes(LIVE_STATUS_OVERRIDE_IN_CONTAINER)) {
    findings.push('compose missing live_status override bind-mount');
  }
  if (!text.includes(SKILLS_BASE_OVERRIDE_IN_CONTAINER)) {
    findings.push('compose missing skills base override bind-mount');
  }
  for (const [key, val] of Object.entries(COMMISSIONING_ENV_DEFAULTS)) {
    const re = new RegExp(`${key}:\\s*"${val}"`);
    if (!re.test(text)) {
      findings.push(`compose missing ${key}: "${val}"`);
    }
  }
  return { ok: findings.length === 0, findings };
}

/**
 * Estimate reduced first-request tokens after minimal commissioning gates.
 * Conservative ranges — live Groq size must still be measured before send.
 *
 * @returns {{ tokens_low: number, tokens_high: number, under_70pct_of_8k: boolean, note: string }}
 */
export function estimateMinimalFirstRequestTokens() {
  // System ~4.1k + terminal+file_editor (~2.5–5k) + think/finish (~0.5–1.5k) + user (~0.1k)
  // With CORPFLOWAI_MINIMAL_TOOLS=1, task_tracker and browser are absent.
  const tokens_low = 5500;
  const tokens_high = 9500;
  const budget = COMMISSIONING_GROQ_TPM_LIMIT * COMMISSIONING_TPM_MARGIN;
  return {
    tokens_low,
    tokens_high,
    under_70pct_of_8k: tokens_low <= budget,
    note:
      'Browser + default MCP + public skills + task_tracker removed (minimal tools). ' +
      'High estimate may still exceed 5600/8000 — live measure mandatory. If over: ' +
      'shorten system prompt via further override or seek Anton approval for ' +
      'meta-llama/llama-4-scout-17b-16e-instruct (free ~30k TPM).',
  };
}
