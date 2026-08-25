import CommercialClearancePanel from './CommercialClearancePanel.js';
import DeliveryStatePanel from './DeliveryStatePanel.js';
import LifecycleContinuityRail from './LifecycleContinuityRail.js';

/**
 * Operating Workspace — shared Prospect detail / actions / history (#994).
 * Staff-only. JSON writes only. No external send.
 *
 * @param {{
 *   prospect: Record<string, unknown>,
 *   dataSource?: string,
 *   busy?: boolean,
 *   saving?: boolean,
 *   error?: string,
 *   saved?: boolean,
 *   proofWanted?: boolean,
 *   onSave?: (fields: Record<string, unknown>) => void,
 * }} props
 */
export default function ProspectDetailPanel({
  prospect,
  dataSource,
  busy,
  saving,
  error,
  saved,
  proofWanted,
  onSave,
}) {
  if (busy) return null;
  if (!prospect || !prospect.id) {
    return (
      <section className="cf-app-panel" data-testid="prospect-detail-missing">
        <h1 className="cf-app-h1">Prospect not found</h1>
        <p className="cf-app-lead">This shared detail surface only opens known Lead Rescue or Website Rescue records.</p>
      </section>
    );
  }

  const id = String(prospect.id);
  const title = String(prospect.organisation_name || prospect.person_name || id);
  const signals = Array.isArray(prospect.exception_signals) ? prospect.exception_signals : [];
  const history = Array.isArray(prospect.history) ? prospect.history : [];
  const nativeStatuses = Array.from(
    new Set(
      [prospect.native_status, ...(Array.isArray(prospect.allowed_native_statuses) ? prospect.allowed_native_statuses : [])]
        .map((status) => (status == null ? '' : String(status)))
        .filter(Boolean),
    ),
  );
  const canonicalStages = Array.from(
    new Set(
      [prospect.canonical_stage, ...(Array.isArray(prospect.allowed_canonical_stages) ? prospect.allowed_canonical_stages : [])]
        .map((stage) => (stage == null ? '' : String(stage)))
        .filter(Boolean),
    ),
  );
  const summary =
    prospect.qualification_summary && typeof prospect.qualification_summary === 'object'
      ? /** @type {Record<string, unknown>} */ (prospect.qualification_summary)
      : {};
  const proofQuery = proofWanted ? '?proof=1' : '';
  const productDesk = prospect.product_detail_path || prospect.detail_path;
  const linkedClient =
    prospect.linked_client && typeof prospect.linked_client === 'object'
      ? /** @type {Record<string, unknown>} */ (prospect.linked_client)
      : null;
  const clientHref = linkedClient?.summary_path
    ? proofWanted
      ? `${String(linkedClient.summary_path)}${String(linkedClient.summary_path).includes('?') ? '&' : '?'}proof=1`
      : String(linkedClient.summary_path)
    : '';

  return (
    <>
    <section className="cf-app-panel" data-testid="prospect-detail">
      <h1 className="cf-app-h1">{title}</h1>
      <LifecycleContinuityRail lifecycle={prospect.lifecycle} current="prospect" />
      <p className="cf-app-lead">
        Shared Prospect detail for Lead Rescue and Website Rescue. Same Postgres <code>leads</code> row —
        not a second CRM. Temporary product desks remain until later slices.
      </p>
      {dataSource ? (
        <p className="cf-app-muted">
          Data source <code data-testid="prospect-detail-data-source">{dataSource}</code>
          {' · '}
          {String(prospect.product || '—')}
          {' · '}
          {String(prospect.reference || id)}
        </p>
      ) : null}

      <dl className="cf-app-kv" data-testid="prospect-detail-identity">
        <dt>Person</dt>
        <dd>{String(prospect.person_name || '—')}</dd>
        <dt>Business</dt>
        <dd>
          {String(prospect.organisation_name || '—')}
          {clientHref ? (
            <>
              {' · '}
              <a href={clientHref} data-testid="prospect-linked-client">
                {String(linkedClient?.trading_name || linkedClient?.legal_name || linkedClient?.company_id)}
              </a>
            </>
          ) : null}
        </dd>
        <dt>Email</dt>
        <dd>{String(prospect.email || '—')}</dd>
        <dt>Phone</dt>
        <dd>{String(prospect.phone || '—')}</dd>
        <dt>Source / path</dt>
        <dd>
          {String(prospect.source || '—')}
          {prospect.product_service_path ? ` · ${String(prospect.product_service_path)}` : ''}
        </dd>
        <dt>Qualification</dt>
        <dd>
          {summary.complete === true ? 'Complete' : 'Incomplete'}
          {summary.region_or_offer ? ` · ${String(summary.region_or_offer)}` : ''}
        </dd>
        <dt>Owner</dt>
        <dd>{String(prospect.owner || '—')}</dd>
        <dt>Stage / status</dt>
        <dd>
          {String(prospect.canonical_stage || '—')} / {String(prospect.native_status_label || prospect.native_status || '—')}
        </dd>
        <dt>Urgency</dt>
        <dd>{String(prospect.urgency || prospect.priority || '—')}</dd>
        <dt>Next action</dt>
        <dd>
          {String(prospect.next_action || '—')}
          {prospect.next_action_due ? ` · due ${String(prospect.next_action_due)}` : ''}
        </dd>
        <dt>Current blocker</dt>
        <dd data-testid="prospect-detail-blocker">{String(prospect.current_blocker || '—')}</dd>
        <dt>Recommended next</dt>
        <dd>{String(prospect.recommended_next_action || '—')}</dd>
        <dt>Signals</dt>
        <dd>
          {signals.length === 0
            ? '—'
            : signals.map((signal) => (
                <span key={String(signal)} className="cf-app-signal">
                  {String(signal)}
                </span>
              ))}
        </dd>
      </dl>

      <form
        key={String(prospect.updated_at || prospect.id)}
        data-testid="prospect-detail-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!onSave) return;
          const form = event.currentTarget;
          const value = (name) => {
            const el = form.elements.namedItem(name);
            if (!el || typeof /** @type {{ value?: string }} */ (el).value !== 'string') return '';
            return String(/** @type {{ value: string }} */ (el).value);
          };
          onSave({
            id,
            owner: value('owner'),
            status: value('status'),
            canonical_stage: value('canonical_stage'),
            next_action: value('next_action'),
            next_action_due: value('next_action_due')
              ? new Date(value('next_action_due')).toISOString()
              : '',
            priority: value('priority'),
            urgency: value('urgency'),
            note_append: value('note_append'),
          });
        }}
      >
        <h2 className="cf-app-comp-title" style={{ marginTop: 18 }}>
          Operator actions
        </h2>
        <p className="cf-app-muted">
          Saves into existing product JSON. Does not send email, WhatsApp, SMS, or take payment.
        </p>
        <div className="cf-app-form-grid">
          <label className="cf-app-label">
            Owner
            <input
              className="cf-app-input"
              name="owner"
              defaultValue={String(prospect.owner || '')}
              data-testid="prospect-detail-owner"
            />
          </label>
          <label className="cf-app-label">
            Native status
            <select
              className="cf-app-input"
              name="status"
              defaultValue={String(prospect.native_status || '')}
              data-testid="prospect-detail-status"
            >
              {nativeStatuses.map((status) => (
                <option key={String(status)} value={String(status)}>
                  {String(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="cf-app-label">
            Canonical stage
            <select
              className="cf-app-input"
              name="canonical_stage"
              defaultValue={String(prospect.canonical_stage || '')}
              data-testid="prospect-detail-stage"
            >
              {canonicalStages.map((stage) => (
                <option key={String(stage)} value={String(stage)}>
                  {String(stage)}
                </option>
              ))}
            </select>
          </label>
          <label className="cf-app-label">
            Priority / urgency
            <input
              className="cf-app-input"
              name="urgency"
              defaultValue={String(prospect.urgency || '')}
              data-testid="prospect-detail-urgency"
            />
            <input type="hidden" name="priority" defaultValue={String(prospect.priority || '')} />
          </label>
          <label className="cf-app-label">
            Next action
            <input
              className="cf-app-input"
              name="next_action"
              defaultValue={String(prospect.next_action || '')}
              data-testid="prospect-detail-next-action"
            />
          </label>
          <label className="cf-app-label">
            Due date
            <input
              className="cf-app-input"
              name="next_action_due"
              type="datetime-local"
              defaultValue={toDatetimeLocal(prospect.next_action_due)}
              data-testid="prospect-detail-due"
            />
          </label>
        </div>
        <label className="cf-app-label" style={{ marginTop: 12 }}>
          Operator note
          <textarea
            className="cf-app-textarea"
            name="note_append"
            placeholder="Add a note. This is recorded with actor and timestamp."
            data-testid="prospect-detail-note"
          />
        </label>
        {error ? (
          <p className="cf-app-error" data-testid="prospect-detail-error">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="cf-app-ok" data-testid="prospect-detail-saved">
            Saved. Refresh keeps the same values.
          </p>
        ) : null}
        <div className="cf-app-actions">
          <button type="submit" className="cf-app-btn" data-primary="true" disabled={saving}>
            {saving ? 'Saving…' : 'Save operator update'}
          </button>
          <a className="cf-app-btn" href={`/app/prospects${proofQuery}`}>
            Back to Prospect Operations
          </a>
          <a className="cf-app-btn" href={`/app/today${proofQuery}`}>
            Today / My Work
          </a>
          {productDesk ? (
            <a className="cf-app-btn" href={String(productDesk)}>
              Temporary product desk
            </a>
          ) : null}
          {clientHref ? (
            <a className="cf-app-btn" href={clientHref} data-testid="prospect-open-client">
              Open client
            </a>
          ) : null}
        </div>
      </form>

      <h2 className="cf-app-comp-title" style={{ marginTop: 22 }}>
        Activity and notes
      </h2>
      {history.length === 0 ? (
        <p className="cf-app-muted" data-testid="prospect-detail-history-empty">
          No activity or notes stored yet.
        </p>
      ) : (
        <ol className="cf-app-history" data-testid="prospect-detail-history">
          {history.map((entry, index) => (
            <li key={`${entry.at || 'row'}-${index}`}>
              <strong>{String(entry.kind || 'activity')}</strong>
              <div className="cf-app-muted">
                {String(entry.at || '—')}
                {entry.actor ? ` · ${String(entry.actor)}` : ''}
                {entry.status_after ? ` · status ${String(entry.status_after)}` : ''}
              </div>
              <div>{String(entry.note || entry.next_action || '—')}</div>
            </li>
          ))}
        </ol>
      )}
    </section>
    <CommercialClearancePanel
      prospect={prospect}
      saving={saving}
      proofWanted={proofWanted}
      onSave={onSave}
    />
    <DeliveryStatePanel prospect={prospect} proofWanted={proofWanted} />
    </>
  );
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
