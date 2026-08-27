import { withOperatingWorkspaceProof } from '../../lib/app/workspace-context.js';

/**
 * Operating Workspace — Clients summary (#999).
 * Read-only Company Master projection. No second client model. No live send.
 *
 * @param {{
 *   clients: Array<Record<string, unknown>>,
 *   dataSource?: string,
 *   busy?: boolean,
 *   error?: string,
 *   proofWanted?: boolean,
 *   selectedId?: string,
 *   onSelect?: (id: string) => void,
 * }} props
 */
export default function ClientsSummary({
  clients,
  dataSource,
  busy,
  error,
  proofWanted,
  selectedId = '',
  onSelect,
}) {
  const rows = Array.isArray(clients) ? clients : [];
  const selected = selectedId ? rows.find((row) => String(row.company_id) === String(selectedId)) : null;

  if (busy) return null;
  if (error && rows.length === 0) return null;
  if (rows.length === 0) {
    return (
      <section className="cf-app-panel" data-testid="clients-empty">
        <h1 className="cf-app-h1">Clients</h1>
        <p className="cf-app-lead">
          No Company Master client/business records are visible yet. This Operating Workspace
          surface reuses existing Company Master identity — it does not create a second customer
          model. The evidence/asset editor remains at{' '}
          <a href="/admin/company-master">/admin/company-master</a>.
        </p>
        {dataSource ? (
          <p className="cf-app-muted">
            Data source <code data-testid="clients-data-source">{dataSource}</code>
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <>
      <section className="cf-app-panel" data-testid="clients-list">
        <h1 className="cf-app-h1">Clients</h1>
        <p className="cf-app-lead">
          Canonical staff Clients summary over existing Company Master / onboarding / service
          references. Prospect, commercial and delivery work stay on their existing routes. Tenant
          Workspace cannot see this operator list.
        </p>
        {dataSource ? (
          <p className="cf-app-muted">
            Data source <code data-testid="clients-data-source">{dataSource}</code>
            {' · '}
            {rows.length} client{rows.length === 1 ? '' : 's'}
          </p>
        ) : null}
        <div className="cf-app-table-wrap">
          <table className="cf-app-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Services</th>
                <th>Next action</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = String(row.company_id || '');
                const name = String(row.trading_name || row.legal_name || id);
                const services = Array.isArray(row.services) ? row.services : [];
                const summary = row.summary_path ? String(row.summary_path) : `/app/clients/${encodeURIComponent(id)}`;
                const href = withOperatingWorkspaceProof(summary, proofWanted);
                const isSelected = String(selectedId) === id;
                return (
                  <tr
                    key={id}
                    data-testid={`clients-row-${id}`}
                    data-selected={isSelected ? 'true' : 'false'}
                  >
                    <td>
                      <strong>{name}</strong>
                      <div className="cf-app-muted">{String(row.legal_name || id)}</div>
                    </td>
                    <td>
                      {String(row.onboarding_status || row.lifecycle_status || '—')}
                      {row.lifecycle_status ? (
                        <div className="cf-app-muted">{String(row.lifecycle_status)}</div>
                      ) : null}
                    </td>
                    <td>{String(row.record_owner || '—')}</td>
                    <td>
                      {services.length
                        ? services.map((service) => String(service.product)).join(', ')
                        : '—'}
                    </td>
                    <td>{String(row.next_action || '—')}</td>
                    <td>
                      {onSelect ? (
                        <button
                          type="button"
                          className="cf-app-btn"
                          data-primary={isSelected ? 'true' : undefined}
                          data-testid={`clients-select-${id}`}
                          onClick={() => onSelect(id)}
                        >
                          Summary
                        </button>
                      ) : (
                        <a className="cf-app-btn" href={href}>
                          Summary
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {selected ? <ClientSummaryPanel client={selected} proofWanted={proofWanted} /> : null}
    </>
  );
}

/**
 * @param {{ client: Record<string, unknown>, proofWanted?: boolean }} props
 */
export function ClientSummaryPanel({ client, proofWanted }) {
  const contact =
    client.primary_contact && typeof client.primary_contact === 'object'
      ? /** @type {Record<string, unknown>} */ (client.primary_contact)
      : {};
  const prospects = Array.isArray(client.related_prospects) ? client.related_prospects : [];
  const services = Array.isArray(client.services) ? client.services : [];
  const missing = Array.isArray(client.missing_fields) ? client.missing_fields : [];
  const commercial =
    client.commercial_references && typeof client.commercial_references === 'object'
      ? /** @type {Record<string, unknown>} */ (client.commercial_references)
      : {};
  const delivery =
    client.delivery_references && typeof client.delivery_references === 'object'
      ? /** @type {Record<string, unknown>} */ (client.delivery_references)
      : {};
  const hops =
    client.hop_paths && typeof client.hop_paths === 'object'
      ? /** @type {Record<string, unknown>} */ (client.hop_paths)
      : {};
  const prospectHop = withOperatingWorkspaceProof(
    String(hops.prospect || '/app/prospects'),
    proofWanted,
  );
  const commercialHop = withOperatingWorkspaceProof(
    String(hops.commercial || commercial.path || '/app/commercial'),
    proofWanted,
  );
  const deliveryHop = withOperatingWorkspaceProof(
    String(hops.delivery || delivery.existing_delivery_path || '/app/delivery'),
    proofWanted,
  );
  const pipelineHop = withOperatingWorkspaceProof(String(hops.pipeline || '/app/pipeline'), proofWanted);
  const companyMasterHop = String(hops.company_master || commercial.existing_identity_path || '/admin/company-master');
  const changeHop = String(hops.change || delivery.tenant_change_path || '/change');
  const contactLabel =
    [contact.name, contact.email, contact.phone].filter(Boolean).join(' · ') || 'Not recorded';

  return (
    <section className="cf-app-panel" data-testid="clients-summary">
      <h2 className="cf-app-h1">{String(client.trading_name || client.legal_name || client.company_id)}</h2>
      <p className="cf-app-muted" data-testid="clients-workspace-context">
        Operating Workspace client summary · not a Tenant Workspace view · Company Master record{' '}
        <code>{String(client.company_id || '')}</code>
      </p>
      <dl className="cf-app-dl">
        <div>
          <dt>Legal name</dt>
          <dd>{String(client.legal_name || '—')}</dd>
        </div>
        <div>
          <dt>Primary contact</dt>
          <dd data-testid="clients-primary-contact">{contactLabel}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>{String(client.record_owner || '—')}</dd>
        </div>
        <div>
          <dt>Onboarding / delivery</dt>
          <dd>
            {String(client.onboarding_status || '—')}
            {client.delivery_status ? ` · ${String(client.delivery_status)}` : ''}
          </dd>
        </div>
        <div>
          <dt>Next action</dt>
          <dd data-testid="clients-next-action">{String(client.next_action || 'Not recorded')}</dd>
        </div>
        <div>
          <dt>ERPNext customer</dt>
          <dd>{client.erpnext_customer ? String(client.erpnext_customer) : 'Not recorded'}</dd>
        </div>
      </dl>
      <p className="cf-app-muted">
        Active services:{' '}
        {services.length ? services.map((service) => String(service.product)).join(', ') : 'None recorded'}
      </p>
      {prospects.length ? (
        <p>
          Related prospects:{' '}
          {prospects.map((prospect, index) => {
            const path = prospect.shared_detail_path ? String(prospect.shared_detail_path) : '';
            const href = path ? withOperatingWorkspaceProof(path, proofWanted) : path;
            const label = String(prospect.organisation_name || prospect.id || 'prospect');
            return (
              <span key={String(prospect.id || index)}>
                {index ? ' · ' : null}
                {href ? <a href={href}>{label}</a> : label}
              </span>
            );
          })}
        </p>
      ) : (
        <p className="cf-app-muted">No related prospect records matched this Company Master identity.</p>
      )}
      <div className="cf-app-actions">
        <a className="cf-app-btn" data-testid="clients-hop-commercial" href={commercialHop}>
          Commercial
        </a>
        <a className="cf-app-btn" data-testid="clients-hop-company-master" href={companyMasterHop}>
          Company Master
        </a>
        <a className="cf-app-btn" data-testid="clients-hop-prospect" href={prospectHop}>
          Prospect
        </a>
        <a className="cf-app-btn" data-testid="clients-hop-pipeline" href={pipelineHop}>
          Pipeline
        </a>
        <a className="cf-app-btn" data-testid="clients-hop-delivery" href={deliveryHop}>
          Delivery
        </a>
        <a className="cf-app-btn" data-testid="clients-hop-change" href={changeHop}>
          Change
        </a>
      </div>
      <p className="cf-app-muted" data-testid="clients-later-slices">
        {String(commercial.note || '')} {String(delivery.note || '')}
      </p>
      {missing.length ? (
        <p className="cf-app-muted" data-testid="clients-missing-fields">
          Not recorded (existing contracts only, no schema added): {missing.join(', ')}
        </p>
      ) : null}
    </section>
  );
}
