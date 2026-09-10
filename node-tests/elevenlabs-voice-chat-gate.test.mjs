import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ELEVENLABS_AGENT_ID_PLACEHOLDER,
  isElevenLabsVoiceChatEnabled,
  isElevenLabsVoiceChatPathAllowed,
  normalizeElevenLabsVoiceChatPathname,
  resolveElevenLabsAgentId,
  resolveElevenLabsVoiceChatAllowedPaths,
  shouldRenderElevenLabsVoiceChat,
} from '../lib/public/elevenlabs-voice-chat.js';

test('ElevenLabs voice chat is disabled by default', () => {
  assert.equal(isElevenLabsVoiceChatEnabled({}), false);
  assert.equal(resolveElevenLabsAgentId(), '');
  assert.deepEqual(resolveElevenLabsVoiceChatAllowedPaths(), []);
  assert.equal(shouldRenderElevenLabsVoiceChat(undefined, '/demo/voice-enquiry'), false);
  assert.equal(
    shouldRenderElevenLabsVoiceChat(
      {
        NEXT_PUBLIC_ELEVENLABS_AGENT_ID: 'agent_test_not_production',
        NEXT_PUBLIC_ELEVENLABS_VOICE_CHAT_ALLOWED_PATHS: '/demo/voice-enquiry',
      },
      '/demo/voice-enquiry',
    ),
    false,
  );
});

test('flag true with missing or placeholder agent ID still does not render', () => {
  assert.equal(
    shouldRenderElevenLabsVoiceChat({
      NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: 'true',
    }, '/demo/voice-enquiry'),
    false,
  );
  assert.equal(
    shouldRenderElevenLabsVoiceChat({
      NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: 'true',
      NEXT_PUBLIC_ELEVENLABS_AGENT_ID: ELEVENLABS_AGENT_ID_PLACEHOLDER,
      NEXT_PUBLIC_ELEVENLABS_VOICE_CHAT_ALLOWED_PATHS: '/demo/voice-enquiry',
    }, '/demo/voice-enquiry'),
    false,
  );
  assert.equal(
    shouldRenderElevenLabsVoiceChat({
      NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: 'true',
      NEXT_PUBLIC_ELEVENLABS_AGENT_ID: 'replace_me',
      NEXT_PUBLIC_ELEVENLABS_VOICE_CHAT_ALLOWED_PATHS: '/demo/voice-enquiry',
    }, '/demo/voice-enquiry'),
    false,
  );
});

test('enabled real agent ID with a missing allowlist does not render', () => {
  const env = {
    NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: 'true',
    NEXT_PUBLIC_ELEVENLABS_AGENT_ID: 'agent_test_placeholder_not_production',
  };
  assert.equal(isElevenLabsVoiceChatEnabled(env), true);
  assert.equal(resolveElevenLabsAgentId(env), 'agent_test_placeholder_not_production');
  assert.deepEqual(resolveElevenLabsVoiceChatAllowedPaths(env), []);
  assert.equal(shouldRenderElevenLabsVoiceChat(env, '/demo/voice-enquiry'), false);
});

test('explicit public environment permits only the demo voice enquiry path', () => {
  const publicEnv = {
    NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: 'true',
    NEXT_PUBLIC_ELEVENLABS_AGENT_ID: 'agent_test_placeholder_not_production',
    NEXT_PUBLIC_ELEVENLABS_VOICE_CHAT_ALLOWED_PATHS: '/demo/voice-enquiry',
  };

  assert.equal(isElevenLabsVoiceChatPathAllowed('/demo/voice-enquiry', publicEnv), true);
  assert.equal(shouldRenderElevenLabsVoiceChat(publicEnv, '/demo/voice-enquiry'), true);
  assert.equal(shouldRenderElevenLabsVoiceChat(publicEnv, '/lead-rescue'), false);
  assert.equal(shouldRenderElevenLabsVoiceChat(publicEnv, '/website-rescue'), false);
  assert.equal(shouldRenderElevenLabsVoiceChat(publicEnv, '/'), false);
});

test('comma-separated allowlist has exact pathname matches', () => {
  const env = {
    NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: 'true',
    NEXT_PUBLIC_ELEVENLABS_AGENT_ID: 'agent_test_placeholder_not_production',
    NEXT_PUBLIC_ELEVENLABS_VOICE_CHAT_ALLOWED_PATHS:
      ' /demo/voice-enquiry , /some-other-approved-page ',
  };

  assert.deepEqual(resolveElevenLabsVoiceChatAllowedPaths(env), [
    '/demo/voice-enquiry',
    '/some-other-approved-page',
  ]);
  assert.equal(shouldRenderElevenLabsVoiceChat(env, '/some-other-approved-page'), true);
  assert.equal(shouldRenderElevenLabsVoiceChat(env, '/some-other-approved-page/child'), false);
});

test('query strings and hash fragments do not affect pathname matching', () => {
  const env = {
    NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT: 'true',
    NEXT_PUBLIC_ELEVENLABS_AGENT_ID: 'agent_test_placeholder_not_production',
    NEXT_PUBLIC_ELEVENLABS_VOICE_CHAT_ALLOWED_PATHS: '/demo/voice-enquiry',
  };

  assert.equal(
    normalizeElevenLabsVoiceChatPathname('/demo/voice-enquiry?source=anton#widget'),
    '/demo/voice-enquiry',
  );
  assert.equal(
    shouldRenderElevenLabsVoiceChat(env, '/demo/voice-enquiry?source=anton#widget'),
    true,
  );
});
