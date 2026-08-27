import { COMMERCIAL_FILTERS, COMMERCIAL_STATE_LABELS } from '../../lib/app/commercial-summary-constants.js';
import { CLIENTS_SUMMARY_PATH, COMPANY_MASTER_PATH } from '../../lib/app/workspace-context.js';

const FILTER_LABELS = Object.freeze({
  needs_attention: 'Needs attention',
  all: 'All',
  ...COMMERCIAL_STATE_LABELS,
});

/**
 * Operating Workspace Commercial summary (#1004).
 * Read-only. Opens shared Prospect detail and Clients / Company Master identity.
 * No payment, send, or ERPNext mutation.
 *
 * @param {{
 *   rows: Array<Record<string, unknown>>,
 *   dataSource?: string,
 *   busy?: boolean,
 *   filter?: string,
 *   filterCounts?: Record<string, number>,
 *   proofWanted?: boolean,
 *   onFilter?: (filter: string) => void,
 * }} props
 */
export default function CommercialSummary({
  rows,
  dataSource,
  busy,
  filter = 'needs_attention',
  filterCounts = {},
  proofWanted,
  onFilter,
}) {
  const list = Array.isArray(rows) ? rows : [];

  if (busy) return null;

  return (
    <>
      <section className="cf-app-panel" data-testid="commercial-summary">
        <h1 className="cf-app-h1">Commercial</h1>
        <p className="cf-app-lead">
          Prospect / client commercial state in one Operating Workspace surface. Values come from
          the existing proposal, acceptance, payment-evidence and financial-approval rail. Rows open
          shared Prospect detail at <code>/app/prospects/</code>. An existing ERPNext quotation
          reference opens bounded status and printable evidence. This does not take payment, send a
          quote, or write to ERPNext.
        </p>
        {dataSource ? (
          <p className="cf-app-muted">
            Data source <code data-testid="commercial-data-source">{dataSource}</code>
            {' · '}
            {list.length} in this filter
            {' · '}
            canonical <code>/app/commercial</code>
            {' · '}
            clients <code>/app/clients</code>
            {' · '}
            identity <code>/admin/company-master</code>
          </p>
        ) : null}

        <div
          className="cf-app-filter-row"
          data-testid="commercial-filters"
          role="tablist"
          aria-label="Commercial filters"
        >
          {COMMERCIAL_FILTERS.map((id) => {
            const count = filterCounts && filterCounts[id] != null ? Number(filterCounts[id]) : null;
            const active = String(filter) === id;
            return (
              <button
                key={id}
                type="button"
                className="cf-app-btn"
                data-primary={active ? 'true' : undefined}
                data-testid={`commercial-filter-${id}`}
                aria-pressed={active ? 'true' : 'false'}
                onClick={() => onFilter && onFilter(id)}
              >
                {FILTER_LABELS[id] || id}
                {count != null ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>
      </section>

      {list.length === 0 ? (
        <section className="cf-app-panel" data-testid="commercial-empty">
          <p className="cf-app-lead">No commercial records match this filter.</p>
        </section>
      ) : (
        <section className="cf-app-panel" data-testid="commercial-list">
          <div className="cf-app-table-wrap">
            <table className="cf-app-table">
              <thead>
                <tr>
                  <th>Prospect / client</th>
                  <th>Commercial state</th>
                  <th>Proposal / acceptance</th>
                  <th>Payment evidence</th>
                  <th>ERPNext / refs</th>
                  <th>Blocker</th>
                  <th>Owner</th>
                  <th>Next action</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const id = String(row.id || '');
                  const name = String(row.client_label || row.prospect_label || id);
                  const shared = row.shared_detail_path ? String(row.shared_detail_path) : '';
                  const sharedHref =
                    shared && proofWanted
                      ? `${shared}${shared.includes('?') ? '&' : '?'}proof=1`
                      : shared;
                  const clientsPath = row.clients_path ? String(row.clients_path) : CLIENTS_SUMMARY_PATH;
                  const clientsHref =
                    proofWanted
                      ? `${clientsPath}${clientsPath.includes('?') ? '&' : '?'}proof=1`
                      : clientsPath;
                  const erp = row.erpnext && typeof row.erpnext === 'object' ? row.erpnext : {};
                  const blockers = Array.isArray(row.blockers) ? row.blockers : [];
                  return (
                    <tr
                      key={id}
                      data-testid={`commercial-row-${id}`}
                      data-state={String(row.commercial_state || '')}
                      data-financially-approved={row.financially_approved === true ? 'true' : 'false'}
                    >
                      <td>
                        <strong>{name}</strong>
                        <div className="cf-app-muted">{String(row.opportunity_ref || id)}</div>
                        <div className="cf-app-muted">{String(row.product || '')}</div>
                      </td>
                      <td>
                        {String(row.commercial_state_label || row.commercial_state || '—')}
                        {row.financial_gate_blocking === true ? (
                          <div className="cf-app-signal">financial_gate_blocking</div>
                        ) : null}
                      </td>
                      <td>
                        {String(row.proposal_status || '—')}
                        <div className="cf-app-muted">
                          {row.proposal_version ? `v ${String(row.proposal_version)}` : 'no version'}
                          {' · '}
                          {String(row.acceptance_status || 'no acceptance')}
                        </div>
                      </td>
                      <td>
                        {String(row.payment_evidence_status || '—')}
                        <div className="cf-app-muted">{String(row.payment_evidence_ref || 'no evidence ref')}</div>
                      </td>
                      <td>
                        <div className="cf-app-muted">Quotation {String(erp.quotation || '—')}</div>
                        {row.quotation_evidence_path ? (
                          <div>
                            <a
                              href={
                                proofWanted
                                  ? `${String(row.quotation_evidence_path)}${
                                      String(row.quotation_evidence_path).includes('?') ? '&' : '?'
                                    }proof=1`
                                  : String(row.quotation_evidence_path)
                              }
                              data-testid={`commercial-quotation-${id}`}
                            >
                              Open quotation evidence
                            </a>
                          </div>
                        ) : null}
                        <div className="cf-app-muted">Pro-forma {String(erp.proforma || '—')}</div>
                        <div className="cf-app-muted">Invoice {String(erp.sales_invoice || '—')}</div>
                      </td>
                      <td>{blockers[0] ? String(blockers[0]) : '—'}</td>
                      <td>{String(row.owner || '—')}</td>
                      <td>{String(row.next_action || '—')}</td>
                      <td>
                        {sharedHref ? (
                          <a href={sharedHref} data-testid={`commercial-shared-detail-${id}`}>
                            Prospect detail
                          </a>
                        ) : (
                          <span className="cf-app-muted">No prospect link</span>
                        )}
                        <div>
                          <a href={clientsHref} data-testid={`commercial-clients-${id}`}>
                            Clients summary
                          </a>
                        </div>
                        <div>
                          <a
                            href={String(row.company_master_href || COMPANY_MASTER_PATH)}
                            data-testid={`commercial-company-master-${id}`}
                          >
                            Company Master
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
