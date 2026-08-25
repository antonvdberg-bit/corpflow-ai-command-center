/**
 * #551 commercial clearance on shared Prospect detail.
 * Records quotation / acceptance / payment-evidence refs. Never executes payment.
 *
 * @param {{
 *   prospect: Record<string, unknown>,
 *   saving?: boolean,
 *   proofWanted?: boolean,
 *   onSave?: (fields: Record<string, unknown>) => void,
 * }} props
 */
export default function CommercialClearancePanel({ prospect, saving, proofWanted, onSave }) {
  const clearance =
    prospect?.commercial_clearance && typeof prospect.commercial_clearance === 'object'
      ? /** @type {Record<string, unknown>} */ (prospect.commercial_clearance)
      : null;
  if (!clearance) return null;

  const proposal =
    clearance.proposal && typeof clearance.proposal === 'object'
      ? /** @type {Record<string, unknown>} */ (clearance.proposal)
      : {};
  const acceptance =
    clearance.acceptance && typeof clearance.acceptance === 'object'
      ? /** @type {Record<string, unknown>} */ (clearance.acceptance)
      : {};
  const evidence =
    clearance.payment_evidence && typeof clearance.payment_evidence === 'object'
      ? /** @type {Record<string, unknown>} */ (clearance.payment_evidence)
      : {};
  const approval =
    clearance.financial_approval && typeof clearance.financial_approval === 'object'
      ? /** @type {Record<string, unknown>} */ (clearance.financial_approval)
      : {};
  const vocab =
    clearance.vocab && typeof clearance.vocab === 'object'
      ? /** @type {Record<string, unknown>} */ (clearance.vocab)
      : {};
  const blockers = Array.isArray(clearance.blockers) ? clearance.blockers : [];
  const cleared = clearance.commercially_cleared === true;
  const proofQuery = proofWanted ? '?proof=1' : '';
  const linkedClient =
    prospect.linked_client && typeof prospect.linked_client === 'object'
      ? /** @type {Record<string, unknown>} */ (prospect.linked_client)
      : null;
  const clientHref = linkedClient?.summary_path
    ? `${String(linkedClient.summary_path)}${proofWanted ? (String(linkedClient.summary_path).includes('?') ? '&' : '?') + 'proof=1' : ''}`
    : `/app/clients${proofQuery}`;

  return (
    <section
      className="cf-app-panel"
      id="commercial-clearance"
      data-testid="commercial-clearance"
      style={{ marginTop: 18 }}
    >
      <h2 className="cf-app-comp-title">Commercial clearance</h2>
      <p className="cf-app-muted">
        Quote → acceptance → payment evidence → financially approved to start delivery. ERPNext
        names are references only. This does not take payment, send a quote, or write to ERPNext.
      </p>
      <p
        className={cleared ? 'cf-app-ok' : 'cf-app-error'}
        data-testid="commercial-clearance-status"
        data-cleared={cleared ? 'true' : 'false'}
      >
        {String(clearance.clearance_label || (cleared ? 'CLEARED TO BUILD' : 'NOT CLEARED'))}
      </p>
      <dl className="cf-app-kv" data-testid="commercial-clearance-summary">
        <dt>Product</dt>
        <dd>{String(clearance.product || prospect.product || '—')}</dd>
        <dt>ERPNext customer</dt>
        <dd>{String(clearance.erpnext_customer || '—')}</dd>
        <dt>Quotation / pro-forma</dt>
        <dd>{String(proposal.erpnext_quotation || proposal.version || '—')}</dd>
        <dt>Sales invoice / draft</dt>
        <dd>{String(proposal.erpnext_sales_invoice || evidence.invoice_ref || '—')}</dd>
        <dt>Price</dt>
        <dd>
          {proposal.setup_price != null ? String(proposal.setup_price) : '—'}
          {proposal.currency ? ` ${String(proposal.currency)}` : ''}
          {proposal.payment_terms ? ` · ${String(proposal.payment_terms)}` : ''}
        </dd>
        <dt>Acceptance</dt>
        <dd>
          {String(acceptance.status || '—')}
          {acceptance.accepted_by ? ` · ${String(acceptance.accepted_by)}` : ''}
        </dd>
        <dt>Payment evidence</dt>
        <dd>
          {String(evidence.status || '—')}
          {evidence.evidence_ref ? ` · ${String(evidence.evidence_ref)}` : ''}
        </dd>
        <dt>Financial approver</dt>
        <dd>{String(approval.approved_by || '—')}</dd>
        <dt>Next required</dt>
        <dd data-testid="commercial-clearance-next">{String(clearance.next_required || '—')}</dd>
        <dt>Blockers</dt>
        <dd data-testid="commercial-clearance-blockers">
          {blockers.length === 0 ? 'None' : blockers.map((code) => String(code)).join(', ')}
        </dd>
      </dl>
      {proposal.scope_summary ? (
        <p className="cf-app-muted" data-testid="commercial-clearance-scope">
          Scope: {String(proposal.scope_summary)}
        </p>
      ) : null}

      <form
        key={`commercial-${String(prospect.updated_at || prospect.id)}`}
        data-testid="commercial-clearance-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!onSave) return;
          const form = event.currentTarget;
          const value = (name) => {
            const el = form.elements.namedItem(name);
            if (!el || typeof /** @type {{ value?: string }} */ (el).value !== 'string') return '';
            return String(/** @type {{ value: string }} */ (el).value);
          };
          const checked = (name) => {
            const el = form.elements.namedItem(name);
            return Boolean(el && /** @type {{ checked?: boolean }} */ (el).checked);
          };
          const acceptanceTs = value('acceptance_timestamp');
          onSave({
            id: String(prospect.id || ''),
            commercial_approval: {
              erpnext_quotation: value('erpnext_quotation'),
              erpnext_sales_invoice: value('erpnext_sales_invoice'),
              proposal_status: value('proposal_status'),
              proposal_version: value('proposal_version') || value('erpnext_quotation'),
              quoted_currency: value('quoted_currency'),
              setup_price: value('setup_price'),
              payment_terms: value('payment_terms'),
              scope_summary: value('scope_summary'),
              acceptance_status: value('acceptance_status'),
              accepted_by: value('accepted_by'),
              acceptance_timestamp: acceptanceTs ? new Date(acceptanceTs).toISOString() : '',
              acceptance_method: value('acceptance_method'),
              payment_evidence_status: value('payment_evidence_status'),
              payment_evidence_type: value('payment_evidence_type'),
              payment_evidence_ref: value('payment_evidence_ref'),
              payment_evidence_amount: value('payment_evidence_amount'),
              payment_evidence_currency: value('quoted_currency'),
              record_financial_approval: checked('record_financial_approval'),
              approved_by: value('approved_by'),
            },
          });
        }}
      >
        <h3 className="cf-app-comp-title" style={{ marginTop: 16 }}>
          Record commercial evidence
        </h3>
        <div className="cf-app-form-grid">
          <label className="cf-app-label">
            ERPNext quotation / pro-forma
            <input
              className="cf-app-input"
              name="erpnext_quotation"
              defaultValue={String(proposal.erpnext_quotation || proposal.version || '')}
              placeholder="SAL-QTN-2026-00001"
              data-testid="commercial-quotation"
            />
          </label>
          <label className="cf-app-label">
            ERPNext sales invoice (draft ok)
            <input
              className="cf-app-input"
              name="erpnext_sales_invoice"
              defaultValue={String(proposal.erpnext_sales_invoice || evidence.invoice_ref || '')}
              placeholder="ACC-SINV-2026-00002"
              data-testid="commercial-invoice"
            />
          </label>
          <label className="cf-app-label">
            Proposal status
            <select
              className="cf-app-input"
              name="proposal_status"
              defaultValue={String(proposal.status || 'draft')}
              data-testid="commercial-proposal-status"
            >
              {selectOptions(vocab.proposal_statuses, proposal.status || 'draft')}
            </select>
          </label>
          <label className="cf-app-label">
            Proposal version
            <input
              className="cf-app-input"
              name="proposal_version"
              defaultValue={String(proposal.version || '')}
              data-testid="commercial-proposal-version"
            />
          </label>
          <label className="cf-app-label">
            Currency
            <input
              className="cf-app-input"
              name="quoted_currency"
              defaultValue={String(proposal.currency || '')}
              placeholder="USD"
              data-testid="commercial-currency"
            />
          </label>
          <label className="cf-app-label">
            Setup price
            <input
              className="cf-app-input"
              name="setup_price"
              defaultValue={proposal.setup_price != null ? String(proposal.setup_price) : ''}
              data-testid="commercial-price"
            />
          </label>
          <label className="cf-app-label">
            Payment terms
            <select
              className="cf-app-input"
              name="payment_terms"
              defaultValue={String(proposal.payment_terms || 'pilot_full_upfront')}
              data-testid="commercial-terms"
            >
              {selectOptions(vocab.payment_term_options, proposal.payment_terms || 'pilot_full_upfront')}
            </select>
          </label>
          <label className="cf-app-label">
            Acceptance
            <select
              className="cf-app-input"
              name="acceptance_status"
              defaultValue={String(acceptance.status || 'pending')}
              data-testid="commercial-acceptance-status"
            >
              <option value="pending">pending</option>
              <option value="accepted">accepted</option>
              <option value="rejected">rejected</option>
              <option value="withdrawn">withdrawn</option>
            </select>
          </label>
          <label className="cf-app-label">
            Accepted by
            <input
              className="cf-app-input"
              name="accepted_by"
              defaultValue={String(acceptance.accepted_by || '')}
              data-testid="commercial-accepted-by"
            />
          </label>
          <label className="cf-app-label">
            Acceptance time
            <input
              className="cf-app-input"
              name="acceptance_timestamp"
              type="datetime-local"
              defaultValue={toDatetimeLocal(acceptance.acceptance_timestamp)}
              data-testid="commercial-acceptance-at"
            />
          </label>
          <label className="cf-app-label">
            Acceptance method
            <select
              className="cf-app-input"
              name="acceptance_method"
              defaultValue={String(acceptance.acceptance_method || 'email_confirmation')}
              data-testid="commercial-acceptance-method"
            >
              {selectOptions(vocab.acceptance_methods, acceptance.acceptance_method || 'email_confirmation')}
            </select>
          </label>
          <label className="cf-app-label">
            Payment evidence status
            <select
              className="cf-app-input"
              name="payment_evidence_status"
              defaultValue={String(evidence.status || 'pending')}
              data-testid="commercial-payment-status"
            >
              {selectOptions(vocab.payment_evidence_statuses, evidence.status || 'pending')}
            </select>
          </label>
          <label className="cf-app-label">
            Evidence type
            <select
              className="cf-app-input"
              name="payment_evidence_type"
              defaultValue={String(evidence.evidence_type || 'bank_transfer_reference')}
              data-testid="commercial-payment-type"
            >
              {selectOptions(vocab.payment_evidence_types, evidence.evidence_type || 'bank_transfer_reference')}
            </select>
          </label>
          <label className="cf-app-label">
            Payment evidence ref
            <input
              className="cf-app-input"
              name="payment_evidence_ref"
              defaultValue={String(evidence.evidence_ref || '')}
              placeholder="PAY-EV-… or ERPNext Payment Entry name"
              data-testid="commercial-payment-ref"
            />
          </label>
          <label className="cf-app-label">
            Amount evidenced
            <input
              className="cf-app-input"
              name="payment_evidence_amount"
              defaultValue={evidence.amount_evidenced != null ? String(evidence.amount_evidenced) : ''}
              data-testid="commercial-payment-amount"
            />
          </label>
          <label className="cf-app-label">
            Financial approver
            <input
              className="cf-app-input"
              name="approved_by"
              defaultValue={String(approval.approved_by || '')}
              placeholder="Anton"
              data-testid="commercial-approver"
            />
          </label>
        </div>
        <label className="cf-app-label" style={{ marginTop: 12 }}>
          Accepted scope
          <textarea
            className="cf-app-textarea"
            name="scope_summary"
            defaultValue={String(proposal.scope_summary || '')}
            data-testid="commercial-scope"
          />
        </label>
        <label className="cf-app-label" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            name="record_financial_approval"
            data-testid="commercial-record-approval"
          />
          Record financial approval now (still blocked if evidence is incomplete)
        </label>
        <div className="cf-app-actions">
          <button type="submit" className="cf-app-btn" data-primary="true" disabled={saving}>
            {saving ? 'Saving…' : 'Save commercial evidence'}
          </button>
          <a className="cf-app-btn" href={clientHref} data-testid="commercial-open-client">
            Open client
          </a>
        </div>
      </form>
    </section>
  );
}

/**
 * @param {unknown} list
 * @param {unknown} selected
 */
function selectOptions(list, selected) {
  const values = Array.isArray(list) ? list.map((item) => String(item)) : [];
  const current = selected != null && String(selected).trim() ? String(selected) : '';
  const all = current && !values.includes(current) ? [current, ...values] : values;
  return all.map((value) => (
    <option key={value} value={value}>
      {value}
    </option>
  ));
}

/**
 * @param {unknown} iso
 * @returns {string}
 */
function toDatetimeLocal(iso) {
  if (iso == null || !String(iso).trim()) return '';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
