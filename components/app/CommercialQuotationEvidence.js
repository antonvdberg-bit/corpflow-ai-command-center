/**
 * Operating Workspace Commercial → ERPNext quotation evidence (#1160).
 * Read-only. Returns to Commercial summary and shared Prospect detail.
 * No payment, send, or ERPNext mutation.
 *
 * @param {{
 *   payload: Record<string, unknown>,
 *   proofWanted?: boolean,
 * }} props
 */
export default function CommercialQuotationEvidence({ payload, proofWanted }) {
  const row = payload && typeof payload === 'object' ? payload : {};
  const commercial =
    row.commercial && typeof row.commercial === 'object' ? /** @type {Record<string, unknown>} */ (row.commercial) : {};
  const quotation =
    row.quotation && typeof row.quotation === 'object' ? /** @type {Record<string, unknown>} */ (row.quotation) : {};
  const print = row.print && typeof row.print === 'object' ? /** @type {Record<string, unknown>} */ (row.print) : {};
  const back = row.back && typeof row.back === 'object' ? /** @type {Record<string, unknown>} */ (row.back) : {};
  const commercialHref = String(back.commercial || (proofWanted ? '/app/commercial?proof=1&filter=all' : '/app/commercial'));
  const prospectHref = back.prospect ? String(back.prospect) : '';
  const printHref = print.href ? String(print.href) : '';
  const name = String(quotation.name || '—');

  return (
    <section className="cf-app-panel" data-testid="commercial-quotation-evidence">
      <h1 className="cf-app-h1">ERPNext quotation evidence</h1>
      <p className="cf-app-lead">
        Authoritative status for the quotation already recorded on this Commercial row.
        Values are a bounded ERPNext GET. This does not copy the quotation into CorpFlowAI,
        take payment, send a quote, or write to ERPNext.
      </p>
      <p className="cf-app-muted">
        Commercial <code>{String(commercial.id || '—')}</code>
        {' · '}
        {String(commercial.prospect_label || commercial.prospect_id || '—')}
        {' · '}
        {String(commercial.commercial_state_label || commercial.commercial_state || '—')}
      </p>

      <dl className="cf-app-dl" data-testid="commercial-quotation-fields">
        <div>
          <dt>Quotation</dt>
          <dd data-testid="commercial-quotation-id">{name}</dd>
        </div>
        <div>
          <dt>Docstatus</dt>
          <dd data-testid="commercial-quotation-docstatus">
            {quotation.docstatus == null ? '—' : String(quotation.docstatus)}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd data-testid="commercial-quotation-status">{String(quotation.status || '—')}</dd>
        </div>
        <div>
          <dt>Currency</dt>
          <dd data-testid="commercial-quotation-currency">{String(quotation.currency || '—')}</dd>
        </div>
        <div>
          <dt>Grand total</dt>
          <dd data-testid="commercial-quotation-total">
            {quotation.grand_total == null ? '—' : String(quotation.grand_total)}
          </dd>
        </div>
        <div>
          <dt>Customer</dt>
          <dd>{String(quotation.customer || quotation.party_name || '—')}</dd>
        </div>
        <div>
          <dt>Print format</dt>
          <dd>{String(print.format || quotation.print_format || '—')}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{String(quotation.source || '—')}</dd>
        </div>
      </dl>

      <div className="cf-app-actions" style={{ marginTop: 20 }}>
        {printHref && print.available !== false ? (
          <a
            className="cf-app-btn"
            data-primary="true"
            href={printHref}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="commercial-quotation-pdf"
          >
            Open printable PDF
          </a>
        ) : (
          <span className="cf-app-muted" data-testid="commercial-quotation-pdf-unavailable">
            Printable PDF unavailable
          </span>
        )}
        <a className="cf-app-btn" href={commercialHref} data-testid="commercial-quotation-back-commercial">
          Back to Commercial
        </a>
        {prospectHref ? (
          <a className="cf-app-btn" href={prospectHref} data-testid="commercial-quotation-back-prospect">
            Back to Prospect
          </a>
        ) : null}
      </div>
      <p className="cf-app-muted" style={{ marginTop: 16 }} data-testid="commercial-quotation-guards">
        ERPNext mutated: no · copied to Postgres: no · payment: no · send: no
      </p>
    </section>
  );
}
