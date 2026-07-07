/**
 * Living Word Mauritius — TEST DEMO Form 2 (profile follow-up via email link).
 *
 * Route: /living-word/form-2?token=
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import {
  API_FORM2,
  API_FORM2_SESSION,
  buttonStyle,
  cardStyle,
  DemoPageShell,
  DEMO_LABEL,
  fieldStyle,
  labelStyle,
} from '../../lib/living-word/demo-form-chain-page.js';

const COMM_PREFS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone call' },
];

export default function LivingWordForm2Page() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    email_confirm: '',
    address_line_1: '',
    city: '',
    preferred_communication: 'email',
    interested_in_serving: false,
    ready_to_serve: false,
    consent_acknowledged: false,
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setTokenError('Missing token — open Form 2 from the TEST DEMO email link.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_FORM2_SESSION}&token=${encodeURIComponent(token)}`);
        const j = await r.json();
        if (!cancelled) {
          if (!r.ok || !j.ok) {
            setTokenError(j.error || 'Invalid or expired link');
          } else {
            setForm((prev) => ({
              ...prev,
              email_confirm: j.prefill?.email_confirm || '',
              ready_to_serve: Boolean(j.prefill?.ready_to_serve),
            }));
          }
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setTokenError(e instanceof Error ? e.message : 'Failed to load session');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, token]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const r = await fetch(API_FORM2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, token }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setError(j.error || 'Submit failed');
        return;
      }
      setResult(j);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>{DEMO_LABEL} Form 2</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <DemoPageShell title="Form 2 — Profile follow-up">
        {loading ? (
          <p>Loading your TEST DEMO session…</p>
        ) : tokenError ? (
          <div style={cardStyle()}>
            <p style={{ color: '#b91c1c', margin: 0 }}>{tokenError}</p>
            <p style={{ marginTop: 16 }}>
              <a href="/living-word/form-1">Start at Form 1</a>
            </p>
          </div>
        ) : result ? (
          <div style={cardStyle()}>
            <h2 style={{ marginTop: 0 }}>Thank you — TEST DEMO complete</h2>
            <p>Your submission is held for operator review only. No canonical member write occurred.</p>
            <pre
              style={{ fontSize: 12, background: '#f4f4f4', padding: 12, overflow: 'auto' }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ) : (
          <div style={cardStyle()}>
            <form onSubmit={onSubmit}>
              <label style={labelStyle()}>
                Confirm email
                <input
                  style={fieldStyle()}
                  type="email"
                  required
                  readOnly
                  value={form.email_confirm}
                />
              </label>
              <label style={labelStyle()}>
                Address line
                <input
                  style={fieldStyle()}
                  required
                  value={form.address_line_1}
                  onChange={(e) => updateField('address_line_1', e.target.value)}
                />
              </label>
              <label style={labelStyle()}>
                City
                <input
                  style={fieldStyle()}
                  required
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                />
              </label>
              <label style={labelStyle()}>
                Communications preference
                <select
                  style={fieldStyle()}
                  required
                  value={form.preferred_communication}
                  onChange={(e) => updateField('preferred_communication', e.target.value)}
                >
                  {COMM_PREFS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ ...labelStyle(), display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.interested_in_serving}
                  onChange={(e) => updateField('interested_in_serving', e.target.checked)}
                />
                Interested in serving on a team
              </label>
              <label style={{ ...labelStyle(), display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.ready_to_serve}
                  onChange={(e) => updateField('ready_to_serve', e.target.checked)}
                />
                I am ready to serve
              </label>
              <label
                style={{
                  ...labelStyle(),
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginTop: 16,
                }}
              >
                <input
                  type="checkbox"
                  required
                  checked={form.consent_acknowledged}
                  onChange={(e) => updateField('consent_acknowledged', e.target.checked)}
                />
                <span>
                  I confirm this TEST DEMO submission may be reviewed by operators. No real member
                  record is updated automatically.
                </span>
              </label>
              {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
              <button type="submit" style={buttonStyle(busy)} disabled={busy}>
                {busy ? 'Submitting…' : 'Submit Form 2'}
              </button>
            </form>
          </div>
        )}
      </DemoPageShell>
    </>
  );
}
