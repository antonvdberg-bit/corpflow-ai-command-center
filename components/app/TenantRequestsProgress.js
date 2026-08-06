import { useState } from 'react';

/**
 * Tenant Requests & Progress view (client-safe projection only).
 * @param {{
 *   request: Record<string, unknown> | null,
 *   busy?: boolean,
 *   onReview: (args: { component_key: string, decision: string, comment: string }) => Promise<void>,
 * }} props
 */
export default function TenantRequestsProgress({ request, busy, onReview }) {
  const [commentByKey, setCommentByKey] = useState(/** @type {Record<string, string>} */ ({}));
  const [localError, setLocalError] = useState('');

  if (!request) {
    return (
      <section className="cf-app-panel" data-testid="tenant-requests-empty">
        <h1 className="cf-app-h1">Requests &amp; Progress</h1>
        <p className="cf-app-lead">No client-safe requests in this tenant scope.</p>
      </section>
    );
  }

  const progress = /** @type {Record<string, number>} */ (request.progress || {});
  const components = Array.isArray(request.components) ? request.components : [];
  const pct = Number(progress.percent) || 0;

  async function submit(componentKey, decision) {
    setLocalError('');
    const comment = String(commentByKey[componentKey] || '').trim();
    if ((decision === 'amend' || decision === 'reject') && !comment) {
      setLocalError('Please add a short comment for amend or reject.');
      return;
    }
    try {
      await onReview({ component_key: componentKey, decision, comment });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Review failed');
    }
  }

  return (
    <section className="cf-app-panel" data-testid="tenant-requests-progress">
      <h1 className="cf-app-h1">{String(request.title || 'Request')}</h1>
      <p className="cf-app-lead">{String(request.outcome || '')}</p>

      <div className="cf-app-progress" data-testid="tenant-progress">
        <div className="cf-app-muted">
          Overall progress · <strong style={{ color: 'var(--app-text)' }}>{pct}%</strong>
          {' · '}
          {progress.complete_count ?? 0} complete · {progress.remaining_count ?? 0} remaining
        </div>
        <div className="cf-app-progress-bar" aria-hidden="true">
          <div className="cf-app-progress-fill" style={{ ['--pct']: `${pct}%` }} />
        </div>
        <div className="cf-app-muted">Next action · {String(request.next_action || '—')}</div>
        {request.client_safe_blocker ? (
          <div className="cf-app-muted" data-testid="tenant-blocker">
            Blocker · <span style={{ color: 'var(--app-warn)' }}>{String(request.client_safe_blocker)}</span>
          </div>
        ) : null}
        {request.attention_required === true ? (
          <div className="cf-app-muted" data-testid="tenant-attention" style={{ color: 'var(--app-warn)' }}>
            Attention required
          </div>
        ) : null}
      </div>

      <div className="cf-app-grid" style={{ marginTop: 18 }} data-testid="tenant-components">
        {components.map((c) => {
          const key = String(c.key || '');
          const exposed = c.exposed_for_client_review === true;
          return (
            <article
              key={key}
              className="cf-app-comp"
              data-testid={`tenant-comp-${key}`}
              data-attention={c.attention_required === true ? 'true' : 'false'}
              data-exposed={exposed ? 'true' : 'false'}
            >
              <div className="cf-app-comp-head">
                <h2 className="cf-app-comp-title">{String(c.title || key)}</h2>
                <span className="cf-app-badge" data-kind={exposed ? 'review' : 'viewonly'}>
                  {exposed ? 'Review open' : 'View only'}
                </span>
              </div>
              <p className="cf-app-muted" style={{ margin: 0 }}>
                {String(c.client_safe_summary || '')}
              </p>
              <p className="cf-app-muted" style={{ margin: '8px 0 0' }}>
                Status · {String(c.client_safe_status || c.milestone_label || c.milestone || '—')}
              </p>
              {c.latest_review ? (
                <p className="cf-app-ok" data-testid={`tenant-latest-review-${key}`}>
                  Latest decision · {String(c.latest_review.decision)}
                  {c.latest_review.comment ? ` — ${String(c.latest_review.comment)}` : ''}
                </p>
              ) : null}

              {exposed ? (
                <div>
                  <textarea
                    className="cf-app-textarea"
                    data-testid={`tenant-comment-${key}`}
                    placeholder="Optional comment (required for amend/reject)"
                    value={commentByKey[key] || ''}
                    onChange={(e) =>
                      setCommentByKey((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    disabled={busy}
                  />
                  <div className="cf-app-actions">
                    <button
                      type="button"
                      className="cf-app-btn"
                      data-primary="true"
                      data-testid={`tenant-approve-${key}`}
                      disabled={busy}
                      onClick={() => submit(key, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="cf-app-btn"
                      data-testid={`tenant-amend-${key}`}
                      disabled={busy}
                      onClick={() => submit(key, 'amend')}
                    >
                      Amend
                    </button>
                    <button
                      type="button"
                      className="cf-app-btn"
                      data-testid={`tenant-reject-${key}`}
                      disabled={busy}
                      onClick={() => submit(key, 'reject')}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <p className="cf-app-muted" style={{ marginTop: 10 }} data-testid={`tenant-viewonly-${key}`}>
                  This component is not open for client review.
                </p>
              )}
            </article>
          );
        })}
      </div>
      {localError ? <p className="cf-app-error">{localError}</p> : null}
    </section>
  );
}
