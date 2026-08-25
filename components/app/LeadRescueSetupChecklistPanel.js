/**
 * #1074 — Lead Rescue setup checklist on shared Prospect detail.
 * Reuses mergeAiLeadRescueChecklistItemPatch via PATCH setup_checklist_item.
 * Visible after PAID_SETUP+. No schema. No send.
 *
 * @param {{
 *   prospect: Record<string, unknown>,
 *   saving?: boolean,
 *   onSave?: (fields: Record<string, unknown>) => void,
 * }} props
 */
export default function LeadRescueSetupChecklistPanel({ prospect, saving, onSave }) {
  const checklist =
    prospect?.setup_checklist && typeof prospect.setup_checklist === 'object'
      ? /** @type {Record<string, unknown>} */ (prospect.setup_checklist)
      : null;
  if (!checklist || checklist.eligible !== true) return null;

  const items = Array.isArray(checklist.items) ? checklist.items : [];
  const states = Array.isArray(checklist.item_states) ? checklist.item_states : ['pending', 'in_progress', 'done', 'skipped'];

  return (
    <section className="cf-app-panel" data-testid="lead-rescue-setup-checklist" style={{ marginTop: 18 }}>
      <h2 className="cf-app-comp-title">Lead Rescue setup checklist</h2>
      <p className="cf-app-muted">
        Same JSON contract as the retired product desk. Marks progress on the existing lead row.
        Does not send Telegram, email, WhatsApp, or SMS.
      </p>
      <p className="cf-app-muted" data-testid="lead-rescue-setup-checklist-progress">
        {String(checklist.completed_count || 0)} / {String(checklist.total_count || items.length)} resolved
        {checklist.all_done === true ? ' · all done' : ''}
      </p>
      <ul className="cf-app-history" data-testid="lead-rescue-setup-checklist-items">
        {items.map((item) => {
          const key = String(item.key || '');
          return (
            <li key={key}>
              <form
                key={`${String(prospect.updated_at || prospect.id)}-${key}`}
                data-testid={`lead-rescue-checklist-item-${key}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!onSave) return;
                  const form = event.currentTarget;
                  const stateEl = form.elements.namedItem('state');
                  const noteEl = form.elements.namedItem('note');
                  const state =
                    stateEl && typeof /** @type {{ value?: string }} */ (stateEl).value === 'string'
                      ? String(/** @type {{ value: string }} */ (stateEl).value)
                      : 'pending';
                  const note =
                    noteEl && typeof /** @type {{ value?: string }} */ (noteEl).value === 'string'
                      ? String(/** @type {{ value: string }} */ (noteEl).value)
                      : '';
                  onSave({
                    id: String(prospect.id || ''),
                    setup_checklist_item: { key, state, note: note || null },
                  });
                }}
              >
                <strong>{String(item.label || key)}</strong>
                {item.hint ? <div className="cf-app-muted">{String(item.hint)}</div> : null}
                <div className="cf-app-form-grid" style={{ marginTop: 8 }}>
                  <label className="cf-app-label">
                    State
                    <select
                      className="cf-app-input"
                      name="state"
                      defaultValue={String(item.state || 'pending')}
                      data-testid={`lead-rescue-checklist-state-${key}`}
                    >
                      {states.map((state) => (
                        <option key={String(state)} value={String(state)}>
                          {String(state)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="cf-app-label">
                    Note
                    <input
                      className="cf-app-input"
                      name="note"
                      defaultValue={item.note ? String(item.note) : ''}
                      data-testid={`lead-rescue-checklist-note-${key}`}
                    />
                  </label>
                </div>
                <div className="cf-app-actions" style={{ marginTop: 8 }}>
                  <button type="submit" className="cf-app-btn" disabled={saving}>
                    {saving ? 'Saving…' : 'Save item'}
                  </button>
                </div>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
