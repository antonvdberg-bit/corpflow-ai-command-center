import {
  DELIVERY_EXCEPTION_FILTERS,
  DELIVERY_EXCEPTION_LABELS,
  DELIVERY_PATH,
} from '../../lib/app/delivery-summary-constants.js';

/**
 * Operating Workspace Delivery summary (#1005).
 * Staff-only projection. Does not send, deploy, or mutate schema.
 *
 * @param {{
 *   items: Array<Record<string, unknown>>,
 *   dataSource?: string,
 *   busy?: boolean,
 *   error?: string,
 *   filter?: string,
 *   filterCounts?: Record<string, number>,
 *   proofWanted?: boolean,
 *   selected?: Record<string, unknown> | null,
 *   onFilter?: (filter: string) => void,
 *   onSelect?: (id: string) => void,
 * }} props
 */
export default function DeliverySummary({
  items,
  dataSource,
  busy,
  error,
  filter = 'all',
  filterCounts = {},
  proofWanted,
  selected = null,
  onFilter,
  onSelect,
}) {
  const rows = Array.isArray(items) ? items : [];

  if (busy) return null;

  return (
    <>
      <section className="cf-app-panel" data-testid="delivery-summary">
        <h1 className="cf-app-h1">Delivery</h1>
        <p className="cf-app-lead">
          Active delivery work from existing Lead Rescue, Website Rescue, and Change / request
          contracts. ERPNext stays the project and support record where an existing pointer
          already exists. This is not a second project system. Protected deploy and live client
          communication stay marked — they are not executed here.
        </p>
        {dataSource ? (
          <p className="cf-app-muted" data-testid="delivery-summary-meta">
            Data source <code data-testid="delivery-data-source">{dataSource}</code>
            {' · '}
            {rows.length} in this filter
            {' · '}
            canonical <code>{DELIVERY_PATH}</code>
            {proofWanted ? ' · proof harness' : ''}
          </p>
        ) : null}

        <div
          className="cf-app-filter-row"
          data-testid="delivery-filters"
          role="tablist"
          aria-label="Delivery exception filters"
        >
          {DELIVERY_EXCEPTION_FILTERS.map((id) => {
            const count = filterCounts && filterCounts[id] != null ? Number(filterCounts[id]) : null;
            const active = String(filter) === id;
            return (
              <button
                key={id}
                type="button"
                className="cf-app-btn"
                data-primary={active ? 'true' : undefined}
                data-testid={`delivery-filter-${id}`}
                aria-pressed={active ? 'true' : 'false'}
                onClick={() => onFilter && onFilter(id)}
              >
                {DELIVERY_EXCEPTION_LABELS[id] || id}
                {count != null ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>
      </section>

      {error ? (
        <p className="cf-app-error" data-testid="delivery-summary-error">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <section className="cf-app-panel" data-testid="delivery-summary-empty">
          <p className="cf-app-lead">No delivery items match this filter.</p>
        </section>
      ) : (
        <section className="cf-app-panel" data-testid="delivery-summary-list">
          <div className="cf-app-table-wrap">
            <table className="cf-app-table cf-app-delivery-table">
              <thead>
                <tr>
                  <th>Client / business</th>
                  <th>Product / service</th>
                  <th>Stage</th>
                  <th>Owner</th>
                  <th>Blocker</th>
                  <th>Next action</th>
                  <th>Review / approval</th>
                  <th>ERPNext</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const protectedGate = row.protected_gate === true;
                  const exception = String(row.primary_exception || '');
                  const evidence = Array.isArray(row.evidence) ? row.evidence : [];
                  const erpnext =
                    row.erpnext && typeof row.erpnext === 'object'
                      ? /** @type {Record<string, unknown>} */ (row.erpnext)
                      : null;
                  const project =
                    erpnext?.project && typeof erpnext.project === 'object'
                      ? /** @type {Record<string, unknown>} */ (erpnext.project)
                      : null;
                  const issue =
                    erpnext?.issue && typeof erpnext.issue === 'object'
                      ? /** @type {Record<string, unknown>} */ (erpnext.issue)
                      : null;
                  const selectedRow = selected && String(selected.id) === String(row.id);
                  return (
                    <tr
                      key={String(row.id)}
                      data-testid={`delivery-row-${row.id}`}
                      data-record-kind={String(row.record_kind || '')}
                      data-protected={protectedGate ? 'true' : 'false'}
                      data-exception={exception || 'none'}
                      data-erpnext-linked={erpnext?.linked === true ? 'true' : 'false'}
                      data-selected={selectedRow ? 'true' : 'false'}
                    >
                      <td data-label="Client / business">
                        <strong>{String(row.client_business || '—')}</strong>
                        <div className="cf-app-muted">{String(row.record_kind_label || '')}</div>
                      </td>
                      <td data-label="Product / service">{String(row.product_service || '—')}</td>
                      <td data-label="Stage">{String(row.delivery_stage || '—')}</td>
                      <td data-label="Owner">{String(row.owner || 'Unassigned')}</td>
                      <td data-label="Blocker">{String(row.current_blocker || 'None recorded')}</td>
                      <td data-label="Next action">
                        {String(row.next_action || 'None recorded')}
                        {row.next_action_due ? (
                          <div className="cf-app-muted">Due {String(row.next_action_due)}</div>
                        ) : null}
                      </td>
                      <td data-label="Review / approval">
                        {protectedGate ? (
                          <span
                            className="cf-app-badge"
                            data-kind="protected"
                            data-testid="delivery-protected-badge"
                          >
                            {String(row.protected_action_label || 'Protected action')}
                          </span>
                        ) : exception ? (
                          <span className="cf-app-badge" data-kind="exception">
                            {DELIVERY_EXCEPTION_LABELS[exception] || exception}
                          </span>
                        ) : (
                          <span className="cf-app-badge">{String(row.review_approval_state || 'In delivery')}</span>
                        )}
                      </td>
                      <td data-label="ERPNext">
                        {erpnext?.linked === true ? (
                          <div data-testid={`delivery-erpnext-${row.id}`}>
                            {project ? (
                              <div>
                                <strong>{String(project.name)}</strong>
                                {project.status ? (
                                  <span className="cf-app-muted"> · {String(project.status)}</span>
                                ) : (
                                  <span className="cf-app-muted"> · status unread</span>
                                )}
                              </div>
                            ) : null}
                            {issue ? (
                              <div className="cf-app-muted">
                                {String(issue.name)}
                                {issue.status ? ` · ${String(issue.status)}` : ''}
                              </div>
                            ) : null}
                            <button
                              type="button"
                              className="cf-app-btn"
                              data-testid={`delivery-erpnext-open-${row.id}`}
                              onClick={() => onSelect && onSelect(String(row.id))}
                            >
                              Open reference
                            </button>
                          </div>
                        ) : (
                          <span className="cf-app-muted" data-testid={`delivery-erpnext-unlinked-${row.id}`}>
                            Not linked
                          </span>
                        )}
                      </td>
                      <td data-label="Evidence">
                        <div className="cf-app-actions" style={{ marginTop: 0 }}>
                          {evidence.map((link) => (
                            <a
                              key={`${row.id}-${link.href}-${link.label}`}
                              className="cf-app-btn"
                              href={String(link.href)}
                              data-testid={`delivery-link-${link.kind || 'safe'}`}
                            >
                              {String(link.label)}
                            </a>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="cf-app-muted" data-testid="delivery-protected-legend">
            Amber exception badges are operator follow-up. Red protected badges are deploy / client
            communication / commercial approval gates — this page does not execute them. ERPNext
            identifiers are references only; task and support history stay in ERPNext.
          </p>
        </section>
      )}
      {selected ? <DeliveryErpnextReference item={selected} /> : null}
    </>
  );
}

/**
 * @param {{ item: Record<string, unknown> }} props
 */
function DeliveryErpnextReference({ item }) {
  const erpnext =
    item.erpnext && typeof item.erpnext === 'object'
      ? /** @type {Record<string, unknown>} */ (item.erpnext)
      : null;
  const project =
    erpnext?.project && typeof erpnext.project === 'object'
      ? /** @type {Record<string, unknown>} */ (erpnext.project)
      : null;
  const issue =
    erpnext?.issue && typeof erpnext.issue === 'object'
      ? /** @type {Record<string, unknown>} */ (erpnext.issue)
      : null;
  const links = item.links && typeof item.links === 'object' ? item.links : {};
  return (
    <section className="cf-app-panel" data-testid="delivery-erpnext-reference">
      <h2 className="cf-app-h1" style={{ fontSize: '1.15rem' }}>
        ERPNext reference
      </h2>
      <p className="cf-app-lead">
        {String(item.client_business || 'Delivery item')} — ERPNext is authoritative for Project
        and Issue status. CorpFlowAI keeps client, prospect, and Change execution context. Nothing
        is copied into a second project or helpdesk.
      </p>
      <dl className="cf-app-kv" data-testid="delivery-erpnext-reference-fields">
        <div>
          <dt>Delivery record</dt>
          <dd>
            <code>{String(item.id)}</code>
          </dd>
        </div>
        <div>
          <dt>Project</dt>
          <dd data-testid="delivery-erpnext-project">
            {project ? (
              <>
                <code>{String(project.name)}</code>
                {project.status ? ` · ${String(project.status)}` : ' · status unread'}
              </>
            ) : (
              'Not linked'
            )}
          </dd>
        </div>
        <div>
          <dt>Issue</dt>
          <dd data-testid="delivery-erpnext-issue">
            {issue ? (
              <>
                <code>{String(issue.name)}</code>
                {issue.status ? ` · ${String(issue.status)}` : ' · status unread'}
              </>
            ) : (
              'Not linked'
            )}
          </dd>
        </div>
        <div>
          <dt>Status source</dt>
          <dd>
            <code>{String(erpnext?.status_source || 'unlinked')}</code>
          </dd>
        </div>
      </dl>
      <div className="cf-app-actions">
        {links.change ? (
          <a className="cf-app-btn" data-primary="true" href={String(links.change)}>
            Open Change Console
          </a>
        ) : null}
        {links.clients ? (
          <a className="cf-app-btn" href={String(links.clients)}>
            Open Clients
          </a>
        ) : null}
        {links.prospect ? (
          <a className="cf-app-btn" href={String(links.prospect)}>
            Open prospect
          </a>
        ) : null}
        <a className="cf-app-btn" href={DELIVERY_PATH}>
          Back to Delivery list
        </a>
      </div>
    </section>
  );
}
