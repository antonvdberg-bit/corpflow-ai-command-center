/**
 * #778 Slice 1 — Tenant Requests & Progress panel (client-safe).
 */

import { useState } from 'react';

/**
 * @param {{
 *   request: Record<string, unknown>,
 *   onReview?: (args: { component_key: string, decision: string, comment: string }) => Promise<void>,
 *   busy?: boolean,
 *   error?: string,
 * }} props
 */
export default function TenantRequestPanel({ request, onReview, busy, error }) {
  const components = Array.isArray(request?.components) ? request.components : [];
  const progress = request?.progress && typeof request.progress === 'object' ? request.progress : {};
  const percent = Number(request?.progress_percent ?? progress.percent ?? 0) || 0;

  return (
    <section
      data-cf-app-tenant-request="true"
      style={{
        borderRadius: 18,
        border: '1px solid rgba(243,205,138,0.35)',
        background: 'rgba(28,18,10,0.55)',
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
      </div>

      <div data-cf-app-progress="true">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 12,
            marginBottom: 6,
          }}
        >
          <span>Overall progress</span>
          <strong data-cf-app-progress-percent={percent}>{percent}%</strong>
        </div>
        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(100, percent))}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #f3cd8a, #d79a4a)',
            }}
          />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, fontFamily: '"DM Sans", sans-serif', opacity: 0.8 }}>
          Complete: {(Array.isArray(request?.complete) ? request.complete : []).join(', ') || '—'} · Remaining:{' '}
          {(Array.isArray(request?.remaining) ? request.remaining : []).join(', ') || '—'}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 10,
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 13,
        }}
      >
        <Info label="Next action" value={String(request?.next_action || '—')} />
        <Info
          label="Client-safe blocker"
          value={request?.client_safe_blocker != null ? String(request.client_safe_blocker) : 'None'}
        />
        <Info
          label="Attention required"
          value={request?.attention_required === true ? 'Yes' : 'No'}
          emphasize={request?.attention_required === true}
        />
        <Info label="Latest update" value={String(request?.latest_update || '—')} />
      </div>

      {error ? (
        <p role="alert" style={{ color: '#fecaca', margin: 0, fontFamily: '"DM Sans", sans-serif', fontSize: 13 }}>
          {error}
        </p>
      ) : null}

      <div data-cf-app-component-list="true" style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Components</h3>
        {components.map((c) => (
          <ComponentCard key={String(c.key)} component={c} onReview={onReview} busy={busy} />
        ))}
      </div>
    </section>
  );
}

function Info({ label, value, emphasize }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.12)',
        background: emphasize ? 'rgba(243,205,138,0.12)' : 'rgba(0,0,0,0.18)',
      }}
    >
      <div style={{ opacity: 0.65, fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function ComponentCard({ component, onReview, busy }) {
  const [comment, setComment] = useState('');
  const exposed = component?.exposed_for_client_review === true;
  const viewOnly = component?.view_only === true || !exposed;

  return (
    <article
      data-cf-app-component={String(component?.key || '')}
      data-cf-app-component-exposed={exposed ? 'true' : 'false'}
      data-cf-app-component-view-only={viewOnly ? 'true' : 'false'}
      style={{
        padding: 14,
        borderRadius: 14,
        border: exposed ? '1px solid rgba(243,205,138,0.55)' : '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(0,0,0,0.22)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong>{String(component?.title || '')}</strong>
        <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 12, opacity: 0.8 }}>
          {String(component?.milestone || '')}
          {viewOnly ? ' · view only' : ' · review open'}
        </span>
      </div>
      <p style={{ margin: '8px 0 0', fontFamily: '"DM Sans", sans-serif', fontSize: 13, opacity: 0.88 }}>
        {String(component?.client_safe_summary || '')}
      </p>

      {exposed && typeof onReview === 'function' ? (
        <div style={{ marginTop: 12, display: 'grid', gap: 8, fontFamily: '"DM Sans", sans-serif' }}>
          <label style={{ fontSize: 12, display: 'grid', gap: 4 }}>
            Comment
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              style={{
                resize: 'vertical',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.35)',
                color: '#eef6ff',
                padding: 8,
                font: 'inherit',
              }}
            />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['approve', 'amend', 'reject'].map((decision) => (
              <button
                key={decision}
                type="button"
                disabled={busy}
                data-cf-app-review-action={decision}
                onClick={() => onReview({ component_key: String(component.key), decision, comment })}
                style={{
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 12px',
                  fontWeight: 700,
                  cursor: busy ? 'wait' : 'pointer',
                  background:
                    decision === 'approve'
                      ? 'linear-gradient(135deg, #f3cd8a, #d79a4a)'
                      : 'rgba(255,255,255,0.1)',
                  color: decision === 'approve' ? '#2a1a08' : '#eef6ff',
                }}
              >
                {decision}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 12,
            fontFamily: '"DM Sans", sans-serif',
            opacity: 0.7,
          }}
        >
          View only — not exposed for client review.
        </p>
      )}
    </article>
  );
}
