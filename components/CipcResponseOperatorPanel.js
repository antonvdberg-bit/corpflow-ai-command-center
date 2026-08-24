import { useCallback, useEffect, useState } from 'react';
import {
  changeTextContainStyle,
} from '../lib/cmp/_lib/change-console-layout.js';

/**
 * CIPC Desk response queue on `/change` (#987).
 * Website and campaign enquiries with drafts. No send.
 *
 * @param {{
 *   visible?: boolean,
 * }} props
 */
export default function CipcResponseOperatorPanel({ visible = true }) {
  const [rows, setRows] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState('');

  const loadBoard = useCallback(async () => {
    const r = await fetch('/api/cmp/router?action=cipc-response-list', { credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j?.ok !== true) {
      throw new Error(j?.error || `response_list_${r.status}`);
    }
    setRows(Array.isArray(j.records) ? j.records : []);
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

  async function runIntent(recordId, intent) {
    setBusy(true);
    setStatus('');
    try {
      const r = await fetch('/api/cmp/router?action=cipc-response-operator-patch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ record_id: recordId, intent }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok !== true) {
        throw new Error(j?.error || j?.reason || `response_patch_${r.status}`);
      }
      if (j.protected_gate_encountered) {
        setStatus(String(j.exact_protected_action || 'Send is blocked until Anton approves it.'));
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

  if (!visible) return null;

  return (
    <div
      data-testid="cipc-response-operator-panel"
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
        border: '1px solid rgba(52,211,153,0.35)',
        background: 'rgba(16,185,129,0.08)',
        minWidth: 0,
        ...changeTextContainStyle(),
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 950, color: '#d1fae5' }}>
        CIPC response queue — website and campaign enquiries
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
        Acknowledgements and discovery drafts only. Approve, reject, or mark do-not-contact.
        {' '}<strong>No message is sent from this panel.</strong>
      </div>
      <div style={{ marginTop: 12, display: 'grid', gap: 8, minWidth: 0 }}>
        {rows.map((row) => {
          const id = String(row.ticket_id || row.campaign_prospect_id || row.public_reference || '');
          const open = openId === id;
          const draft = row.draft && typeof row.draft === 'object' ? row.draft : {};
          return (
            <div
              key={id}
              data-testid={`cipc-response-row-${id}`}
              style={{
                border: '1px solid rgba(148,163,184,0.22)',
                borderRadius: 12,
                padding: 10,
                background: 'rgba(2,6,23,0.25)',
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 850, color: '#e2e8f0', ...changeTextContainStyle() }}>
                {String(row.company || row.sender_email || id)}
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                {String(row.public_reference || '—')} · {String(row.source || '')} ·{' '}
                {String(row.classification || '')} · {String(row.service_id || 'unscoped')} ·{' '}
                {String(row.control_flow_state || '')} · send {String(row.send_state || 'not_sent')}
                {row.duplicate_of ? ` · duplicate of ${String(row.duplicate_of)}` : ''}
                {row.specialist_escalation ? ' · specialist' : ''}
                {row.next_action_due ? ` · follow-up ${String(row.next_action_due)}` : ''}
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
          <div style={{ fontSize: 12, color: '#94a3b8' }}>No response rows loaded.</div>
        ) : null}
      </div>
      {status ? (
        <div data-testid="cipc-response-status" style={{ marginTop: 10, fontSize: 11, color: '#94a3b8' }}>
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
