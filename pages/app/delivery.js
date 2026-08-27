import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/app/AppShell.js';
import AppLoadState from '../../components/app/AppLoadState.js';
import CoreMenu from '../../components/app/CoreMenu.js';
import DeliverySummary from '../../components/app/DeliverySummary.js';
import { normalizeDeliveryFilter } from '../../lib/app/delivery-summary-constants.js';

/**
 * @param {import('next/router').NextRouter['query']} query
 */
function proofFromQuery(query) {
  const raw = query?.proof;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s === '1';
}

/**
 * Operating Workspace — Delivery summary (#1005).
 * Core / admin session only. Tenant sessions are denied.
 */
export default function AppDeliveryPage() {
  const router = useRouter();
  const [shell, setShell] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [items, setItems] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [filterCounts, setFilterCounts] = useState(/** @type {Record<string, number>} */ ({}));
  const [selected, setSelected] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [dataSource, setDataSource] = useState('');
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(true);

  const proofWanted = router.isReady && proofFromQuery(router.query);
  const filter = router.isReady
    ? normalizeDeliveryFilter(Array.isArray(router.query.filter) ? router.query.filter[0] : router.query.filter)
    : 'all';
  const selectedId = router.isReady
    ? String(Array.isArray(router.query.item) ? router.query.item[0] : router.query.item || '')
    : '';

  const apiBase = useMemo(() => {
    const params = new URLSearchParams();
    params.set('env', 'core');
    params.set('filter', filter);
    if (proofWanted) params.set('proof', '1');
    if (selectedId) params.set('item', selectedId);
    return params.toString();
  }, [filter, proofWanted, selectedId]);

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

      const listRes = await fetch(`/api/app/delivery?${apiBase}`, { credentials: 'same-origin' });
      const listJson = await listRes.json().catch(() => ({}));
      if (listRes.status === 403) {
        setAccessDenied(true);
        setError(String(listJson.error || 'core_access_denied'));
        setItems([]);
        setSelected(null);
        return;
      }
      if (!listRes.ok || !listJson.ok) {
        setError(String(listJson.error || `delivery_${listRes.status}`));
        setItems([]);
        setSelected(null);
        return;
      }
      setItems(Array.isArray(listJson.items) ? listJson.items : []);
      setFilterCounts(
        listJson.filter_counts && typeof listJson.filter_counts === 'object' ? listJson.filter_counts : {},
      );
      setSelected(listJson.selected && typeof listJson.selected === 'object' ? listJson.selected : null);
      if (listJson.data_source) setDataSource(String(listJson.data_source));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed');
      setShell(null);
      setItems([]);
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
          <p className="cf-app-lead">Delivery is staff-only. Use the existing Core / admin session.</p>
          <div className="cf-app-actions">
            <a
              className="cf-app-btn"
              data-primary="true"
              href={`/login?next=${encodeURIComponent('/app/delivery')}`}
            >
              Operating Workspace sign in
            </a>
            <a className="cf-app-btn" href="/app">
              Choose workspace
            </a>
          </div>
          <p className="cf-app-muted" style={{ marginTop: 16 }} data-testid="proof-harness-hint">
            Deterministic test harness only: <a href="/app/delivery?proof=1">Delivery proof</a>
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
            A Tenant session cannot open Delivery oversight. Sign in with Core credentials.
          </p>
          <p className="cf-app-error">{error}</p>
          <div className="cf-app-actions">
            <a className="cf-app-btn" data-primary="true" href="/app/tenant">
              Open Tenant Workspace
            </a>
            <a className="cf-app-btn" href={`/login?next=${encodeURIComponent('/app/delivery')}`}>
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
          title="Delivery unavailable"
          message={error}
          testId="app-delivery-error"
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
        active="delivery"
        disabled={busy}
        onSelect={() => {
          router.push('/app/core');
        }}
      />
      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }} data-testid="delivery-workspace-meta">
        Operating Workspace · Delivery · staff only · no Tenant leakage
        {dataSource ? (
          <>
            {' · '}data source <code>{dataSource}</code>
          </>
        ) : null}
      </p>
      {busy ? <AppLoadState kind="loading" title="Loading delivery…" /> : null}
      <DeliverySummary
        items={items}
        dataSource={dataSource}
        busy={busy}
        error={error}
        filter={filter}
        filterCounts={filterCounts}
        proofWanted={proofWanted}
        selected={selected}
        onFilter={(next) => {
          const params = new URLSearchParams();
          if (proofWanted) params.set('proof', '1');
          if (next && next !== 'all') params.set('filter', next);
          if (selectedId) params.set('item', selectedId);
          const qs = params.toString();
          router.push(qs ? `/app/delivery?${qs}` : '/app/delivery');
        }}
        onSelect={(id) => {
          const params = new URLSearchParams();
          if (proofWanted) params.set('proof', '1');
          if (filter && filter !== 'all') params.set('filter', filter);
          if (id) params.set('item', id);
          const qs = params.toString();
          router.push(qs ? `/app/delivery?${qs}` : '/app/delivery');
        }}
      />
    </AppShell>
  );
}
