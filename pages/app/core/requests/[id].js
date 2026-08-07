/**
 * #778 Slice 1 — Core request/work twin view + exposure controls.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppShell from '../../../../components/app/AppShell.js';
import CoreRequestPanel from '../../../../components/app/CoreRequestPanel.js';
import {
  getDemoChrome,
  getDemoRequest,
  demoExpose,
  ensureDemoStore,
} from '../../../../lib/app/client-demo.js';
import { projectCoreRequest } from '../../../../lib/app/projection.js';
import { SYNTHETIC_REQUEST_ID } from '../../../../lib/app/synthetic-store.js';

export default function AppCoreRequestPage() {
  const router = useRouter();
  const demoMode = router.isReady && String(router.query.demo || '') === 'slice1';
  const requestId = router.isReady
    ? String(Array.isArray(router.query.id) ? router.query.id[0] : router.query.id || SYNTHETIC_REQUEST_ID)
    : SYNTHETIC_REQUEST_ID;

  const [chrome, setChrome] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [request, setRequest] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const loadLive = useCallback(async () => {
    setError('');
    const ctx = await fetch('/api/app/context?scope=core', { credentials: 'include' });
    const ctxJ = await ctx.json().catch(() => ({}));
    if (ctx.status === 401) {
      setAuthRequired(true);
      return;
    }
    if (!ctx.ok) {
      setError(String(ctxJ.error || 'Unable to load context'));
      return;
    }
    if (ctxJ.chrome?.can_access_core === false) {
      setError('Core scope requires an admin session');
      setChrome({ ...(ctxJ.chrome || {}), synthetic_request_id: ctxJ.synthetic_request_id });
      return;
    }
    setChrome({ ...(ctxJ.chrome || {}), synthetic_request_id: ctxJ.synthetic_request_id });
    const r = await fetch(
      `/api/app/request?id=${encodeURIComponent(requestId)}&scope=core`,
      { credentials: 'include' },
    );
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(String(j.error || 'Unable to load request'));
      return;
    }
    setRequest(j.request || null);
  }, [requestId]);

  useEffect(() => {
    if (!router.isReady) return;
    if (demoMode) {
      ensureDemoStore();
      setChrome(getDemoChrome('core'));
      setRequest(getDemoRequest('core'));
      setAuthRequired(false);
      return;
    }
    loadLive();
  }, [router.isReady, demoMode, loadLive]);

  async function onExpose({ component_key, exposed }) {
    setBusy(true);
    setError('');
    try {
      if (demoMode) {
        const result = demoExpose(component_key, exposed);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setRequest(projectCoreRequest(result.request));
        return;
      }
      const r = await fetch('/api/app/expose', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          component_key,
          exposed,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(String(j.error || 'Expose update failed'));
        return;
      }
      setRequest(j.request || null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      chrome={chrome || { selected_scope: 'core', role: '…', selected_tenant_label: '—' }}
      title="Core request / work"
      subtitle="Same request identity as Tenant — CorpFlowAI, with internal evidence and exposure controls."
    >
      {demoMode ? (
        <p data-cf-app-demo-banner="true" style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, opacity: 0.85 }}>
          Demo mode — synthetic Core twin view.{' '}
          <Link href="/app/requests?demo=slice1" style={{ color: '#2dd4bf' }}>
            Open tenant projection
          </Link>
        </p>
      ) : null}
      {authRequired ? (
        <p style={{ fontFamily: '"DM Sans", sans-serif' }}>
          <a href="/login" style={{ color: '#2dd4bf' }}>
            Sign in as Core admin
          </a>{' '}
          or open{' '}
          <Link href={`/app/core/requests/${SYNTHETIC_REQUEST_ID}?demo=slice1`} style={{ color: '#2dd4bf' }}>
            demo
          </Link>
          .
        </p>
      ) : null}
      {request ? (
        <CoreRequestPanel request={request} onExpose={onExpose} busy={busy} error={error} />
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
