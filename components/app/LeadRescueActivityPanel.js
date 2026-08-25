/**
 * #1074 — Lead Rescue structured activity log on shared Prospect detail.
 * Reuses appendAiLeadRescueActivity via PATCH activity_append. No live send.
 *
 * @param {{
 *   prospect: Record<string, unknown>,
 *   saving?: boolean,
 *   onSave?: (fields: Record<string, unknown>) => void,
 * }} props
 */
export default function LeadRescueActivityPanel({ prospect, saving, onSave }) {
  const vocab =
    prospect?.lead_rescue_activity && typeof prospect.lead_rescue_activity === 'object'
      ? /** @type {Record<string, unknown>} */ (prospect.lead_rescue_activity)
      : null;
  if (!vocab || vocab.applicable !== true) return null;

  const channels = Array.isArray(vocab.channels) ? vocab.channels : [];
  const types = Array.isArray(vocab.types) ? vocab.types : [];

  return (
    <section className="cf-app-panel" data-testid="lead-rescue-activity" style={{ marginTop: 18 }}>
      <h2 className="cf-app-comp-title">Lead Rescue activity</h2>
      <p className="cf-app-muted">
        Record outreach, replies, and follow-ups on the existing lead JSON. This does not send
        WhatsApp, email, or SMS.
      </p>
      <form
        key={`activity-${String(prospect.updated_at || prospect.id)}`}
        data-testid="lead-rescue-activity-form"
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
            id: String(prospect.id || ''),
            activity_append: {
              channel: value('channel'),
              type: value('type'),
              note: value('note') || null,
              next_action: value('next_action') || null,
              next_action_date: value('next_action_date')
                ? new Date(value('next_action_date')).toISOString()
                : null,
            },
          });
          form.reset();
        }}
      >
        <div className="cf-app-form-grid">
          <label className="cf-app-label">
            Channel
            <select className="cf-app-input" name="channel" defaultValue="whatsapp" data-testid="lead-rescue-activity-channel">
              {channels.map((row) => (
                <option key={String(row.id)} value={String(row.id)}>
                  {String(row.label || row.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="cf-app-label">
            Type
            <select
              className="cf-app-input"
              name="type"
              defaultValue="outbound_opener"
              data-testid="lead-rescue-activity-type"
            >
              {types.map((row) => (
                <option key={String(row.id)} value={String(row.id)}>
                  {String(row.label || row.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="cf-app-label">
            Next action
            <input className="cf-app-input" name="next_action" data-testid="lead-rescue-activity-next" />
          </label>
          <label className="cf-app-label">
            Next action date
            <input
              className="cf-app-input"
              name="next_action_date"
              type="datetime-local"
              data-testid="lead-rescue-activity-due"
            />
          </label>
        </div>
        <label className="cf-app-label" style={{ marginTop: 12 }}>
          Note
          <textarea
            className="cf-app-textarea"
            name="note"
            placeholder="What happened. Nothing is sent from this form."
            data-testid="lead-rescue-activity-note"
          />
        </label>
        <div className="cf-app-actions" style={{ marginTop: 10 }}>
          <button type="submit" className="cf-app-btn" data-primary="true" disabled={saving}>
            {saving ? 'Saving…' : 'Record activity'}
          </button>
        </div>
      </form>
    </section>
  );
}
