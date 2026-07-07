/**
 * Living Word Mauritius — TEST DEMO Form 2 (profile follow-up via email link).
 *
 * Multi-step layout aligned with legacy GHL Profile Verification screens.
 * Route: /living-word/form-2?token=
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import {
  COMM_PREF_OPTIONS,
  COUNTRY_OPTIONS,
  emptyForm2State,
  FORM2_STEP_LABELS,
  GENDER_OPTIONS,
  TEAM_ACTIVE_FIELDS,
  TEST_DEMO_CONSENT_TEXT,
  TRANSACTIONAL_CONSENT_TEXT,
  YN_OPTIONS,
} from '../../lib/living-word/demo-form-chain-fields.js';
import {
  API_FORM2,
  API_FORM2_SESSION,
  buttonStyle,
  cardStyle,
  COLOURS,
  DemoPageShell,
  DEMO_LABEL,
  fieldStyle,
  labelStyle,
  stepNavStyle,
} from '../../lib/living-word/demo-form-chain-page.js';

const STEP_COUNT = FORM2_STEP_LABELS.length;

function StepFields({ step, form, updateField }) {
  if (step === 0) {
    return (
      <>
        <label style={labelStyle()}>
          Email *
          <input
            style={fieldStyle()}
            type="email"
            required
            readOnly
            value={form.email_confirm}
          />
        </label>
        <label style={labelStyle()}>
          Email 2
          <input
            style={fieldStyle()}
            type="email"
            placeholder="Any other email on which we can contact you"
            value={form.email_secondary}
            onChange={(e) => updateField('email_secondary', e.target.value)}
          />
        </label>
        <label style={labelStyle()}>
          City
          <input
            style={fieldStyle()}
            value={form.city}
            onChange={(e) => updateField('city', e.target.value)}
          />
        </label>
        <label style={labelStyle()}>
          Country
          <select
            style={fieldStyle()}
            value={form.country}
            onChange={(e) => updateField('country', e.target.value)}
          >
            {COUNTRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle()}>
          Emergency Contact Person Name
          <input
            style={fieldStyle()}
            placeholder="Please add ICE preferred name and surname"
            value={form.emergency_contact_name}
            onChange={(e) => updateField('emergency_contact_name', e.target.value)}
          />
        </label>
        <label style={labelStyle()}>
          Emergency Contact Phone Number
          <input
            style={fieldStyle()}
            type="tel"
            placeholder="Please add ICE Phone Number"
            value={form.emergency_contact_phone}
            onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
          />
        </label>
      </>
    );
  }

  if (step === 1) {
    return (
      <>
        <label style={labelStyle()}>
          Gender / Sex 1 *
          <select
            style={fieldStyle()}
            required
            value={form.gender}
            onChange={(e) => updateField('gender', e.target.value)}
          >
            <option value="">Please select</option>
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle()}>
          Preferred Communication *
          <select
            style={fieldStyle()}
            required
            value={form.preferred_communication}
            onChange={(e) => updateField('preferred_communication', e.target.value)}
          >
            <option value="">How would you like us to connect with you</option>
            {COMM_PREF_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle()}>
          Date Of Birth
          <input
            style={fieldStyle()}
            type="date"
            value={form.date_of_birth}
            onChange={(e) => updateField('date_of_birth', e.target.value)}
          />
        </label>
        <label style={labelStyle()}>
          WhatsApp Number *
          <input
            style={fieldStyle()}
            type="tel"
            required
            placeholder="Collected for demo only — no WhatsApp messages sent"
            value={form.whatsapp_number}
            onChange={(e) => updateField('whatsapp_number', e.target.value)}
          />
        </label>
        <label
          style={{
            ...labelStyle(),
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            marginTop: 8,
          }}
        >
          <input
            type="checkbox"
            checked={form.consent_transactional}
            onChange={(e) => updateField('consent_transactional', e.target.checked)}
          />
          <span style={{ fontWeight: 400, fontSize: 13 }}>{TRANSACTIONAL_CONSENT_TEXT}</span>
        </label>
        <label style={labelStyle()}>
          Phone 2
          <input
            style={fieldStyle()}
            type="tel"
            placeholder="Any other phone number on which we can call you"
            value={form.phone_secondary}
            onChange={(e) => updateField('phone_secondary', e.target.value)}
          />
        </label>
      </>
    );
  }

  const teams =
    step === 2 ? TEAM_ACTIVE_FIELDS.slice(0, 5) : TEAM_ACTIVE_FIELDS.slice(5);

  return (
    <>
      {teams.map((f) => (
        <label key={f.key} style={labelStyle()}>
          {f.label}
          <select
            style={fieldStyle()}
            value={form[f.key]}
            onChange={(e) => updateField(f.key, e.target.value)}
          >
            {YN_OPTIONS.map((o) => (
              <option key={o.value || 'empty'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {step === STEP_COUNT - 1 ? (
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
            checked={form.consent_acknowledged}
            onChange={(e) => updateField('consent_acknowledged', e.target.checked)}
          />
          <span style={{ fontWeight: 400, fontSize: 13 }}>{TEST_DEMO_CONSENT_TEXT}</span>
        </label>
      ) : null}
    </>
  );
}

function stepIsValid(step, form) {
  if (step === 0) return Boolean(form.email_confirm);
  if (step === 1) {
    return (
      Boolean(form.gender) &&
      Boolean(form.preferred_communication) &&
      Boolean(form.whatsapp_number) &&
      Boolean(form.consent_transactional)
    );
  }
  if (step === STEP_COUNT - 1) return Boolean(form.consent_acknowledged);
  return true;
}

export default function LivingWordForm2Page() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm2State);
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
              whatsapp_number: j.prefill?.whatsapp_number || j.prefill?.phone || '',
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

  function goNext() {
    if (!stepIsValid(step, form)) {
      setError('Please complete required fields on this step.');
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  }

  function goPrev() {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!stepIsValid(step, form)) {
      setError('Please complete required fields before submitting.');
      return;
    }
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
        setError(j.error || j.field || 'Submit failed');
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
          <div style={{ ...cardStyle(), padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 0' }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: COLOURS.muted }}>
                Step {step + 1} of {STEP_COUNT}: {FORM2_STEP_LABELS[step]}
              </p>
            </div>
            <form onSubmit={onSubmit} style={{ padding: '0 24px 24px' }}>
              <StepFields step={step} form={form} updateField={updateField} />
              {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
              <div style={stepNavStyle()}>
                <button type="button" onClick={goPrev} disabled={step === 0} style={stepButtonStyle(false)}>
                  ← PREV
                </button>
                {step < STEP_COUNT - 1 ? (
                  <button type="button" onClick={goNext} style={stepButtonStyle(true)}>
                    NEXT →
                  </button>
                ) : (
                  <button type="submit" style={stepButtonStyle(true)} disabled={busy}>
                    {busy ? 'Submitting…' : 'SUBMIT'}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </DemoPageShell>
    </>
  );
}

function stepButtonStyle(primary) {
  return {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    opacity: primary ? 1 : 0.85,
  };
}
