import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/app/AppShell.js';
import TenantMenu from '../../components/app/TenantMenu.js';
import TenantRequestsProgress from '../../components/app/TenantRequestsProgress.js';
import { REFERENCE_TENANT_ID, SYNTHETIC_REQUEST_ID } from '../../lib/app/constants.js';

/**
 * @param {import('next/router').NextRouter['query']} query
 */
function proofFromQuery(query) {
  const raw = query?.proof;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s === '1';
}

/**
 * Tenant — CorpFlowAI environment entry.
 * Requires normal tenant session (or Tenant proof actor). No Core exposure.
 */
export default function AppTenantPage() {
  const router = useRouter();
  const [shell, setShell] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [request, setRequest] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const proofWanted = router.isReady && proofFromQuery(router.query);

  const apiBase = useMemo(() => {
    const params = new URLSearchParams();
    params.set('env', 'tenant');
    params.set('scope', 'tenant');
    params.set('tenant_id', REFERENCE_TENANT_ID);
    if (proofWanted) params.set('proof', '1');
    return params.toString();
  }, [proofWanted]);

  const loadAll = useCallback(async () => {
    setBusy(true);
    setError('');
    setNotice('');
    setAuthRequired(false);
    setAccessDenied(false);
    try {
      const shellRes = await fetch(`/api/app/shell?${apiBase}`, { credentials: 'same-origin' });
      const shellJson = await shellRes.json().catch(() => ({}));
      if (shellRes.status === 401) {
        setAuthRequired(true);
        setShell(null);
        setRequest(null);
        return;
      }
      if (shellRes.status === 403) {
        setAccessDenied(true);
        setError(String(shellJson.error || 'tenant_access_denied'));
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

      const detailQs = new URLSearchParams(apiBase);
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
  }, [apiBase]);

  useEffect(() => {
    if (!router.isReady) return;
    loadAll();
  }, [router.isReady, loadAll]);

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
          env: 'tenant',
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

  const actor = /** @type {Record<string, unknown>} */ (shell?.actor || {});
  const selected = /** @type {Record<string, unknown>} */ (shell?.selected || {});
  const proofMode = shell?.proof_mode === true;

  if (authRequired) {
    return (
      <AppShell environment="tenant" tenantLabel="CorpFlowAI" role="—">
        <section className="cf-app-panel" data-testid="app-auth-required">
          <h1 className="cf-app-h1">Sign in to Tenant — CorpFlowAI</h1>
          <p className="cf-app-lead">
            CorpFlowAI is a normal reference tenant. Use the existing tenant authentication protocol
            (email/password or PIN) — not Core / admin credentials.
          </p>
          <div className="cf-app-actions">
            <a
              className="cf-app-btn"
              data-primary="true"
              href={`/login?next=${encodeURIComponent('/app/tenant')}`}
            >
              Tenant sign in
            </a>
            <a className="cf-app-btn" href="/app/tenant?proof=1">
              Open Tenant proof
            </a>
            <a className="cf-app-btn" href="/app">
              Back to chooser
            </a>
          </div>
        </section>
      </AppShell>
    );
  }

  if (accessDenied) {
    return (
      <AppShell environment="tenant" tenantLabel="CorpFlowAI" role="—">
        <section className="cf-app-panel" data-testid="app-tenant-denied">
          <h1 className="cf-app-h1">Tenant access denied</h1>
          <p className="cf-app-lead">
            A Core session cannot enter Tenant. Sign out and sign in with CorpFlowAI tenant credentials,
            or open Core instead.
          </p>
          <p className="cf-app-error">{error}</p>
          <div className="cf-app-actions">
            <a className="cf-app-btn" data-primary="true" href="/app/core">
              Open Core
            </a>
            <a className="cf-app-btn" href={`/login?next=${encodeURIComponent('/app/tenant')}`}>
              Tenant sign in
            </a>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      environment="tenant"
      tenantLabel="CorpFlowAI"
      role={String(selected.role || actor.role || '—')}
      username={actor.username != null ? String(actor.username) : null}
      proofMode={proofMode}
    >
      <TenantMenu active="requests_progress" disabled={busy} />

      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Tenant environment · normal tenant auth · no Core menu · no internal evidence
      </p>

      {error ? <p className="cf-app-error" data-testid="app-error">{error}</p> : null}
      {notice ? <p className="cf-app-ok" data-testid="app-notice">{notice}</p> : null}

      <TenantRequestsProgress request={request} busy={busy} onReview={onReview} />
    </AppShell>
  );
}
