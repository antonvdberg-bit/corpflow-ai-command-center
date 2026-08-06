import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

/**
 * Regression: @dataclass must decorate the override classes, not helper
 * functions. Misplacement crashed the control plane on recreate
 * (AttributeError: 'function' object has no attribute '__mro__').
 * Issue #743 / PR #747.
 */

const LIVE_STATUS =
  'ops/openhands/runtime-overrides/live_status_app_conversation_service.py';
const SKILLS_BASE =
  'ops/openhands/runtime-overrides/app_conversation_service_base.py';

/**
 * @param {string} source
 * @param {string} className
 */
function assertDataclassOnClass(source, className) {
  const re = new RegExp(
    String.raw`@dataclass\s*\nclass ${className}\b`,
  );
  assert.match(
    source,
    re,
    `@dataclass must immediately precede class ${className}`,
  );
}

/**
 * @param {string} source
 * @param {string} funcName
 */
function assertDataclassNotOnFunction(source, funcName) {
  const re = new RegExp(
    String.raw`@dataclass\s*\ndef ${funcName}\b`,
  );
  assert.doesNotMatch(
    source,
    re,
    `@dataclass must not decorate helper function ${funcName}`,
  );
}

describe('openhands override dataclass placement', () => {
  it('places @dataclass on LiveStatusAppConversationService', () => {
    const src = fs.readFileSync(LIVE_STATUS, 'utf8');
    assertDataclassOnClass(src, 'LiveStatusAppConversationService');
    assertDataclassNotOnFunction(src, '_corpflowai_env_flag');
    assertDataclassNotOnFunction(src, '_corpflowai_enable_browser');
    assertDataclassNotOnFunction(src, '_corpflowai_minimal_tools_only');
  });

  it('places @dataclass on AppConversationServiceBase', () => {
    const src = fs.readFileSync(SKILLS_BASE, 'utf8');
    assertDataclassOnClass(src, 'AppConversationServiceBase');
    assertDataclassNotOnFunction(src, '_corpflowai_env_flag');
    assertDataclassNotOnFunction(src, 'get_project_dir');
  });
});
