import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { AI_LEAD_RESCUE_STATUSES } from '../lib/cmp/_lib/ai-lead-rescue-operator.js';

const pageStyle = {
  minHeight: '100vh',
  background: '#050505',
  color: '#eef6ff',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};
const shell = { maxWidth: 1400, margin: '0 auto', padding: '32px 20px 48px' };
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
const th = {
  textAlign: 'left',
  fontSize: 10,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: '#8899aa',
  padding: '10px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  whiteSpace: 'nowrap',
};
const td = { padding: '12px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, verticalAlign: 'top' };

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
}

function regionLabel(path) {
  const v = (path || '').toLowerCase();
  if (v === 'mauritius') return 'Mauritius';
  if (v === 'international') return 'International';
  if (!v || v === 'not_selected') return 'Not selected';
  return path;
}

export default function AiLeadRescueAdminList() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [region, setRegion] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [q, setQ] = useState('');
  const [searchDraft, setSearchDraft] = useState('');

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (region) p.set('region', region);
    if (paymentStatus) p.set('payment_status', paymentStatus);
    if (q) p.set('q', q);
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [status, region, paymentStatus, q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/factory/lead-rescue/list${queryString}`, { credentials: 'include' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'load_failed');
      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load leads.');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  const paymentStatuses = useMemo(() => {
    const set = new Set(['none']);
    leads.forEach((l) => {
      if (l.payment_status) set.add(l.payment_status);
    });
    return Array.from(set).sort();
  }, [leads]);

  return (
    <div style={pageStyle}>
      <Head>
        <title>AI Lead Rescue · Operator pipeline</title>
      </Head>
      <main style={shell}>
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  letterSpacing: '0.35em',
                  textTransform: 'uppercase',
                  color: '#6b7c8f',
                }}
              >
                Factory operator
              </p>
              <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800 }}>AI Lead Rescue pipeline</h1>
              <p style={{ margin: '8px 0 0', color: '#9fb2c8', fontSize: 14, maxWidth: 640 }}>
                Intakes from <code style={{ color: '#7dd3fc' }}>/lead-rescue</code> with product{' '}
                <code style={{ color: '#7dd3fc' }}>ai-lead-rescue</code>. Qualify, quote, onboard, and maintain from here.
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              style={{
                ...input,
                cursor: 'pointer',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontSize: 11,
              }}
            >
              Refresh
            </button>
          </header>

          <section
            style={{
              ...glass,
              padding: 16,
              marginBottom: 20,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'flex-end',
            }}
          >
            <label style={{ display: 'grid', gap: 4, fontSize: 11, color: '#8899aa' }}>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={input}>
                <option value="">All</option>
                {AI_LEAD_RESCUE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 11, color: '#8899aa' }}>
              Region
              <select value={region} onChange={(e) => setRegion(e.target.value)} style={input}>
                <option value="">All</option>
                <option value="mauritius">Mauritius</option>
                <option value="international">International</option>
                <option value="not_selected">Not selected</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 11, color: '#8899aa' }}>
              Payment status
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} style={input}>
                <option value="">All</option>
                {paymentStatuses.map((ps) => (
                  <option key={ps} value={ps}>
                    {ps}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 11, color: '#8899aa', flex: '1 1 200px', minWidth: 200 }}>
              Search
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setQ(searchDraft.trim());
                }}
                placeholder="Business, contact, email…"
                style={{ ...input, width: '100%' }}
              />
            </label>
            <button
              type="button"
              onClick={() => setQ(searchDraft.trim())}
              style={{ ...input, cursor: 'pointer', fontWeight: 700 }}
            >
              Apply search
            </button>
          </section>

          {error ? <p style={{ color: '#fca5a5', marginBottom: 16 }}>{error}</p> : null}

          <div style={{ ...glass, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1500 }}>
              <thead>
                <tr>
                  <th style={th}>Submitted</th>
                  <th style={th}>Business</th>
                  <th style={th}>Contact</th>
                  <th style={th}>Email</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Region</th>
                  <th style={th}>Sources</th>
                  <th style={th}>Payment path</th>
                  <th style={th}>Status</th>
                  <th style={th}>Setup</th>
                  <th style={th}>Monthly</th>
                  <th style={th}>Cur</th>
                  <th style={th}>Payment</th>
                  <th style={th}>Owner</th>
                  <th style={th}>Last contact</th>
                  <th style={th}>Next action</th>
                  <th style={th}>Notes</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={17} style={{ ...td, color: '#8899aa' }}>
                      Loading…
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={17} style={{ ...td, color: '#8899aa' }}>
                      No AI Lead Rescue intakes match these filters.
                    </td>
                  </tr>
                ) : (
                  leads.map((row) => (
                    <tr key={row.id}>
                      <td style={{ ...td, color: '#8899aa', fontFamily: 'monospace', fontSize: 12 }}>
                        {fmtDate(row.submitted_at)}
                      </td>
                      <td style={{ ...td, fontWeight: 600 }}>{row.business_name || '—'}</td>
                      <td style={td}>{row.contact_name || '—'}</td>
                      <td style={td}>{row.email || '—'}</td>
                      <td style={td}>{row.phone || '—'}</td>
                      <td style={td}>{regionLabel(row.region_path)}</td>
                      <td style={{ ...td, maxWidth: 120 }}>{row.lead_sources || '—'}</td>
                      <td style={{ ...td, maxWidth: 140 }}>{row.preferred_payment_path || '—'}</td>
                      <td style={td}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#2dd4bf' }}>
                          {row.status_label || row.status}
                        </span>
                      </td>
                      <td style={td}>{row.setup_price != null ? row.setup_price : '—'}</td>
                      <td style={td}>{row.monthly_monitoring_price != null ? row.monthly_monitoring_price : '—'}</td>
                      <td style={td}>{row.currency || '—'}</td>
                      <td style={td}>{row.payment_status || 'none'}</td>
                      <td style={td}>{row.owner || '—'}</td>
                      <td style={{ ...td, fontSize: 12, color: '#8899aa' }}>{fmtDate(row.last_contacted)}</td>
                      <td style={{ ...td, maxWidth: 140 }}>{row.next_action || '—'}</td>
                      <td style={{ ...td, maxWidth: 120 }}>{row.notes_preview || '—'}</td>
                      <td style={td}>
                        <Link href={row.detail_path} style={{ color: '#7dd3fc', fontWeight: 700, fontSize: 12 }}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </main>
    </div>
  );
}
