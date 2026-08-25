/**
 * Operating Workspace — Prospect → Client → Commercial → Delivery rail (#1072).
 * Read-only navigation over existing identity/reference fields.
 *
 * @param {{
 *   lifecycle?: Record<string, unknown> | null,
 *   current?: 'prospect' | 'client' | 'commercial' | 'delivery',
 * }} props
 */
export default function LifecycleContinuityRail({ lifecycle, current }) {
  const stages =
    lifecycle?.stages && typeof lifecycle.stages === 'object'
      ? /** @type {Record<string, Record<string, unknown>>} */ (lifecycle.stages)
      : null;
  if (!stages) return null;
  const order = ['prospect', 'client', 'commercial', 'delivery'];

  return (
    <nav className="cf-life-rail" data-testid="lifecycle-rail" aria-label="Lifecycle continuity">
      {order.map((name, index) => {
        const stage = stages[name] && typeof stages[name] === 'object' ? stages[name] : {};
        const href = String(stage.href || '');
        const owner = String(stage.owner || '—');
        const next = String(stage.next_action || '—');
        const isCurrent = current === name;
        return (
          <span key={name} className="cf-life-rail-item">
            {index ? (
              <span className="cf-life-rail-arrow" aria-hidden="true">
                →
              </span>
            ) : null}
            {href ? (
              <a
                className="cf-life-rail-step"
                data-current={isCurrent ? 'true' : 'false'}
                data-testid={`lifecycle-rail-${name}`}
                href={href}
              >
                {labelForStage(name)}
              </a>
            ) : (
              <span className="cf-life-rail-step" data-current={isCurrent ? 'true' : 'false'}>
                {labelForStage(name)}
              </span>
            )}
            <span className="cf-app-muted cf-life-rail-meta">
              Owner {owner} · Next {next}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

/**
 * @param {string} name
 */
function labelForStage(name) {
  if (name === 'prospect') return 'Prospect';
  if (name === 'client') return 'Client';
  if (name === 'commercial') return 'Commercial';
  return 'Delivery';
}
