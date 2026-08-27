import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/app/AppShell.js';
import AppLoadState from '../../components/app/AppLoadState.js';
import CoreMenu from '../../components/app/CoreMenu.js';
import ProspectPipelineBoard from '../../components/app/ProspectPipelineBoard.js';

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
 * @param {string} key
 */
function queryString(query, key) {
  const raw = query?.[key];
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s != null ? String(s) : '';
}

/**
 * Operating Workspace — Postgres-backed Prospect Pipeline (#997).
 * Core / admin session only. Tenant sessions are denied.
 */
export default function AppPipelinePage() {
  const router = useRouter();
  const [shell, setShell] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [lanes, setLanes] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [filterOptions, setFilterOptions] = useState(
    /** @type {Record<string, string[]>} */ ({}),
  );
  const [dataSource, setDataSource] = useState('');
  const [count, setCount] = useState(0);
  const [unfilteredCount, setUnfilteredCount] = useState(0);
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(true);
  const [movingId, setMovingId] = useState('');
  const [moveError, setMoveError] = useState('');

  const proofWanted = router.isReady && proofFromQuery(router.query);
  const filters = useMemo(
    () => ({
      owner: router.isReady ? queryString(router.query, 'owner') : '',
      product: router.isReady ? queryString(router.query, 'product') : '',
      source: router.isReady ? queryString(router.query, 'source') : '',
      urgency: router.isReady ? queryString(router.query, 'urgency') : '',
    }),
    [router.isReady, router.query],
  );

  const apiBase = useMemo(() => {
    const params = new URLSearchParams();
    params.set('env', 'core');
    if (proofWanted) params.set('proof', '1');
    if (filters.owner) params.set('owner', filters.owner);
    if (filters.product) params.set('product', filters.product);
    if (filters.source) params.set('source', filters.source);
    if (filters.urgency) params.set('urgency', filters.urgency);
    return params.toString();
  }, [proofWanted, filters]);

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

      const listRes = await fetch(`/api/app/pipeline?${apiBase}`, { credentials: 'same-origin' });
      const listJson = await listRes.json().catch(() => ({}));
      if (listRes.status === 403) {
        setAccessDenied(true);
        setError(String(listJson.error || 'core_access_denied'));
        setLanes([]);
        return;
      }
      if (!listRes.ok || !listJson.ok) {
        setError(String(listJson.error || `pipeline_${listRes.status}`));
        setLanes([]);
        return;
      }
      setLanes(Array.isArray(listJson.lanes) ? listJson.lanes : []);
      setFilterOptions(
        listJson.filter_options && typeof listJson.filter_options === 'object'
          ? listJson.filter_options
          : {},
      );
      setCount(Number(listJson.count || 0));
      setUnfilteredCount(Number(listJson.unfiltered_count || listJson.count || 0));
      if (listJson.data_source) setDataSource(String(listJson.data_source));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed');
      setShell(null);
      setLanes([]);
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

  const onFilterChange = useCallback(
    (next) => {
      const params = new URLSearchParams();
      params.set('env', 'core');
      if (proofWanted) params.set('proof', '1');
      for (const key of ['owner', 'product', 'source', 'urgency']) {
        const value = String(next?.[key] || '').trim();
        if (value) params.set(key, value);
      }
      router.replace(`/app/pipeline?${params.toString()}`, undefined, { shallow: true });
    },
    [proofWanted, router],
  );

  const onMoveStage = useCallback(
    async (id, canonicalStage) => {
      setMoveError('');
      setMovingId(String(id || ''));
      try {
        const params = new URLSearchParams();
        params.set('env', 'core');
        params.set('id', String(id || ''));
        if (proofWanted) params.set('proof', '1');
        const res = await fetch(`/api/app/prospect?${params.toString()}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id,
            canonical_stage: canonicalStage,
            intervention: 'change_stage',
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setMoveError(String(json.error || `move_${res.status}`));
          return;
        }
        await load();
      } catch (err) {
        setMoveError(err instanceof Error ? err.message : 'move_failed');
      } finally {
        setMovingId('');
      }
    },
    [load, proofWanted],
  );

  if (authRequired) {
    return (
      <AppShell environment="core" role="—">
        <section className="cf-app-panel" data-testid="app-auth-required">
          <h1 className="cf-app-h1">Sign in to the Operating Workspace</h1>
          <p className="cf-app-lead">
            Prospect Pipeline is staff-only. Use the existing Core / admin session.
          </p>
          <div className="cf-app-actions">
            <a
              className="cf-app-btn"
              data-primary="true"
              href={`/login?next=${encodeURIComponent('/app/pipeline')}`}
            >
              Operating Workspace sign in
            </a>
            <a className="cf-app-btn" href="/app">
              Choose workspace
            </a>
          </div>
          <p className="cf-app-muted" style={{ marginTop: 16 }} data-testid="proof-harness-hint">
            Deterministic test harness only:{' '}
            <a href="/app/pipeline?proof=1">Prospect Pipeline proof</a>
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
            A Tenant session cannot open Prospect Pipeline. Sign in with Core credentials.
          </p>
          <p className="cf-app-error">{error}</p>
          <div className="cf-app-actions">
            <a className="cf-app-btn" data-primary="true" href="/app/tenant">
              Open Tenant Workspace
            </a>
            <a className="cf-app-btn" href={`/login?next=${encodeURIComponent('/app/pipeline')}`}>
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
          title="Prospect Pipeline unavailable"
          message={error}
          testId="app-pipeline-error"
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
        active="pipeline"
        disabled={busy}
        proofWanted={proofWanted}
        onSelect={() => {
          router.push(proofWanted ? '/app/core?proof=1' : '/app/core');
        }}
      />
      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }} data-testid="pipeline-page-meta">
        Operating Workspace · Prospect Pipeline · staff only · no Tenant leakage
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
      {busy ? <AppLoadState kind="loading" title="Loading pipeline…" /> : null}
      <ProspectPipelineBoard
        lanes={lanes}
        filters={filters}
        filterOptions={filterOptions}
        dataSource={dataSource}
        count={count}
        unfilteredCount={unfilteredCount}
        busy={busy}
        proofWanted={proofWanted}
        movingId={movingId}
        moveError={moveError}
        onFilterChange={onFilterChange}
        onMoveStage={onMoveStage}
      />
    </AppShell>
  );
}
