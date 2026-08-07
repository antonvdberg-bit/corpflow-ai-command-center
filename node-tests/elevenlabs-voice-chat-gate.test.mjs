import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  ELEVENLABS_AGENT_ID_PLACEHOLDER,
  isElevenLabsVoiceChatEnabled,
  resolveElevenLabsAgentId,
  shouldRenderElevenLabsVoiceChat,
} from '../lib/public/elevenlabs-voice-chat.js';

const ROOT = process.cwd();

test('ElevenLabs voice chat is disabled by default', () => {
  assert.equal(isElevenLabsVoiceChatEnabled({}), false);
  assert.equal(shouldRenderElevenLabsVoiceChat({}), false);
});

test('unset, false, empty, and non-true flag values keep the widget off', () => {
  for (const value of [undefined, '', 'false', 'FALSE', '0', 'yes', 'on']) {
    assert.equal(
      isElevenLabsVoiceChatEnabled({ NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: value }),
      false,
      `expected disabled for flag=${JSON.stringify(value)}`,
    );
    assert.equal(
      shouldRenderElevenLabsVoiceChat({
        NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: value,
        NEXT_PUBLIC_ELEVENLABS_AGENT_ID: 'agent_test_placeholder_not_production',
      }),
      false,
      `expected no render for flag=${JSON.stringify(value)}`,
    );
  }
});

test('only exact true (case/whitespace tolerant) enables the flag', () => {
  for (const value of ['true', 'TRUE', ' True ']) {
    assert.equal(
      isElevenLabsVoiceChatEnabled({ NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: value }),
      true,
      `expected enabled for flag=${JSON.stringify(value)}`,
    );
  }
});

test('flag true with missing or placeholder agent id still does not render', () => {
  assert.equal(
    shouldRenderElevenLabsVoiceChat({
      NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: 'true',
    }),
    false,
  );
  assert.equal(
    shouldRenderElevenLabsVoiceChat({
      NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: 'true',
      NEXT_PUBLIC_ELEVENLABS_AGENT_ID: ELEVENLABS_AGENT_ID_PLACEHOLDER,
    }),
    false,
  );
  assert.equal(
    shouldRenderElevenLabsVoiceChat({
      NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: 'true',
      NEXT_PUBLIC_ELEVENLABS_AGENT_ID: 'replace_me',
    }),
    false,
  );
  assert.equal(
    shouldRenderElevenLabsVoiceChat({
      NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: 'true',
      NEXT_PUBLIC_ELEVENLABS_AGENT_ID: 'REPLACE-ME',
    }),
    false,
  );
  assert.equal(
    shouldRenderElevenLabsVoiceChat({
      NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: 'true',
      NEXT_PUBLIC_ELEVENLABS_AGENT_ID: '   ',
    }),
    false,
  );
});

test('renders only when enabled with a non-placeholder agent id', () => {
  const env = {
    NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: 'true',
    NEXT_PUBLIC_ELEVENLABS_AGENT_ID: 'agent_test_placeholder_not_production',
  };
  assert.equal(isElevenLabsVoiceChatEnabled(env), true);
  assert.equal(resolveElevenLabsAgentId(env), 'agent_test_placeholder_not_production');
  assert.equal(shouldRenderElevenLabsVoiceChat(env), true);
});

test('.env.template keeps ElevenLabs pilot disabled with placeholder agent id', () => {
  const template = readFileSync(join(ROOT, '.env.template'), 'utf8');
  assert.match(template, /NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT=false/);
  assert.match(template, /NEXT_PUBLIC_ELEVENLABS_AGENT_ID=REPLACE_ME/);
  assert.doesNotMatch(template, /NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT=true/);
  assert.doesNotMatch(template, /NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_[A-Za-z0-9]+/);
});

test('gated component and private demo do not hardcode a real agent id', () => {
  const component = readFileSync(join(ROOT, 'components/ElevenLabsWebsiteVoiceChat.js'), 'utf8');
  const demo = readFileSync(join(ROOT, 'pages/demo/voice-enquiry.js'), 'utf8');
  assert.match(component, /Talk or type to our AI enquiry assistant/);
  assert.doesNotMatch(component, /agent-id=["']agent_[A-Za-z0-9]+["']/);
  assert.doesNotMatch(demo, /agent_[A-Za-z0-9]{8,}/);
  assert.match(demo, /Talk or type/);
});
