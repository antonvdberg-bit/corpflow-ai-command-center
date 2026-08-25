/**
 * #716 Website Rescue onboarding / delivery on shared Prospect detail.
 * Records intake, readiness gates, delivery state, and preview/handover evidence.
 * Never stores credentials or executes DNS/deploy.
 *
 * @param {{
 *   prospect: Record<string, unknown>,
 *   saving?: boolean,
 *   onSave?: (fields: Record<string, unknown>) => void,
 * }} props
 */
export default function WebsiteRescueDeliveryPanel({ prospect, saving, onSave }) {
  const delivery =
    prospect?.website_rescue_delivery && typeof prospect.website_rescue_delivery === 'object'
      ? /** @type {Record<string, unknown>} */ (prospect.website_rescue_delivery)
      : null;
  if (!delivery || delivery.applicable === false) return null;

  const intake =
    delivery.intake && typeof delivery.intake === 'object'
      ? /** @type {Record<string, unknown>} */ (delivery.intake)
      : {};
  const checklist =
    delivery.shared_checklist && typeof delivery.shared_checklist === 'object'
      ? /** @type {Record<string, unknown>} */ (delivery.shared_checklist)
      : {};
  const evidence =
    delivery.evidence && typeof delivery.evidence === 'object'
      ? /** @type {Record<string, unknown>} */ (delivery.evidence)
      : {};
  const preview = asObj(evidence.preview);
  const revision = asObj(evidence.revision);
  const handover = asObj(evidence.handover);
  const vocab =
    delivery.vocab && typeof delivery.vocab === 'object'
      ? /** @type {Record<string, unknown>} */ (delivery.vocab)
      : {};
  const nextStates = Array.isArray(delivery.allowed_next_states) ? delivery.allowed_next_states : [];
  const missing = Array.isArray(delivery.intake_missing) ? delivery.intake_missing : [];
  const blockers = Array.isArray(delivery.blockers) ? delivery.blockers : [];
  const cleared = delivery.commercially_cleared === true || delivery.financially_approved === true;
  const canStart = delivery.can_start_build === true;
  const checklistItems = Array.isArray(vocab.shared_checklist) ? vocab.shared_checklist : [];

  return (
    <section className="cf-app-panel" data-testid="website-rescue-delivery" style={{ marginTop: 18 }}>
      <h2 className="cf-app-comp-title">Website Rescue onboarding and delivery</h2>
      <p className="cf-app-muted">
        After commercial clearance, capture intake, confirm readiness gates, and move the bounded
        delivery state. Credentials stay out of this form. Deploy and DNS are simulated only.
      </p>
      <p
        className={cleared ? 'cf-app-ok' : 'cf-app-error'}
        data-testid="website-rescue-delivery-clearance"
        data-cleared={cleared ? 'true' : 'false'}
      >
        {cleared ? 'CLEARED TO BUILD' : 'NOT CLEARED TO BUILD'}
      </p>
      <p
        className={canStart ? 'cf-app-ok' : 'cf-app-muted'}
        data-testid="website-rescue-delivery-state"
        data-can-start={canStart ? 'true' : 'false'}
      >
        Delivery state: {String(delivery.delivery_state || 'approved_to_onboard')}
        {canStart ? ' · build gate open' : ' · build gate closed'}
      </p>
      <dl className="cf-app-kv" data-testid="website-rescue-delivery-summary">
        <dt>Financial approval</dt>
        <dd>{cleared ? 'Yes' : 'No — use Commercial clearance first'}</dd>
        <dt>Intake</dt>
        <dd data-testid="website-rescue-delivery-intake-status">
          {delivery.intake_complete === true ? 'Complete' : `Incomplete${missing.length ? ` · ${missing.slice(0, 4).join(', ')}` : ''}`}
        </dd>
        <dt>Content / assets</dt>
        <dd>{delivery.content_assets_ready === true ? 'Ready' : 'Not confirmed'}</dd>
        <dt>Approved access</dt>
        <dd>{delivery.approved_access_confirmed === true ? 'Confirmed via secret channel' : 'Not confirmed'}</dd>
        <dt>Next required</dt>
        <dd data-testid="website-rescue-delivery-next">{String(delivery.next_required || '—')}</dd>
        <dt>Blockers</dt>
        <dd data-testid="website-rescue-delivery-blockers">
          {blockers.length === 0 ? 'None' : blockers.map((code) => String(code)).join(', ')}
        </dd>
      </dl>

      <form
        key={`wr-delivery-${String(prospect.updated_at || prospect.id)}`}
        data-testid="website-rescue-delivery-form"
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
          /** @type {Record<string, boolean>} */
          const sharedChecklist = {};
          for (const item of checklistItems) {
            const id = item && typeof item === 'object' ? String(item.id || '') : '';
            if (!id) continue;
            sharedChecklist[id] = checked(`check:${id}`);
          }
          onSave({
            id: String(prospect.id || ''),
            website_rescue_delivery: {
              case_type: value('case_type'),
              tier: value('tier'),
              business_display_name: value('business_display_name'),
              primary_contact_name: value('primary_contact_name'),
              working_email: value('working_email'),
              working_phone: value('working_phone'),
              current_site_url: value('current_site_url'),
              domain_hostname: value('domain_hostname'),
              hosting_facts_summary: value('hosting_facts_summary'),
              brand_assets_status: value('brand_assets_status'),
              pages_in_scope: value('pages_in_scope'),
              services_or_products_summary: value('services_or_products_summary'),
              content_ownership: value('content_ownership'),
              enquiry_destination: value('enquiry_destination'),
              design_preferences: value('design_preferences'),
              revision_authority: value('revision_authority'),
              named_approver: value('named_approver'),
              review_cadence: value('review_cadence'),
              maintenance_boundary: value('maintenance_boundary'),
              client_responsibilities: value('client_responsibilities'),
              exclusions: value('exclusions'),
              acceptance_measures: value('acceptance_measures'),
              content_assets_ready: checked('content_assets_ready'),
              approved_access_confirmed: checked('approved_access_confirmed'),
              dns_cutover_in_scope: checked('dns_cutover_in_scope'),
              deploy_approval_simulated: checked('deploy_approval_simulated'),
              dns_cutover_authorized_simulated: checked('dns_cutover_authorized_simulated'),
              requested_delivery_state: value('requested_delivery_state'),
              shared_checklist: sharedChecklist,
              evidence: {
                preview: {
                  preview_url_or_artefact: value('preview_url_or_artefact'),
                  captured_at: value('preview_captured_at'),
                  operator_note: value('preview_operator_note'),
                },
                revision: {
                  round: value('revision_round'),
                  reviewer: value('revision_reviewer'),
                  decision: value('revision_decision'),
                  feedback_summary: value('revision_feedback'),
                  captured_at: value('revision_captured_at'),
                },
                handover: {
                  handover_sent_at: value('handover_sent_at'),
                  channels: value('handover_channels'),
                  support_boundary_summary: value('handover_support'),
                  what_was_built: value('handover_what_was_built'),
                },
              },
            },
          });
        }}
      >
        <h3 className="cf-app-comp-title" style={{ marginTop: 16 }}>
          Intake
        </h3>
        <div className="cf-app-form-grid">
          <label className="cf-app-label">
            Case type
            <select className="cf-app-input" name="case_type" defaultValue={String(intake.case_type || 'one_page')} data-testid="wr-case-type">
              {selectOptions(vocab.case_types, intake.case_type || 'one_page')}
            </select>
          </label>
          <label className="cf-app-label">
            Tier
            <select className="cf-app-input" name="tier" defaultValue={String(intake.tier || 'T1')} data-testid="wr-tier">
              {selectOptions(vocab.tiers, intake.tier || 'T1')}
            </select>
          </label>
          <label className="cf-app-label">
            Business name
            <input className="cf-app-input" name="business_display_name" defaultValue={String(intake.business_display_name || '')} data-testid="wr-business" />
          </label>
          <label className="cf-app-label">
            Primary contact
            <input className="cf-app-input" name="primary_contact_name" defaultValue={String(intake.primary_contact_name || '')} data-testid="wr-contact" />
          </label>
          <label className="cf-app-label">
            Working email
            <input className="cf-app-input" name="working_email" defaultValue={String(intake.working_email || '')} data-testid="wr-email" />
          </label>
          <label className="cf-app-label">
            Working phone
            <input className="cf-app-input" name="working_phone" defaultValue={String(intake.working_phone || '')} data-testid="wr-phone" />
          </label>
          <label className="cf-app-label">
            Current site
            <input className="cf-app-input" name="current_site_url" defaultValue={String(intake.current_site_url || '')} data-testid="wr-current-site" />
          </label>
          <label className="cf-app-label">
            Agreed hostname
            <input className="cf-app-input" name="domain_hostname" defaultValue={String(intake.domain_hostname || '')} placeholder="name only — no registrar password" data-testid="wr-hostname" />
          </label>
          <label className="cf-app-label">
            Brand / assets
            <select className="cf-app-input" name="brand_assets_status" defaultValue={String(intake.brand_assets_status || 'pending')} data-testid="wr-brand">
              {selectOptions(vocab.brand_assets_statuses, intake.brand_assets_status || 'pending')}
            </select>
          </label>
          <label className="cf-app-label">
            Named approver
            <input className="cf-app-input" name="named_approver" defaultValue={String(intake.named_approver || '')} data-testid="wr-approver" />
          </label>
        </div>
        <label className="cf-app-label" style={{ marginTop: 12 }}>
          Hosting facts (no passwords)
          <textarea className="cf-app-textarea" name="hosting_facts_summary" defaultValue={String(intake.hosting_facts_summary || '')} data-testid="wr-hosting" />
        </label>
        <label className="cf-app-label" style={{ marginTop: 12 }}>
          Pages in scope (one per line)
          <textarea className="cf-app-textarea" name="pages_in_scope" defaultValue={joinLines(intake.pages_in_scope)} data-testid="wr-pages" />
        </label>
        <label className="cf-app-label" style={{ marginTop: 12 }}>
          Services / products in scope
          <textarea className="cf-app-textarea" name="services_or_products_summary" defaultValue={String(intake.services_or_products_summary || '')} data-testid="wr-services" />
        </label>
        <div className="cf-app-form-grid">
          <label className="cf-app-label">
            Content ownership
            <input className="cf-app-input" name="content_ownership" defaultValue={String(intake.content_ownership || '')} data-testid="wr-content-owner" />
          </label>
          <label className="cf-app-label">
            Enquiry destination
            <input className="cf-app-input" name="enquiry_destination" defaultValue={String(intake.enquiry_destination || '')} data-testid="wr-enquiry" />
          </label>
          <label className="cf-app-label">
            Design preferences
            <input className="cf-app-input" name="design_preferences" defaultValue={String(intake.design_preferences || '')} data-testid="wr-design" />
          </label>
          <label className="cf-app-label">
            Revision authority
            <input className="cf-app-input" name="revision_authority" defaultValue={String(intake.revision_authority || '')} data-testid="wr-revision-authority" />
          </label>
          <label className="cf-app-label">
            Review cadence
            <input className="cf-app-input" name="review_cadence" defaultValue={String(intake.review_cadence || '')} data-testid="wr-cadence" />
          </label>
        </div>
        <label className="cf-app-label" style={{ marginTop: 12 }}>
          Maintenance boundary
          <textarea className="cf-app-textarea" name="maintenance_boundary" defaultValue={String(intake.maintenance_boundary || '')} data-testid="wr-maintenance" />
        </label>
        <label className="cf-app-label" style={{ marginTop: 12 }}>
          Client responsibilities (one per line)
          <textarea className="cf-app-textarea" name="client_responsibilities" defaultValue={joinLines(intake.client_responsibilities)} />
        </label>
        <label className="cf-app-label" style={{ marginTop: 12 }}>
          Exclusions (one per line)
          <textarea className="cf-app-textarea" name="exclusions" defaultValue={joinLines(intake.exclusions)} />
        </label>
        <label className="cf-app-label" style={{ marginTop: 12 }}>
          Acceptance measures (one per line)
          <textarea className="cf-app-textarea" name="acceptance_measures" defaultValue={joinLines(intake.acceptance_measures)} />
        </label>

        <h3 className="cf-app-comp-title" style={{ marginTop: 18 }}>
          Shared checklist
        </h3>
        <div data-testid="website-rescue-delivery-checklist">
          {checklistItems.map((item) => {
            const id = item && typeof item === 'object' ? String(item.id || '') : '';
            if (!id) return null;
            return (
              <label key={id} className="cf-app-label" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <input type="checkbox" name={`check:${id}`} defaultChecked={checklist[id] === true} />
                {String(item.label || id)}
              </label>
            );
          })}
        </div>

        <h3 className="cf-app-comp-title" style={{ marginTop: 18 }}>
          Readiness gates
        </h3>
        <label className="cf-app-label" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <input type="checkbox" name="content_assets_ready" defaultChecked={delivery.content_assets_ready === true} data-testid="wr-assets-ready" />
          Content and brand assets are ready
        </label>
        <label className="cf-app-label" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <input type="checkbox" name="approved_access_confirmed" defaultChecked={delivery.approved_access_confirmed === true} data-testid="wr-access-confirmed" />
          Access confirmed through an approved secret channel (do not paste passwords)
        </label>
        <label className="cf-app-label" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <input type="checkbox" name="dns_cutover_in_scope" defaultChecked={delivery.dns_cutover_in_scope === true} data-testid="wr-dns-in-scope" />
          DNS / cutover is in the quoted scope (authorization still simulated)
        </label>
        <label className="cf-app-label" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <input type="checkbox" name="deploy_approval_simulated" defaultChecked={delivery.deploy_approval_simulated === true} data-testid="wr-deploy-sim" />
          Record simulated deploy approval (does not deploy)
        </label>
        <label className="cf-app-label" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <input type="checkbox" name="dns_cutover_authorized_simulated" defaultChecked={delivery.dns_cutover_authorized_simulated === true} data-testid="wr-dns-sim" />
          Record simulated DNS authorization (does not change DNS)
        </label>

        <h3 className="cf-app-comp-title" style={{ marginTop: 18 }}>
          Preview, revision, handover
        </h3>
        <div className="cf-app-form-grid">
          <label className="cf-app-label">
            Preview URL or artefact
            <input className="cf-app-input" name="preview_url_or_artefact" defaultValue={String(preview.preview_url_or_artefact || '')} data-testid="wr-preview-url" />
          </label>
          <label className="cf-app-label">
            Preview captured at
            <input className="cf-app-input" name="preview_captured_at" defaultValue={String(preview.captured_at || '')} />
          </label>
          <label className="cf-app-label">
            Preview note
            <input className="cf-app-input" name="preview_operator_note" defaultValue={String(preview.operator_note || '')} />
          </label>
          <label className="cf-app-label">
            Revision round
            <input className="cf-app-input" name="revision_round" defaultValue={String(revision.round || '')} />
          </label>
          <label className="cf-app-label">
            Reviewer
            <input className="cf-app-input" name="revision_reviewer" defaultValue={String(revision.reviewer || '')} />
          </label>
          <label className="cf-app-label">
            Revision decision
            <input className="cf-app-input" name="revision_decision" defaultValue={String(revision.decision || '')} />
          </label>
        </div>
        <label className="cf-app-label" style={{ marginTop: 12 }}>
          Revision feedback
          <textarea className="cf-app-textarea" name="revision_feedback" defaultValue={String(revision.feedback_summary || '')} />
        </label>
        <input type="hidden" name="revision_captured_at" defaultValue={String(revision.captured_at || '')} />
        <div className="cf-app-form-grid">
          <label className="cf-app-label">
            Handover sent at
            <input className="cf-app-input" name="handover_sent_at" defaultValue={String(handover.handover_sent_at || '')} />
          </label>
          <label className="cf-app-label">
            Handover channels
            <input className="cf-app-input" name="handover_channels" defaultValue={joinLines(handover.channels)} />
          </label>
        </div>
        <label className="cf-app-label" style={{ marginTop: 12 }}>
          What was built
          <textarea className="cf-app-textarea" name="handover_what_was_built" defaultValue={String(handover.what_was_built || '')} data-testid="wr-handover-built" />
        </label>
        <label className="cf-app-label" style={{ marginTop: 12 }}>
          Support / maintenance boundary
          <textarea className="cf-app-textarea" name="handover_support" defaultValue={String(handover.support_boundary_summary || '')} />
        </label>

        <h3 className="cf-app-comp-title" style={{ marginTop: 18 }}>
          Advance delivery state
        </h3>
        <label className="cf-app-label">
          Next state
          <select
            className="cf-app-input"
            name="requested_delivery_state"
            defaultValue={String(delivery.delivery_state || 'approved_to_onboard')}
            data-testid="wr-next-state"
          >
            <option value={String(delivery.delivery_state || 'approved_to_onboard')}>
              Keep {String(delivery.delivery_state || 'approved_to_onboard')}
            </option>
            {nextStates.map((row) => {
              const state = row && typeof row === 'object' ? String(row.state || '') : '';
              if (!state) return null;
              const allowed = row.allowed === true;
              return (
                <option key={state} value={state} disabled={!allowed}>
                  {state}
                  {allowed ? '' : ` (blocked: ${String(row.block_reason || 'gate')})`}
                </option>
              );
            })}
          </select>
        </label>
        <div className="cf-app-actions" style={{ marginTop: 14 }}>
          <button type="submit" className="cf-app-btn" data-primary="true" disabled={saving} data-testid="wr-save">
            {saving ? 'Saving…' : 'Save onboarding and delivery'}
          </button>
        </div>
      </form>
    </section>
  );
}

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function joinLines(v) {
  if (Array.isArray(v)) return v.map((item) => String(item)).filter(Boolean).join('\n');
  return v == null ? '' : String(v);
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
