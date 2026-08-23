import { ACTION_QUEUE_FILTERS } from '../../lib/cmp/_lib/prospect-operations-view-model.js';

const FILTER_LABELS = Object.freeze({
  needs_action: 'Needs action now',
  all: 'All',
  new: 'New',
  overdue: 'Overdue',
  due_today: 'Due today',
  no_next_action: 'No next action',
  awaiting_prospect: 'Awaiting prospect/client',
  awaiting_operator: 'Awaiting CorpFlowAI',
  awaiting_protected_approval: 'Awaiting protected approval',
});

/**
 * Canonical Prospect Action Queue (#995).
 * Opens `/app/prospects/[id]` for shared detail. Safe PATCH uses existing write paths.
 * No external send.
 *
 * @param {{
 *   prospects: Array<Record<string, unknown>>,
 *   dataSource?: string,
 *   busy?: boolean,
 *   saving?: boolean,
 *   saved?: boolean,
 *   error?: string,
 *   filter?: string,
 *   filterCounts?: Record<string, number>,
 *   proofWanted?: boolean,
 *   selectedId?: string,
 *   onFilter?: (filter: string) => void,
 *   onSelect?: (id: string) => void,
 *   onSave?: (fields: Record<string, unknown>) => void,
 * }} props
 */
export default function ProspectActionQueue({
  prospects,
  dataSource,
  busy,
  saving,
  saved,
  error,
  filter = 'needs_action',
  filterCounts = {},
  proofWanted,
  selectedId = '',
  onFilter,
  onSelect,
  onSave,
}) {
  const rows = Array.isArray(prospects) ? prospects : [];
  const selected = selectedId ? rows.find((row) => String(row.id) === String(selectedId)) : null;
  const canPatch = selected && selected.product && selected.product !== 'unknown';

  if (busy) return null;

  return (
    <>
      <section className="cf-app-panel" data-testid="action-queue">
        <h1 className="cf-app-h1">Prospect Action Queue</h1>
        <p className="cf-app-lead">
          What needs action now? Lead Rescue, Website Rescue, and general market enquiries share
          one Operating Workspace queue over existing Postgres <code>leads</code>. Opening a row
          uses the shared Prospect detail surface. Temporary desks remain until later slices.
        </p>
        {dataSource ? (
          <p className="cf-app-muted">
            Data source <code data-testid="action-queue-data-source">{dataSource}</code>
            {' · '}
            {rows.length} in this filter
            {' · '}
            canonical <code>/app/queue</code>
          </p>
        ) : null}

        <div className="cf-app-filter-row" data-testid="action-queue-filters" role="tablist" aria-label="Action Queue filters">
          {ACTION_QUEUE_FILTERS.map((id) => {
            const count = filterCounts && filterCounts[id] != null ? Number(filterCounts[id]) : null;
            const active = String(filter) === id;
            return (
              <button
                key={id}
                type="button"
                className="cf-app-btn"
                data-primary={active ? 'true' : undefined}
                data-testid={`action-queue-filter-${id}`}
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

      {rows.length === 0 ? (
        <section className="cf-app-panel" data-testid="action-queue-empty">
          <p className="cf-app-lead">No prospects match this filter.</p>
        </section>
      ) : (
        <section className="cf-app-panel" data-testid="action-queue-list">
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
                  const shared = row.shared_detail_path
                    ? String(row.shared_detail_path)
                    : `/app/prospects/${encodeURIComponent(id)}`;
                  const sharedHref =
                    shared && proofWanted ? `${shared}${shared.includes('?') ? '&' : '?'}proof=1` : shared;
                  const isSelected = String(selectedId) === id;
                  return (
                    <tr
                      key={id}
                      data-testid={`action-queue-row-${id}`}
                      data-selected={isSelected ? 'true' : 'false'}
                      data-product={String(row.product || '')}
                    >
                      <td>
                        <strong>{name}</strong>
                        <div className="cf-app-muted">{String(row.reference || id)}</div>
                        <div className="cf-app-muted">{String(row.product || 'general')}</div>
                        {signals.map((signal) => (
                          <span key={String(signal)} className="cf-app-signal">
                            {String(signal)}
                          </span>
                        ))}
                      </td>
                      <td>{String(row.owner || '—')}</td>
                      <td>
                        {String(row.canonical_stage || '—')}
                        <div className="cf-app-muted">
                          {String(row.native_status_label || row.native_status || '')}
                        </div>
                      </td>
                      <td>{String(row.urgency || row.priority || '—')}</td>
                      <td>{String(row.next_action || '—')}</td>
                      <td>{row.next_action_due ? String(row.next_action_due) : '—'}</td>
                      <td>
                        {row.last_meaningful_activity_at ? String(row.last_meaningful_activity_at) : '—'}
                      </td>
                      <td>{String(row.recommended_next_action || '—')}</td>
                      <td>
                        <a href={sharedHref} data-testid={`action-queue-shared-detail-${id}`}>
                          Shared detail
                        </a>
                        <div>
                          <button
                            type="button"
                            className="cf-app-btn"
                            data-testid={`action-queue-select-${id}`}
                            onClick={() => onSelect && onSelect(id)}
                          >
                            {isSelected ? 'Editing' : 'Quick edit'}
                          </button>
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

      {selected ? (
        <section className="cf-app-panel" data-testid="action-queue-editor">
          <h2 className="cf-app-h1">Safe operator update</h2>
          <p className="cf-app-lead">
            Uses the existing shared Prospect PATCH path. Does not send email, WhatsApp, SMS, or take
            payment. Full history stays on shared detail.
          </p>
          {!canPatch ? (
            <p className="cf-app-muted" data-testid="action-queue-editor-readonly">
              General market enquiries are visible here. Safe JSON writes exist for Lead Rescue and
              Website Rescue records. Open shared detail to review.
            </p>
          ) : (
            <form
              key={String(selected.id) + String(selected.updated_at || '')}
              data-testid="action-queue-form"
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
                  id: String(selected.id),
                  owner: value('owner'),
                  status: value('status'),
                  next_action: value('next_action'),
                  next_action_due: value('next_action_due')
                    ? new Date(value('next_action_due')).toISOString()
                    : '',
                  urgency: value('urgency'),
                  priority: value('urgency'),
                  note_append: value('note_append'),
                });
              }}
            >
              <div className="cf-app-form-grid">
                <label className="cf-app-label">
                  Owner
                  <input
                    className="cf-app-input"
                    name="owner"
                    defaultValue={String(selected.owner || '')}
                    data-testid="action-queue-owner"
                  />
                </label>
                <label className="cf-app-label">
                  Status
                  <input
                    className="cf-app-input"
                    name="status"
                    defaultValue={String(selected.native_status || '')}
                    data-testid="action-queue-status"
                  />
                </label>
                <label className="cf-app-label">
                  Urgency / priority
                  <input
                    className="cf-app-input"
                    name="urgency"
                    defaultValue={String(selected.urgency || selected.priority || '')}
                    data-testid="action-queue-urgency"
                  />
                </label>
                <label className="cf-app-label">
                  Next action
                  <input
                    className="cf-app-input"
                    name="next_action"
                    defaultValue={String(selected.next_action || '')}
                    data-testid="action-queue-next-action"
                  />
                </label>
                <label className="cf-app-label">
                  Due date
                  <input
                    className="cf-app-input"
                    name="next_action_due"
                    type="datetime-local"
                    defaultValue={toDatetimeLocal(selected.next_action_due)}
                    data-testid="action-queue-due"
                  />
                </label>
              </div>
              <label className="cf-app-label" style={{ marginTop: 12 }}>
                Operator note
                <textarea
                  className="cf-app-textarea"
                  name="note_append"
                  placeholder="Add a note. Recorded with actor and timestamp."
                  data-testid="action-queue-note"
                />
              </label>
              {error ? (
                <p className="cf-app-error" data-testid="action-queue-error">
                  {error}
                </p>
              ) : null}
              {saved ? (
                <p className="cf-app-ok" data-testid="action-queue-saved">
                  Saved. Refresh keeps the same values.
                </p>
              ) : null}
              <div className="cf-app-actions">
                <button type="submit" className="cf-app-btn" data-primary="true" disabled={saving}>
                  {saving ? 'Saving…' : 'Save operator update'}
                </button>
                <a
                  className="cf-app-btn"
                  href={
                    proofWanted
                      ? `${String(selected.shared_detail_path)}?proof=1`
                      : String(selected.shared_detail_path || `/app/prospects/${encodeURIComponent(String(selected.id))}`)
                  }
                >
                  Open shared detail
                </a>
              </div>
            </form>
          )}
        </section>
      ) : null}
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
