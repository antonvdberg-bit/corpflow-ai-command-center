import {
  DELIVERY_EXCEPTION_FILTERS,
  DELIVERY_EXCEPTION_LABELS,
  DELIVERY_PATH,
} from '../../lib/app/delivery-summary-constants.js';
import { appendProofQuery } from '../../lib/app/workspace-context.js';

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
 *   onFilter?: (filter: string) => void,
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
  onFilter,
}) {
  const rows = Array.isArray(items) ? items : [];

  if (busy) return null;

  return (
    <>
      <section className="cf-app-panel" data-testid="delivery-summary">
        <h1 className="cf-app-h1">Delivery</h1>
        <p className="cf-app-lead">
          Active delivery work from existing Lead Rescue, Website Rescue, and Change / request
          contracts. This is not a second project system. Protected deploy and live client
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
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const protectedGate = row.protected_gate === true;
                  const exception = String(row.primary_exception || '');
                  const evidence = Array.isArray(row.evidence) ? row.evidence : [];
                  return (
                    <tr
                      key={String(row.id)}
                      data-testid={`delivery-row-${row.id}`}
                      data-record-kind={String(row.record_kind || '')}
                      data-protected={protectedGate ? 'true' : 'false'}
                      data-exception={exception || 'none'}
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
                      <td data-label="Evidence">
                        <div className="cf-app-actions" style={{ marginTop: 0 }}>
                          {evidence.map((link) => (
                            <a
                              key={`${row.id}-${link.href}-${link.label}`}
                              className="cf-app-btn"
                              href={appendProofQuery(String(link.href), proofWanted)}
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
            communication / commercial approval gates — this page does not execute them.
          </p>
        </section>
      )}
    </>
  );
}
