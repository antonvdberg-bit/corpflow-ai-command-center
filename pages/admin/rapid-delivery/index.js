import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { requireAdminPageSession } from '../../../lib/server/admin-page-gate.js';
import { loadRapidDeliveryListData } from '../../../lib/server/admin-rapid-delivery-api.js';
import { RAPID_DELIVERY_OPERATOR_STATUSES } from '../../../lib/cmp/_lib/rapid-delivery-operator.js';

/**
 * Factory operator desk for MUR rapid-delivery discovery intakes.
 */
export default function AdminRapidDeliveryPage({ initialLeads, initialError }) {
  const [leads, setLeads] = useState(initialLeads || []);
  const [error, setError] = useState(initialError);
  const [selected, setSelected] = useState(null);
  const [proposal, setProposal] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const r = await fetch('/api/factory/rapid-delivery/list', { credentials: 'include' });
      const data = await r.json();
      if (!data.ok) throw new Error(data.message || data.error || 'List failed');
      setLeads(data.leads || []);
      setError(null);
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function openProposal(id) {
    setBusy(true);
    setProposal('');
    try {
      const r = await fetch(`/api/factory/rapid-delivery/proposal?id=${encodeURIComponent(id)}`, {
        credentials: 'include',
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || 'Proposal failed');
      setSelected(id);
      setProposal(data.markdown || '');
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function patchStatus(id, status) {
    setBusy(true);
    try {
      const r = await fetch('/api/factory/rapid-delivery/patch', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.message || data.error || 'Patch failed');
      await refresh();
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!initialLeads) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Head>
        <title>Rapid delivery intakes · CorpFlowAI</title>
      </Head>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 18px 64px', fontFamily: 'system-ui, sans-serif' }}>
        <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.14em', color: '#0369a1', fontWeight: 700 }}>OPERATOR</p>
        <h1 style={{ margin: '6px 0 8px' }}>MUR rapid-delivery discovery intakes</h1>
        <p style={{ color: '#475569', maxWidth: 720, lineHeight: 1.55 }}>
          Prospects from `/contact` and `/offers/*` structured forms. Qualify here, copy the proposal summary (includes
          delivery-proof links), then send commercially only with separate Anton approval. No auto email/WhatsApp/SMS.
          ERPNext remains system of record.
        </p>
        <p style={{ fontSize: 14 }}>
          <Link href="/change/revenue">Revenue cockpit</Link>
          {' · '}
          <Link href="/admin/lead-rescue">USD Lead Rescue desk</Link>
          {' · '}
          <button type="button" onClick={refresh} disabled={busy}>
            Refresh
          </button>
        </p>
        {error ? (
          <p role="alert" style={{ color: '#b91c1c' }}>
            {error.message || error.error || 'Error'}
          </p>
        ) : null}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ padding: 8 }}>Ref</th>
              <th style={{ padding: 8 }}>Business</th>
              <th style={{ padding: 8 }}>Offer</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(leads || []).map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: 8, fontFamily: 'ui-monospace, monospace' }}>{row.reference}</td>
                <td style={{ padding: 8 }}>
                  <div>{row.business_name || row.name}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{row.email}</div>
                </td>
                <td style={{ padding: 8 }}>{row.offer_title || row.offer_slug}</td>
                <td style={{ padding: 8 }}>
                  <select
                    value={row.operator_status}
                    disabled={busy}
                    onChange={(ev) => patchStatus(row.id, ev.target.value)}
                  >
                    {RAPID_DELIVERY_OPERATOR_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: 8 }}>
                  <button type="button" disabled={busy} onClick={() => openProposal(row.id)}>
                    Proposal summary
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!leads?.length ? <p style={{ color: '#64748b' }}>No rapid-delivery intakes yet.</p> : null}
        {proposal ? (
          <section style={{ marginTop: 24 }}>
            <h2>Proposal-ready summary {selected ? `(${selected})` : ''}</h2>
            <p style={{ color: '#64748b', fontSize: 13 }}>Copy into ERPNext / quote email. Do not auto-send.</p>
            <textarea readOnly value={proposal} rows={22} style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
          </section>
        ) : null}
      </main>
    </>
  );
}

export async function getServerSideProps({ req }) {
  const gate = requireAdminPageSession(req, '/admin/rapid-delivery');
  if ('redirect' in gate) return gate;

  let initialLeads = null;
  let initialError = null;
  try {
    const result = await loadRapidDeliveryListData({ filters: {} });
    if (result?.ok) initialLeads = result.leads || [];
    else initialError = { message: result?.message || result?.error || 'Load failed' };
  } catch (e) {
    initialError = { message: e instanceof Error ? e.message : String(e) };
  }
  return { props: { initialLeads, initialError } };
}
