import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ELEVENLABS_AGENT_ID_PLACEHOLDER,
  isElevenLabsVoiceChatEnabled,
  resolveElevenLabsAgentId,
  shouldRenderElevenLabsVoiceChat,
} from '../lib/public/elevenlabs-voice-chat.js';

test('ElevenLabs voice chat is disabled by default', () => {
  assert.equal(isElevenLabsVoiceChatEnabled({}), false);
  assert.equal(shouldRenderElevenLabsVoiceChat({}), false);
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
