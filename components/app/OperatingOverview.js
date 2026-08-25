/**
 * Operating Workspace cross-client overview (#1071).
 * Counts + short exception lists + links into existing canonical routes.
 *
 * @param {{
 *   overview?: Record<string, unknown> | null,
 *   dataSource?: string,
 *   busy?: boolean,
 *   proofWanted?: boolean,
 * }} props
 */
export default function OperatingOverview({ overview, dataSource, busy, proofWanted }) {
  if (busy) return null;

  const payload = overview && typeof overview === 'object' ? overview : null;
  const counts =
    payload && payload.counts && typeof payload.counts === 'object'
      ? /** @type {Record<string, unknown>} */ (payload.counts)
      : {};
  const sections =
    payload && payload.sections && typeof payload.sections === 'object'
      ? /** @type {Record<string, unknown>} */ (payload.sections)
      : {};
  const openNext =
    payload && payload.open_next && typeof payload.open_next === 'object'
      ? /** @type {Record<string, unknown>} */ (payload.open_next)
      : null;
  const sectionErrors = Array.isArray(payload?.section_errors) ? payload.section_errors : [];
  const totalAttention =
    Number(counts.needs_action_now || 0) +
    Number(counts.client_commercial_blockers || 0) +
    Number(counts.deliveries_blocked || 0) +
    Number(counts.deliveries_awaiting_review || 0) +
    Number(counts.deliveries_awaiting_protected_approval || 0);

  function withProof(href) {
    const path = String(href || '').trim();
    if (!path) return '#';
    if (!proofWanted) return path;
    return path.includes('?') ? `${path}&proof=1` : `${path}?proof=1`;
  }

  const cards = [
    {
      id: 'needs_action_now',
      label: 'Needs action now',
      value: counts.needs_action_now,
      href: '/app/queue',
    },
    {
      id: 'overdue_prospects',
      label: 'Overdue prospects',
      value: counts.overdue_prospects,
      href: '/app/queue?filter=overdue',
    },
    {
      id: 'stalled_prospects',
      label: 'Stalled prospects',
      value: counts.stalled_prospects,
      href: '/app/workbench?filter=stalled',
    },
    {
      id: 'client_commercial_blockers',
      label: 'Client commercial blockers',
      value: counts.client_commercial_blockers,
      href: '/app/clients',
    },
    {
      id: 'deliveries_blocked',
      label: 'Deliveries blocked',
      value: counts.deliveries_blocked,
      href: '/change',
    },
    {
      id: 'deliveries_awaiting_review',
      label: 'Awaiting review',
      value: counts.deliveries_awaiting_review,
      href: '/change',
    },
    {
      id: 'deliveries_awaiting_protected_approval',
      label: 'Awaiting protected approval',
      value: counts.deliveries_awaiting_protected_approval,
      href: '/app/queue?filter=awaiting_protected_approval',
    },
    {
      id: 'today_my_work',
      label: 'Today / My Work',
      value: counts.today_my_work,
      href: '/app/today',
    },
  ];

  const sectionOrder = [
    'needs_action',
    'overdue_prospects',
    'stalled_prospects',
    'client_commercial_blockers',
    'deliveries_blocked',
    'deliveries_awaiting_review',
    'deliveries_awaiting_protected_approval',
  ];

  return (
    <>
      <section className="cf-app-panel" data-testid="operating-overview">
        <h1 className="cf-app-h1">Operating Workspace overview</h1>
        <p className="cf-app-lead">
          One staff landing for what needs attention now across Prospects, Clients,
          Commercial references and Delivery. Counts and short lists only — open the
          canonical route for the full table. This is not a dashboard or a second record
          store.
        </p>
        {dataSource ? (
          <p className="cf-app-muted" data-testid="overview-data-source">
            Data source <code>{dataSource}</code>
            {' · '}existing workspace records only
          </p>
        ) : null}

        <div className="cf-app-overview-counts" data-testid="overview-counts">
          {cards.map((card) => {
            const value = Number(card.value || 0);
            return (
              <a
                key={card.id}
                className="cf-app-count-card"
                href={withProof(card.href)}
                data-testid={`overview-count-${card.id}`}
                data-tone={value > 0 ? 'warn' : undefined}
              >
                <div className="cf-app-count-value">{value}</div>
                <div className="cf-app-count-label">{card.label}</div>
              </a>
            );
          })}
        </div>

        {openNext ? (
          <div className="cf-app-actions" data-testid="overview-open-next">
            <a className="cf-app-btn" data-primary="true" href={withProof(String(openNext.href || ''))}>
              Open next: {String(openNext.label || 'Record')}
            </a>
            <span className="cf-app-muted">{String(openNext.reason || '')}</span>
          </div>
        ) : (
          <p className="cf-app-muted" data-testid="overview-open-next-empty" style={{ marginTop: 16 }}>
            Nothing in the recorded workspace records currently needs operator attention.
          </p>
        )}
      </section>

      {totalAttention === 0 ? (
        <section className="cf-app-panel" data-testid="overview-empty">
          <h2 className="cf-app-h2">No exceptions recorded</h2>
          <p className="cf-app-lead">
            Existing Prospect, Client and Delivery records are visible, and none currently
            match overdue, stalled, commercial-blocker, or delivery-attention predicates.
            Canonical desks remain available.
          </p>
          <div className="cf-app-actions">
            <a className="cf-app-btn" href={withProof('/app/queue')}>
              Action Queue
            </a>
            <a className="cf-app-btn" href={withProof('/app/prospects')}>
              Prospects
            </a>
            <a className="cf-app-btn" href={withProof('/app/clients')}>
              Clients
            </a>
            <a className="cf-app-btn" href="/change">
              Delivery / Change
            </a>
          </div>
        </section>
      ) : (
        sectionOrder.map((key) => {
        const section =
          sections[key] && typeof sections[key] === 'object'
            ? /** @type {Record<string, unknown>} */ (sections[key])
            : null;
        if (!section) return null;
        const items = Array.isArray(section.items) ? section.items : [];
        const count = Number(section.count || 0);
        return (
          <section
            key={key}
            className="cf-app-panel"
            data-testid={`overview-section-${key}`}
          >
            <h2 className="cf-app-h2">{String(section.title || key)}</h2>
            <p className="cf-app-muted">
              {count} recorded
              {section.href ? (
                <>
                  {' · '}
                  <a href={withProof(String(section.href))}>Open canonical list</a>
                </>
              ) : null}
            </p>
            {items.length === 0 ? (
              <p className="cf-app-lead" data-testid={`overview-section-empty-${key}`}>
                None recorded.
              </p>
            ) : (
              <ul className="cf-app-exception-list">
                {items.map((item) => {
                  const row = /** @type {Record<string, unknown>} */ (item);
                  const id = String(row.id || '');
                  return (
                    <li key={`${key}-${id}`} data-testid={`overview-item-${key}-${id}`}>
                      <div>
                        <strong>{String(row.title || id)}</strong>
                        <div className="cf-app-muted">{String(row.reason || '')}</div>
                      </div>
                      <a className="cf-app-btn" href={withProof(String(row.href || ''))}>
                        Open
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
        })
      )}

      {sectionErrors.length ? (
        <p className="cf-app-error" data-testid="overview-section-errors">
          Some overview sources could not load:{' '}
          {sectionErrors
            .map((row) => `${row.section} (${row.error})`)
            .join(' · ')}
        </p>
      ) : null}
    </>
  );
}
