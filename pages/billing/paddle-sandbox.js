import Head from 'next/head';
import { useEffect, useState } from 'react';

export default function PaddleSandboxPage() {
  const [paddle, setPaddle] = useState(null);
  const [state, setState] = useState('ready');
  const [error, setError] = useState('');

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

  function openCheckout(priceId) {
    if (!paddle || !/^pri_[A-Za-z0-9]+$/.test(priceId || '')) return;
    setState('processing');
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      settings: { variant: 'one-page' },
    });
  }

  const platformPrice = process.env.NEXT_PUBLIC_PADDLE_PLATFORM_PRICE_ID;
  const implementationPrice = process.env.NEXT_PUBLIC_PADDLE_IMPLEMENTATION_PRICE_ID;

  return (
    <>
      <Head>
        <title>Paddle sandbox checkout</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'system-ui' }}>
        <p style={{ color: '#9a3412', fontWeight: 700 }}>TEST ENVIRONMENT — Paddle sandbox only</p>
        <h1>CorpFlowAI payment rail proof</h1>
        <p>Checkout completion is not activation. Only a verified Paddle webhook can make the isolated proof account eligible.</p>
        {error && <p role="alert">{error}</p>}
        <p aria-live="polite">Status: {state}</p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button disabled={!paddle || !platformPrice} onClick={() => openCheckout(platformPrice)}>
            Start monthly platform checkout
          </button>
          <button disabled={!paddle || !implementationPrice} onClick={() => openCheckout(implementationPrice)}>
            Start one-time implementation checkout
          </button>
        </div>
      </main>
    </>
  );
}
