import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/app/AppShell.js';
import ScopeSwitcher from '../../components/app/ScopeSwitcher.js';
import TenantRequestsProgress from '../../components/app/TenantRequestsProgress.js';
import CoreRequestWorkView from '../../components/app/CoreRequestWorkView.js';
import { REFERENCE_TENANT_ID, SYNTHETIC_REQUEST_ID } from '../../lib/app/constants.js';

const SCOPE_STORAGE_KEY = 'corpflow_app_slice1_scope';

/**
 * @param {import('next/router').NextRouter['query']} query
 * @returns {'core'|'tenant'|null}
 */
function scopeFromQuery(query) {
  const raw = query?.scope;
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s === 'tenant' || s === 'core') return s;
  return null;
}

/**
 * @param {import('next/router').NextRouter['query']} query
 */
function proofFromQuery(query) {
  const raw = query?.proof;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s === '1';
}

/**
 * Slice 1 entry: Core / Tenant — CorpFlowAI shell + Requests & Progress.
 * Uses synthetic data via /api/app/* . Proof mode (?proof=1) on Preview/local only.
 */
export default function AppSlice1Page() {
  const router = useRouter();
  const [scope, setScope] = useState(/** @type {'core'|'tenant'} */ ('core'));
  const [shell, setShell] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [request, setRequest] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const proofWanted = router.isReady && proofFromQuery(router.query);

  const apiSuffix = useMemo(() => {
    const params = new URLSearchParams();
    params.set('scope', scope);
    if (scope === 'tenant') params.set('tenant_id', REFERENCE_TENANT_ID);
    if (proofWanted) params.set('proof', '1');
    return params.toString();
  }, [scope, proofWanted]);

  const loadAll = useCallback(async () => {
    setBusy(true);
    setError('');
    setNotice('');
    setAuthRequired(false);
    try {
      const shellRes = await fetch(`/api/app/shell?${apiSuffix}`, { credentials: 'same-origin' });
      const shellJson = await shellRes.json().catch(() => ({}));
      if (shellRes.status === 401) {
        setAuthRequired(true);
        setShell(null);
        setRequest(null);
        return;
      }
      if (!shellRes.ok || !shellJson.ok) {
        setError(String(shellJson.error || `shell_${shellRes.status}`));
        setShell(null);
        setRequest(null);
        return;
      }
      setShell(shellJson);

      const available = Array.isArray(shellJson.available_scopes) ? shellJson.available_scopes : [];
      const canSelected = available.some((s) => s.scope === scope);
      if (!canSelected && available[0]) {
        const next = available[0].scope === 'tenant' ? 'tenant' : 'core';
        setScope(next);
        return;
      }

      const detailQs = new URLSearchParams(apiSuffix);
      detailQs.set('id', SYNTHETIC_REQUEST_ID);
      const detailRes = await fetch(`/api/app/request?${detailQs.toString()}`, {
        credentials: 'same-origin',
      });
      const detailJson = await detailRes.json().catch(() => ({}));
      if (!detailRes.ok || !detailJson.ok) {
        setError(String(detailJson.error || `request_${detailRes.status}`));
        setRequest(null);
        return;
      }
      setRequest(detailJson.request || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
    } finally {
      setBusy(false);
    }
  }, [apiSuffix, scope]);

  useEffect(() => {
    if (!router.isReady) return;
    const fromQuery = scopeFromQuery(router.query);
    if (fromQuery) {
      setScope(fromQuery);
      return;
    }
    try {
      const stored = localStorage.getItem(SCOPE_STORAGE_KEY);
      if (stored === 'tenant' || stored === 'core') setScope(stored);
    } catch {
      /* ignore */
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    try {
      localStorage.setItem(SCOPE_STORAGE_KEY, scope);
    } catch {
      /* ignore */
    }
  }, [scope]);

  useEffect(() => {
    if (!router.isReady) return;
    loadAll();
  }, [router.isReady, loadAll]);

  function selectScope(next) {
    setScope(next);
    const q = { ...router.query, scope: next };
    if (proofWanted) q.proof = '1';
    router.replace({ pathname: '/app', query: q }, undefined, { shallow: true });
  }

  async function onReview(args) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      /** @type {Record<string, string>} */
      const headers = { 'Content-Type': 'application/json' };
      if (proofWanted) headers['x-corpflow-app-proof'] = '1';
      const res = await fetch('/api/app/component-review', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({
          request_id: SYNTHETIC_REQUEST_ID,
          component_key: args.component_key,
          decision: args.decision,
          comment: args.comment,
          scope: 'tenant',
          tenant_id: REFERENCE_TENANT_ID,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(String(json.error || `review_${res.status}`));
      }
      setRequest(json.request || null);
      setNotice(`Review recorded: ${args.decision} (no external send).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'review_failed');
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function onExpose({ component_key, exposed }) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      /** @type {Record<string, string>} */
      const headers = { 'Content-Type': 'application/json' };
      if (proofWanted) headers['x-corpflow-app-proof'] = '1';
      const res = await fetch('/api/app/component-expose', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({
          request_id: SYNTHETIC_REQUEST_ID,
          component_key,
          exposed,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(String(json.error || `expose_${res.status}`));
      }
      setRequest(json.request || null);
      setNotice(exposed ? 'Component exposed for client review.' : 'Component hidden from client review.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'expose_failed');
    } finally {
      setBusy(false);
    }
  }

  const selected = /** @type {Record<string, unknown>} */ (shell?.selected || {});
  const actor = /** @type {Record<string, unknown>} */ (shell?.actor || {});
  const available = Array.isArray(shell?.available_scopes) ? shell.available_scopes : [];
  const proofMode = shell?.proof_mode === true;

  if (authRequired) {
    return (
      <AppShell scope={scope} role="—" tenantLabel={scope === 'tenant' ? 'CorpFlowAI' : null}>
        <section className="cf-app-panel" data-testid="app-auth-required">
          <h1 className="cf-app-h1">Sign in to open the app shell</h1>
          <p className="cf-app-lead">
            Slice 1 uses the existing CorpFlowAI auth foundation. Sign in, then return here — or open
            Preview proof mode with <code>?proof=1</code> (Preview / local only).
          </p>
          <div className="cf-app-actions">
            <a className="cf-app-btn" data-primary="true" href={`/login?next=${encodeURIComponent('/app')}`}>
              Sign in
            </a>
            <a className="cf-app-btn" href="/app?proof=1&scope=tenant">
              Open proof · Tenant
            </a>
            <a className="cf-app-btn" href="/app?proof=1&scope=core">
              Open proof · Core
            </a>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      scope={scope}
      tenantLabel={scope === 'tenant' ? 'CorpFlowAI' : null}
      role={String(selected.role || actor.role || '—')}
      username={actor.username != null ? String(actor.username) : null}
      proofMode={proofMode}
    >
      <ScopeSwitcher available={available} selected={scope} onSelect={selectScope} disabled={busy} />

      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Slice 1 · synthetic Requests &amp; Progress · <code>/change</code> unchanged · no external send
      </p>

      {error ? <p className="cf-app-error" data-testid="app-error">{error}</p> : null}
      {notice ? <p className="cf-app-ok" data-testid="app-notice">{notice}</p> : null}

      {scope === 'tenant' ? (
        <TenantRequestsProgress request={request} busy={busy} onReview={onReview} />
      ) : (
        <CoreRequestWorkView request={request} busy={busy} onExpose={onExpose} />
      )}
    </AppShell>
  );
}
