import React, { useEffect } from 'react';

import {
  shouldRenderElevenLabsVoiceChat,
  resolveElevenLabsAgentId,
} from '../lib/public/elevenlabs-voice-chat.js';

const WIDGET_SCRIPT_SRC = 'https://unpkg.com/@elevenlabs/convai-widget-embed';

/**
 * Gated ElevenLabs Agents website voice + text enquiry placeholder.
 *
 * - One ElevenLabs agent for voice and text (typing fallback); no second chatbot stack.
 * - Renders nothing unless NEXT_PUBLIC_ENABLE_ELEVENLABS_VOICE_CHAT=true
 *   AND NEXT_PUBLIC_ELEVENLABS_AGENT_ID is a real non-placeholder id.
 * - CorpFlowAI-owned surfaces only (call sites must stay on CorpFlowAI pages).
 * - Do NOT enable in production without Anton approval.
 * - NO ACTIVATION AUTHORIZED by merging this component.
 *
 * @param {{ surface?: string }} props
 */
export default function ElevenLabsWebsiteVoiceChat({ surface = 'unspecified' }) {
  const enabled = shouldRenderElevenLabsVoiceChat();
  const agentId = resolveElevenLabsAgentId();

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return undefined;

    const existing = document.querySelector(`script[data-corpflow-elevenlabs-widget="1"]`);
    if (existing) return undefined;

    const script = document.createElement('script');
    script.src = WIDGET_SCRIPT_SRC;
    script.async = true;
    script.type = 'text/javascript';
    script.dataset.corpflowElevenlabsWidget = '1';
    document.body.appendChild(script);

    return () => {
      // Leave script in place if other mounts exist; safe no-op cleanup for single mount.
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <aside
      data-corpflow-elevenlabs-voice-chat="1"
      data-surface={surface}
      style={{
        marginTop: 24,
        padding: 16,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(0,0,0,0.28)',
      }}
    >
      <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.45 }}>
        Talk or type to our AI enquiry assistant. It captures your enquiry for human review. No
        commitments are made by the assistant. A CorpFlowAI human will review before any next
        action. Please do not submit passwords, secrets, financial records, medical details, or
        confidential client data.
      </p>
      {/* Custom element provided by ElevenLabs widget script when enabled. */}
      <elevenlabs-convai agent-id={agentId}></elevenlabs-convai>
    </aside>
  );
}
