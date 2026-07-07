/**
 * Living Word Mauritius — TEST DEMO Form 1 (onboarding intake).
 *
 * Route: /living-word/form-1
 */

import Head from 'next/head';
import { useState } from 'react';

import { FORM1_MEMBER_TYPES } from '../../lib/living-word/demo-form-chain-fields.js';
import {
  API_FORM1,
  buttonStyle,
  cardStyle,
  DemoPageShell,
  DEMO_LABEL,
  fieldStyle,
  labelStyle,
} from '../../lib/living-word/demo-form-chain-page.js';

export default function LivingWordForm1Page() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: 'test.alpha@example.test',
    phone: '+23050000001',
    member_type: 'visitor',
    consent_demo: false,
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const r = await fetch(API_FORM1, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setError(j.error || j.detail || 'Submit failed');
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
        <title>{DEMO_LABEL} Form 1</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <DemoPageShell title="Form 1 — Getting started">
        <div style={cardStyle()}>
          <p style={{ marginTop: 0, fontSize: 14, color: '#555' }}>
            Use synthetic test data only (<code>@example.test</code> emails). No real member
            records are written.
          </p>
          <form onSubmit={onSubmit}>
            <label style={labelStyle()}>
              First name
              <input
                style={fieldStyle()}
                required
                value={form.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
              />
            </label>
            <label style={labelStyle()}>
              Last name
              <input
                style={fieldStyle()}
                required
                value={form.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
              />
            </label>
            <label style={labelStyle()}>
              Email (test/demo only)
              <input
                style={fieldStyle()}
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </label>
            <label style={labelStyle()}>
              Phone
              <input
                style={fieldStyle()}
                type="tel"
                required
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </label>
            <label style={labelStyle()}>
              Member type
              <select
                style={fieldStyle()}
                required
                value={form.member_type}
                onChange={(e) => updateField('member_type', e.target.value)}
              >
                {FORM1_MEMBER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
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
                checked={form.consent_demo}
                onChange={(e) => updateField('consent_demo', e.target.checked)}
              />
              <span>
                I understand this is a <strong>TEST DEMO</strong> flow. Synthetic data only; no
                public launch.
              </span>
            </label>
            {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
            <button type="submit" style={buttonStyle(busy)} disabled={busy}>
              {busy ? 'Submitting…' : 'Submit Form 1'}
            </button>
          </form>
        </div>

        {result ? (
          <div style={{ ...cardStyle(), marginTop: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Form 2 unlocked</h2>
            <p>
              Email status: <strong>{result.email?.status}</strong>
            </p>
            {result.form2_url ? (
              <p>
                Form 2 link:{' '}
                <a href={result.form2_path || result.form2_url}>{result.form2_url}</a>
              </p>
            ) : null}
            {result.email?.preview ? (
              <pre
                style={{
                  fontSize: 12,
                  background: '#f4f4f4',
                  padding: 12,
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(result.email.preview, null, 2)}
              </pre>
            ) : null}
            <p style={{ fontSize: 13, color: '#555' }}>
              WhatsApp can replace this email step later once approved and unblocked.
            </p>
          </div>
        ) : null}
      </DemoPageShell>
    </>
  );
}
