import { useEffect, useMemo, useState } from 'react';

function normalizeLocale(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/_/g, '-');
  if (!s) return 'en';
  if (s.startsWith('es')) return 'es';
  if (s.startsWith('fr')) return 'fr';
  if (s.startsWith('de')) return 'de';
  if (s.startsWith('pt')) return 'pt';
  return 'en';
}

function jsonOrNull(v) {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

export default function ChangeConsolePage() {
  const [accessToken, setAccessToken] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [locale, setLocale] = useState('en');
  const [draft, setDraft] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [brief, setBrief] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastAssistant, setLastAssistant] = useState('');

  useEffect(() => {
    try {
      const l = normalizeLocale(navigator.language);
      setLocale(l);
    } catch {
      setLocale('en');
    }
    try {
      const t = localStorage.getItem('corpflow_change_access_token') || '';
      if (t) setAccessToken(t);
    } catch {}
    try {
      const tid = localStorage.getItem('corpflow_change_ticket_id') || '';
      if (tid) setTicketId(tid);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('corpflow_change_access_token', accessToken || '');
    } catch {}
  }, [accessToken]);

  useEffect(() => {
    try {
      if (ticketId) localStorage.setItem('corpflow_change_ticket_id', ticketId);
      else localStorage.removeItem('corpflow_change_ticket_id');
    } catch {}
  }, [ticketId]);

  const headers = useMemo(() => {
    const h = { 'Content-Type': 'application/json' };
    if (accessToken) {
      // Same token is acceptable for either lane:
      // - factory master uses x-session-token
      // - tenant sovereign uses Authorization: Bearer
      h['x-session-token'] = accessToken;
      h['Authorization'] = `Bearer ${accessToken}`;
    }
    return h;
  }, [accessToken]);

  async function createTicket() {
    setError('');
    setLastAssistant('');
    if (!draft.trim()) {
      setError('Please describe the change you want.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/cmp/router?action=ticket-create', {
        method: 'POST',
        headers,
        body: JSON.stringify({ description: draft.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'ticket-create failed');
      const tid = String(j.ticket_id || '').trim();
      if (!tid) throw new Error('Missing ticket_id from server');
      setTicketId(tid);
      setMessages([{ role: 'user', content: draft.trim() }]);
      setChatInput('');
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function sendChat() {
    setError('');
    setLastAssistant('');
    if (!ticketId) {
      setError('Create or paste a Ticket ID first.');
      return;
    }
    const msg = chatInput.trim();
    if (!msg) return;
    setBusy(true);
    try {
      const r = await fetch('/api/cmp/router?action=change-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ticket_id: ticketId,
          message: msg,
          locale,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'change-chat failed');
      const assistant = String(j.assistant || '').trim();
      setLastAssistant(assistant);
      setBrief(j.brief || null);
      setMessages((prev) => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: assistant }]);
      setChatInput('');
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function costingPreview() {
    setError('');
    if (!ticketId) {
      setError('Create or paste a Ticket ID first.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/cmp/router?action=costing-preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          description: draft.trim() || (messages[0]?.content || ''),
          ticketId,
          is_demo: false,
          tier: 'standard',
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'costing-preview failed');
      setBrief((prev) => ({ ...(prev || {}), costing_preview: j }));
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function approveBuild() {
    setError('');
    if (!ticketId) {
      setError('Create or paste a Ticket ID first.');
      return;
    }
    setBusy(true);
    try {
      const description = draft.trim() || (messages[0]?.content || '');
      const r = await fetch('/api/cmp/router?action=approve-build', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ticket_id: ticketId,
          tier: 'standard',
          is_demo: false,
          description,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'approve-build failed');
      setBrief((prev) => ({ ...(prev || {}), approve_build: j }));
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function clearSession() {
    setTicketId('');
    setDraft('');
    setChatInput('');
    setMessages([]);
    setBrief(null);
    setError('');
    setLastAssistant('');
    try {
      localStorage.removeItem('corpflow_change_ticket_id');
    } catch {}
  }

  return (
    <div style={{ fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif', padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 6px' }}>CorpFlow Change Console</h1>
      <p style={{ marginTop: 0, color: '#475569' }}>
        Start a change request, refine it via chat, then approve build automation. Clients never see n8n; the Factory orchestrates it.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: '#334155' }}>
              Locale
              <select value={locale} onChange={(e) => setLocale(e.target.value)} style={{ marginLeft: 8 }}>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="pt">Português</option>
              </select>
            </label>
            <label style={{ fontSize: 12, color: '#334155', flex: 1, minWidth: 260 }}>
              Access token (admin or sovereign session)
              <input
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Optional now; required if Dormant Gate is enabled"
                style={{ width: '100%', marginTop: 6, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
            </label>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>Describe the change</div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Describe what you want changed in plain language…"
              style={{ width: '100%', minHeight: 120, padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <button disabled={busy} onClick={createTicket} style={{ padding: '10px 14px', borderRadius: 10 }}>
                {busy ? 'Working…' : 'Create ticket'}
              </button>
              <button disabled={busy || !ticketId} onClick={costingPreview} style={{ padding: '10px 14px', borderRadius: 10 }}>
                Estimate (costing-preview)
              </button>
              <button disabled={busy || !ticketId} onClick={approveBuild} style={{ padding: '10px 14px', borderRadius: 10 }}>
                Approve build
              </button>
              <button disabled={busy} onClick={clearSession} style={{ padding: '10px 14px', borderRadius: 10 }}>
                Reset
              </button>
            </div>
          </div>

          <hr style={{ margin: '18px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

          <div>
            <div style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>Chat refine</div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, minHeight: 180, background: '#fafafa' }}>
              {messages.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 13 }}>No messages yet.</div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{m.role}</div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{m.content}</div>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message…"
                style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
              />
              <button disabled={busy} onClick={sendChat} style={{ padding: '10px 14px', borderRadius: 10 }}>
                Send
              </button>
            </div>
            {lastAssistant ? (
              <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: '1px solid #dcfce7', background: '#f0fdf4' }}>
                <div style={{ fontSize: 12, color: '#166534', marginBottom: 6 }}>Assistant</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{lastAssistant}</div>
              </div>
            ) : null}
          </div>

          {error ? (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b' }}>
              {error}
            </div>
          ) : null}
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>Ticket</div>
          <input
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            placeholder="Paste ticket_id"
            style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
          />
          <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
            Stored in your browser for convenience.
          </div>

          <hr style={{ margin: '18px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

          <div style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>Brief (live)</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#0b1220', color: '#e2e8f0', padding: 12, borderRadius: 12, overflow: 'auto', maxHeight: 420 }}>
            {brief ? JSON.stringify(brief, null, 2) : '{\n  \"summary\": \"(waiting)\"\n}'}
          </pre>

          <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
            Tip: create a Baserow text field named <code>console_json</code> (or set <code>BASEROW_CMP_CONSOLE_JSON_FIELD</code>) to persist this.
          </div>
        </div>
      </div>
    </div>
  );
}

