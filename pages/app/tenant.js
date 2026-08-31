import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/app/AppShell.js';
import AppLoadState from '../../components/app/AppLoadState.js';
import TenantMenu from '../../components/app/TenantMenu.js';
import TenantRequestsProgress from '../../components/app/TenantRequestsProgress.js';
import { CANONICAL_REQUEST_ID, REFERENCE_TENANT_ID } from '../../lib/app/constants.js';
import {
  isReturnFromChange,
  tenantChangeHandoffHref,
} from '../../lib/app/tenant-journey.js';
import {
  TENANT_PROGRESS_LIST_ERROR_BODY,
  TENANT_PROGRESS_LIST_ERROR_TITLE,
  TENANT_PROGRESS_LOADING_TITLE,
  tenantProgressPanelKind,
} from '../../lib/app/tenant-workspace.js';

/**
 * @param {import('next/router').NextRouter['query']} query
 */
function proofFromQuery(query) {
  const raw = query?.proof;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s === '1';
}

/**
 * Tenant — CorpFlowAI. Normal tenant session only. No Core exposure.
 * Slice 2: normal authenticated path is default; ?proof=1 remains harness-only.
 */
export default function AppTenantPage() {
  const router = useRouter();
  const [menu, setMenu] = useState('requests_progress');
  const [shell, setShell] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [list, setList] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [request, setRequest] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [requestId, setRequestId] = useState(CANONICAL_REQUEST_ID);
  const [boundTenantId, setBoundTenantId] = useState(REFERENCE_TENANT_ID);
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [listReady, setListReady] = useState(false);
  const [notice, setNotice] = useState('');

  const proofWanted = router.isReady && proofFromQuery(router.query);
  const returnedFromChange = router.isReady && isReturnFromChange(router.query);

  const apiBase = useMemo(() => {
    const params = new URLSearchParams();
    params.set('env', 'tenant');
    params.set('scope', 'tenant');
    params.set('tenant_id', boundTenantId || REFERENCE_TENANT_ID);
    if (proofWanted) params.set('proof', '1');
    return params.toString();
  }, [proofWanted, boundTenantId]);

  const loadShellAndList = useCallback(async () => {
    setBusy(true);
    setError('');
    setNotice('');
    setAuthRequired(false);
    setAccessDenied(false);
    setListReady(false);
    try {
      const shellQs = new URLSearchParams();
      shellQs.set('env', 'tenant');
      shellQs.set('scope', 'tenant');
      shellQs.set('tenant_id', REFERENCE_TENANT_ID);
      if (proofWanted) shellQs.set('proof', '1');

      const shellRes = await fetch(`/api/app/shell?${shellQs.toString()}`, {
        credentials: 'same-origin',
      });
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
      const selected = /** @type {Record<string, unknown>} */ (shellJson.selected || {});
      const tid =
        selected.tenant_id != null && String(selected.tenant_id).trim()
          ? String(selected.tenant_id).trim()
          : REFERENCE_TENANT_ID;
      setBoundTenantId(tid);

      const listQs = new URLSearchParams();
      listQs.set('env', 'tenant');
      listQs.set('scope', 'tenant');
      listQs.set('tenant_id', tid);
      if (proofWanted) listQs.set('proof', '1');

      const listRes = await fetch(`/api/app/requests?${listQs.toString()}`, {
        credentials: 'same-origin',
      });
      const listJson = await listRes.json().catch(() => ({}));
      if (!listRes.ok || !listJson.ok) {
        setError(String(listJson.error || `requests_${listRes.status}`));
        setList([]);
        setListReady(true);
        return;
      }
      const rows = Array.isArray(listJson.requests) ? listJson.requests : [];
      setList(rows);
      const qid = String(Array.isArray(router.query.id) ? router.query.id[0] : router.query.id || '').trim();
      setRequestId((prev) => {
        if (qid && rows.some((r) => String(r.request_id) === qid)) return qid;
        if (rows.some((r) => String(r.request_id) === prev)) return prev;
        return String(rows[0]?.request_id || CANONICAL_REQUEST_ID);
      });
      setListReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
      setListReady(true);
    } finally {
      setBusy(false);
      setInitialLoad(false);
    }
  }, [proofWanted, router.query.id]);

  const loadDetail = useCallback(async () => {
    if (menu !== 'requests_progress') {
      setRequest(null);
      return;
    }
    if (!listReady || !list.length) {
      setRequest(null);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const detailQs = new URLSearchParams(apiBase);
      detailQs.set('id', requestId);
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
  }, [apiBase, menu, requestId, listReady, list.length]);

  useEffect(() => {
    if (!router.isReady) return;
    loadShellAndList();
  }, [router.isReady, loadShellAndList]);

  useEffect(() => {
    if (!router.isReady || !shell) return;
    loadDetail();
  }, [router.isReady, shell, loadDetail]);

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
          request_id: requestId,
          component_key: args.component_key,
          decision: args.decision,
          comment: args.comment,
          env: 'tenant',
          scope: 'tenant',
          tenant_id: boundTenantId || REFERENCE_TENANT_ID,
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
  const tenantLabel =
    selected.tenant_label != null ? String(selected.tenant_label) : 'CorpFlowAI';
  const changeHref = tenantChangeHandoffHref({
    tenantId: boundTenantId || REFERENCE_TENANT_ID,
  });
  const progressPanelKind = tenantProgressPanelKind({
    listReady,
    requestCount: list.length,
    error,
    busy,
  });

  if (!router.isReady || (initialLoad && busy && !authRequired && !accessDenied && !shell)) {
    return (
      <AppShell environment="tenant" tenantLabel="CorpFlowAI" role="—">
        <AppLoadState kind="loading" title="Loading Tenant — CorpFlowAI…" />
      </AppShell>
    );
  }

  if (authRequired) {
    return (
      <AppShell environment="tenant" tenantLabel="CorpFlowAI" role="—">
        <section className="cf-app-panel" data-testid="app-auth-required">
          <h1 className="cf-app-h1">Sign in to Tenant Workspace</h1>
          <p className="cf-app-lead">
            Use your tenant sign-in to review requests and progress for CorpFlowAI.
          </p>
          <div className="cf-app-actions">
            <a
              className="cf-app-btn"
              data-primary="true"
              href={`/login?next=${encodeURIComponent('/app/tenant')}`}
            >
              Tenant sign in
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
            An Operating Workspace session cannot enter Tenant Workspace. Sign out and sign in with
            CorpFlowAI tenant credentials.
          </p>
          <p className="cf-app-error">{error}</p>
          <div className="cf-app-actions">
            <a className="cf-app-btn" data-primary="true" href="/app/core">
              Open Operating Workspace
            </a>
            <a className="cf-app-btn" href={`/login?next=${encodeURIComponent('/app/tenant')}`}>
              Tenant sign in
            </a>
          </div>
        </section>
      </AppShell>
    );
  }

  if (error && !shell) {
    return (
      <AppShell environment="tenant" tenantLabel="CorpFlowAI" role="—">
        <AppLoadState
          kind="error"
          title="Tenant workspace unavailable"
          message={error}
          testId="app-tenant-error"
        />
        <div className="cf-app-actions" style={{ marginTop: 12 }}>
          <button type="button" className="cf-app-btn" data-primary="true" onClick={() => loadShellAndList()}>
            Retry
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      environment="tenant"
      tenantLabel={tenantLabel}
      role={String(selected.role || actor.role || '—')}
      username={actor.username != null ? String(actor.username) : null}
      proofMode={proofMode}
    >
      <TenantMenu
        active={menu}
        disabled={busy}
        onSelect={(id) => setMenu(id)}
        changeHref={changeHref}
      />

      <section className="cf-app-journey" data-testid="tenant-journey-strip">
        <p className="cf-app-lead" style={{ margin: 0 }}>
          You are in <strong>Tenant Workspace — {tenantLabel}</strong>. Review progress here.
          Use Service &amp; change when you need to raise or update a request.
        </p>
        <div className="cf-app-actions" style={{ marginTop: 12 }}>
          <a
            className="cf-app-btn"
            data-primary="true"
            data-testid="tenant-open-change"
            href={changeHref}
          >
            Open service &amp; change
          </a>
        </div>
      </section>

      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }} data-testid="tenant-workspace-meta">
        Requests, review, and service for this tenant
      </p>

      {returnedFromChange ? (
        <p className="cf-app-ok" data-testid="tenant-return-from-change">
          Back in Tenant Workspace — {tenantLabel}. Your sign-in and tenant context are unchanged.
        </p>
      ) : null}

      {error && progressPanelKind !== 'error' ? (
        <p className="cf-app-error" data-testid="app-error">
          {error}
        </p>
      ) : null}
      {notice ? <p className="cf-app-ok" data-testid="app-notice">{notice}</p> : null}

      {progressPanelKind === 'loading' ? (
        <AppLoadState kind="loading" title={TENANT_PROGRESS_LOADING_TITLE} />
      ) : progressPanelKind === 'error' ? (
        <>
          <AppLoadState
            kind="error"
            title={TENANT_PROGRESS_LIST_ERROR_TITLE}
            message={TENANT_PROGRESS_LIST_ERROR_BODY}
            testId="app-tenant-list-error"
          />
          <p className="cf-app-muted" data-testid="app-tenant-list-error-code">
            {error}
          </p>
          <div className="cf-app-actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="cf-app-btn"
              data-primary="true"
              data-testid="tenant-list-error-retry"
              onClick={() => loadShellAndList()}
            >
              Retry
            </button>
            <a
              className="cf-app-btn"
              data-testid="tenant-list-error-open-change"
              href={changeHref}
            >
              Open service &amp; change
            </a>
          </div>
        </>
      ) : (
        <TenantRequestsProgress
          requests={list}
          request={request}
          busy={busy}
          empty={progressPanelKind === 'empty'}
          changeHref={changeHref}
          onSelectRequest={(id) => {
            setRequestId(id);
            setMenu('requests_progress');
          }}
          onReview={onReview}
        />
      )}
    </AppShell>
  );
}
