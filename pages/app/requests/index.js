/**
 * #778 Slice 1 — Tenant Requests & Progress list.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppShell from '../../../components/app/AppShell.js';
import TenantRequestPanel from '../../../components/app/TenantRequestPanel.js';
import {
  getDemoChrome,
  getDemoRequest,
  demoReview,
  ensureDemoStore,
} from '../../../lib/app/client-demo.js';
import { SYNTHETIC_REQUEST_ID } from '../../../lib/app/synthetic-store.js';

export default function AppTenantRequestsPage() {
  const router = useRouter();
  const demoMode = router.isReady && String(router.query.demo || '') === 'slice1';
  const [chrome, setChrome] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [request, setRequest] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const loadLive = useCallback(async () => {
    setError('');
    const ctx = await fetch('/api/app/context?scope=tenant&tenant_id=corpflowai', {
      credentials: 'include',
    });
    const ctxJ = await ctx.json().catch(() => ({}));
    if (ctx.status === 401) {
      setAuthRequired(true);
      return;
    }
    if (!ctx.ok) {
      setError(String(ctxJ.error || 'Unable to load context'));
      return;
    }
    if (ctxJ.chrome?.selected_allowed === false || ctxJ.chrome?.can_access_tenant_corpflowai === false) {
      setError('Tenant — CorpFlowAI scope denied for this session');
      setChrome({ ...(ctxJ.chrome || {}), synthetic_request_id: ctxJ.synthetic_request_id });
      return;
    }
    setChrome({ ...(ctxJ.chrome || {}), synthetic_request_id: ctxJ.synthetic_request_id });
    const r = await fetch(
      `/api/app/request?id=${encodeURIComponent(SYNTHETIC_REQUEST_ID)}&scope=tenant`,
      { credentials: 'include' },
    );
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(String(j.error || 'Unable to load request'));
      return;
    }
    setRequest(j.request || null);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (demoMode) {
      ensureDemoStore();
      setChrome(getDemoChrome('tenant'));
      setRequest(getDemoRequest('tenant'));
      setAuthRequired(false);
      return;
    }
    loadLive();
  }, [router.isReady, demoMode, loadLive]);

  async function onReview({ component_key, decision, comment }) {
    setBusy(true);
    setError('');
    try {
      if (demoMode) {
        const result = demoReview({ component_key, decision, comment });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setRequest(getDemoRequest('tenant'));
        return;
      }
      const r = await fetch('/api/app/review', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: SYNTHETIC_REQUEST_ID,
          component_key,
          decision,
          comment,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(String(j.error || 'Review failed'));
        return;
      }
      setRequest(j.request || null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      chrome={chrome || { selected_scope: 'tenant', role: '…', selected_tenant_label: 'CorpFlowAI' }}
      title="Requests & Progress"
      subtitle="Client-safe view for Tenant — CorpFlowAI. No GitHub, CI, or agent detail."
    >
      {demoMode ? (
        <p data-cf-app-demo-banner="true" style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, opacity: 0.85 }}>
          Demo mode — synthetic request only.
        </p>
      ) : null}
      {authRequired ? (
        <p style={{ fontFamily: '"DM Sans", sans-serif' }}>
          <a href="/login" style={{ color: '#f3cd8a' }}>
            Sign in
          </a>{' '}
          or open{' '}
          <Link href="/app/requests?demo=slice1" style={{ color: '#f3cd8a' }}>
            demo
          </Link>
          .
        </p>
      ) : null}
      {request ? (
        <TenantRequestPanel request={request} onReview={onReview} busy={busy} error={error} />
      ) : error ? (
        <p role="alert" style={{ color: '#fecaca', fontFamily: '"DM Sans", sans-serif' }}>
          {error}
        </p>
      ) : !authRequired ? (
        <p style={{ fontFamily: '"DM Sans", sans-serif' }}>Loading…</p>
      ) : null}
    </AppShell>
  );
}
