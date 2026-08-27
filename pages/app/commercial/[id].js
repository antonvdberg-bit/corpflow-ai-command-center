import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../../components/app/AppShell.js';
import AppLoadState from '../../../components/app/AppLoadState.js';
import CoreMenu from '../../../components/app/CoreMenu.js';
import CommercialQuotationEvidence from '../../../components/app/CommercialQuotationEvidence.js';

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
 * Operating Workspace — Commercial ERPNext quotation evidence (#1160).
 * Core / admin session only. Tenant sessions are denied.
 * Read-only GET of the already-recorded Quotation. No ERPNext write.
 */
export default function AppCommercialQuotationPage() {
  const router = useRouter();
  const [shell, setShell] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [payload, setPayload] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [dataSource, setDataSource] = useState('');
  const [error, setError] = useState('');
  const [blocker, setBlocker] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(true);

  const proofWanted = router.isReady && proofFromQuery(router.query);
  const commercialId = router.isReady ? idFromQuery(router.query) : '';

  const apiBase = useMemo(() => {
    const params = new URLSearchParams();
    params.set('env', 'core');
    if (proofWanted) params.set('proof', '1');
    if (commercialId) params.set('id', commercialId);
    return params.toString();
  }, [proofWanted, commercialId]);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    setBlocker('');
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

      const detailRes = await fetch(`/api/app/commercial-quotation?${apiBase}`, {
        credentials: 'same-origin',
      });
      const detailJson = await detailRes.json().catch(() => ({}));
      if (detailRes.status === 403) {
        setAccessDenied(true);
        setError(String(detailJson.error || 'core_access_denied'));
        setPayload(null);
        return;
      }
      if (!detailRes.ok || !detailJson.ok) {
        setError(String(detailJson.error || `quotation_${detailRes.status}`));
        setBlocker(detailJson.blocker ? String(detailJson.blocker) : '');
        setPayload(null);
        return;
      }
      setPayload(detailJson && typeof detailJson === 'object' ? detailJson : null);
      if (detailJson.data_source) setDataSource(String(detailJson.data_source));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load_failed');
      setShell(null);
      setPayload(null);
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
  const loginNext = commercialId
    ? `/app/commercial/${encodeURIComponent(commercialId)}`
    : '/app/commercial';
  const commercialListHref = proofWanted ? '/app/commercial?proof=1&filter=all' : '/app/commercial';

  if (authRequired) {
    return (
      <AppShell environment="core" role="—">
        <section className="cf-app-panel" data-testid="app-auth-required">
          <h1 className="cf-app-h1">Sign in to the Operating Workspace</h1>
          <p className="cf-app-lead">
            Commercial quotation evidence is staff-only. Use the existing Core / admin session.
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
            A Tenant session cannot open commercial or ERPNext quotation evidence. Sign in with Core
            credentials.
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
          title="Quotation evidence unavailable"
          message={error}
          testId="app-commercial-quotation-error"
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
        onSelect={() => {
          router.push('/app/core');
        }}
      />
      <p className="cf-app-muted" style={{ marginTop: -8, marginBottom: 16 }} data-testid="commercial-quotation-meta">
        Operating Workspace · Commercial · ERPNext quotation · staff only · GET/read-only
        {dataSource ? (
          <>
            {' · '}data source <code>{dataSource}</code>
          </>
        ) : null}
      </p>
      {error ? (
        <section className="cf-app-panel" data-testid="commercial-quotation-blocker">
          <h1 className="cf-app-h1">Quotation evidence not ready</h1>
          <p className="cf-app-error">{error}</p>
          {blocker ? <p className="cf-app-lead">{blocker}</p> : null}
          <div className="cf-app-actions">
            <a className="cf-app-btn" data-primary="true" href={commercialListHref}>
              Back to Commercial
            </a>
            <button type="button" className="cf-app-btn" onClick={() => load()}>
              Retry
            </button>
          </div>
        </section>
      ) : null}
      {busy ? <AppLoadState kind="loading" title="Loading quotation evidence…" /> : null}
      {!busy && payload ? (
        <CommercialQuotationEvidence payload={payload} proofWanted={proofWanted} />
      ) : null}
    </AppShell>
  );
}
