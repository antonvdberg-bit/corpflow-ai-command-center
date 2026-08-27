import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/app/AppShell.js';
import AppLoadState from '../../components/app/AppLoadState.js';
import CoreMenu from '../../components/app/CoreMenu.js';
import CommercialSummary from '../../components/app/CommercialSummary.js';
import { normalizeCommercialFilter } from '../../lib/app/commercial-summary-constants.js';

/**
 * @param {import('next/router').NextRouter['query']} query
 */
function proofFromQuery(query) {
  const raw = query?.proof;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s === '1';
}

function filterFromQuery(query) {
  const raw = query?.filter;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return normalizeCommercialFilter(s);
}

/**
 * Operating Workspace — Commercial summary (#1004).
 * Core / admin session only. Tenant sessions are denied.
 * Read-only. No payment, send, schema, or ERPNext mutation.
 */
export default function AppCommercialPage() {
  const router = useRouter();
  const [shell, setShell] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [rows, setRows] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [filterCounts, setFilterCounts] = useState(/** @type {Record<string, number>} */ ({}));
  const [dataSource, setDataSource] = useState('');
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(true);

  const proofWanted = router.isReady && proofFromQuery(router.query);
  const filter = router.isReady ? filterFromQuery(router.query) : 'needs_attention';

  const apiBase = useMemo(() => {
    const params = new URLSearchParams();
    params.set('env', 'core');
    if (proofWanted) params.set('proof', '1');
    params.set('filter', filter);
    return params.toString();
  }, [proofWanted, filter]);

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

      const listRes = await fetch(`/api/app/commercial?${apiBase}`, { credentials: 'same-origin' });
      const listJson = await listRes.json().catch(() => ({}));
      if (listRes.status === 403) {
        setAccessDenied(true);
        setError(String(listJson.error || 'core_access_denied'));
        setRows([]);
        return;
      }
      if (!listRes.ok || !listJson.ok) {
        setError(String(listJson.error || `commercial_${listRes.status}`));
        setRows([]);
        return;
      }
      setRows(Array.isArray(listJson.rows) ? listJson.rows : []);
      setFilterCounts(
        listJson.filter_counts && typeof listJson.filter_counts === 'object' ? listJson.filter_counts : {},
      );
      if (listJson.data_source) setDataSource(String(listJson.data_source));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed');
      setShell(null);
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (!router.isReady) return;
    load();
  }, [router.isReady, load]);

  const pushFilter = useCallback(
    (next) => {
      const params = new URLSearchParams();
      params.set('env', 'core');
      if (proofWanted) params.set('proof', '1');
      params.set('filter', next || filter);
      router.replace(`/app/commercial?${params.toString()}`, undefined, { shallow: true });
    },
    [filter, proofWanted, router],
  );

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
            Commercial is staff-only. Use the existing Core / admin session.
          </p>
          <div className="cf-app-actions">
            <a
              className="cf-app-btn"
              data-primary="true"
              href={`/login?next=${encodeURIComponent('/app/commercial')}`}
            >
              Operating Workspace sign in
            </a>
            <a className="cf-app-btn" href="/app">
              Choose workspace
            </a>
          </div>
          <p className="cf-app-muted" style={{ marginTop: 16 }} data-testid="proof-harness-hint">
            Deterministic test harness only:{' '}
            <a href="/app/commercial?proof=1">Commercial proof</a>
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
            A Tenant session cannot open Commercial. Sign in with Core credentials.
          </p>
          <p className="cf-app-error">{error}</p>
          <div className="cf-app-actions">
            <a className="cf-app-btn" data-primary="true" href="/app/tenant">
              Open Tenant Workspace
            </a>
            <a className="cf-app-btn" href={`/login?next=${encodeURIComponent('/app/commercial')}`}>
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
          title="Commercial unavailable"
          message={error}
          testId="app-commercial-error"
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
        active="commercial"
        disabled={busy}
        proofWanted={proofWanted}
        onSelect={() => {
          router.push(proofWanted ? '/app/core?proof=1' : '/app/core');
        }}
      />
      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }} data-testid="commercial-page-meta">
        Operating Workspace · Commercial · staff only · no Tenant leakage · no payment · no send
        {dataSource ? (
          <>
            {' · '}data source <code>{dataSource}</code>
          </>
        ) : null}
      </p>
      {error ? (
        <p className="cf-app-error" data-testid="app-error">
          {error}
        </p>
      ) : null}
      {busy ? <AppLoadState kind="loading" title="Loading commercial state…" /> : null}
      <CommercialSummary
        rows={rows}
        dataSource={dataSource}
        busy={busy}
        filter={filter}
        filterCounts={filterCounts}
        proofWanted={proofWanted}
        onFilter={pushFilter}
      />
    </AppShell>
  );
}
