import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { fmtDateStableUtc } from '../lib/format/utc-date.js';

const TENANT_ID = 'living-word-mauritius';
const LWM_CHATBOT_LEAD_WORKFLOW_KEY = 'living_word_chatbot_lead_followup';
const LIST_API = '/api/factory/tenant-workflows/steps';
const PATCH_API = '/api/factory/tenant-workflows/step-update';

const pageStyle = {
  minHeight: '100vh',
  background: '#0b1020',
  color: '#eef6ff',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};
const shell = { maxWidth: 1200, margin: '0 auto', padding: '32px 20px 48px' };
const glass = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
};
const input = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.35)',
  color: '#eef6ff',
  fontSize: 13,
};
const btn = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.06)',
  color: '#eef6ff',
  fontSize: 12,
  cursor: 'pointer',
};
const btnPrimary = {
  ...btn,
  background: 'rgba(56, 189, 120, 0.18)',
  borderColor: 'rgba(56, 189, 120, 0.45)',
};
const btnDanger = {
  ...btn,
  background: 'rgba(248, 113, 113, 0.12)',
  borderColor: 'rgba(248, 113, 113, 0.35)',
};

/** @type {Record<string, string>} */
const WORKFLOW_LABELS = {
  [LWM_CHATBOT_LEAD_WORKFLOW_KEY]: 'Living Word chatbot lead follow-up',
};

/**
 * @param {string | null | undefined} key
 * @returns {string}
 */
function workflowLabel(key) {
  if (!key) return 'Unknown workflow';
  return WORKFLOW_LABELS[key] || key.replace(/_/g, ' ');
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function str(v) {
  return v != null && String(v).trim() ? String(v).trim() : '—';
}

/**
 * @param {{
 *   initialSteps?: Array<Record<string, unknown>> | null;
 *   initialError?: { error?: string; message?: string } | null;
 *   initialStatus?: string;
 * }} [props]
 */
export default function LivingWordWorkflowOperatorList(props = {}) {
  const { initialSteps, initialError, initialStatus = 'open' } = props;
  const hasInitial = Array.isArray(initialSteps);

  const [steps, setSteps] = useState(hasInitial ? initialSteps : []);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [loading, setLoading] = useState(!hasInitial && !initialError);
  const [error, setError] = useState(
    initialError
      ? { code: initialError.error || 'LOAD_FAILED', message: initialError.message || 'Load failed.' }
      : null,
  );
  const [actionId, setActionId] = useState(null);
  const skipFirstFetchRef = useRef(hasInitial || Boolean(initialError));

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set('tenant_id', TENANT_ID);
    p.set('workflow_key', LWM_CHATBOT_LEAD_WORKFLOW_KEY);
    p.set('status', statusFilter || 'open');
    p.set('limit', '100');
    return `?${p.toString()}`;
  }, [statusFilter]);

  const loadSteps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${LIST_API}${queryString}`, { credentials: 'include' });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        setError({
          code: data.error || 'LOAD_FAILED',
          message: data.message || data.detail || `HTTP ${r.status}`,
        });
        setSteps([]);
        return;
      }
      setSteps(Array.isArray(data.steps) ? data.steps : []);
    } catch (e) {
      setError({
        code: 'NETWORK_ERROR',
        message: e instanceof Error ? e.message : String(e),
      });
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    loadSteps();
  }, [loadSteps]);

  /**
   * @param {string} stepId
   * @param {'completed' | 'cancelled'} nextStatus
   */
  const patchStep = async (stepId, nextStatus) => {
    setActionId(stepId);
    setError(null);
    try {
      const r = await fetch(PATCH_API, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: TENANT_ID,
          step_id: stepId,
          status: nextStatus,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        setError({
          code: data.error || 'PATCH_FAILED',
          message: data.message || `HTTP ${r.status}`,
        });
        return;
      }
      await loadSteps();
    } catch (e) {
      setError({
        code: 'NETWORK_ERROR',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Living Word workflows — CorpFlow operator</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div style={pageStyle}>
        <div style={shell}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7aa3c4' }}>
              CorpFlow operator · internal only
            </div>
            <h1 style={{ margin: '8px 0 6px', fontSize: 28, fontWeight: 600 }}>
              Living Word chatbot follow-ups
            </h1>
            <p style={{ margin: 0, color: '#9fb3c8', maxWidth: 720, lineHeight: 1.5 }}>
              Sandbox workflow inbox for <code style={{ color: '#c5dff5' }}>{TENANT_ID}</code>.
              This is not the public church site. No messages are sent from this screen.
            </p>
            <p style={{ margin: '10px 0 0', fontSize: 13 }}>
              <Link href="/admin/lead-rescue" style={{ color: '#93c5fd' }}>
                AI Lead Rescue inbox
              </Link>
              {' · '}
              <Link href="https://living-word-mauritius.corpflowai.com/site-preview" style={{ color: '#93c5fd' }}>
                LWM sandbox preview
              </Link>
            </p>
          </div>

          <div style={{ ...glass, padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: '#9fb3c8' }}>
              Status{' '}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ ...input, marginLeft: 6 }}
              >
                <option value="open">Open</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="all">All</option>
              </select>
            </label>
            <button type="button" style={btn} onClick={loadSteps} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {error ? (
            <div
              style={{
                ...glass,
                padding: 14,
                marginBottom: 16,
                borderColor: 'rgba(248, 113, 113, 0.35)',
                color: '#fecaca',
              }}
            >
              <strong>{error.code}</strong> — {error.message}
            </div>
          ) : null}

          {loading && steps.length === 0 ? (
            <div style={{ ...glass, padding: 24, color: '#9fb3c8' }}>Loading workflow steps…</div>
          ) : null}

          {!loading && steps.length === 0 ? (
            <div style={{ ...glass, padding: 24 }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>No steps in this filter</h2>
              <p style={{ margin: 0, color: '#9fb3c8', lineHeight: 1.5 }}>
                {statusFilter === 'open'
                  ? 'No open Living Word chatbot follow-up tasks. Submit a test lead on the sandbox chatbot or switch the status filter.'
                  : 'Try another status filter or refresh after new chatbot submissions.'}
              </p>
            </div>
          ) : null}

          <div style={{ display: 'grid', gap: 16 }}>
            {steps.map((step) => {
              const lead = step.lead && typeof step.lead === 'object' ? step.lead : {};
              const origin = step.origin && typeof step.origin === 'object' ? step.origin : {};
              const isOpen = step.status === 'open' || step.status === 'new';
              const busy = actionId === step.id;
              return (
                <article key={String(step.id)} style={{ ...glass, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7aa3c4' }}>
                        {workflowLabel(String(step.workflow_key || ''))} · {str(step.step_key)}
                      </div>
                      <h2 style={{ margin: '6px 0 4px', fontSize: 20 }}>{str(step.title)}</h2>
                      <div style={{ fontSize: 13, color: '#9fb3c8' }}>
                        Tenant: {str(step.tenant_id)} · Step status:{' '}
                        <strong style={{ color: '#eef6ff' }}>{str(step.status)}</strong>
                        {step.workflow_run_status ? (
                          <>
                            {' '}
                            · Run: <strong style={{ color: '#eef6ff' }}>{str(step.workflow_run_status)}</strong>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#8899aa', textAlign: 'right' }}>
                      Created {fmtDateStableUtc(step.created_at)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 12,
                      marginTop: 16,
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <div style={{ color: '#7aa3c4', fontSize: 11, textTransform: 'uppercase' }}>Contact</div>
                      <div>{str(lead.full_name)}</div>
                      <div style={{ color: '#9fb3c8' }}>{str(lead.email)}</div>
                      <div style={{ color: '#9fb3c8' }}>{str(lead.whatsapp_or_mobile)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#7aa3c4', fontSize: 11, textTransform: 'uppercase' }}>Preferred</div>
                      <div>{str(lead.preferred_contact_method)}</div>
                      <div>
                        Recommended: <strong>{str(lead.recommended_channel)}</strong>
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#7aa3c4', fontSize: 11, textTransform: 'uppercase' }}>Source</div>
                      <div>{str(origin.source_host)}</div>
                      <div style={{ color: '#9fb3c8' }}>{str(origin.source_path)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#7aa3c4', fontSize: 11, textTransform: 'uppercase' }}>References</div>
                      <div style={{ wordBreak: 'break-all', fontSize: 11, color: '#9fb3c8' }}>
                        event: {str(step.source_event_id)}
                      </div>
                      <div style={{ wordBreak: 'break-all', fontSize: 11, color: '#9fb3c8' }}>
                        thread: {str(step.source_thread_id)}
                      </div>
                    </div>
                  </div>

                  {lead.message_excerpt ? (
                    <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontSize: 13 }}>
                      <div style={{ color: '#7aa3c4', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>
                        Message excerpt
                      </div>
                      {str(lead.message_excerpt)}
                    </div>
                  ) : null}

                  {isOpen ? (
                    <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        style={btnPrimary}
                        disabled={busy}
                        onClick={() => patchStep(String(step.id), 'completed')}
                      >
                        {busy ? 'Saving…' : 'Mark completed'}
                      </button>
                      <button
                        type="button"
                        style={btnDanger}
                        disabled={busy}
                        onClick={() => patchStep(String(step.id), 'cancelled')}
                      >
                        Mark cancelled
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
