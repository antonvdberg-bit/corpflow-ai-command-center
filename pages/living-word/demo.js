/**
 * Living Word Mauritius — TEST DEMO hub with status panel.
 *
 * Route: /living-word/demo
 */

import Head from 'next/head';
import { useEffect, useState } from 'react';

import {
  API_STATUS,
  cardStyle,
  COLOURS,
  DemoPageShell,
  DEMO_LABEL,
} from '../../lib/living-word/demo-form-chain-page.js';

function verdictColour(v) {
  if (v === 'READY') return '#15803d';
  if (v === 'BLOCKED') return '#b91c1c';
  return '#b45309';
}

export default function LivingWordDemoHubPage() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(API_STATUS);
        const j = await r.json();
        if (!cancelled) setStatus(j);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load status');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const verdict = status?.demo_chain_verdict || 'PARTIAL';

  return (
    <>
      <Head>
        <title>{DEMO_LABEL} Demo hub</title>
        <meta name="robots" content="noindex,nofollow" />
        <script async src="/api/chat-widget/loader.js" data-flow="default" data-position="bottom-right" />
      </Head>
      <DemoPageShell title="Demo form chain">
        <div style={cardStyle()}>
          <h2 style={{ marginTop: 0, fontSize: 18, color: COLOURS.heading }}>Demo status</h2>
          <p style={{ margin: '8px 0' }}>
            Living Word demo chain:{' '}
            <strong style={{ color: verdictColour(verdict) }}>{verdict}</strong>
          </p>
          {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
          {status ? (
            <dl style={{ fontSize: 14, lineHeight: 1.7 }}>
              <dt>
                <strong>First form URL:</strong>
              </dt>
              <dd>
                <a href={status.routes?.form_1}>{status.routes?.form_1}</a>
              </dd>
              <dt>
                <strong>Second form URL behavior:</strong>
              </dt>
              <dd>{status.routes?.form_2_behavior}</dd>
              <dt>
                <strong>Email behavior:</strong>
              </dt>
              <dd>
                {status.email_behavior?.configured
                  ? 'Existing n8n transactional path configured'
                  : 'BLOCKED_PENDING_EXISTING_EMAIL_PATH — preview only'}
              </dd>
              <dt>
                <strong>Branding/logo present:</strong>
              </dt>
              <dd>{status.branding?.logo_present ? 'Yes' : 'No'}</dd>
              <dt>
                <strong>Fields complete:</strong>
              </dt>
              <dd>
                Form 1: {status.fields?.form_1_complete ? 'yes' : 'no'}; Form 2:{' '}
                {status.fields?.form_2_complete ? 'yes' : 'no'}
              </dd>
              <dt>
                <strong>Chatbot visible:</strong>
              </dt>
              <dd>Yes (bottom-right on this page)</dd>
              <dt>
                <strong>WhatsApp:</strong>
              </dt>
              <dd>Excluded for this TEST DEMO</dd>
              {status.need_anton_approval?.length ? (
                <>
                  <dt>
                    <strong>Need Anton approval:</strong>
                  </dt>
                  <dd>{status.need_anton_approval.join('; ')}</dd>
                </>
              ) : null}
            </dl>
          ) : (
            <p style={{ color: COLOURS.muted }}>Loading status…</p>
          )}
        </div>

        <div style={{ ...cardStyle(), marginTop: 20 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Start the demo</h2>
          <ol style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>
              Open{' '}
              <a href="/site-preview" style={{ fontWeight: 600 }}>
                /site-preview
              </a>{' '}
              (Living Word sandbox site)
            </li>
            <li>Use the chatbot (bottom-right) for guided paths</li>
            <li>
              Open{' '}
              <a href="/living-word/form-1" style={{ fontWeight: 600 }}>
                Form 1
              </a>{' '}
              — use <code>test.alpha@example.test</code> or any <code>@example.test</code> email
            </li>
            <li>Submit Form 1 — receive TEST DEMO email with Form 2 link (or blocked preview)</li>
            <li>Open Form 2 from the email link and complete follow-up fields</li>
          </ol>
        </div>
      </DemoPageShell>
    </>
  );
}
