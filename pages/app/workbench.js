import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/app/AppShell.js';
import AppLoadState from '../../components/app/AppLoadState.js';
import CoreMenu from '../../components/app/CoreMenu.js';
import ProspectWorkbench from '../../components/app/ProspectWorkbench.js';
import {
  normalizeWorkbenchFilter,
  normalizeWorkbenchSort,
  normalizeWorkbenchSortDir,
} from '../../lib/cmp/_lib/prospect-operations-view-model.js';

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
  return normalizeWorkbenchFilter(s);
}

function sortFromQuery(query) {
  const raw = query?.sort;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return normalizeWorkbenchSort(s);
}

function dirFromQuery(query) {
  const raw = query?.dir;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return normalizeWorkbenchSortDir(s);
}

function qFromQuery(query) {
  const raw = query?.q;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return String(s || '').trim();
}

function idFromQuery(query) {
  const raw = query?.id;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return String(s || '').trim();
}

/**
 * Operating Workspace — shared Prospect Workbench (#996).
 * Core / admin session only. Tenant sessions are denied.
 */
export default function AppProspectWorkbenchPage() {
  const router = useRouter();
  const [shell, setShell] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [prospects, setProspects] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [filterCounts, setFilterCounts] = useState(/** @type {Record<string, number>} */ ({}));
  const [dataSource, setDataSource] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);

  const proofWanted = router.isReady && proofFromQuery(router.query);
  const filter = router.isReady ? filterFromQuery(router.query) : 'all';
  const sort = router.isReady ? sortFromQuery(router.query) : 'priority';
  const dir = router.isReady ? dirFromQuery(router.query) : 'asc';
  const q = router.isReady ? qFromQuery(router.query) : '';
  const selectedId = router.isReady ? idFromQuery(router.query) : '';

  const apiBase = useMemo(() => {
    const params = new URLSearchParams();
    params.set('env', 'core');
    if (proofWanted) params.set('proof', '1');
    params.set('filter', filter);
    params.set('sort', sort);
    params.set('dir', dir);
    if (q) params.set('q', q);
    return params.toString();
  }, [proofWanted, filter, sort, dir, q]);

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

      const listRes = await fetch(`/api/app/workbench?${apiBase}`, { credentials: 'same-origin' });
      const listJson = await listRes.json().catch(() => ({}));
      if (listRes.status === 403) {
        setAccessDenied(true);
        setError(String(listJson.error || 'core_access_denied'));
        setProspects([]);
        return;
      }
      if (!listRes.ok || !listJson.ok) {
        setError(String(listJson.error || `workbench_${listRes.status}`));
        setProspects([]);
        return;
      }
      setProspects(Array.isArray(listJson.prospects) ? listJson.prospects : []);
      setFilterCounts(
        listJson.filter_counts && typeof listJson.filter_counts === 'object' ? listJson.filter_counts : {},
      );
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

  const pushWorkbenchQuery = useCallback(
    (next) => {
      const params = new URLSearchParams();
      params.set('env', 'core');
      if (proofWanted) params.set('proof', '1');
      params.set('filter', next.filter || filter);
      params.set('sort', next.sort || sort);
      params.set('dir', next.dir || dir);
      const nextQ = next.q != null ? next.q : q;
      if (nextQ) params.set('q', String(nextQ));
      if (next.id) params.set('id', next.id);
      else if (selectedId && next.id !== '') params.set('id', selectedId);
      router.replace(`/app/workbench?${params.toString()}`, undefined, { shallow: true });
    },
    [dir, filter, proofWanted, q, router, selectedId, sort],
  );

  const save = useCallback(
    async (fields) => {
      setSaving(true);
      setFormError('');
      setSaved(false);
      try {
        const params = new URLSearchParams();
        params.set('env', 'core');
        if (proofWanted) params.set('proof', '1');
        params.set('id', String(fields.id || selectedId));
        const res = await fetch(`/api/app/prospect?${params.toString()}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(fields),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setFormError(String(json.error || `save_${res.status}`));
          return;
        }
        setSaved(true);
        await load();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'save_failed');
      } finally {
        setSaving(false);
      }
    },
    [load, proofWanted, selectedId],
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
            The Prospect Workbench is staff-only. Use the existing Core / admin session.
          </p>
          <div className="cf-app-actions">
            <a
              className="cf-app-btn"
              data-primary="true"
              href={`/login?next=${encodeURIComponent('/app/workbench')}`}
            >
              Operating Workspace sign in
            </a>
            <a className="cf-app-btn" href="/app">
              Choose workspace
            </a>
          </div>
          <p className="cf-app-muted" style={{ marginTop: 16 }} data-testid="proof-harness-hint">
            Deterministic test harness only:{' '}
            <a href="/app/workbench?proof=1">Prospect Workbench proof</a>
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
            A Tenant session cannot open the Prospect Workbench. Sign in with Core credentials.
          </p>
          <p className="cf-app-error">{error}</p>
          <div className="cf-app-actions">
            <a className="cf-app-btn" data-primary="true" href="/app/tenant">
              Open Tenant Workspace
            </a>
            <a className="cf-app-btn" href={`/login?next=${encodeURIComponent('/app/workbench')}`}>
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
          title="Prospect Workbench unavailable"
          message={error}
          testId="app-workbench-error"
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
        active="workbench"
        disabled={busy}
        onSelect={() => {
          router.push('/app/core');
        }}
      />
      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }} data-testid="prospect-workbench-meta">
        Operating Workspace · Prospect Workbench · staff only · no Tenant leakage
        {dataSource ? (
          <>
            {' · '}data source <code>{dataSource}</code>
          </>
        ) : null}
      </p>
      {error ? <p className="cf-app-error" data-testid="app-error">{error}</p> : null}
      {busy ? <AppLoadState kind="loading" title="Loading workbench…" /> : null}
      <ProspectWorkbench
        prospects={prospects}
        dataSource={dataSource}
        busy={busy}
        saving={saving}
        saved={saved}
        error={formError}
        filter={filter}
        sort={sort}
        dir={dir}
        q={q}
        filterCounts={filterCounts}
        proofWanted={proofWanted}
        selectedId={selectedId}
        onFilter={(nextFilter) => pushWorkbenchQuery({ filter: nextFilter, id: selectedId })}
        onSort={(nextSort) => {
          const nextDir = nextSort === sort && dir === 'asc' ? 'desc' : 'asc';
          pushWorkbenchQuery({ sort: nextSort, dir: nextDir, id: selectedId });
        }}
        onQuery={(nextQ) => pushWorkbenchQuery({ q: nextQ, id: selectedId })}
        onSelect={(id) => pushWorkbenchQuery({ id })}
        onSave={save}
      />
    </AppShell>
  );
}
