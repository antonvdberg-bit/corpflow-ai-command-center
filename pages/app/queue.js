import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/app/AppShell.js';
import AppLoadState from '../../components/app/AppLoadState.js';
import CoreMenu from '../../components/app/CoreMenu.js';
import ProspectActionQueue from '../../components/app/ProspectActionQueue.js';
import { normalizeActionQueueFilter } from '../../lib/cmp/_lib/prospect-operations-view-model.js';

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
  return normalizeActionQueueFilter(s);
}

function idFromQuery(query) {
  const raw = query?.id;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return String(s || '').trim();
}

/**
 * Operating Workspace — canonical Prospect Action Queue (#995).
 * Core / admin session only. Tenant sessions are denied.
 */
export default function AppActionQueuePage() {
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
  const filter = router.isReady ? filterFromQuery(router.query) : 'needs_action';
  const selectedId = router.isReady ? idFromQuery(router.query) : '';

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

      const listRes = await fetch(`/api/app/queue?${apiBase}`, { credentials: 'same-origin' });
      const listJson = await listRes.json().catch(() => ({}));
      if (listRes.status === 403) {
        setAccessDenied(true);
        setError(String(listJson.error || 'core_access_denied'));
        setProspects([]);
        return;
      }
      if (!listRes.ok || !listJson.ok) {
        setError(String(listJson.error || `queue_${listRes.status}`));
        setProspects([]);
        return;
      }
      setProspects(Array.isArray(listJson.prospects) ? listJson.prospects : []);
      setFilterCounts(listJson.filter_counts && typeof listJson.filter_counts === 'object' ? listJson.filter_counts : {});
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

  const pushQueueQuery = useCallback(
    (next) => {
      const params = new URLSearchParams();
      params.set('env', 'core');
      if (proofWanted) params.set('proof', '1');
      params.set('filter', next.filter || filter);
      if (next.id) params.set('id', next.id);
      router.replace(`/app/queue?${params.toString()}`, undefined, { shallow: true });
    },
    [filter, proofWanted, router],
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
            The Prospect Action Queue is staff-only. Use the existing Core / admin session.
          </p>
          <div className="cf-app-actions">
            <a
              className="cf-app-btn"
              data-primary="true"
              href={`/login?next=${encodeURIComponent('/app/queue')}`}
            >
              Operating Workspace sign in
            </a>
            <a className="cf-app-btn" href="/app">
              Choose workspace
            </a>
          </div>
          <p className="cf-app-muted" style={{ marginTop: 16 }} data-testid="proof-harness-hint">
            Deterministic test harness only:{' '}
            <a href="/app/queue?proof=1">Action Queue proof</a>
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
            A Tenant session cannot open the Prospect Action Queue. Sign in with Core credentials.
          </p>
          <p className="cf-app-error">{error}</p>
          <div className="cf-app-actions">
            <a className="cf-app-btn" data-primary="true" href="/app/tenant">
              Open Tenant Workspace
            </a>
            <a className="cf-app-btn" href={`/login?next=${encodeURIComponent('/app/queue')}`}>
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
          title="Action Queue unavailable"
          message={error}
          testId="app-queue-error"
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
        active="queue"
        disabled={busy || saving}
        proofWanted={proofWanted}
        onSelect={() => {
          router.push(proofWanted ? '/app/core?proof=1' : '/app/core');
        }}
      />
      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }} data-testid="action-queue-meta">
        Operating Workspace · Action Queue · staff only · no Tenant leakage · no live send
        {dataSource ? (
          <>
            {' · '}data source <code>{dataSource}</code>
          </>
        ) : null}
      </p>
      {error && !formError ? <p className="cf-app-error" data-testid="app-error">{error}</p> : null}
      {busy ? <AppLoadState kind="loading" title="Loading Action Queue…" /> : null}
      <ProspectActionQueue
        prospects={prospects}
        dataSource={dataSource}
        busy={busy}
        saving={saving}
        saved={saved}
        error={formError}
        filter={filter}
        filterCounts={filterCounts}
        proofWanted={proofWanted}
        selectedId={selectedId}
        onFilter={(next) => pushQueueQuery({ filter: next, id: selectedId })}
        onSelect={(id) => pushQueueQuery({ filter, id })}
        onSave={save}
      />
    </AppShell>
  );
}
