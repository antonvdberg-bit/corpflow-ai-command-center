/**
 * Read-only delivery state from the existing Lead Rescue / Website Rescue contract (#1072).
 * Does not create a project system. Protected deploy/send remain gated elsewhere.
 *
 * @param {{
 *   prospect?: Record<string, unknown> | null,
 *   proofWanted?: boolean,
 * }} props
 */
export default function DeliveryStatePanel({ prospect, proofWanted }) {
  const lifecycle =
    prospect?.lifecycle && typeof prospect.lifecycle === 'object'
      ? /** @type {Record<string, unknown>} */ (prospect.lifecycle)
      : null;
  const delivery =
    lifecycle?.stages && typeof lifecycle.stages === 'object'
      ? /** @type {Record<string, unknown>} */ (
          /** @type {Record<string, unknown>} */ (lifecycle.stages).delivery || {}
        )
      : {};
  if (!prospect?.id) return null;

  const proofQuery = proofWanted ? '?proof=1' : '';
  const clientHref =
    prospect.linked_client && typeof prospect.linked_client === 'object'
      ? String(/** @type {Record<string, unknown>} */ (prospect.linked_client).summary_path || `/app/clients`)
      : '/app/clients';
  const clientLink = proofWanted
    ? `${clientHref}${clientHref.includes('?') ? '&' : '?'}proof=1`
    : clientHref;

  return (
    <section className="cf-app-panel" id="delivery-state" data-testid="delivery-state" style={{ marginTop: 18 }}>
      <h2 className="cf-app-comp-title">Delivery state</h2>
      <p className="cf-app-muted">
        Same Lead Rescue / Website Rescue row as this prospect. Not a second project system. Tenant
        service-request remains at <a href="/change">/change</a>.
      </p>
      <dl className="cf-app-kv" data-testid="delivery-state-identity">
        <dt>Item</dt>
        <dd>
          <code>{String(delivery.record_id || prospect.id)}</code>
        </dd>
        <dt>Product</dt>
        <dd>{String(delivery.product || prospect.product || '—')}</dd>
        <dt>Status</dt>
        <dd>{String(delivery.status || prospect.canonical_stage || '—')}</dd>
        <dt>Owner</dt>
        <dd>{String(delivery.owner || prospect.owner || '—')}</dd>
        <dt>Blocker</dt>
        <dd data-testid="delivery-state-blocker">{String(delivery.blocker || prospect.current_blocker || '—')}</dd>
        <dt>Next action</dt>
        <dd data-testid="delivery-state-next">{String(delivery.next_action || prospect.next_action || '—')}</dd>
      </dl>
      <div className="cf-app-actions">
        <a className="cf-app-btn" href={clientLink}>
          Open client
        </a>
        <a className="cf-app-btn" href={`/app/queue${proofQuery}`}>
          Action Queue
        </a>
        {delivery.product_detail_path ? (
          <a className="cf-app-btn" href={String(delivery.product_detail_path)}>
            Temporary product desk
          </a>
        ) : null}
      </div>
    </section>
  );
}
