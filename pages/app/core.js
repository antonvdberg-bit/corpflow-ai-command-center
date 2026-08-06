import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/app/AppShell.js';
import CoreMenu from '../../components/app/CoreMenu.js';
import CoreRequestList from '../../components/app/CoreRequestList.js';
import CoreRequestWorkView from '../../components/app/CoreRequestWorkView.js';
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
 * Core environment entry — requires Core/admin session (or Core proof actor).
 * No path into Tenant from this session.
 */
export default function AppCorePage() {
  const router = useRouter();
  const [menu, setMenu] = useState(
    /** @type {'global_requests'|'tenant_requests'|'request_work'} */ ('request_work'),
  );
  const [shell, setShell] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [request, setRequest] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [list, setList] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [requestId, setRequestId] = useState(SYNTHETIC_REQUEST_ID);
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const proofWanted = router.isReady && proofFromQuery(router.query);

  const apiBase = useMemo(() => {
    const params = new URLSearchParams();
    params.set('env', 'core');
    params.set('scope', 'core');
    if (proofWanted) params.set('proof', '1');
    return params.toString();
  }, [proofWanted]);

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

      if (menu === 'global_requests' || menu === 'tenant_requests') {
        const listQs = new URLSearchParams(apiBase);
        if (menu === 'global_requests') listQs.set('view', 'global');
        else listQs.set('tenant_id', REFERENCE_TENANT_ID);
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
        setRequest(null);
        return;
      }

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
      setList([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
    } finally {
      setBusy(false);
    }
  }, [apiBase, menu, requestId]);

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

  if (authRequired) {
    return (
      <AppShell environment="core" role="—">
        <section className="cf-app-panel" data-testid="app-auth-required">
          <h1 className="cf-app-h1">Sign in to Core</h1>
          <p className="cf-app-lead">
            Core uses the existing Core / admin authentication protocol (separate from Tenant). Sign in
            with Core credentials, then return here.
          </p>
          <div className="cf-app-actions">
            <a
              className="cf-app-btn"
              data-primary="true"
              href={`/login?next=${encodeURIComponent('/app/core')}`}
            >
              Core sign in
            </a>
            <a className="cf-app-btn" href="/app/core?proof=1">
              Open Core proof
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
      <AppShell environment="core" role="—">
        <section className="cf-app-panel" data-testid="app-core-denied">
          <h1 className="cf-app-h1">Core access denied</h1>
          <p className="cf-app-lead">
            A Tenant session cannot enter Core. Sign out and sign in with Core credentials, or open the
            Tenant environment instead.
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

  return (
    <AppShell
      environment="core"
      tenantLabel={null}
      role={String(selected.role || actor.role || '—')}
      username={actor.username != null ? String(actor.username) : null}
      proofMode={proofMode}
    >
      <CoreMenu
        active={menu}
        disabled={busy}
        onSelect={(id) => {
          setMenu(id);
          if (id === 'request_work' && !requestId) setRequestId(SYNTHETIC_REQUEST_ID);
        }}
      />

      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Core environment · separate auth · no Tenant switch · <code>/change</code> unchanged
      </p>

      {error ? <p className="cf-app-error" data-testid="app-error">{error}</p> : null}
      {notice ? <p className="cf-app-ok" data-testid="app-notice">{notice}</p> : null}

      {menu === 'global_requests' ? (
        <CoreRequestList
          title="All requests"
          requests={list}
          busy={busy}
          onOpen={(id) => {
            setRequestId(id);
            setMenu('request_work');
          }}
        />
      ) : null}

      {menu === 'tenant_requests' ? (
        <CoreRequestList
          title="Tenant · CorpFlowAI requests"
          requests={list}
          busy={busy}
          onOpen={(id) => {
            setRequestId(id);
            setMenu('request_work');
          }}
        />
      ) : null}

      {menu === 'request_work' ? (
        <CoreRequestWorkView request={request} busy={busy} onExpose={onExpose} />
      ) : null}
    </AppShell>
  );
}
