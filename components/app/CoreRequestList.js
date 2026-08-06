/**
 * Compact Core request list for global / per-tenant management.
 * @param {{
 *   requests: Array<Record<string, unknown>>,
 *   title: string,
 *   onOpen: (requestId: string) => void,
 *   busy?: boolean,
 * }} props
 */
export default function CoreRequestList({ requests, title, onOpen, busy }) {
  const rows = Array.isArray(requests) ? requests : [];
  return (
    <section className="cf-app-panel" data-testid="core-request-list">
      <h1 className="cf-app-h1">{title}</h1>
      <p className="cf-app-lead">
        Core request management · same synthetic ids · internal fields visible only here
      </p>
      {!rows.length ? (
        <p className="cf-app-muted" data-testid="core-request-list-empty">
          No requests in this view.
        </p>
      ) : (
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
                    Open request / work
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
