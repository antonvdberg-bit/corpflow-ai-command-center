import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/app/AppShell.js';
import AppLoadState from '../../components/app/AppLoadState.js';
import CoreMenu from '../../components/app/CoreMenu.js';
import CoreRequestList from '../../components/app/CoreRequestList.js';
import CoreRequestWorkView from '../../components/app/CoreRequestWorkView.js';
import OperatingOverview from '../../components/app/OperatingOverview.js';
import { CANONICAL_REQUEST_ID } from '../../lib/app/constants.js';

const LIST_MENUS = new Set(['requests', 'my_work', 'tenants', 'approvals', 'releases']);

/**
 * @param {import('next/router').NextRouter['query']} query
 */
function proofFromQuery(query) {
  const raw = query?.proof;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s === '1';
}

/**
 * @param {import('next/router').NextRouter['query']} query
 */
function menuFromQuery(query) {
  const raw = query?.view;
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s === 'requests' || s === 'tenants' || s === 'approvals' || s === 'releases') return s;
  return 'overview';
}

/**
 * Operating Workspace landing — action overview (#1159).
 * Core / admin session only. Tenant sessions fail closed.
 * Requests remain an in-shell list (`?view=requests`).
 */
export default function AppCorePage() {
  const router = useRouter();
  const [menu, setMenu] = useState('overview');
  const [shell, setShell] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [request, setRequest] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [list, setList] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [overview, setOverview] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [tenantOptions, setTenantOptions] = useState(/** @type {string[]} */ ([]));
  const [dataSource, setDataSource] = useState('');
  const [filters, setFilters] = useState({
    tenant_id: 'all',
    status: '',
    waiting_party: '',
  });
  const [requestId, setRequestId] = useState(CANONICAL_REQUEST_ID);
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [notice, setNotice] = useState('');

  const proofWanted = router.isReady && proofFromQuery(router.query);

  const apiBase = useMemo(() => {
    const params = new URLSearchParams();
    params.set('env', 'core');
    params.set('scope', 'core');
    if (proofWanted) params.set('proof', '1');
    return params.toString();
  }, [proofWanted]);

  useEffect(() => {
    if (!router.isReady) return;
    setMenu(menuFromQuery(router.query));
  }, [router.isReady, router.query.view]);

  const loadShellAndWork = useCallback(async () => {
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
        return;
      }
      if (shellRes.status === 403) {
        setAccessDenied(true);
        setError(String(shellJson.error || 'core_access_denied'));
        setShell(null);
        return;
      }
      if (!shellRes.ok || !shellJson.ok) {
        setError(String(shellJson.error || `shell_${shellRes.status}`));
        setShell(null);
        return;
      }
      setShell(shellJson);
      if (shellJson.data_source) setDataSource(String(shellJson.data_source));

      if (menu === 'overview') {
        const overviewRes = await fetch(`/api/app/overview?${apiBase}`, { credentials: 'same-origin' });
        const overviewJson = await overviewRes.json().catch(() => ({}));
        if (overviewRes.status === 403) {
          setAccessDenied(true);
          setError(String(overviewJson.error || 'core_access_denied'));
          setOverview(null);
          return;
        }
        if (!overviewRes.ok || !overviewJson.ok) {
          setError(String(overviewJson.error || `overview_${overviewRes.status}`));
          setOverview(null);
          return;
        }
        setOverview(overviewJson);
        if (overviewJson.data_source) setDataSource(String(overviewJson.data_source));
        setList([]);
        setRequest(null);
        return;
      }

      if (LIST_MENUS.has(menu)) {
        const listQs = new URLSearchParams(apiBase);
        listQs.set('view', 'global');
        if (filters.tenant_id && filters.tenant_id !== 'all') {
          listQs.set('tenant_id', filters.tenant_id);
          listQs.delete('view');
        }
        if (filters.status) listQs.set('status', filters.status);
        if (filters.waiting_party) listQs.set('waiting_party', filters.waiting_party);
        const listRes = await fetch(`/api/app/requests?${listQs.toString()}`, {
          credentials: 'same-origin',
        });
        const listJson = await listRes.json().catch(() => ({}));
        if (!listRes.ok || !listJson.ok) {
          setError(String(listJson.error || `requests_${listRes.status}`));
          setList([]);
          return;
        }
        setList(Array.isArray(listJson.requests) ? listJson.requests : []);
        setTenantOptions(Array.isArray(listJson.tenant_options) ? listJson.tenant_options : []);
        if (listJson.data_source) setDataSource(String(listJson.data_source));
        setRequest(null);
        setOverview(null);
        return;
      }

      if (menu === 'request_detail') {
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
        if (detailJson.data_source) setDataSource(String(detailJson.data_source));
        setList([]);
        setOverview(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
    } finally {
      setBusy(false);
      setInitialLoad(false);
    }
  }, [apiBase, menu, requestId, filters]);

  useEffect(() => {
    if (!router.isReady) return;
    loadShellAndWork();
  }, [router.isReady, loadShellAndWork]);

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
          request_id: requestId,
          component_key,
          exposed,
          env: 'core',
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

  const actor = /** @type {Record<string, unknown>} */ (shell?.actor || {});
  const selected = /** @type {Record<string, unknown>} */ (shell?.selected || {});
  const proofMode = shell?.proof_mode === true;
  const menuActive = menu === 'request_detail' ? 'requests' : menu;

  if (!router.isReady || (initialLoad && busy && !authRequired && !accessDenied && !shell)) {
    return (
      <AppShell environment="core" role="—">
        <AppLoadState kind="loading" title="Loading Operating Workspace…" />
      </AppShell>
    );
  }

  if (authRequired) {
    return (
      <AppShell environment="core" role="—">
        <section className="cf-app-panel" data-testid="app-auth-required">
          <h1 className="cf-app-h1">Sign in to Core</h1>
          <p className="cf-app-lead">
            Core uses the existing Core / admin authentication protocol (separate from Tenant).
          </p>
          <div className="cf-app-actions">
            <a
              className="cf-app-btn"
              data-primary="true"
              href={`/login?next=${encodeURIComponent('/app/core')}`}
            >
              Core sign in
            </a>
            <a className="cf-app-btn" href="/app">
              Back to chooser
            </a>
          </div>
          <p className="cf-app-muted" style={{ marginTop: 16 }} data-testid="proof-harness-hint">
            Deterministic test harness only:{' '}
            <a href="/app/core?proof=1">Open Core proof</a>
          </p>
        </section>
      </AppShell>
    );
  }

  if (accessDenied) {
    return (
      <AppShell environment="core" role="—">
        <section className="cf-app-panel" data-testid="app-core-denied">
          <h1 className="cf-app-h1">Core access denied</h1>
          <p className="cf-app-lead">
            A Tenant session cannot enter Core. Sign out and sign in with Core credentials.
          </p>
          <p className="cf-app-error">{error}</p>
          <div className="cf-app-actions">
            <a className="cf-app-btn" data-primary="true" href="/app/tenant">
              Open Tenant — CorpFlowAI
            </a>
            <a className="cf-app-btn" href={`/login?next=${encodeURIComponent('/app/core')}`}>
              Core sign in
            </a>
          </div>
        </section>
      </AppShell>
    );
  }

  if (error && !shell) {
    return (
      <AppShell environment="core" role="—">
        <AppLoadState
          kind="error"
          title="Core workspace unavailable"
          message={error}
          testId="app-core-error"
        />
        <div className="cf-app-actions" style={{ marginTop: 12 }}>
          <button type="button" className="cf-app-btn" data-primary="true" onClick={() => loadShellAndWork()}>
            Retry
          </button>
        </div>
      </AppShell>
    );
  }

  const listTitle =
    menu === 'my_work'
      ? 'My Work'
      : menu === 'tenants'
        ? 'Tenants'
        : menu === 'approvals'
          ? 'Approvals'
          : menu === 'releases'
            ? 'Releases'
            : 'Requests';

  return (
    <AppShell
      environment="core"
      tenantLabel={null}
      role={String(selected.role || actor.role || '—')}
      username={actor.username != null ? String(actor.username) : null}
      proofMode={proofMode}
    >
      <CoreMenu
        active={menuActive}
        disabled={busy}
        proofWanted={proofWanted}
        onSelect={(id) => {
          setMenu(id);
        }}
      />

      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }} data-testid="core-workspace-meta">
        Operating Workspace · separate auth ·{' '}
        {dataSource ? (
          <>
            data source <code data-testid="core-data-source">{dataSource}</code>
          </>
        ) : (
          'existing records'
        )}
        {' · '}
        {menu === 'overview' ? (
          <>action overview · <code>/app/core</code></>
        ) : (
          <>
            <code>/change</code> remains compatibility route
          </>
        )}
      </p>

      {error ? <p className="cf-app-error" data-testid="app-error">{error}</p> : null}
      {notice ? <p className="cf-app-ok" data-testid="app-notice">{notice}</p> : null}

      {busy && menu === 'overview' ? <AppLoadState kind="loading" title="Loading overview…" /> : null}
      {busy && LIST_MENUS.has(menu) ? <AppLoadState kind="loading" title="Loading requests…" /> : null}

      {!busy && menu === 'overview' ? (
        <OperatingOverview
          overview={overview}
          dataSource={dataSource}
          busy={busy}
          proofWanted={proofWanted}
        />
      ) : null}

      {!busy && LIST_MENUS.has(menu) ? (
        <CoreRequestList
          title={listTitle}
          requests={list}
          busy={busy}
          tenantOptions={tenantOptions}
          filters={filters}
          onFilterChange={(next) => setFilters(next)}
          onOpen={(id) => {
            setRequestId(id);
            setMenu('request_detail');
          }}
        />
      ) : null}

      {menu === 'request_detail' ? (
        busy && !request ? (
          <AppLoadState kind="loading" title="Loading request…" />
        ) : (
          <CoreRequestWorkView request={request} busy={busy} onExpose={onExpose} />
        )
      ) : null}
    </AppShell>
  );
}
