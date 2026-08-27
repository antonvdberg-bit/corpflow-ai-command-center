import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../../components/app/AppShell.js';
import AppLoadState from '../../../components/app/AppLoadState.js';
import CoreMenu from '../../../components/app/CoreMenu.js';
import ProspectDetailPanel from '../../../components/app/ProspectDetailPanel.js';

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
 * Operating Workspace — shared Prospect detail (#994).
 * Core / admin session only. Tenant sessions are denied.
 */
export default function AppProspectDetailPage() {
  const router = useRouter();
  const [shell, setShell] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [prospect, setProspect] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [dataSource, setDataSource] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);

  const proofWanted = router.isReady && proofFromQuery(router.query);
  const prospectId = router.isReady ? idFromQuery(router.query) : '';

  const apiBase = useMemo(() => {
    const params = new URLSearchParams();
    params.set('env', 'core');
    if (proofWanted) params.set('proof', '1');
    if (prospectId) params.set('id', prospectId);
    return params.toString();
  }, [proofWanted, prospectId]);

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

      const detailRes = await fetch(`/api/app/prospect?${apiBase}`, { credentials: 'same-origin' });
      const detailJson = await detailRes.json().catch(() => ({}));
      if (detailRes.status === 403) {
        setAccessDenied(true);
        setError(String(detailJson.error || 'core_access_denied'));
        setProspect(null);
        return;
      }
      if (detailRes.status === 404) {
        setProspect(null);
        setError(String(detailJson.error || 'prospect_not_found'));
        return;
      }
      if (!detailRes.ok || !detailJson.ok) {
        setError(String(detailJson.error || `prospect_${detailRes.status}`));
        setProspect(null);
        return;
      }
      setProspect(detailJson.prospect && typeof detailJson.prospect === 'object' ? detailJson.prospect : null);
      if (detailJson.data_source) setDataSource(String(detailJson.data_source));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed');
      setShell(null);
      setProspect(null);
    } finally {
      setBusy(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (!router.isReady) return;
    load();
  }, [router.isReady, load]);

  const save = useCallback(
    async (fields) => {
      setSaving(true);
      setFormError('');
      setSaved(false);
      try {
        const res = await fetch(`/api/app/prospect?${apiBase}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...fields, id: prospectId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          setFormError(String(json.error || `save_${res.status}`));
          return;
        }
        setProspect(json.prospect && typeof json.prospect === 'object' ? json.prospect : null);
        setSaved(true);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'save_failed');
      } finally {
        setSaving(false);
      }
    },
    [apiBase, prospectId],
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
  const loginNext = prospectId
    ? `/app/prospects/${encodeURIComponent(prospectId)}`
    : '/app/prospects';

  if (authRequired) {
    return (
      <AppShell environment="core" role="—">
        <section className="cf-app-panel" data-testid="app-auth-required">
          <h1 className="cf-app-h1">Sign in to the Operating Workspace</h1>
          <p className="cf-app-lead">
            Shared Prospect detail is staff-only. Use the existing Core / admin session.
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
            A Tenant session cannot open shared Prospect detail. Sign in with Core credentials.
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
          title="Prospect detail unavailable"
          message={error}
          testId="app-prospect-detail-error"
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
        disabled={busy || saving}
        proofWanted={proofWanted}
        onSelect={() => {
          router.push(proofWanted ? '/app/core?proof=1' : '/app/core');
        }}
      />
      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }} data-testid="prospect-detail-meta">
        Operating Workspace · shared Prospect detail · staff only · no Tenant leakage
      </p>
      {error && !formError ? <p className="cf-app-error" data-testid="app-error">{error}</p> : null}
      {busy ? <AppLoadState kind="loading" title="Loading prospect…" /> : null}
      <ProspectDetailPanel
        prospect={prospect || {}}
        dataSource={dataSource}
        busy={busy}
        saving={saving}
        error={formError}
        saved={saved}
        proofWanted={proofWanted}
        onSave={save}
      />
    </AppShell>
  );
}
