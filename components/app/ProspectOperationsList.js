/**
 * Operating Workspace — shared Prospect Operations / Today list (#772 / #721).
 * Read-only. Temporary product-desk links remain until later slices.
 *
 * @param {{
 *   prospects: Array<Record<string, unknown>>,
 *   dataSource?: string,
 *   busy?: boolean,
 *   title?: string,
 *   lead?: string,
 *   testId?: string,
 * }} props
 */
export default function ProspectOperationsList({
  prospects,
  dataSource,
  busy,
  title = 'Prospect Operations',
  lead,
  testId = 'prospect-ops',
}) {
  const rows = Array.isArray(prospects) ? prospects : [];
  const leadText =
    lead ||
    'Shared Action Queue over existing Lead Rescue and Rapid Delivery records. Same Postgres leads rows — no second CRM.';
  if (busy) return null;
  if (rows.length === 0) {
    return (
      <section className="cf-app-panel" data-testid={`${testId}-empty`}>
        <h1 className="cf-app-h1">{title}</h1>
        <p className="cf-app-lead">
          No shared prospect records in this view yet. Temporary product desks remain at{' '}
          <a href="/admin/rapid-delivery">/admin/rapid-delivery</a> and{' '}
          <a href="/admin/lead-rescue">/admin/lead-rescue</a>.
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
              <th>Product</th>
              <th>Stage</th>
              <th>Owner</th>
              <th>Next action</th>
              <th>Signals</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = String(row.id || '');
              const name = String(row.organisation_name || row.person_name || id);
              const signals = Array.isArray(row.exception_signals) ? row.exception_signals : [];
              const detail = row.detail_path ? String(row.detail_path) : '';
              return (
                <tr key={id} data-testid={`prospect-ops-row-${id}`}>
                  <td>
                    <strong>{name}</strong>
                    <div className="cf-app-muted">{String(row.reference || id)}</div>
                  </td>
                  <td>{String(row.product || '—')}</td>
                  <td>{String(row.canonical_stage || row.native_status_label || '—')}</td>
                  <td>{String(row.owner || '—')}</td>
                  <td>
                    {String(row.next_action || '—')}
                    {row.next_action_due ? (
                      <div className="cf-app-muted">{String(row.next_action_due)}</div>
                    ) : null}
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
                    {detail ? (
                      <a href={detail} data-testid={`prospect-ops-detail-${id}`}>
                        Product desk
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
