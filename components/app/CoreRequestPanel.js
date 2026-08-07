/**
 * #778 Slice 1 — Core request/work view with exposure controls + client projection preview.
 */

/**
 * @param {{
 *   request: Record<string, unknown>,
 *   onExpose?: (args: { component_key: string, exposed: boolean }) => Promise<void>,
 *   busy?: boolean,
 *   error?: string,
 * }} props
 */
export default function CoreRequestPanel({ request, onExpose, busy, error }) {
  const components = Array.isArray(request?.components) ? request.components : [];
  const evidence = Array.isArray(request?.evidence_refs) ? request.evidence_refs : [];
  const tasks = Array.isArray(request?.tasks) ? request.tasks : [];
  const preview =
    request?.client_projection_preview && typeof request.client_projection_preview === 'object'
      ? request.client_projection_preview
      : null;
  const progress = request?.progress && typeof request.progress === 'object' ? request.progress : {};

  return (
    <section
      data-cf-app-core-request="true"
      style={{
        borderRadius: 18,
        border: '1px solid rgba(45,212,191,0.35)',
        background: 'rgba(8,16,28,0.62)',
        padding: 18,
        display: 'grid',
        gap: 16,
      }}
    >
      <div>
        <h2 style={{ margin: '0 0 6px', fontSize: 22 }}>{String(request?.title || '')}</h2>
        <p style={{ margin: 0, opacity: 0.85, fontFamily: '"DM Sans", sans-serif', fontSize: 14 }}>
          {String(request?.outcome || '')}
        </p>
        <p style={{ margin: '8px 0 0', fontFamily: '"DM Sans", sans-serif', fontSize: 12, opacity: 0.75 }}>
          Identity: <code data-cf-app-request-id={String(request?.id || '')}>{String(request?.id || '')}</code> ·
          Tenant: {String(request?.tenant_id || '')} · Internal status: {String(request?.internal_status || '—')}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10,
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 13,
        }}
      >
        <Panel title="Work package">
          <div>{String(request?.work_package_key || '—')}</div>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {tasks.map((t) => (
              <li key={String(t.key)}>{String(t.title)} — {String(t.status)}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Evidence references (Core only)">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {evidence.map((e, i) => (
              <li key={i}>
                {String(e.kind)}: {String(e.label)}
              </li>
            ))}
          </ul>
          {request?.github ? (
            <p style={{ margin: '8px 0 0', fontSize: 12 }}>
              GitHub PR #{String(request.github.pr_number)} / {String(request.github.branch)}
            </p>
          ) : null}
          {request?.ci ? (
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>
              CI: {String(request.ci.status)} ({String(request.ci.workflow)})
            </p>
          ) : null}
          {request?.agent ? (
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>Agent: {String(request.agent.run_id)}</p>
          ) : null}
        </Panel>
        <Panel title="Internal blocker / progress">
          <div>{request?.internal_blocker != null ? String(request.internal_blocker) : 'None'}</div>
          <div style={{ marginTop: 8 }}>
            Deterministic progress: {Number(progress.percent || 0)}% ({Number(progress.complete_count || 0)}/
            {Number(progress.total_count || 0)} complete)
          </div>
        </Panel>
      </div>

      {error ? (
        <p role="alert" style={{ color: '#fecaca', margin: 0, fontFamily: '"DM Sans", sans-serif', fontSize: 13 }}>
          {error}
        </p>
      ) : null}

      <div data-cf-app-core-components="true" style={{ display: 'grid', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Components & exposure</h3>
        {components.map((c) => {
          const exposed = c?.exposed_for_client_review === true;
          return (
            <article
              key={String(c.key)}
              data-cf-app-component={String(c.key)}
              data-cf-app-component-exposed={exposed ? 'true' : 'false'}
              style={{
                padding: 12,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(0,0,0,0.22)',
                fontFamily: '"DM Sans", sans-serif',
                fontSize: 13,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontFamily: '"Source Serif 4", serif', fontSize: 15 }}>
                  {String(c.title)}
                </strong>
                <span>{String(c.milestone)}</span>
              </div>
              <p style={{ margin: '6px 0', opacity: 0.85 }}>{String(c.client_safe_summary || '')}</p>
              <p style={{ margin: '0 0 8px', opacity: 0.7, fontSize: 12 }}>
                Internal refs: {String(c.internal_task_ref || '—')} / {String(c.internal_evidence_ref || '—')}
              </p>
              {typeof onExpose === 'function' ? (
                <button
                  type="button"
                  disabled={busy}
                  data-cf-app-expose-toggle="true"
                  onClick={() =>
                    onExpose({ component_key: String(c.key), exposed: !exposed })
                  }
                  style={{
                    border: '1px solid rgba(45,212,191,0.45)',
                    borderRadius: 10,
                    padding: '7px 12px',
                    background: exposed ? 'rgba(45,212,191,0.18)' : 'transparent',
                    color: '#eef6ff',
                    fontWeight: 700,
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                >
                  {exposed ? 'Revoke client review exposure' : 'Expose for client review'}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      {preview ? (
        <div data-cf-app-client-preview="true">
          <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Client projection preview</h3>
          <pre
            style={{
              margin: 0,
              padding: 12,
              borderRadius: 12,
              overflow: 'auto',
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: 11,
              lineHeight: 1.45,
            }}
          >
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}

function Panel({ title, children }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}
