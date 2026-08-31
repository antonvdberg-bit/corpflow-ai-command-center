import {
  WORKBENCH_FILTERS,
  WORKBENCH_SORT_COLUMNS,
} from '../../lib/cmp/_lib/prospect-operations-view-model.js';

const FILTER_LABELS = Object.freeze({
  all: 'All',
  lead_rescue: 'Lead Rescue',
  website_rescue: 'Website Rescue',
  general: 'General',
  overdue: 'Overdue',
  due_today: 'Due today',
  no_next_action: 'No next action',
  stalled: 'Stalled',
  missing_qualification: 'Missing qualification',
});

const SORT_LABELS = Object.freeze({
  priority: 'Priority',
  prospect: 'Prospect / business',
  product: 'Source / product',
  owner: 'Owner',
  stage: 'Stage / status',
  urgency: 'Urgency',
  next_action: 'Next action',
  due: 'Due date',
  qualification: 'Qualification',
  last_activity: 'Last activity',
  value: 'Est. value',
});

/**
 * Shared Prospect Workbench (#996).
 * Generalises the Lead Rescue grid without product-specific branding.
 * Opens `/app/prospects/[id]`. Safe PATCH uses existing write paths.
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
 *   sort?: string,
 *   dir?: string,
 *   q?: string,
 *   filterCounts?: Record<string, number>,
 *   proofWanted?: boolean,
 *   selectedId?: string,
 *   onFilter?: (filter: string) => void,
 *   onSort?: (sort: string) => void,
 *   onQuery?: (q: string) => void,
 *   onSelect?: (id: string) => void,
 *   onSave?: (fields: Record<string, unknown>) => void,
 * }} props
 */
export default function ProspectWorkbench({
  prospects,
  dataSource,
  busy,
  saving,
  saved,
  error,
  filter = 'all',
  sort = 'priority',
  dir = 'asc',
  q = '',
  filterCounts = {},
  proofWanted,
  selectedId = '',
  onFilter,
  onSort,
  onQuery,
  onSelect,
  onSave,
}) {
  const rows = Array.isArray(prospects) ? prospects : [];
  const selected = selectedId ? rows.find((row) => String(row.id) === String(selectedId)) : null;
  const canPatch = selected && selected.product && selected.product !== 'unknown';

  if (busy) return null;

  return (
    <>
      <section className="cf-app-panel" data-testid="prospect-workbench">
        <h1 className="cf-app-h1">Prospect Workbench</h1>
        <p className="cf-app-lead">
          Process many prospect records in one Operating Workspace grid. Lead Rescue, Website Rescue,
          and general enquiries share the canonical prospect model. Opening a row uses the shared
          Prospect detail surface. Temporary product desks remain until later slices.
        </p>
        {dataSource ? (
          <p className="cf-app-muted">
            Data source <code data-testid="prospect-workbench-data-source">{dataSource}</code>
            {' · '}
            {rows.length} in this view
            {' · '}
            canonical <code>/app/workbench</code>
            {' · '}
            replaces product grid <code>/admin/lead-rescue</code>
          </p>
        ) : null}

        <div className="cf-app-filter-row" data-testid="prospect-workbench-filters" role="tablist" aria-label="Workbench filters">
          {WORKBENCH_FILTERS.map((id) => {
            const count = filterCounts && filterCounts[id] != null ? Number(filterCounts[id]) : null;
            const active = String(filter) === id;
            return (
              <button
                key={id}
                type="button"
                className="cf-app-btn"
                data-primary={active ? 'true' : undefined}
                data-testid={`prospect-workbench-filter-${id}`}
                aria-pressed={active ? 'true' : 'false'}
                onClick={() => onFilter && onFilter(id)}
              >
                {FILTER_LABELS[id] || id}
                {count != null ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>

        <label className="cf-app-label cf-app-search">
          Search
          <input
            className="cf-app-input"
            type="search"
            defaultValue={q}
            placeholder="Prospect, owner, product…"
            data-testid="prospect-workbench-search"
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              if (onQuery) onQuery(event.currentTarget.value);
            }}
            onBlur={(event) => {
              if (onQuery) onQuery(event.currentTarget.value);
            }}
          />
        </label>
      </section>

      {rows.length === 0 ? (
        <section className="cf-app-panel" data-testid="prospect-workbench-empty">
          <p className="cf-app-lead">No prospects match this filter.</p>
        </section>
      ) : (
        <section className="cf-app-panel" data-testid="prospect-workbench-list">
          <div className="cf-app-table-wrap">
            <table className="cf-app-table">
              <thead>
                <tr>
                  {WORKBENCH_SORT_COLUMNS.filter((col) => col !== 'priority').map((col) => (
                    <th key={col}>
                      <button
                        type="button"
                        className="cf-app-sort-btn"
                        data-active={sort === col ? 'true' : 'false'}
                        data-testid={`prospect-workbench-sort-${col}`}
                        onClick={() => onSort && onSort(col)}
                      >
                        {SORT_LABELS[col] || col}
                        {sort === col ? (dir === 'desc' ? ' ↓' : ' ↑') : ''}
                      </button>
                    </th>
                  ))}
                  <th>Signals</th>
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
                  const productLabel =
                    row.product === 'ai-lead-rescue'
                      ? 'Lead Rescue'
                      : row.product === 'corpflow-rapid-delivery'
                        ? 'Website Rescue'
                        : 'General';
                  return (
                    <tr
                      key={id}
                      data-testid={`prospect-workbench-row-${id}`}
                      data-selected={isSelected ? 'true' : 'false'}
                      data-product={String(row.product || 'unknown')}
                    >
                      <td>
                        <strong>{name}</strong>
                        <div className="cf-app-muted">{String(row.reference || id)}</div>
                        <div className="cf-app-muted">{String(row.person_name || '')}</div>
                      </td>
                      <td>
                        {productLabel}
                        <div className="cf-app-muted">{String(row.source || row.product_service_path || '')}</div>
                      </td>
                      <td data-testid={`workbench-owner-${String(row.id || '')}`}>
                        {String(row.owner || 'Unassigned')}
                      </td>
                      <td>
                        {String(row.canonical_stage || '—')}
                        <div className="cf-app-muted">
                          {String(row.native_status_label || row.native_status || '')}
                        </div>
                      </td>
                      <td>{String(row.urgency || row.priority || '—')}</td>
                      <td>{String(row.next_action || '—')}</td>
                      <td>{row.next_action_due ? String(row.next_action_due) : '—'}</td>
                      <td>{row.qualification_complete === true ? 'Complete' : 'Incomplete'}</td>
                      <td>
                        {row.last_meaningful_activity_at ? String(row.last_meaningful_activity_at) : '—'}
                      </td>
                      <td>
                        {row.estimated_value != null && String(row.estimated_value) !== ''
                          ? `${row.currency || ''} ${row.estimated_value}`.trim()
                          : '—'}
                      </td>
                      <td>
                        {signals.length === 0
                          ? '—'
                          : signals.map((signal) => (
                              <span key={String(signal)} className="cf-app-signal">
                                {String(signal)}
                              </span>
                            ))}
                      </td>
                      <td>
                        <a href={sharedHref} data-testid={`prospect-workbench-shared-detail-${id}`}>
                          Shared detail
                        </a>
                        <div>
                          <button
                            type="button"
                            className="cf-app-btn"
                            data-testid={`prospect-workbench-select-${id}`}
                            onClick={() => onSelect && onSelect(id)}
                          >
                            {isSelected ? 'Editing' : 'Inline edit'}
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
        <section className="cf-app-panel" data-testid="prospect-workbench-editor">
          <h2 className="cf-app-h1">Safe inline update</h2>
          <p className="cf-app-lead">
            Uses the existing shared Prospect PATCH path. Does not send email, WhatsApp, SMS, or take
            payment. Full history stays on shared detail.
          </p>
          {!canPatch ? (
            <p className="cf-app-muted" data-testid="prospect-workbench-editor-readonly">
              General market enquiries are visible here. Safe JSON writes exist for Lead Rescue and
              Website Rescue records. Open shared detail to review.
            </p>
          ) : (
            <form
              key={String(selected.id) + String(selected.updated_at || '')}
              data-testid="prospect-workbench-form"
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
                    data-testid="prospect-workbench-owner"
                  />
                </label>
                <label className="cf-app-label">
                  Status
                  <input
                    className="cf-app-input"
                    name="status"
                    defaultValue={String(selected.native_status || '')}
                    data-testid="prospect-workbench-status"
                  />
                </label>
                <label className="cf-app-label">
                  Urgency / priority
                  <input
                    className="cf-app-input"
                    name="urgency"
                    defaultValue={String(selected.urgency || selected.priority || '')}
                    data-testid="prospect-workbench-urgency"
                  />
                </label>
                <label className="cf-app-label">
                  Next action
                  <input
                    className="cf-app-input"
                    name="next_action"
                    defaultValue={String(selected.next_action || '')}
                    data-testid="prospect-workbench-next-action"
                  />
                </label>
                <label className="cf-app-label">
                  Due date
                  <input
                    className="cf-app-input"
                    name="next_action_due"
                    type="datetime-local"
                    defaultValue={toDatetimeLocal(selected.next_action_due)}
                    data-testid="prospect-workbench-due"
                  />
                </label>
              </div>
              <label className="cf-app-label" style={{ marginTop: 12 }}>
                Operator note
                <textarea
                  className="cf-app-textarea"
                  name="note_append"
                  placeholder="Add a note. Recorded with actor and timestamp."
                  data-testid="prospect-workbench-note"
                />
              </label>
              {error ? <p className="cf-app-error">{error}</p> : null}
              {saved ? <p className="cf-app-ok">Saved. Same lead row — no second CRM.</p> : null}
              <div className="cf-app-actions">
                <button
                  type="submit"
                  className="cf-app-btn"
                  data-primary="true"
                  disabled={saving}
                  data-testid="prospect-workbench-save"
                >
                  {saving ? 'Saving…' : 'Save safe edits'}
                </button>
                <a
                  className="cf-app-btn"
                  href={
                    proofWanted
                      ? `${selected.shared_detail_path || `/app/prospects/${selected.id}`}?proof=1`
                      : String(selected.shared_detail_path || `/app/prospects/${selected.id}`)
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
  if (!iso) return '';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
