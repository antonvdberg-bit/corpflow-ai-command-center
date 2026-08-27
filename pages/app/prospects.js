import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/app/AppShell.js';
import AppLoadState from '../../components/app/AppLoadState.js';
import CoreMenu from '../../components/app/CoreMenu.js';
import ProspectOperationsList from '../../components/app/ProspectOperationsList.js';

/**
 * @param {import('next/router').NextRouter['query']} query
 */
function proofFromQuery(query) {
  const raw = query?.proof;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s === '1';
}

/**
 * Operating Workspace — first shared Prospect Operations route (#772).
 * Core / admin session only. Tenant sessions are denied.
 */
export default function AppProspectsPage() {
  const router = useRouter();
  const [shell, setShell] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [prospects, setProspects] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [dataSource, setDataSource] = useState('');
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(true);

  const proofWanted = router.isReady && proofFromQuery(router.query);
  const selectedId = router.isReady ? String(Array.isArray(router.query.id) ? router.query.id[0] : router.query.id || '') : '';

  const apiBase = useMemo(() => {
    const params = new URLSearchParams();
    params.set('env', 'core');
    if (proofWanted) params.set('proof', '1');
    return params.toString();
  }, [proofWanted]);

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

      const listRes = await fetch(`/api/app/prospects?${apiBase}`, { credentials: 'same-origin' });
      const listJson = await listRes.json().catch(() => ({}));
      if (listRes.status === 403) {
        setAccessDenied(true);
        setError(String(listJson.error || 'core_access_denied'));
        setProspects([]);
        return;
      }
      if (!listRes.ok || !listJson.ok) {
        setError(String(listJson.error || `prospects_${listRes.status}`));
        setProspects([]);
        return;
      }
      setProspects(Array.isArray(listJson.prospects) ? listJson.prospects : []);
      if (listJson.data_source) setDataSource(String(listJson.data_source));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed');
      setShell(null);
      setProspects([]);
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

  if (authRequired) {
    return (
      <AppShell environment="core" role="—">
        <section className="cf-app-panel" data-testid="app-auth-required">
          <h1 className="cf-app-h1">Sign in to the Operating Workspace</h1>
          <p className="cf-app-lead">
            Prospect Operations is staff-only. Use the existing Core / admin session.
          </p>
          <div className="cf-app-actions">
            <a
              className="cf-app-btn"
              data-primary="true"
              href={`/login?next=${encodeURIComponent('/app/prospects')}`}
            >
              Operating Workspace sign in
            </a>
            <a className="cf-app-btn" href="/app">
              Choose workspace
            </a>
          </div>
          <p className="cf-app-muted" style={{ marginTop: 16 }} data-testid="proof-harness-hint">
            Deterministic test harness only:{' '}
            <a href="/app/prospects?proof=1">Prospect Operations proof</a>
          </p>
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
            A Tenant session cannot open Prospect Operations. Sign in with Core credentials.
          </p>
          <p className="cf-app-error">{error}</p>
          <div className="cf-app-actions">
            <a className="cf-app-btn" data-primary="true" href="/app/tenant">
              Open Tenant Workspace
            </a>
            <a className="cf-app-btn" href={`/login?next=${encodeURIComponent('/app/prospects')}`}>
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
          title="Prospect Operations unavailable"
          message={error}
          testId="app-prospects-error"
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
        active="prospects"
        disabled={busy}
        proofWanted={proofWanted}
        onSelect={() => {
          router.push(proofWanted ? '/app/core?proof=1' : '/app/core');
        }}
      />
      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }} data-testid="prospect-ops-meta">
        Operating Workspace · staff only · no Tenant leakage
        {dataSource ? (
          <>
            {' · '}data source <code>{dataSource}</code>
          </>
        ) : null}
      </p>
      {error ? <p className="cf-app-error" data-testid="app-error">{error}</p> : null}
      {busy ? <AppLoadState kind="loading" title="Loading prospects…" /> : null}
      <ProspectOperationsList
        prospects={prospects}
        dataSource={dataSource}
        busy={busy}
        proofWanted={proofWanted}
        selectedId={selectedId}
        onSelect={(id) => {
          const params = new URLSearchParams();
          params.set('env', 'core');
          if (proofWanted) params.set('proof', '1');
          params.set('id', id);
          router.replace(`/app/prospects?${params.toString()}`, undefined, { shallow: true });
        }}
      />
    </AppShell>
  );
}
