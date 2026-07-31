import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { fmtDateStableUtc } from '../lib/format/utc-date.js';
import {
  RAPID_DELIVERY_OPERATOR_STATUS_OPTIONS,
  RAPID_DELIVERY_SUMMARY_CARD_DEFS,
  countRapidDeliverySummaryCards,
  rapidDeliveryStatusLabel,
  rapidDeliveryStatusSelectValue,
} from '../lib/cmp/_lib/rapid-delivery-operator.js';

const MANUAL_APPROVAL =
  'External commercial contact remains a manual Anton-approved action.';

const c = {
  bg: 'linear-gradient(160deg, #06111f 0%, #0b1f33 48%, #0a1628 100%)',
  panel: 'rgba(255,255,255,0.04)',
  panelBorder: 'rgba(255,255,255,0.10)',
  panelHover: 'rgba(45,212,191,0.08)',
  text: '#eef6ff',
  muted: '#aebfd1',
  faint: '#9fb2c8',
  accent: '#2dd4bf',
  accentDim: 'rgba(45,212,191,0.18)',
  link: '#7dd3fc',
  danger: '#f87171',
  warn: '#fbbf24',
  good: '#34d399',
  font: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const btnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '9px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 650,
  fontFamily: 'inherit',
  cursor: 'pointer',
  border: `1px solid ${c.panelBorder}`,
  background: c.panel,
  color: c.text,
  textDecoration: 'none',
  lineHeight: 1.2,
};

const btnPrimary = {
  ...btnBase,
  background: c.accentDim,
  borderColor: 'rgba(45,212,191,0.45)',
  color: c.accent,
};

const btnGhost = {
  ...btnBase,
  background: 'transparent',
};

const badgeFor = (status) => {
  const s = rapidDeliveryStatusSelectValue(status);
  const map = {
    new_intake: { bg: 'rgba(125,211,252,0.15)', fg: '#7dd3fc' },
    reviewing: { bg: 'rgba(251,191,36,0.15)', fg: '#fbbf24' },
    discovery_booked: { bg: 'rgba(167,139,250,0.18)', fg: '#c4b5fd' },
    quote_ready: { bg: 'rgba(45,212,191,0.16)', fg: '#2dd4bf' },
    proposal_sent: { bg: 'rgba(52,211,153,0.16)', fg: '#6ee7b7' },
    won: { bg: 'rgba(52,211,153,0.22)', fg: '#34d399' },
    not_fit: { bg: 'rgba(248,113,113,0.15)', fg: '#f87171' },
  };
  return map[s] || map.new_intake;
};

function truncate(text, n = 96) {
  const t = String(text || '').trim();
  if (!t) return '—';
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function formatReceived(iso) {
  if (!iso) return '—';
  return fmtDateStableUtc(iso);
}

/**
 * CorpFlowAI revenue operator desk — rapid-delivery discovery prospects.
 *
 * @param {{
 *   initialLeads?: Array<Record<string, unknown>>|null,
 *   initialError?: { message?: string, error?: string, http_status?: number }|null,
 * }} props
 */
export default function RapidDeliveryRevenueDesk({ initialLeads = null, initialError = null }) {
  const hasInitial = Array.isArray(initialLeads);
  const [leads, setLeads] = useState(hasInitial ? initialLeads : []);
  const [loading, setLoading] = useState(!hasInitial && !initialError);
  const [error, setError] = useState(initialError);
  const [busyId, setBusyId] = useState(null);
  const [saveState, setSaveState] = useState(/** @type {Record<string, string>} */ ({}));
  const [selectedId, setSelectedId] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [copyFlash, setCopyFlash] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [refreshedAt, setRefreshedAt] = useState(() => (hasInitial ? new Date().toISOString() : null));

  const selected = useMemo(
    () => (leads || []).find((l) => l.id === selectedId) || null,
    [leads, selectedId],
  );

  useEffect(() => {
    setNotesDraft(selected?.operator_notes != null ? String(selected.operator_notes) : '');
  }, [selected?.id, selected?.operator_notes]);

  const cardCounts = useMemo(() => countRapidDeliverySummaryCards(leads || []), [leads]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/factory/rapid-delivery/list', { credentials: 'include' });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        throw new Error('Could not load discovery prospects. Retry in a moment.');
      }
      setLeads(data.leads || []);
      setRefreshedAt(new Date().toISOString());
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : 'Could not load discovery prospects.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasInitial && !initialError) refresh();
  }, [hasInitial, initialError, refresh]);

  async function patchLead(id, patch) {
    setBusyId(id);
    setSaveState((s) => ({ ...s, [id]: 'Saving…' }));
    try {
      const r = await fetch('/api/factory/rapid-delivery/patch', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        throw new Error(data.message || data.error || 'Update failed');
      }
      const lead = data.lead;
      if (lead?.id) {
        setLeads((prev) =>
          (prev || []).map((row) =>
            row.id === lead.id
              ? {
                  ...row,
                  ...lead,
                  operator_status: lead.operator_status,
                  operator_status_label: rapidDeliveryStatusLabel(lead.operator_status),
                  operator_notes: lead.operator_notes ?? lead.rapid_delivery_operator?.notes ?? row.operator_notes,
                }
              : row,
          ),
        );
      } else {
        await refresh();
      }
      setSaveState((s) => ({ ...s, [id]: 'Saved' }));
      setTimeout(() => {
        setSaveState((s) => {
          const next = { ...s };
          if (next[id] === 'Saved') delete next[id];
          return next;
        });
      }, 1800);
    } catch (e) {
      setSaveState((s) => ({ ...s, [id]: 'Error' }));
      setError({
        message: e instanceof Error ? e.message : 'Update failed',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function patchStatus(id, status) {
    return patchLead(id, { status });
  }

  async function saveNotes(id) {
    return patchLead(id, { notes: notesDraft });
  }

  async function prepareProposal(id) {
    setBusyId(id);
    setProposal(null);
    setProposalOpen(true);
    setSelectedId(id);
    try {
      const r = await fetch(`/api/factory/rapid-delivery/proposal?id=${encodeURIComponent(id)}`, {
        credentials: 'include',
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        throw new Error(data.message || data.error || 'Could not prepare proposal');
      }
      setProposal(data);
      return data;
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : 'Could not prepare proposal',
      });
      setProposalOpen(false);
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function copyProposal(id) {
    const data = proposal?.reference && selectedId === id ? proposal : await prepareProposal(id);
    if (data?.markdown) {
      await copyText('Proposal copied', data.markdown);
    }
  }

  async function copyText(label, text) {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopyFlash(label);
      setTimeout(() => setCopyFlash(''), 1600);
    } catch {
      setCopyFlash('Copy failed');
      setTimeout(() => setCopyFlash(''), 1600);
    }
  }

  return (
    <>
      <Head>
        <title>Rapid-delivery discovery desk · CorpFlowAI</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: c.font }}>
        <style>{`
          .rd-desk a:focus-visible, .rd-desk button:focus-visible, .rd-desk select:focus-visible {
            outline: 2px solid ${c.accent};
            outline-offset: 2px;
          }
          .rd-desk-table { display: none; }
          .rd-desk-cards { display: grid; gap: 12px; }
          @media (min-width: 900px) {
            .rd-desk-table { display: table; width: 100%; border-collapse: separate; border-spacing: 0; }
            .rd-desk-cards { display: none; }
          }
        `}</style>
        <main className="rd-desk" style={{ maxWidth: 1120, margin: '0 auto', padding: '28px 18px 72px' }}>
          <header style={{ marginBottom: 22 }}>
            <p
              style={{
                margin: 0,
                fontSize: 11.5,
                letterSpacing: '0.16em',
                fontWeight: 800,
                color: c.accent,
              }}
            >
              CORPFLOWAI REVENUE
            </p>
            <h1 style={{ margin: '8px 0 10px', fontSize: 'clamp(24px, 3.4vw, 34px)', letterSpacing: '-0.03em' }}>
              Rapid-delivery discovery desk
            </h1>
            <p style={{ margin: 0, maxWidth: 720, color: c.muted, lineHeight: 1.55, fontSize: 14.5 }}>
              Review CorpFlowAI market enquiries and sprint discovery requests from contact and offer pages. See
              source, service path, timing, status, recommended next action and a copy-ready response draft.
              Qualify prospects, then record commercial state in ERPNext. Mauritius sprint clients pay in MUR
              (bank transfer) — do not request USD for that path. {MANUAL_APPROVAL}
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                alignItems: 'center',
                marginTop: 16,
              }}
            >
              <Link href="/change/revenue" style={btnPrimary}>
                Open revenue cockpit
              </Link>
              <button type="button" style={btnGhost} onClick={refresh} disabled={loading || busyId != null}>
                Refresh
              </button>
              <span style={{ color: c.faint, fontSize: 13 }}>
                {leads?.length ?? 0} prospect{(leads?.length || 0) === 1 ? '' : 's'}
                {refreshedAt ? ` · Last refreshed ${formatReceived(refreshedAt)}` : ''}
              </span>
            </div>
            <p style={{ margin: '12px 0 0', color: c.warn, fontSize: 13, fontWeight: 600 }} role="note">
              {MANUAL_APPROVAL}
            </p>
          </header>

          <section
            aria-label="Pipeline summary"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 10,
              marginBottom: 20,
            }}
          >
            {RAPID_DELIVERY_SUMMARY_CARD_DEFS.map((def) => (
              <div
                key={def.key}
                data-summary-card={def.key}
                style={{
                  background: c.panel,
                  border: `1px solid ${c.panelBorder}`,
                  borderRadius: 14,
                  padding: '14px 14px 12px',
                }}
              >
                <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.faint }}>
                  {def.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, letterSpacing: '-0.03em' }}>
                  {cardCounts[def.key] || 0}
                </div>
              </div>
            ))}
          </section>

          {error ? (
            <div
              role="alert"
              style={{
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.35)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <p style={{ margin: '0 0 10px', color: c.danger, fontWeight: 650 }}>
                Discovery prospects could not be loaded.
              </p>
              <p style={{ margin: '0 0 12px', color: c.muted, fontSize: 14 }}>
                {error.message || 'Retry in a moment. If this continues, check your admin session.'}
              </p>
              <button type="button" style={btnPrimary} onClick={refresh}>
                Retry
              </button>
            </div>
          ) : null}

          {loading ? (
            <p style={{ color: c.muted }} aria-live="polite">
              Loading discovery prospects…
            </p>
          ) : null}

          {!loading && !error && !(leads || []).length ? (
            <div
              style={{
                background: c.panel,
                border: `1px solid ${c.panelBorder}`,
                borderRadius: 14,
                padding: 24,
              }}
            >
              <p style={{ margin: 0, fontWeight: 700 }}>No CorpFlowAI discovery requests yet.</p>
              <p style={{ margin: '8px 0 0', color: c.muted, fontSize: 14, lineHeight: 1.5 }}>
                Public forms live on{' '}
                <Link href="/contact" style={{ color: c.link }}>
                  /contact
                </Link>
                . Prefer Preview for test submissions — avoid unnecessary production test records.
              </p>
            </div>
          ) : null}

          {!loading && (leads || []).length > 0 ? (
            <section aria-label="Discovery prospects">
              <table className="rd-desk-table" style={{ background: c.panel, borderRadius: 14, overflow: 'hidden' }}>
                <thead>
                  <tr>
                    {['Reference', 'Business / contact', 'Path / offer', 'Received', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '12px 14px',
                          fontSize: 11,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: c.faint,
                          borderBottom: `1px solid ${c.panelBorder}`,
                          fontWeight: 700,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(leads || []).map((row) => {
                    const badge = badgeFor(row.operator_status);
                    return (
                      <tr
                        key={row.id}
                        style={{
                          background: selectedId === row.id ? c.panelHover : 'transparent',
                        }}
                      >
                        <td style={tdCell}>
                          <code style={{ fontSize: 12.5, color: c.accent }}>{row.reference}</code>
                        </td>
                        <td style={tdCell}>
                          <div style={{ fontWeight: 700 }}>{row.business_name || row.name || '—'}</div>
                          <div style={{ color: c.faint, fontSize: 12.5, marginTop: 2 }}>
                            {row.name || '—'}
                            {row.enquiry_channels ? ` · ${row.enquiry_channels}` : ''}
                          </div>
                          <div style={{ color: c.muted, fontSize: 12.5, marginTop: 4 }}>
                            {truncate(row.primary_pain, 80)}
                          </div>
                        </td>
                        <td style={tdCell}>
                          {row.service_path_title || row.offer_title || row.offer_slug || '—'}
                          {row.source_host ? (
                            <div style={{ color: c.faint, fontSize: 12, marginTop: 4 }}>Source: {row.source_host}</div>
                          ) : null}
                        </td>
                        <td style={{ ...tdCell, whiteSpace: 'nowrap', color: c.muted, fontSize: 12.5 }}>
                          {formatReceived(row.created_at)}
                        </td>
                        <td style={tdCell}>
                          <StatusControl
                            row={row}
                            busy={busyId === row.id}
                            saveHint={saveState[row.id]}
                            onChange={(status) => patchStatus(row.id, status)}
                            badge={badge}
                          />
                        </td>
                        <td style={tdCell}>
                          <LeadActions
                            row={row}
                            busy={busyId === row.id}
                            onDetails={() => setSelectedId(row.id === selectedId ? null : row.id)}
                            onProposal={() => prepareProposal(row.id)}
                            onCopyProposal={() => copyProposal(row.id)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="rd-desk-cards">
                {(leads || []).map((row) => {
                  const badge = badgeFor(row.operator_status);
                  return (
                    <article
                      key={row.id}
                      data-lead-card
                      style={{
                        background: c.panel,
                        border: `1px solid ${selectedId === row.id ? 'rgba(45,212,191,0.45)' : c.panelBorder}`,
                        borderRadius: 14,
                        padding: 16,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <code style={{ color: c.accent, fontSize: 13 }}>{row.reference}</code>
                        <span
                          style={{
                            ...badgeStyle,
                            background: badge.bg,
                            color: badge.fg,
                          }}
                        >
                          {rapidDeliveryStatusLabel(row.operator_status)}
                        </span>
                      </div>
                      <h2 style={{ margin: '10px 0 4px', fontSize: 17 }}>{row.business_name || row.name || '—'}</h2>
                      <p style={{ margin: 0, color: c.muted, fontSize: 13.5 }}>
                        {row.name || '—'} · {row.service_path_title || row.offer_title || row.offer_slug || '—'}
                      </p>
                      <p style={{ margin: '8px 0 0', color: c.faint, fontSize: 12.5 }}>
                        Received {formatReceived(row.created_at)}
                        {row.enquiry_channels ? ` · Prefers ${row.enquiry_channels}` : ''}
                      </p>
                      <p style={{ margin: '10px 0 0', fontSize: 13.5, lineHeight: 1.45 }}>
                        {truncate(row.primary_pain, 140)}
                      </p>
                      <div style={{ marginTop: 12 }}>
                        <StatusControl
                          row={row}
                          busy={busyId === row.id}
                          saveHint={saveState[row.id]}
                          onChange={(status) => patchStatus(row.id, status)}
                          badge={badge}
                        />
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <LeadActions
                          row={row}
                          busy={busyId === row.id}
                          onDetails={() => setSelectedId(row.id === selectedId ? null : row.id)}
                          onProposal={() => prepareProposal(row.id)}
                          onCopyProposal={() => copyProposal(row.id)}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {selected ? (
            <section
              aria-label="Lead detail"
              data-lead-detail
              style={{
                marginTop: 20,
                background: c.panel,
                border: `1px solid rgba(45,212,191,0.28)`,
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Lead detail · {selected.reference}</h2>
                <button type="button" style={btnGhost} onClick={() => setSelectedId(null)}>
                  Close detail
                </button>
              </div>
              <dl
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px 18px',
                  margin: '16px 0 0',
                }}
              >
                {[
                  ['Source', selected.source_host || '—'],
                  ['Business', selected.business_name || '—'],
                  ['Contact', selected.name || '—'],
                  ['Email', selected.email || '—'],
                  ['Telephone', selected.phone || '—'],
                  ['Website', selected.website || '—'],
                  ['Enquiry channels', selected.enquiry_channels || '—'],
                  ['Service path', selected.service_path_title || selected.service_path || '—'],
                  ['Selected offer', selected.offer_title || selected.offer_slug || '—'],
                  ['Timing', selected.urgency_label || selected.urgency || '—'],
                  ['Consent to contact', selected.consent_to_contact ? 'Yes' : '—'],
                  ['Primary pain', selected.primary_pain || '—'],
                  ['Status', rapidDeliveryStatusLabel(selected.operator_status)],
                  ['Reference', selected.reference],
                  ['Received', formatReceived(selected.created_at)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.faint }}>
                      {k}
                    </dt>
                    <dd style={{ margin: '4px 0 0', fontSize: 14.5, lineHeight: 1.45 }}>{v}</dd>
                  </div>
                ))}
              </dl>
              <div style={{ marginTop: 14 }} data-recommended-next-action>
                <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.faint }}>
                  Recommended next action
                </div>
                <p style={{ margin: '6px 0 0', color: c.text, lineHeight: 1.55, fontWeight: 600 }}>
                  {selected.recommended_next_action || '—'}
                </p>
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.faint }}>
                  Problem summary / discovery notes
                </div>
                <p style={{ margin: '6px 0 0', color: c.muted, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  {selected.primary_pain || '—'}
                  {selected.discovery_notes && selected.discovery_notes !== selected.primary_pain
                    ? `\n\n${selected.discovery_notes}`
                    : ''}
                </p>
              </div>
              <div style={{ marginTop: 16 }} data-operator-notes>
                <label style={{ display: 'block' }}>
                  <span
                    style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.faint }}
                  >
                    Operator notes
                  </span>
                  <textarea
                    value={notesDraft}
                    onChange={(ev) => setNotesDraft(ev.target.value)}
                    rows={4}
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: 6,
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: `1px solid ${c.panelBorder}`,
                      background: 'rgba(0,0,0,0.22)',
                      color: c.text,
                      fontFamily: 'inherit',
                      fontSize: 14,
                      lineHeight: 1.5,
                      resize: 'vertical',
                    }}
                  />
                </label>
                <button
                  type="button"
                  style={{ ...btnPrimary, marginTop: 10 }}
                  disabled={busyId === selected.id}
                  onClick={() => saveNotes(selected.id)}
                >
                  Save notes
                </button>
                {saveState[selected.id] ? (
                  <span style={{ marginLeft: 10, color: c.faint, fontSize: 13 }}>{saveState[selected.id]}</span>
                ) : null}
              </div>
              <div style={{ marginTop: 16 }} data-response-draft>
                <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.faint }}>
                  Copy-ready response draft (no live send)
                </div>
                <pre
                  style={{
                    margin: '8px 0 0',
                    padding: 12,
                    borderRadius: 10,
                    border: `1px solid ${c.panelBorder}`,
                    background: 'rgba(0,0,0,0.22)',
                    color: c.muted,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                  }}
                >
                  {selected.response_draft || '—'}
                </pre>
                <button
                  type="button"
                  style={{ ...btnGhost, marginTop: 10 }}
                  onClick={() => copyText('Response draft copied', selected.response_draft || '')}
                >
                  Copy response draft
                </button>
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" style={btnPrimary} onClick={() => prepareProposal(selected.id)}>
                  Prepare proposal
                </button>
                {selected.offer_path ? (
                  <Link href={selected.offer_path} style={btnGhost} target="_blank" rel="noreferrer">
                    Open public offer
                  </Link>
                ) : null}
                <Link href="/change/revenue" style={btnGhost}>
                  Open revenue cockpit
                </Link>
              </div>
              {String(selected.offer_slug || '') === 'premium-landing-page-rescue' ? (
                <div
                  data-website-rescue-operator-pack
                  style={{
                    marginTop: 18,
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(45,212,191,0.28)',
                    background: 'rgba(45,212,191,0.08)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: c.accent,
                      fontWeight: 700,
                    }}
                  >
                    Website Rescue operator pack
                  </div>
                  <p style={{ margin: '8px 0 0', color: c.muted, fontSize: 13.5, lineHeight: 1.5 }}>
                    T1 public floor MUR 45,000 · 50% deposit · quote from the Website Rescue packet. Demo (fictional):{' '}
                    <Link href="/demo/website-rescue" style={{ color: c.link }}>
                      /demo/website-rescue
                    </Link>
                    .
                  </p>
                  <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: c.muted, fontSize: 13, lineHeight: 1.55 }}>
                    <li>docs/marketing/WEBSITE_RESCUE_QUOTE_READY_PACKET_V1.md</li>
                    <li>docs/sales/WEBSITE_RESCUE_PRICING_GUIDE.md</li>
                    <li>docs/operations/WEBSITE_RESCUE_DELIVERY_CHECKLISTS_V1.md</li>
                    <li>docs/marketing/WEBSITE_RESCUE_PRODUCT_PACK_V1.md</li>
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {proposalOpen && proposal ? (
            <ProposalPreview
              proposal={proposal}
              copyFlash={copyFlash}
              onCopyMarkdown={() => copyText('Proposal copied', proposal.markdown)}
              onCopyPlain={() => copyText('Plain text copied', proposal.plain_text || proposal.markdown)}
              onClose={() => {
                setProposalOpen(false);
                setProposal(null);
              }}
            />
          ) : null}
        </main>
      </div>
    </>
  );
}

const tdCell = {
  padding: '14px',
  borderBottom: `1px solid rgba(255,255,255,0.06)`,
  verticalAlign: 'top',
  fontSize: 13.5,
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '3px 9px',
  borderRadius: 999,
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: '0.02em',
};

function StatusControl({ row, busy, saveHint, onChange, badge }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
      <label style={{ fontSize: 11, color: c.faint }} htmlFor={`status-${row.id}`}>
        Update status
      </label>
      <select
        id={`status-${row.id}`}
        value={rapidDeliveryStatusSelectValue(row.operator_status)}
        disabled={busy}
        onChange={(ev) => onChange(ev.target.value)}
        aria-label={`Update status for ${row.reference}`}
        style={{
          padding: '8px 10px',
          borderRadius: 10,
          border: `1px solid ${c.panelBorder}`,
          background: '#0a1628',
          color: c.text,
          fontSize: 13,
          fontFamily: 'inherit',
        }}
      >
        {RAPID_DELIVERY_OPERATOR_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        style={{
          ...badgeStyle,
          alignSelf: 'flex-start',
          background: badge.bg,
          color: badge.fg,
        }}
      >
        {rapidDeliveryStatusLabel(row.operator_status)}
      </span>
      {saveHint ? (
        <span style={{ fontSize: 12, color: saveHint === 'Error' ? c.danger : c.good }}>{saveHint}</span>
      ) : null}
    </div>
  );
}

function LeadActions({ row, busy, onDetails, onProposal, onCopyProposal }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      <button type="button" style={btnGhost} onClick={onDetails} disabled={busy}>
        View details
      </button>
      <button type="button" style={btnPrimary} onClick={onProposal} disabled={busy}>
        Prepare proposal
      </button>
      <button type="button" style={btnGhost} onClick={onCopyProposal} disabled={busy}>
        Copy proposal
      </button>
      {row.offer_path ? (
        <Link href={row.offer_path} style={btnGhost} target="_blank" rel="noreferrer">
          Open public offer
        </Link>
      ) : null}
      <Link href="/change/revenue" style={btnGhost}>
        Open revenue cockpit
      </Link>
    </div>
  );
}

function ProposalPreview({ proposal, copyFlash, onCopyMarkdown, onCopyPlain, onClose }) {
  const s = proposal.sections || {};
  const prospect = s.prospect || {};
  const needs = s.prospect_needs || {};
  const proof = s.delivery_proof || {};

  const blocks = [
    {
      title: 'Prospect',
      body: (
        <ul style={listStyle}>
          <li>Business: {prospect.business}</li>
          <li>Contact: {prospect.contact}</li>
          <li>Email: {prospect.email}</li>
          <li>Phone: {prospect.phone}</li>
          <li>Channels: {prospect.enquiry_channels}</li>
          <li>Reference: {prospect.reference || proposal.reference}</li>
        </ul>
      ),
    },
    { title: 'Recommended sprint', body: <p style={pStyle}>{s.recommended_sprint || '—'}</p> },
    { title: 'Starting price', body: <p style={pStyle}>{s.starting_price || '—'}</p> },
    { title: 'Deposit', body: <p style={pStyle}>{s.deposit || '—'}</p> },
    {
      title: 'Prospect needs',
      body: (
        <ul style={listStyle}>
          <li>Primary pain: {needs.primary_pain || '—'}</li>
          <li>Discovery notes: {needs.discovery_notes || '—'}</li>
        </ul>
      ),
    },
    {
      title: 'Delivery scope',
      body: (
        <ul style={listStyle}>
          {(s.delivery_scope || []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ),
    },
    {
      title: 'Client responsibilities',
      body: (
        <ul style={listStyle}>
          {(s.client_responsibilities || []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ),
    },
    { title: 'Timeline', body: <p style={pStyle}>{s.timeline || '—'}</p> },
    {
      title: 'Delivery proof',
      body: (
        <div>
          <p style={pStyle}>{proof.statement || '—'}</p>
          <ul style={listStyle}>
            {proof.offer_url ? (
              <li>
                <a href={proof.offer_url} style={{ color: c.link }} target="_blank" rel="noreferrer">
                  {proof.offer_url}
                </a>
              </li>
            ) : null}
            {proof.standards_url ? <li>{proof.standards_url}</li> : null}
            {proof.process_url ? <li>{proof.process_url}</li> : null}
          </ul>
        </div>
      ),
    },
    {
      title: 'Commercial guardrails',
      body: (
        <ul style={listStyle}>
          {(s.commercial_guardrails || []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ),
    },
    {
      title: 'Operator next steps',
      body: (
        <ol style={{ ...listStyle, listStyleType: 'decimal', paddingLeft: 18 }}>
          {(s.operator_next_steps || []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      ),
    },
  ];

  return (
    <section
      aria-label="Proposal preview"
      data-proposal-preview
      style={{
        marginTop: 22,
        background: c.panel,
        border: `1px solid ${c.panelBorder}`,
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Proposal-ready summary · {proposal.reference}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" style={btnPrimary} onClick={onCopyMarkdown} data-copy-proposal>
            Copy proposal summary
          </button>
          <button type="button" style={btnGhost} onClick={onCopyPlain} data-copy-plain>
            Copy plain text
          </button>
          <button type="button" style={btnGhost} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <p style={{ margin: '10px 0 0', color: c.warn, fontSize: 13, fontWeight: 600 }}>{MANUAL_APPROVAL}</p>
      {copyFlash ? (
        <p style={{ margin: '8px 0 0', color: c.good, fontSize: 13 }} aria-live="polite">
          {copyFlash}
        </p>
      ) : null}
      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {blocks.map((block) => (
          <div
            key={block.title}
            data-proposal-section={block.title}
            style={{
              border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: 12,
              padding: '12px 14px',
              background: 'rgba(0,0,0,0.18)',
            }}
          >
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: 12,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: c.accent,
              }}
            >
              {block.title}
            </h3>
            {block.body}
          </div>
        ))}
      </div>
      {/* Explicit: no outbound message control on this desk */}
    </section>
  );
}

const listStyle = { margin: 0, paddingLeft: 18, color: c.muted, lineHeight: 1.5, fontSize: 14 };
const pStyle = { margin: 0, color: c.muted, lineHeight: 1.55, fontSize: 14 };
