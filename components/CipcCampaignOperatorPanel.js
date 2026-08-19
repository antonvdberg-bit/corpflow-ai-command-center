import { useCallback, useEffect, useState } from 'react';
import {
  changeTextContainStyle,
} from '../lib/cmp/_lib/change-console-layout.js';

/**
 * CIPC Desk campaign board on `/change` (#985).
 * Shows the first 10 verified partner prospects. Drafts only. No send.
 *
 * @param {{
 *   visible?: boolean,
 * }} props
 */
export default function CipcCampaignOperatorPanel({ visible = true }) {
  const [rows, setRows] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState('');

  const loadBoard = useCallback(async () => {
    const r = await fetch('/api/cmp/router?action=cipc-campaign-list', { credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j?.ok !== true) {
      throw new Error(j?.error || `campaign_list_${r.status}`);
    }
    setRows(Array.isArray(j.prospects) ? j.prospects : []);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    setBusy(true);
    loadBoard()
      .catch((e) => {
        if (!cancelled) setStatus(String(e?.message || e));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, loadBoard]);

  async function runIntent(prospectId, intent) {
    setBusy(true);
    setStatus('');
    try {
      const r = await fetch('/api/cmp/router?action=cipc-campaign-operator-patch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospectId, intent }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok !== true) {
        throw new Error(j?.error || j?.reason || `campaign_patch_${r.status}`);
      }
      if (j.protected_gate_encountered) {
        setStatus(String(j.exact_protected_action || 'Send is blocked until Anton approves the first batch.'));
      } else {
        setStatus(intent === 'approve' ? 'Draft approved. Still not sent.' : 'Updated. Still not sent.');
      }
      await loadBoard();
    } catch (e) {
      setStatus(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function hydrateLeads() {
    setBusy(true);
    setStatus('');
    try {
      const r = await fetch('/api/cmp/router?action=cipc-campaign-hydrate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok !== true) {
        throw new Error(j?.error || `campaign_hydrate_${r.status}`);
      }
      setStatus(`Stored ${j.upserted || 0} campaign rows on existing leads. Nothing was sent.`);
      await loadBoard();
    } catch (e) {
      setStatus(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      data-testid="cipc-campaign-operator-panel"
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
        border: '1px solid rgba(56,189,248,0.35)',
        background: 'rgba(56,189,248,0.08)',
        minWidth: 0,
        ...changeTextContainStyle(),
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 950, color: '#e0f2fe' }}>
        CIPC partner campaign — first 10 verified prospects
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
        Fractional / white-label company-secretarial capacity behind accounting practices.
        Human approval is required. <strong>No message is sent from this panel.</strong>
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          data-testid="cipc-campaign-hydrate-btn"
          onClick={() => void hydrateLeads()}
          disabled={busy}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: 'none',
            background: busy ? '#94a3b8' : '#38bdf8',
            color: '#020617',
            fontWeight: 900,
            cursor: busy ? 'not-allowed' : 'pointer',
            fontSize: 12,
          }}
        >
          {busy ? 'Working…' : 'Store on existing leads'}
        </button>
      </div>
      <div style={{ marginTop: 12, display: 'grid', gap: 8, minWidth: 0 }}>
        {rows.map((row) => {
          const id = String(row.prospect_id || '');
          const open = openId === id;
          const draft = row.message_draft && typeof row.message_draft === 'object' ? row.message_draft : {};
          return (
            <div
              key={id}
              data-testid={`cipc-campaign-row-${id}`}
              style={{
                border: '1px solid rgba(148,163,184,0.22)',
                borderRadius: 12,
                padding: 10,
                background: 'rgba(2,6,23,0.25)',
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 850, color: '#e2e8f0', ...changeTextContainStyle() }}>
                {String(row.company || id)}
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                Segment {String(row.segment || '')} · score {String(row.fit_score ?? '—')} ·{' '}
                {String(row.control_flow_state || '')} · {String(row.approval_state || 'pending')} · send{' '}
                {String(row.send_state || 'not_sent')}
                {row.duplicate_of ? ` · duplicate of ${String(row.duplicate_of)}` : ''}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? '' : id)}
                  style={smallBtnStyle}
                >
                  {open ? 'Hide draft' : 'Show draft'}
                </button>
                <button
                  type="button"
                  onClick={() => void runIntent(id, 'approve')}
                  disabled={busy}
                  style={smallBtnStyle}
                >
                  Approve draft
                </button>
                <button
                  type="button"
                  onClick={() => void runIntent(id, 'reject')}
                  disabled={busy}
                  style={smallBtnStyle}
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => void runIntent(id, 'do_not_contact')}
                  disabled={busy}
                  style={smallBtnStyle}
                >
                  Do not contact
                </button>
              </div>
              {open ? (
                <pre
                  style={{
                    marginTop: 10,
                    whiteSpace: 'pre-wrap',
                    fontSize: 12,
                    color: '#e2e8f0',
                    lineHeight: 1.45,
                    ...changeTextContainStyle(),
                  }}
                >
                  {String(draft.subject || '')}
                  {'\n\n'}
                  {String(draft.body || '')}
                </pre>
              ) : null}
            </div>
          );
        })}
        {!rows.length && !busy ? (
          <div style={{ fontSize: 12, color: '#94a3b8' }}>No campaign rows loaded.</div>
        ) : null}
      </div>
      {status ? (
        <div data-testid="cipc-campaign-status" style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
          {status}
        </div>
      ) : null}
    </div>
  );
}

const smallBtnStyle = {
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(148,163,184,0.25)',
  background: 'rgba(15,23,42,0.35)',
  color: '#e2e8f0',
  fontWeight: 850,
  cursor: 'pointer',
  fontSize: 12,
};
