const OVERVIEW_LIST_LIMIT = 5;

/**
 * @param {string} href
 * @param {boolean} [proofWanted]
 */
function withProof(href, proofWanted) {
  const raw = href == null ? '' : String(href);
  if (!raw || !proofWanted) return raw;
  return `${raw}${raw.includes('?') ? '&' : '?'}proof=1`;
}

const COUNT_CARDS = Object.freeze([
  Object.freeze({
    key: 'prospects_overdue',
    label: 'Overdue prospects',
    href: '/app/queue?filter=overdue',
    testId: 'overview-count-prospects-overdue',
  }),
  Object.freeze({
    key: 'prospects_stalled',
    label: 'Stalled prospects',
    href: '/app/workbench?filter=stalled',
    testId: 'overview-count-prospects-stalled',
  }),
  Object.freeze({
    key: 'clients_exceptions',
    label: 'Client exceptions',
    href: '/app/clients',
    testId: 'overview-count-clients',
  }),
  Object.freeze({
    key: 'commercial_blockers',
    label: 'Commercial blockers',
    href: '/app/commercial?filter=needs_attention',
    testId: 'overview-count-commercial',
  }),
  Object.freeze({
    key: 'delivery_blocked',
    label: 'Delivery blockers',
    href: '/app/delivery?filter=blocked',
    testId: 'overview-count-delivery-blocked',
  }),
  Object.freeze({
    key: 'delivery_review',
    label: 'Delivery review',
    href: '/app/delivery?filter=client_review_pending',
    testId: 'overview-count-delivery-review',
  }),
  Object.freeze({
    key: 'delivery_protected',
    label: 'Protected gates',
    href: '/app/delivery?filter=protected_deploy_approval_required',
    testId: 'overview-count-delivery-protected',
  }),
]);

const SECTION_ORDER = Object.freeze([
  'delivery_protected',
  'delivery_blocked',
  'prospects_overdue',
  'commercial',
  'prospects_stalled',
  'delivery_review',
  'clients',
]);

/**
 * Operating Workspace action overview (#1159).
 * Staff-only. Existing records only. Every item links to a canonical route.
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

  const payload = overview && typeof overview === 'object' ? overview : {};
  const counts =
    payload.counts && typeof payload.counts === 'object'
      ? /** @type {Record<string, number>} */ (payload.counts)
      : {};
  const sections =
    payload.sections && typeof payload.sections === 'object'
      ? /** @type {Record<string, Record<string, unknown>>} */ (payload.sections)
      : {};
  const next =
    payload.next_destination && typeof payload.next_destination === 'object'
      ? /** @type {Record<string, unknown>} */ (payload.next_destination)
      : null;
  const exceptionCount = Number(payload.exception_count || 0);
  const nextHref = next?.href ? withProof(String(next.href), proofWanted) : '';

  return (
    <>
      <section className="cf-app-panel" data-testid="operating-overview">
        <h1 className="cf-app-h1">What needs attention</h1>
        <p className="cf-app-lead">
          Highest-value exceptions from existing Prospects, Clients, Commercial and Delivery
          records. This is not a second queue or a KPI dashboard. Open an item to continue on its
          canonical route.
        </p>
        {dataSource ? (
          <p className="cf-app-muted" data-testid="operating-overview-meta">
            Data source <code data-testid="overview-data-source">{dataSource}</code>
            {' · '}
            {exceptionCount} recorded exception{exceptionCount === 1 ? '' : 's'}
            {' · '}
            lists capped at {OVERVIEW_LIST_LIMIT}
            {proofWanted ? ' · proof harness' : ''}
          </p>
        ) : null}

        {next && nextHref ? (
          <div className="cf-app-journey" data-testid="overview-next-destination">
            <p className="cf-app-label">Next destination</p>
            <p style={{ margin: '6px 0 0' }}>
              <a className="cf-app-btn" data-primary="true" href={nextHref} data-testid="overview-next-link">
                {String(next.label || 'Open next work')}
              </a>
            </p>
            <p className="cf-app-muted" style={{ marginTop: 8 }}>
              {String(next.reason || '')}
              {Number(next.count) > 0 ? ` · ${Number(next.count)}` : ''}
            </p>
          </div>
        ) : null}

        <div className="cf-app-overview-counts" data-testid="overview-counts">
          {COUNT_CARDS.map((card) => {
            const count = Number(counts[card.key] || 0);
            return (
              <a
                key={card.key}
                className="cf-app-overview-count"
                href={withProof(card.href, proofWanted)}
                data-testid={card.testId}
                data-count={String(count)}
                data-attention={count > 0 ? 'true' : 'false'}
              >
                <span className="cf-app-overview-count-num">{count}</span>
                <span className="cf-app-overview-count-label">{card.label}</span>
              </a>
            );
          })}
        </div>
      </section>

      {exceptionCount === 0 ? (
        <section className="cf-app-panel" data-testid="operating-overview-empty">
          <h2 className="cf-app-h1" style={{ fontSize: '1.15rem' }}>
            Nothing needs attention right now
          </h2>
          <p className="cf-app-lead">
            Existing Prospect, Client, Commercial and Delivery records have no overdue, stalled,
            blocked, review or protected-gate exceptions in this workspace.
          </p>
          <div className="cf-app-actions">
            <a className="cf-app-btn" data-primary="true" href={withProof('/app/today', proofWanted)}>
              Today / My Work
            </a>
            <a className="cf-app-btn" href={withProof('/app/queue', proofWanted)}>
              Action Queue
            </a>
            <a className="cf-app-btn" href={withProof('/app/clients', proofWanted)}>
              Clients
            </a>
            <a className="cf-app-btn" href={withProof('/app/commercial', proofWanted)}>
              Commercial
            </a>
            <a className="cf-app-btn" href={withProof('/app/delivery', proofWanted)}>
              Delivery
            </a>
          </div>
        </section>
      ) : (
        <div className="cf-app-overview-sections" data-testid="overview-sections">
          {SECTION_ORDER.map((key) => {
            const section = sections[key];
            if (!section) return null;
            const items = Array.isArray(section.items) ? section.items : [];
            const count = Number(section.count || 0);
            const sectionHref = section.href ? withProof(String(section.href), proofWanted) : '';
            return (
              <section
                key={key}
                className="cf-app-panel"
                data-testid={`overview-section-${key}`}
                data-count={String(count)}
              >
                <div className="cf-app-comp-head">
                  <h2 className="cf-app-comp-title">{String(section.title || key)}</h2>
                  <span className="cf-app-badge" data-kind={count > 0 ? 'exception' : 'viewonly'}>
                    {count}
                  </span>
                </div>
                {sectionHref ? (
                  <p className="cf-app-muted">
                    <a href={sectionHref} data-testid={`overview-section-link-${key}`}>
                      Open canonical list
                    </a>
                  </p>
                ) : null}
                {items.length === 0 ? (
                  <p className="cf-app-muted" data-testid={`overview-section-empty-${key}`}>
                    None recorded.
                  </p>
                ) : (
                  <ul className="cf-app-overview-list">
                    {items.map((item) => {
                      const href = item.href ? withProof(String(item.href), proofWanted) : '';
                      return (
                        <li key={String(item.id)} data-testid={`overview-item-${item.id}`}>
                          {href ? (
                            <a href={href} data-testid={`overview-item-link-${item.id}`}>
                              {String(item.label || item.id)}
                            </a>
                          ) : (
                            <span>{String(item.label || item.id)}</span>
                          )}
                          <div className="cf-app-muted">{String(item.reason || '')}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
