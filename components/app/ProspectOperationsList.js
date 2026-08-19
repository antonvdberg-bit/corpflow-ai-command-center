/**
 * Operating Workspace — shared Prospect Operations / Today list (#772 / #721 / #699 / #994).
 * Opens the shared Prospect detail surface. Temporary product-desk links remain.
 * No live email / WhatsApp / SMS send.
 *
 * @param {{
 *   prospects: Array<Record<string, unknown>>,
 *   dataSource?: string,
 *   busy?: boolean,
 *   title?: string,
 *   lead?: string,
 *   testId?: string,
 *   proofWanted?: boolean,
 *   selectedId?: string,
 *   onSelect?: (id: string) => void,
 *   showEnquiryHandoff?: boolean,
 * }} props
 */
export default function ProspectOperationsList({
  prospects,
  dataSource,
  busy,
  title = 'Prospect Operations',
  lead,
  testId = 'prospect-ops',
  proofWanted,
  selectedId = '',
  onSelect,
  showEnquiryHandoff = true,
}) {
  const rows = Array.isArray(prospects) ? prospects : [];
  const leadText =
    lead ||
    'Canonical staff queue for CorpFlowAI market enquiries and product intakes. Same Postgres leads rows — no second CRM. Copy-ready drafts only; no automatic send.';
  const selected = selectedId ? rows.find((row) => String(row.id) === String(selectedId)) : null;

  if (busy) return null;
  if (rows.length === 0) {
    return (
      <section className="cf-app-panel" data-testid={`${testId}-empty`}>
        <h1 className="cf-app-h1">{title}</h1>
        <p className="cf-app-lead">
          No shared prospect records in this view yet. Canonical Action Queue is{' '}
          <a href="/app/queue">/app/queue</a>. Temporary product desks remain at{' '}
          <a href="/admin/rapid-delivery">/admin/rapid-delivery</a> and{' '}
          <a href="/admin/lead-rescue">/admin/lead-rescue</a>. Tenant{' '}
          <a href="/change">/change</a> is not the enquiry desk.
        </p>
        {dataSource ? (
          <p className="cf-app-muted">
            Data source <code data-testid={`${testId}-data-source`}>{dataSource}</code>
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <>
      <section className="cf-app-panel" data-testid={`${testId}-list`}>
        <h1 className="cf-app-h1">{title}</h1>
        <p className="cf-app-lead">{leadText}</p>
        {dataSource ? (
          <p className="cf-app-muted">
            Data source <code data-testid={`${testId}-data-source`}>{dataSource}</code>
            {' · '}
            {rows.length} prospect{rows.length === 1 ? '' : 's'}
          </p>
        ) : null}
        <div className="cf-app-table-wrap">
          <table className="cf-app-table">
            <thead>
              <tr>
                <th>Prospect</th>
                <th>Owner</th>
                <th>Stage / status</th>
                <th>Urgency</th>
                <th>Next action</th>
                <th>Due</th>
                <th>Last activity</th>
                <th>Recommended</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = String(row.id || '');
                const name = String(row.organisation_name || row.person_name || id);
                const signals = Array.isArray(row.exception_signals) ? row.exception_signals : [];
                const shared = row.shared_detail_path ? String(row.shared_detail_path) : `/app/prospects/${encodeURIComponent(id)}`;
                const sharedHref =
                  shared && proofWanted ? `${shared}${shared.includes('?') ? '&' : '?'}proof=1` : shared;
                const productDesk = row.detail_path ? String(row.detail_path) : '';
                const isSelected = String(selectedId) === id;
                return (
                  <tr
                    key={id}
                    data-testid={`prospect-ops-row-${id}`}
                    data-selected={isSelected ? 'true' : 'false'}
                  >
                    <td>
                      <strong>{name}</strong>
                      <div className="cf-app-muted">{String(row.reference || id)}</div>
                      <div className="cf-app-muted">{String(row.product || row.person_name || '')}</div>
                      {signals.length > 0 ? (
                        <div>
                          {signals.map((signal) => (
                            <span key={String(signal)} className="cf-app-signal">
                              {String(signal)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td>{String(row.owner || '—')}</td>
                    <td>
                      {String(row.canonical_stage || '—')}
                      <div className="cf-app-muted">{String(row.native_status_label || row.native_status || '')}</div>
                    </td>
                    <td>{String(row.urgency || row.priority || '—')}</td>
                    <td>{String(row.next_action || '—')}</td>
                    <td>{row.next_action_due ? String(row.next_action_due) : '—'}</td>
                    <td>{row.last_meaningful_activity_at ? String(row.last_meaningful_activity_at) : '—'}</td>
                    <td>{String(row.recommended_next_action || '—')}</td>
                    <td>
                      <a href={sharedHref} data-testid={`prospect-ops-shared-detail-${id}`}>
                        Shared detail
                      </a>
                      {onSelect ? (
                        <div>
                          <button
                            type="button"
                            className="cf-app-btn"
                            data-testid={`prospect-ops-open-${id}`}
                            onClick={() => onSelect(id)}
                          >
                            {isSelected ? 'Selected' : 'Handoff'}
                          </button>
                        </div>
                      ) : null}
                      {productDesk ? (
                        <div className="cf-app-muted">
                          <a href={productDesk} data-testid={`prospect-ops-detail-${id}`}>
                            Product desk
                          </a>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {showEnquiryHandoff && selected ? <ProspectEnquiryDetail prospect={selected} testId={testId} /> : null}
    </>
  );
}

/**
 * #699 enquiry handoff fields. Not a second detail implementation — shared
 * history/actions live on `/app/prospects/[id]`.
 *
 * @param {{ prospect: Record<string, unknown>, testId?: string }} props
 */
function ProspectEnquiryDetail({ prospect, testId = 'prospect-ops' }) {
  const draft = String(prospect.response_draft || '');
  const productDesk =
    prospect.source_surfaces && typeof prospect.source_surfaces === 'object'
      ? String(/** @type {Record<string, unknown>} */ (prospect.source_surfaces).product_detail || '')
      : '';
  const shared = prospect.shared_detail_path ? String(prospect.shared_detail_path) : '';

  async function copyDraft() {
    if (!draft || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
      /* copy is best-effort; never send */
    }
  }

  const fields = [
    ['Source', prospect.source || '—'],
    ['Business', prospect.organisation_name || '—'],
    ['Contact', prospect.person_name || '—'],
    ['Email', prospect.email || '—'],
    ['Phone / WhatsApp', prospect.phone || '—'],
    ['Website', prospect.website || '—'],
    ['Selected offer', prospect.offer_title || prospect.offer_slug || '—'],
    ['Service path', prospect.product_service_path || '—'],
    ['Problem / outcome', prospect.problem_summary || '—'],
    ['Enquiry channels', prospect.enquiry_channels || '—'],
    ['Timing', prospect.urgency || '—'],
    ['Consent', prospect.consent_contact ? 'Yes — may contact' : '—'],
    ['Owner', prospect.owner || '—'],
    ['Status', prospect.native_status_label || prospect.canonical_stage || '—'],
    ['Next action', prospect.next_action || prospect.recommended_next_action || '—'],
    ['Notes', prospect.notes || '—'],
    ['Reference', prospect.reference || prospect.id || '—'],
  ];

  return (
    <section className="cf-app-panel" data-testid={`${testId}-detail`} data-market-enquiry-fields>
      <h2 className="cf-app-h1">Enquiry handoff</h2>
      <p className="cf-app-lead">
        Operator-visible fields from the existing lead record. Copy the draft if needed. Full
        actions and history open on the shared Prospect detail surface. Nothing is sent
        automatically.
      </p>
      <dl className="cf-app-dl">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>
      <div data-recommended-next-action className="cf-app-draft-block">
        <div className="cf-app-muted">Recommended next action</div>
        <p>
          {String(
            prospect.recommended_next_action ||
              prospect.next_action ||
              'Review enquiry and reply with the copy-ready draft.',
          )}
        </p>
      </div>
      <div data-response-draft className="cf-app-draft-block">
        <div className="cf-app-muted">Copy-ready response draft · no live send</div>
        <textarea className="cf-app-draft" readOnly value={draft} rows={8} />
        <div className="cf-app-actions" style={{ marginTop: 10 }}>
          <button type="button" className="cf-app-btn" data-primary="true" onClick={copyDraft}>
            Copy response draft
          </button>
          {shared ? (
            <a className="cf-app-btn" href={shared}>
              Shared detail
            </a>
          ) : null}
          {productDesk ? (
            <a className="cf-app-btn" href={productDesk}>
              Temporary product desk
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
