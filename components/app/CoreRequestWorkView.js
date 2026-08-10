/**
 * Core request detail — canonical id, internal evidence, client projection, expose/hide.
 * @param {{
 *   request: Record<string, unknown> | null,
 *   busy?: boolean,
 *   onExpose: (args: { component_key: string, exposed: boolean }) => Promise<void>,
 * }} props
 */
export default function CoreRequestWorkView({ request, busy, onExpose }) {
  if (!request) {
    return (
      <section className="cf-app-panel" data-testid="core-request-empty">
        <h1 className="cf-app-h1">Request detail</h1>
        <p className="cf-app-lead">Select a request from the queue to open Core detail.</p>
      </section>
    );
  }

  const progress = /** @type {Record<string, number>} */ (request.progress || {});
  const components = Array.isArray(request.components) ? request.components : [];
  const internalRefs = /** @type {Record<string, unknown>} */ (request.internal_refs || {});
  const preview = /** @type {Record<string, unknown> | null} */ (
    request.client_projection_preview || null
  );
  const pct = Number(progress.percent) || 0;

  return (
    <section className="cf-app-panel" data-testid="core-request-work">
      <h1 className="cf-app-h1">{String(request.title || 'Request')}</h1>
      <p className="cf-app-lead">{String(request.outcome || '')}</p>

      <dl className="cf-app-kv" data-testid="core-identity">
        <dt>Canonical request id</dt>
        <dd data-testid="core-request-id">{String(request.request_id || '')}</dd>
        <dt>Tenant</dt>
        <dd data-testid="core-tenant-id">{String(request.tenant_id || '')}</dd>
        <dt>Internal status</dt>
        <dd>
          {String(request.status || '—')} / {String(request.stage || '—')}
        </dd>
        <dt>Workflow</dt>
        <dd>{String(request.workflow_state || '—')}</dd>
        <dt>Owner</dt>
        <dd>{String(request.owner || '—')}</dd>
        <dt>Waiting party</dt>
        <dd>{String(request.waiting_party || '—')}</dd>
        <dt>Progress</dt>
        <dd>
          {pct}% · {progress.complete_count ?? 0}/{progress.total_count ?? 0} complete
        </dd>
        <dt>Internal blocker</dt>
        <dd style={{ color: request.internal_blocker ? 'var(--app-warn)' : undefined }}>
          {String(request.internal_blocker || 'None')}
        </dd>
        <dt>Client blocker</dt>
        <dd>{String(request.client_safe_blocker || 'None')}</dd>
        <dt>Last update</dt>
        <dd>{String(request.updated_at || '—')}</dd>
      </dl>

      <div className="cf-app-progress" style={{ marginTop: 16 }}>
        <div className="cf-app-progress-bar" aria-hidden="true">
          <div className="cf-app-progress-fill" style={{ ['--pct']: `${pct}%` }} />
        </div>
      </div>

      <h2 style={{ fontSize: '1.05rem', margin: '20px 0 10px' }}>
        Delivery / work components · exposure
      </h2>
      <div className="cf-app-grid" data-testid="core-components">
        {components.map((c) => {
          const key = String(c.key || '');
          const exposed = c.exposed_for_client_review === true;
          const gh = c.github && typeof c.github === 'object' ? c.github : null;
          const latest = c.latest_client_decision;
          return (
            <article key={key} className="cf-app-comp" data-testid={`core-comp-${key}`}>
              <div className="cf-app-comp-head">
                <h3 className="cf-app-comp-title">{String(c.title || key)}</h3>
                <span className="cf-app-badge">{exposed ? 'Exposed' : 'Internal'}</span>
              </div>
              <dl className="cf-app-kv">
                <dt>Milestone</dt>
                <dd>{String(c.milestone_label || c.milestone || '—')}</dd>
                <dt>Task ref</dt>
                <dd data-testid={`core-task-${key}`}>{String(c.internal_task_ref || '—')}</dd>
                <dt>Evidence</dt>
                <dd data-testid={`core-evidence-${key}`}>
                  {Array.isArray(c.internal_evidence_refs) && c.internal_evidence_refs.length
                    ? c.internal_evidence_refs.join(', ')
                    : '—'}
                </dd>
                <dt>Internal note</dt>
                <dd>{String(c.internal_note || '—')}</dd>
                <dt>GitHub (Core)</dt>
                <dd data-testid={`core-github-${key}`}>
                  {gh
                    ? `PR #${gh.pr_number} · ${String(gh.commit_sha || '').slice(0, 12)} · ${String(gh.ci || '')}`
                    : '—'}
                </dd>
                <dt>Latest client decision</dt>
                <dd data-testid={`core-client-decision-${key}`}>
                  {latest
                    ? `${String(latest.decision)}${latest.comment ? ` — ${String(latest.comment)}` : ''}`
                    : '—'}
                </dd>
              </dl>
              <div className="cf-app-actions" data-testid={`core-expose-controls-${key}`}>
                <button
                  type="button"
                  className="cf-app-btn"
                  data-primary={!exposed ? 'true' : undefined}
                  data-testid={`core-expose-${key}`}
                  disabled={busy || exposed}
                  onClick={() => onExpose({ component_key: key, exposed: true })}
                >
                  Expose for client review
                </button>
                <button
                  type="button"
                  className="cf-app-btn"
                  data-testid={`core-unexpose-${key}`}
                  disabled={busy || !exposed}
                  onClick={() => onExpose({ component_key: key, exposed: false })}
                >
                  Hide from client review
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="cf-app-preview" data-testid="core-internal-refs">
        <h2 style={{ fontSize: '1.05rem', margin: '0 0 8px' }}>Internal work / evidence references</h2>
        <dl className="cf-app-kv">
          <dt>Promotion</dt>
          <dd>{internalRefs.promotion ? JSON.stringify(internalRefs.promotion) : '—'}</dd>
          <dt>Technical lead</dt>
          <dd>
            {internalRefs.technical_lead && typeof internalRefs.technical_lead === 'object'
              ? String(
                  /** @type {Record<string, unknown>} */ (internalRefs.technical_lead).summary || '',
                )
              : '—'}
          </dd>
        </dl>
      </div>

      {preview ? (
        <div className="cf-app-preview" data-testid="core-client-preview">
          <h2 style={{ fontSize: '1.05rem', margin: '0 0 8px' }}>Client projection preview</h2>
          <p className="cf-app-muted" style={{ margin: 0 }}>
            Same canonical request id · {String(preview.request_id || '')} · tenant progress{' '}
            {String(
              /** @type {Record<string, unknown>} */ (preview.progress || {}).percent ?? '—',
            )}
            % · components {Array.isArray(preview.components) ? preview.components.length : 0}
          </p>
          <p className="cf-app-muted" style={{ margin: '8px 0 0' }}>
            Tenant next action · {String(preview.next_action || '—')}
          </p>
        </div>
      ) : null}

      <p className="cf-app-muted" style={{ marginTop: 16 }}>
        Compatibility ·{' '}
        <a href="/change" className="cf-app-btn">
          Open Change Console
        </a>{' '}
        <a href="/app/core" className="cf-app-btn">
          Core home
        </a>
      </p>
    </section>
  );
}
