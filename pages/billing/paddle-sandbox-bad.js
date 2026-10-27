import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

import { createBadCorrelationId, validateBadCustomerIntake } from '../../lib/server/paddle-sandbox/bad-intake.js';
import { APPROVED_BAD_ZAR_SERVICES } from '../../lib/server/paddle-sandbox/bad-zar-catalog.js';
import { configuredBadCheckoutServices } from '../../lib/server/paddle-sandbox/bad-checkout-static-prices.js';

export default function PaddleSandboxBadPage() {
  const [paddle, setPaddle] = useState(null);
  const [state, setState] = useState('ready');
  const [error, setError] = useState('');
  const [checkoutIntentId, setCheckoutIntentId] = useState('');
  const [confirmationRef, setConfirmationRef] = useState('');
  const [form, setForm] = useState({
    item_code: APPROVED_BAD_ZAR_SERVICES[0].item_code,
    legal_business_name: '',
    contact_name: '',
    business_email: '',
    country: 'ZA',
    correlation_id: createBadCorrelationId(),
  });

  const services = useMemo(() => configuredBadCheckoutServices(), []);
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

  useEffect(() => {
    if (state !== 'success_processing' || !checkoutIntentId) return undefined;
    let cancelled = false;
    let attempts = 0;
    async function poll() {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/paddle/bad/order-confirmation?checkout_intent_id=${encodeURIComponent(checkoutIntentId)}`,
          { credentials: 'include' },
        );
        const body = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (response.ok && body.ok) {
          setConfirmationRef(body.confirmation_ref || '');
          setState('confirmed');
          return;
        }
        if (response.status === 401) {
          setError('Sign in to retrieve your confirmation.');
          setState('failed');
          return;
        }
      } catch {
        // Keep polling until the verified webhook issues the confirmation.
      }
      if (!cancelled && attempts < 12) setTimeout(poll, 1500);
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [state, checkoutIntentId]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function openCheckout(event) {
    event.preventDefault();
    const intake = validateBadCustomerIntake(form);
    if (!intake.ok) {
      setError(`Invalid business details: ${intake.errors.join(', ')}`);
      return;
    }
    if (!paddle) {
      setError('Sandbox checkout is not ready.');
      return;
    }
    setError('');
    setConfirmationRef('');
    setState('processing');
    try {
      const response = await fetch('/api/paddle/bad/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(intake.value),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setState('failed');
        setError('Sign in as the purchasing customer before starting checkout.');
        return;
      }
      if (response.status === 404 && body.error === 'feature_disabled') {
        setState('failed');
        setError('Authenticated buyer ownership is not enabled in this runtime.');
        return;
      }
      if (!response.ok || !body.paddle_transaction_id) {
        setState('failed');
        setError(body.error || 'Authenticated checkout could not be created.');
        return;
      }
      setCheckoutIntentId(body.checkout_intent_id);
      paddle.Checkout.open({
        transactionId: body.paddle_transaction_id,
        settings: { variant: 'one-page' },
      });
    } catch {
      setState('failed');
      setError('Authenticated checkout could not be created.');
    }
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
          You must be signed in. Checkout is created on the server against your account. Browser success does not issue
          a confirmation. Only a verified Paddle webhook can mark the purchase paid.
        </p>
        {error && <p role="alert">{error}</p>}
        <p aria-live="polite">Status: {state}</p>
        {confirmationRef && <p>Confirmation: {confirmationRef}</p>}
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
          <button type="submit" disabled={!paddle || state === 'unavailable' || state === 'processing'}>
            Start authenticated ZAR sandbox checkout
          </button>
        </form>
        <p style={{ marginTop: 24 }}>
          Price IDs remain server-mapped. This page no longer opens an anonymous Paddle overlay. Production ERPNext
          writes stay disabled unless separately authorised.
        </p>
      </main>
    </>
  );
}
