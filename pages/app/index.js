/**
 * #778 Slice 1 — scope entry: Core vs Tenant — CorpFlowAI.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppShell from '../../components/app/AppShell.js';
import { getDemoChrome, demoAccessChecks, resetDemoStore } from '../../lib/app/client-demo.js';
import { SYNTHETIC_REQUEST_ID } from '../../lib/app/synthetic-store.js';

export default function AppScopePage() {
  const router = useRouter();
  const demoMode = router.isReady && String(router.query.demo || '') === 'slice1';
  const [chrome, setChrome] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [mode, setMode] = useState(/** @type {'live'|'demo'|'loading'} */ ('loading'));

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;

    async function load() {
      setError('');
      if (demoMode) {
        resetDemoStore();
        if (!cancelled) {
          setChrome(getDemoChrome('core'));
          setMode('demo');
          setAuthRequired(false);
        }
        return;
      }
      try {
        const r = await fetch('/api/app/context?scope=core', { credentials: 'include' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.status === 401) {
          setAuthRequired(true);
          setChrome(null);
          setMode('live');
          return;
        }
        if (!r.ok) {
          setError(String(j.error || 'Unable to load app context'));
          setMode('live');
          return;
        }
        setChrome({ ...(j.chrome || {}), synthetic_request_id: j.synthetic_request_id || SYNTHETIC_REQUEST_ID });
        setMode('live');
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unable to load app context');
          setMode('live');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, demoMode]);

  const checks = useMemo(() => (demoMode ? demoAccessChecks() : null), [demoMode]);
  const options = Array.isArray(chrome?.scope_options) ? chrome.scope_options : [];

  return (
    <AppShell
      chrome={chrome || { selected_scope: 'core', role: authRequired ? 'anonymous' : '…', selected_tenant_label: '—' }}
      title="Choose your scope"
      subtitle="One application · Core for operators · Tenant — CorpFlowAI as the reference tenant."
    >
      {mode === 'demo' ? (
        <p
          data-cf-app-demo-banner="true"
          style={{
            margin: '0 0 14px',
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(45,212,191,0.35)',
            background: 'rgba(45,212,191,0.1)',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 13,
          }}
        >
          Slice 1 demo mode (`?demo=slice1`) — synthetic data only; no external send; same access rules as live APIs.
        </p>
      ) : null}

      {authRequired ? (
        <p style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 14 }}>
          Sign in to enter the application.{' '}
          <a href="/login" style={{ color: '#2dd4bf' }}>
            Go to login
          </a>
          . For preview evidence use{' '}
          <Link href="/app?demo=slice1" style={{ color: '#2dd4bf' }}>
            /app?demo=slice1
          </Link>
          .
        </p>
      ) : null}

      {error ? (
        <p role="alert" style={{ color: '#fecaca', fontFamily: '"DM Sans", sans-serif' }}>
          {error}
        </p>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
        }}
      >
        {options.map((opt) => {
          const allowed = opt.allowed === true;
          const isCore = opt.scope === 'core';
          const href = isCore
            ? demoMode
              ? `/app/core/requests/${SYNTHETIC_REQUEST_ID}?demo=slice1`
              : `/app/core/requests/${SYNTHETIC_REQUEST_ID}`
            : demoMode
              ? '/app/requests?demo=slice1'
              : '/app/requests';
          return (
            <div
              key={`${opt.scope}-${opt.tenant_id || 'none'}`}
              data-cf-app-scope-option={String(opt.scope)}
              data-cf-app-scope-allowed={allowed ? 'true' : 'false'}
              style={{
                padding: 18,
                borderRadius: 16,
                border: isCore ? '1px solid rgba(45,212,191,0.4)' : '1px solid rgba(243,205,138,0.4)',
                background: isCore ? 'rgba(8,16,28,0.65)' : 'rgba(28,18,10,0.65)',
                opacity: allowed ? 1 : 0.45,
              }}
            >
              <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>{String(opt.label)}</h2>
              <p style={{ margin: '0 0 14px', fontFamily: '"DM Sans", sans-serif', fontSize: 13, opacity: 0.85 }}>
                {isCore
                  ? 'Internal product, delivery, exposure controls, and evidence.'
                  : 'Client-safe Requests & Progress for the CorpFlowAI reference tenant.'}
              </p>
              {allowed ? (
                <Link
                  href={href}
                  style={{
                    display: 'inline-block',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: isCore
                      ? 'linear-gradient(135deg, #2dd4bf, #14b8a6)'
                      : 'linear-gradient(135deg, #f3cd8a, #d79a4a)',
                    color: isCore ? '#031018' : '#2a1a08',
                    fontWeight: 700,
                    fontFamily: '"DM Sans", sans-serif',
                    textDecoration: 'none',
                  }}
                >
                  Enter {String(opt.label)}
                </Link>
              ) : (
                <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13 }}>Not authorised</span>
              )}
            </div>
          );
        })}
      </div>

      {checks ? (
        <pre
          data-cf-app-access-checks="true"
          style={{
            marginTop: 18,
            padding: 12,
            borderRadius: 12,
            background: 'rgba(0,0,0,0.3)',
            fontSize: 11,
            overflow: 'auto',
          }}
        >
          {JSON.stringify(checks, null, 2)}
        </pre>
      ) : null}
    </AppShell>
  );
}
