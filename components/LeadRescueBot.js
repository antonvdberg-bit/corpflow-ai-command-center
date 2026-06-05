import React from 'react';

import { trackEvent } from '../lib/analytics/index.js';

/**
 * AI Lead Rescue assistant — client-side chat component.
 *
 * Mounted from `components/AiLeadRescueLanding.js` and gated by the
 * `NEXT_PUBLIC_LR_BOT_ENABLED` env var (default OFF — Production stays off
 * until Anton flips it after Preview verification).
 *
 * Doctrine references:
 *   - `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md` § 8 (UI plan), § 10 (events)
 *   - `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § AI Lead Rescue doctrine
 *
 * The component:
 *   - Renders a small FAB (floating action button) in the bottom-right corner.
 *   - On click, opens a chat panel. On mobile, the panel becomes full-screen.
 *   - Sends each visitor turn to `POST /api/lead-rescue/bot/turn`.
 *   - Executes tool calls client-side:
 *       * scroll_to_intake()              → smooth scroll to the intake form
 *       * prefill_intake_form({ ... })    → populate the existing form (NEVER submits)
 *   - Emits the doctrine-named Plausible events (see audit § 10).
 *   - Respects `prefers-reduced-motion`.
 *   - Never auto-submits the form. The visitor still clicks "Request AI Lead Rescue setup".
 *
 * Tool-name field map (bot → DOM input name):
 *   - business_name  → input[name="business_name"]
 *   - contact_name   → input[name="name"]              (page uses "name", not "contact_name")
 *   - email          → input[name="email"]
 *   - phone          → input[name="phone"]
 *   - lead_sources   → input[name="lead_sources"]
 *   - message        → textarea[name="message"]
 */

const FORM_FIELD_MAP = Object.freeze({
  business_name: 'business_name',
  contact_name: 'name',
  email: 'email',
  phone: 'phone',
  lead_sources: 'lead_sources',
  message: 'message',
});

const MAX_VISIBLE_HISTORY = 20;
const MAX_INPUT_CHARS = 1000;

/** @returns {boolean} */
function isBotEnabled() {
  const raw = String(process.env.NEXT_PUBLIC_LR_BOT_ENABLED || '').toLowerCase().trim();
  return raw === 'true' || raw === '1' || raw === 'on' || raw === 'yes';
}

/** @returns {string} */
function mintSessionId() {
  if (typeof globalThis !== 'undefined' && /** @type {any} */ (globalThis).crypto?.randomUUID) {
    return /** @type {any} */ (globalThis).crypto.randomUUID().replace(/-/g, '');
  }
  return 'sess-' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

/**
 * @param {string} eventName
 * @param {Record<string, string | number | boolean>} [props]
 */
function safeTrack(eventName, props) {
  try {
    trackEvent(eventName, props);
  } catch {
    /* analytics never blocks UX */
  }
}

/**
 * Find the visible intake form and set field values via React-compatible
 * native setters (so React 18's controlled-input warnings stay quiet and the
 * change events fire). Returns the count of fields actually updated.
 *
 * @param {Record<string, unknown>} args
 * @returns {number}
 */
function applyPrefill(args) {
  if (typeof document === 'undefined') return 0;
  const form = document.querySelector('form[data-lr-intake-form]') || document.querySelector('section#intake form');
  if (!form) return 0;
  let updated = 0;
  for (const [botKey, value] of Object.entries(args)) {
    if (typeof value !== 'string') continue;
    const domName = FORM_FIELD_MAP[/** @type {keyof typeof FORM_FIELD_MAP} */ (botKey)];
    if (!domName) continue;
    const el = form.querySelector(`[name="${domName}"]`);
    if (!el) continue;
    const setter = Object.getOwnPropertyDescriptor(
      el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value',
    )?.set;
    if (setter) {
      setter.call(el, String(value).slice(0, 500));
    } else {
      /** @type {any} */ (el).value = String(value).slice(0, 500);
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    updated += 1;
  }
  return updated;
}

function scrollToIntake() {
  if (typeof document === 'undefined') return;
  const section = document.getElementById('intake');
  if (!section) return;
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

const initialAssistantGreeting = {
  role: 'assistant',
  content:
    "Hi — I'm a sales assistant for AI Lead Rescue. Ask me anything about the USD 150 launch pilot, what's included, or what we need from you. When you're ready, I can take you to the intake form.",
};

export default function LeadRescueBot() {
  const enabled = isBotEnabled();
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState(() => [initialAssistantGreeting]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState(/** @type {string | null} */ (null));
  const sessionIdRef = React.useRef('');
  const turnsSentRef = React.useRef(0);
  const scrollRef = React.useRef(/** @type {HTMLDivElement | null} */ (null));

  React.useEffect(() => {
    if (!sessionIdRef.current) sessionIdRef.current = mintSessionId();
  }, []);

  React.useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages]);

  if (!enabled) return null;

  function onOpen() {
    if (open) return;
    setOpen(true);
    safeTrack('lr_bot_open', { session_id_prefix: sessionIdRef.current.slice(0, 6) });
  }

  function onClose() {
    if (!open) return;
    setOpen(false);
    safeTrack('lr_bot_closed', {
      session_id_prefix: sessionIdRef.current.slice(0, 6),
      turns: turnsSentRef.current,
    });
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    if (text.length > MAX_INPUT_CHARS) {
      setError(`Message is too long (max ${MAX_INPUT_CHARS} characters).`);
      return;
    }
    setError(null);
    setSending(true);
    const isFirstTurn = turnsSentRef.current === 0;
    if (isFirstTurn) {
      safeTrack('lr_bot_first_message', {
        session_id_prefix: sessionIdRef.current.slice(0, 6),
      });
    }
    /** @type {{role: 'user' | 'assistant', content: string}[]} */
    const history = [...messages.filter((m) => m.role !== 'assistant' || !m.is_greeting), { role: 'user', content: text }];
    const trimmedHistory = history.slice(-MAX_VISIBLE_HISTORY);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    try {
      const r = await fetch('/api/lead-rescue/bot/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          is_first_turn: isFirstTurn,
          messages: trimmedHistory,
        }),
      });
      if (!r.ok && r.status !== 200) {
        const isRate = r.status === 429;
        const fallback = isRate
          ? "We're getting a lot of chat traffic just now. Please try again in a few minutes, or fill in the intake form below."
          : "Something went wrong on my side. Please use the intake form below — we review every intake within two business hours.";
        try {
          const parsed = await r.json();
          if (parsed && typeof parsed === 'object' && typeof parsed.assistant_text === 'string') {
            setMessages((prev) => [...prev, { role: 'assistant', content: parsed.assistant_text }]);
            if (parsed.refusal_class) {
              safeTrack('lr_bot_refusal', {
                session_id_prefix: sessionIdRef.current.slice(0, 6),
                refusal_class: String(parsed.refusal_class),
              });
            }
          } else {
            setMessages((prev) => [...prev, { role: 'assistant', content: fallback }]);
            safeTrack('lr_bot_error', {
              session_id_prefix: sessionIdRef.current.slice(0, 6),
              status: r.status,
            });
          }
        } catch {
          setMessages((prev) => [...prev, { role: 'assistant', content: fallback }]);
          safeTrack('lr_bot_error', {
            session_id_prefix: sessionIdRef.current.slice(0, 6),
            status: r.status,
          });
        }
        turnsSentRef.current += 1;
        return;
      }
      const data = await r.json();
      const assistantText =
        typeof data?.assistant_text === 'string' && data.assistant_text.trim()
          ? data.assistant_text
          : "I can help you start the intake — we review every intake within two business hours.";
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);
      turnsSentRef.current += 1;
      if (data && data.refusal_class) {
        safeTrack('lr_bot_refusal', {
          session_id_prefix: sessionIdRef.current.slice(0, 6),
          refusal_class: String(data.refusal_class),
        });
      } else {
        safeTrack('lr_bot_assistant_response', {
          session_id_prefix: sessionIdRef.current.slice(0, 6),
          turns: turnsSentRef.current,
        });
      }
      if (Array.isArray(data?.tool_calls)) {
        for (const call of data.tool_calls) {
          if (!call || typeof call !== 'object') continue;
          if (call.name === 'scroll_to_intake') {
            scrollToIntake();
            safeTrack('lr_bot_intake_handoff', {
              session_id_prefix: sessionIdRef.current.slice(0, 6),
              method: 'scroll',
            });
          } else if (call.name === 'prefill_intake_form') {
            const args = call.arguments && typeof call.arguments === 'object' ? call.arguments : {};
            const filled = applyPrefill(args);
            if (filled > 0) {
              scrollToIntake();
              safeTrack('lr_bot_intake_handoff', {
                session_id_prefix: sessionIdRef.current.slice(0, 6),
                method: 'prefill',
                fields_filled: filled,
              });
            }
          }
        }
      }
    } catch (err) {
      setError('Could not reach the assistant. Please try again, or use the intake form below.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "The chat assistant is temporarily unavailable. The intake form below works without it — we review every intake within two business hours.",
        },
      ]);
      safeTrack('lr_bot_error', {
        session_id_prefix: sessionIdRef.current.slice(0, 6),
        reason: 'fetch_failed',
      });
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          aria-label="Open AI Lead Rescue chat assistant"
          onClick={onOpen}
          className="lr-bot-fab"
        >
          <span className="lr-bot-fab-dot" aria-hidden="true" />
          Ask the assistant
        </button>
      ) : null}

      {open ? (
        <div className="lr-bot-panel" role="dialog" aria-label="AI Lead Rescue assistant">
          <div className="lr-bot-panel-header">
            <div className="lr-bot-panel-title">
              <span className="lr-bot-panel-dot" aria-hidden="true" />
              AI Lead Rescue assistant
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={onClose}
              className="lr-bot-panel-close"
            >
              ×
            </button>
          </div>

          <div className="lr-bot-panel-body" ref={scrollRef}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === 'user' ? 'lr-bot-msg lr-bot-msg-user' : 'lr-bot-msg lr-bot-msg-assistant'}
              >
                {m.content}
              </div>
            ))}
            {sending ? (
              <div className="lr-bot-msg lr-bot-msg-assistant lr-bot-msg-thinking" aria-live="polite">
                <span className="lr-bot-thinking-dot" />
                <span className="lr-bot-thinking-dot" />
                <span className="lr-bot-thinking-dot" />
              </div>
            ) : null}
          </div>

          <div className="lr-bot-panel-footer">
            {error ? <div className="lr-bot-error" role="alert">{error}</div> : null}
            <div className="lr-bot-panel-input-row">
              <textarea
                aria-label="Your message"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_CHARS))}
                onKeyDown={onKeyDown}
                placeholder="Ask about the pilot, what's included, or what we need from you…"
                rows={2}
                maxLength={MAX_INPUT_CHARS}
                disabled={sending}
                className="lr-bot-textarea"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                className="lr-bot-send"
              >
                Send
              </button>
            </div>
            <div className="lr-bot-disclaimer">
              No card or banking details on this page. We email a USD invoice after we review your intake.
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .lr-bot-fab {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 9000;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #2dd4bf;
          color: #031018;
          border: 0;
          border-radius: 999px;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .lr-bot-fab:focus-visible {
          outline: 3px solid #7dd3fc;
          outline-offset: 2px;
        }
        .lr-bot-fab-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #031018;
          display: inline-block;
        }

        .lr-bot-panel {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 9000;
          width: min(380px, calc(100vw - 36px));
          height: min(560px, calc(100vh - 36px));
          background: #0b1f33;
          color: #eef6ff;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 18px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
        }
        @media (max-width: 540px) {
          .lr-bot-panel {
            inset: 0;
            width: 100vw;
            height: 100vh;
            border-radius: 0;
          }
        }

        .lr-bot-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.10);
          background: #06111f;
        }
        .lr-bot-panel-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          font-size: 14px;
        }
        .lr-bot-panel-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2dd4bf;
          display: inline-block;
        }
        .lr-bot-panel-close {
          background: transparent;
          border: 0;
          color: #c9d8e8;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          padding: 0 4px;
        }
        .lr-bot-panel-close:focus-visible {
          outline: 2px solid #7dd3fc;
          outline-offset: 2px;
        }

        .lr-bot-panel-body {
          flex: 1 1 auto;
          overflow-y: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .lr-bot-msg {
          padding: 10px 12px;
          border-radius: 14px;
          font-size: 14px;
          line-height: 1.5;
          max-width: 86%;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .lr-bot-msg-user {
          align-self: flex-end;
          background: #2dd4bf;
          color: #031018;
          font-weight: 600;
        }
        .lr-bot-msg-assistant {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.10);
          color: #eef6ff;
        }
        .lr-bot-msg-thinking {
          display: inline-flex;
          gap: 4px;
          align-items: center;
          padding: 12px 14px;
        }
        .lr-bot-thinking-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #c9d8e8;
          display: inline-block;
          animation: lrBotPulse 1200ms ease-in-out infinite;
        }
        .lr-bot-thinking-dot:nth-child(2) {
          animation-delay: 200ms;
        }
        .lr-bot-thinking-dot:nth-child(3) {
          animation-delay: 400ms;
        }
        @keyframes lrBotPulse {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lr-bot-thinking-dot {
            animation: none;
            opacity: 0.6;
          }
        }

        .lr-bot-panel-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.10);
          padding: 10px 12px 12px;
          background: #06111f;
        }
        .lr-bot-error {
          color: #fda4af;
          font-size: 12px;
          margin-bottom: 6px;
        }
        .lr-bot-panel-input-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        .lr-bot-textarea {
          flex: 1 1 auto;
          resize: none;
          padding: 9px 10px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.25);
          color: #eef6ff;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.4;
          box-sizing: border-box;
        }
        .lr-bot-textarea:focus-visible {
          outline: 2px solid #7dd3fc;
          outline-offset: 1px;
        }
        .lr-bot-send {
          padding: 9px 14px;
          background: #2dd4bf;
          color: #031018;
          border: 0;
          border-radius: 10px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
        }
        .lr-bot-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .lr-bot-send:focus-visible {
          outline: 2px solid #06111f;
          outline-offset: 2px;
        }
        .lr-bot-disclaimer {
          margin-top: 8px;
          font-size: 11px;
          color: #aebfd1;
          line-height: 1.4;
        }
      `}</style>
    </>
  );
}
