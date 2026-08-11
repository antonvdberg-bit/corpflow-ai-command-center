/**
 * Core global request queue with tenant / status / waiting-party filters.
 * @param {{
 *   requests: Array<Record<string, unknown>>,
 *   title?: string,
 *   busy?: boolean,
 *   tenantOptions?: string[],
 *   filters?: { tenant_id?: string | null, status?: string | null, waiting_party?: string | null },
 *   onFilterChange?: (filters: Record<string, string>) => void,
 *   onOpen: (requestId: string) => void,
 * }} props
 */
export default function CoreRequestList({
  requests,
  title = 'Requests',
  busy,
  tenantOptions = [],
  filters = {},
  onFilterChange,
  onOpen,
}) {
  const rows = Array.isArray(requests) ? requests : [];
  const tenantVal = filters.tenant_id != null ? String(filters.tenant_id) : 'all';
  const statusVal = filters.status != null ? String(filters.status) : '';
  const waitingVal = filters.waiting_party != null ? String(filters.waiting_party) : '';

  return (
    <section className="cf-app-panel" data-testid="core-request-list">
      <h1 className="cf-app-h1">{title}</h1>
      <p className="cf-app-lead">
        Global request queue · production-shaped adapters · same canonical ids as Tenant
      </p>

      <div className="cf-app-actions" data-testid="core-request-filters" style={{ marginTop: 12 }}>
        <label className="cf-app-muted" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          Tenant
          <select
            data-testid="core-filter-tenant"
            value={tenantVal}
            disabled={busy}
            onChange={(e) =>
              onFilterChange &&
              onFilterChange({
                tenant_id: e.target.value,
                status: statusVal,
                waiting_party: waitingVal,
              })
            }
          >
            <option value="all">All tenants</option>
            {tenantOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="cf-app-muted" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          Status
          <select
            data-testid="core-filter-status"
            value={statusVal}
            disabled={busy}
            onChange={(e) =>
              onFilterChange &&
              onFilterChange({
                tenant_id: tenantVal,
                status: e.target.value,
                waiting_party: waitingVal,
              })
            }
          >
            <option value="">All statuses</option>
            <option value="Approved">Approved</option>
            <option value="Draft">Draft</option>
            <option value="Closed">Closed</option>
          </select>
        </label>
        <label className="cf-app-muted" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          Waiting
          <select
            data-testid="core-filter-waiting"
            value={waitingVal}
            disabled={busy}
            onChange={(e) =>
              onFilterChange &&
              onFilterChange({
                tenant_id: tenantVal,
                status: statusVal,
                waiting_party: e.target.value,
              })
            }
          >
            <option value="">Any</option>
            <option value="client">Client</option>
            <option value="corpflow">CorpFlow</option>
            <option value="none">None</option>
          </select>
        </label>
      </div>

      {busy ? (
        <p className="cf-app-muted" data-testid="core-request-list-loading">
          Loading authorised requests…
        </p>
      ) : null}

      {!busy && !rows.length ? (
        <div data-testid="core-request-list-empty">
          <p className="cf-app-lead" style={{ marginTop: 16 }}>
            No authorised request / work-package records match this view.
          </p>
          <p className="cf-app-muted">
            Adjust filters, or confirm tickets exist in the read-only request repository for tenants
            you can see.
          </p>
        </div>
      ) : null}

      {!busy && rows.length ? (
        <div className="cf-app-grid" style={{ marginTop: 16 }}>
          {rows.map((r) => {
            const id = String(r.request_id || '');
            return (
              <article key={id} className="cf-app-comp" data-testid={`core-list-${id}`}>
                <div className="cf-app-comp-head">
                  <h2 className="cf-app-comp-title">{String(r.title || id)}</h2>
                  <span className="cf-app-badge">{String(r.status || '—')}</span>
                </div>
                <dl className="cf-app-kv">
                  <dt>Request id</dt>
                  <dd>{id}</dd>
                  <dt>Tenant</dt>
                  <dd>{String(r.tenant_id || '—')}</dd>
                  <dt>Status / milestone</dt>
                  <dd>
                    {String(r.status || '—')} / {String(r.milestone || r.stage || '—')}
                  </dd>
                  <dt>Owner</dt>
                  <dd>{String(r.owner || '—')}</dd>
                  <dt>Waiting party</dt>
                  <dd>{String(r.waiting_party || '—')}</dd>
                  <dt>Next action</dt>
                  <dd>{String(r.next_action || '—')}</dd>
                  <dt>Last update</dt>
                  <dd>{String(r.updated_at || '—')}</dd>
                  <dt>Progress</dt>
                  <dd>{Number(r.progress_percent) || 0}%</dd>
                  <dt>Internal blocker</dt>
                  <dd style={{ color: r.internal_blocker ? 'var(--app-warn)' : undefined }}>
                    {String(r.internal_blocker || 'None')}
                  </dd>
                </dl>
                <div className="cf-app-actions">
                  <button
                    type="button"
                    className="cf-app-btn"
                    data-primary="true"
                    data-testid={`core-open-${id}`}
                    disabled={busy}
                    onClick={() => onOpen(id)}
                  >
                    Open request detail
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
