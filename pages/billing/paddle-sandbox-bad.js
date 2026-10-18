import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

import { checkoutCustomData, createBadCorrelationId, validateBadCustomerIntake } from '../../lib/server/paddle-sandbox/bad-intake.js';
import { APPROVED_BAD_ZAR_SERVICES, isPaddleSandboxPriceId } from '../../lib/server/paddle-sandbox/bad-zar-catalog.js';

function priceIdFor(envKey) {
  const value = String(process.env[envKey] || '').trim();
  return isPaddleSandboxPriceId(value) ? value : '';
}

export default function PaddleSandboxBadPage() {
  const [paddle, setPaddle] = useState(null);
  const [state, setState] = useState('ready');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    item_code: APPROVED_BAD_ZAR_SERVICES[0].item_code,
    legal_business_name: '',
    contact_name: '',
    business_email: '',
    country: 'ZA',
    correlation_id: createBadCorrelationId(),
  });

  const services = useMemo(
    () =>
      APPROVED_BAD_ZAR_SERVICES.map((row) => ({
        ...row,
        paddle_price_id: priceIdFor(row.env_key),
      })),
    [],
  );
  const selected = services.find((row) => row.item_code === form.item_code) || services[0];

  useEffect(() => {
    let cancelled = false;
    async function loadPaddle() {
      const { initializePaddle } = await import('@paddle/paddle-js');
      const environment = process.env.NEXT_PUBLIC_PADDLE_ENV;
      const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
      if (environment !== 'sandbox' || !token?.startsWith('test_')) {
        setState('unavailable');
        setError('Sandbox checkout is not configured.');
        return;
      }
      const instance = await initializePaddle({
        environment,
        token,
        eventCallback: (event) => {
          if (event?.name === 'checkout.completed') setState('success_processing');
          if (event?.name === 'checkout.payment-error' || event?.name === 'checkout.error') setState('failed');
          if (event?.name === 'checkout.closed') setState('abandoned');
        },
      });
      if (!cancelled && instance) setPaddle(instance);
    }
    loadPaddle().catch(() => {
      if (!cancelled) {
        setState('unavailable');
        setError('Sandbox checkout could not be initialized.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function openCheckout(event) {
    event.preventDefault();
    const intake = validateBadCustomerIntake(form);
    if (!intake.ok) {
      setError(`Invalid business details: ${intake.errors.join(', ')}`);
      return;
    }
    if (!paddle || !selected.paddle_price_id) {
      setError('This service has no configured Paddle sandbox price ID.');
      return;
    }
    const payload = checkoutCustomData(intake.value);
    setError('');
    setState('processing');
    paddle.Checkout.open({
      items: [{ priceId: selected.paddle_price_id, quantity: 1 }],
      customer: payload.customer,
      customData: payload.customData,
      settings: { variant: 'one-page' },
    });
  }

  return (
    <>
      <Head>
        <title>Business Admin Desk Paddle sandbox</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main style={{ maxWidth: 760, margin: '3rem auto', padding: '0 1.5rem', fontFamily: 'system-ui' }}>
        <p style={{ color: '#9a3412', fontWeight: 700 }}>TEST ENVIRONMENT — Paddle sandbox only. Not a live checkout.</p>
        <h1>Business Admin Desk sandbox purchase</h1>
        <p>
          Customer-facing amounts are ZAR. Browser checkout success does not release onboarding. Only a verified Paddle
          webhook can create the internal commercial record.
        </p>
        {error && <p role="alert">{error}</p>}
        <p aria-live="polite">Status: {state}</p>
        <form onSubmit={openCheckout} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
          <label>
            Service
            <select value={form.item_code} onChange={(e) => updateField('item_code', e.target.value)} required>
              {services.map((row) => (
                <option key={row.item_code} value={row.item_code}>
                  {row.item_name} — ZAR {row.zar_amount}
                  {row.paddle_price_id ? '' : ' (sandbox price unconfigured)'}
                </option>
              ))}
            </select>
          </label>
          <p>
            Selected: <strong>{selected.item_code}</strong> / ZAR {selected.zar_amount} / currency ZAR
          </p>
          <label>
            Legal business name
            <input value={form.legal_business_name} onChange={(e) => updateField('legal_business_name', e.target.value)} required />
          </label>
          <label>
            Contact name
            <input value={form.contact_name} onChange={(e) => updateField('contact_name', e.target.value)} required />
          </label>
          <label>
            Business email
            <input type="email" value={form.business_email} onChange={(e) => updateField('business_email', e.target.value)} required />
          </label>
          <label>
            Country (ISO)
            <input value={form.country} onChange={(e) => updateField('country', e.target.value.toUpperCase())} maxLength={2} required />
          </label>
          <p>Correlation: {form.correlation_id}</p>
          <button type="submit" disabled={!paddle || !selected.paddle_price_id || state === 'unavailable'}>
            Start ZAR sandbox checkout
          </button>
        </form>
        <p style={{ marginTop: 24 }}>
          Required sandbox env keys are listed when a service has no price ID. Do not invent Paddle IDs. Production ERPNext
          writes stay disabled.
        </p>
      </main>
    </>
  );
}
