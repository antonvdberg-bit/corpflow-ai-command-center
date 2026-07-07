import test from 'node:test';
import assert from 'node:assert/strict';

import { validateFlow } from '../lib/server/chat-widget/flow.js';
import { LIVING_WORD_FLOW_ASK_ONLY } from '../lib/server/chat-widget/living-word-flow-ask-only.js';
import { resolveChatWidgetFlowForTenant } from '../lib/server/chat-widget/living-word-flow-resolve.js';
import { LIVING_WORD_FLOW_V3 } from '../lib/server/chat-widget/living-word-flow-v3.js';

test('LIVING_WORD_FLOW_ASK_ONLY validates with single Ask a Question option', () => {
  const flow = validateFlow(LIVING_WORD_FLOW_ASK_ONLY);
  assert.equal(flow.root, 'welcome');
  assert.equal(flow.nodes.welcome.options.length, 1);
  assert.equal(flow.nodes.welcome.options[0].label, 'Ask a Question');
  assert.equal(flow.nodes.welcome.options[0].widget_action, 'ai_ask');
});

test('resolveChatWidgetFlowForTenant overlays ask-only flow for Living Word', () => {
  const flow = resolveChatWidgetFlowForTenant('living-word-mauritius', LIVING_WORD_FLOW_V3);
  assert.equal(flow.nodes.welcome.options.length, 1);
  assert.equal(flow.nodes.welcome.options[0].widget_action, 'ai_ask');
});

test('resolveChatWidgetFlowForTenant leaves other tenants unchanged', () => {
  const other = {
    schema_version: 1,
    root: 'welcome',
    nodes: {
      welcome: {
        type: 'menu',
        prompt: 'Hi',
        options: [{ label: 'A', next: 'welcome' }],
      },
    },
  };
  const flow = resolveChatWidgetFlowForTenant('luxe-maurice', other);
  assert.equal(flow.nodes.welcome.options[0].label, 'A');
});
