import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../../components/app/AppShell.js';
import AppLoadState from '../../../components/app/AppLoadState.js';
import CoreMenu from '../../../components/app/CoreMenu.js';
import { ClientSummaryPanel } from '../../../components/app/ClientsSummary.js';

/**
 * @param {import('next/router').NextRouter['query']} query
 */
function proofFromQuery(query) {
  const raw = query?.proof;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s === '1';
}

function idFromQuery(query) {
  const raw = query?.id;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return String(s || '').trim();
}

/**
 * Operating Workspace — Client summary (#999).
 * Core / admin session only. Tenant sessions are denied.
 */
export default function AppClientDetailPage() {
  const router = useRouter();
  const [shell, setShell] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [client, setClient] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [dataSource, setDataSource] = useState('');
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(true);

  const proofWanted = router.isReady && proofFromQuery(router.query);
  const clientId = router.isReady ? idFromQuery(router.query) : '';

  const apiBase = useMemo(() => {
    const params = new URLSearchParams();
    params.set('env', 'core');
    if (proofWanted) params.set('proof', '1');
    if (clientId) params.set('id', clientId);
    return params.toString();
  }, [proofWanted, clientId]);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
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

      const detailRes = await fetch(`/api/app/client?${apiBase}`, { credentials: 'same-origin' });
      const detailJson = await detailRes.json().catch(() => ({}));
      if (detailRes.status === 403) {
        setAccessDenied(true);
        setError(String(detailJson.error || 'core_access_denied'));
        setClient(null);
        return;
      }
      if (detailRes.status === 404) {
        setClient(null);
        setError(String(detailJson.error || 'client_not_found'));
        return;
      }
      if (!detailRes.ok || !detailJson.ok) {
        setError(String(detailJson.error || `client_${detailRes.status}`));
        setClient(null);
        return;
      }
      setClient(detailJson.client && typeof detailJson.client === 'object' ? detailJson.client : null);
      if (detailJson.data_source) setDataSource(String(detailJson.data_source));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed');
      setShell(null);
      setClient(null);
    } finally {
      setBusy(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (!router.isReady) return;
    load();
  }, [router.isReady, load]);

  const selected =
    shell && typeof shell.selected === 'object' && shell.selected
      ? /** @type {Record<string, unknown>} */ (shell.selected)
      : {};
  const actor =
    shell && typeof shell.actor === 'object' && shell.actor
      ? /** @type {Record<string, unknown>} */ (shell.actor)
      : {};
  const proofMode = shell?.proof_mode === true;
  const loginNext = clientId ? `/app/clients/${encodeURIComponent(clientId)}` : '/app/clients';

  if (authRequired) {
    return (
      <AppShell environment="core" role="—">
        <section className="cf-app-panel" data-testid="app-auth-required">
          <h1 className="cf-app-h1">Sign in to the Operating Workspace</h1>
          <p className="cf-app-lead">
            Client summary is staff-only. Use the existing Core / admin session.
          </p>
          <div className="cf-app-actions">
            <a
              className="cf-app-btn"
              data-primary="true"
              href={`/login?next=${encodeURIComponent(loginNext)}`}
            >
              Operating Workspace sign in
            </a>
            <a className="cf-app-btn" href="/app">
              Choose workspace
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
          <h1 className="cf-app-h1">Operating Workspace access denied</h1>
          <p className="cf-app-lead">
            A Tenant session cannot open a client summary. Sign in with Core credentials.
          </p>
          <p className="cf-app-error">{error}</p>
          <div className="cf-app-actions">
            <a className="cf-app-btn" data-primary="true" href="/app/tenant">
              Open Tenant Workspace
            </a>
            <a className="cf-app-btn" href={`/login?next=${encodeURIComponent(loginNext)}`}>
              Operating Workspace sign in
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
          title="Client summary unavailable"
          message={error}
          testId="app-client-detail-error"
        />
        <div className="cf-app-actions" style={{ marginTop: 12 }}>
          <button type="button" className="cf-app-btn" data-primary="true" onClick={() => load()}>
            Retry
          </button>
        </div>
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
        active="clients"
        disabled={busy}
        proofWanted={proofWanted}
        onSelect={() => {
          router.push(proofWanted ? '/app/core?proof=1' : '/app/core');
        }}
      />
      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }} data-testid="clients-detail-meta">
        Operating Workspace · Client summary · staff only · no Tenant leakage
        {dataSource ? (
          <>
            {' · '}data source <code>{dataSource}</code>
          </>
        ) : null}
      </p>
      {error ? <p className="cf-app-error" data-testid="app-error">{error}</p> : null}
      {busy ? <AppLoadState kind="loading" title="Loading client…" /> : null}
      {!busy && client ? <ClientSummaryPanel client={client} proofWanted={proofWanted} /> : null}
      <p className="cf-app-muted">
        <a href={proofWanted ? '/app/clients?proof=1' : '/app/clients'}>Back to Clients</a>
      </p>
    </AppShell>
  );
}
