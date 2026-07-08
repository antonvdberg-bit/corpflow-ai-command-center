import { useEffect, useState } from 'react';
import Link from 'next/link';

import LuxeMauriceAiPreviewShell, { LUXE_MAURICE_AI_BASE } from '../../../components/LuxeMauriceAiPreviewShell.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../../../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow, LuxHairline } from '../../../components/LuxeMauriceBrandPrimitives.js';
import { listLeads } from '../../../lib/client/luxe-maurice-ai-data.js';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatBudget(profile) {
  if (!profile) return '—';
  const min = profile.budget_min != null ? Number(profile.budget_min).toLocaleString() : null;
  const max = profile.budget_max != null ? Number(profile.budget_max).toLocaleString() : null;
  const cur = profile.currency_code || 'USD';
  if (min && max) return `${cur} ${min} – ${max}`;
  if (max) return `Up to ${cur} ${max}`;
  if (min) return `From ${cur} ${min}`;
  return '—';
}

function requirementSummary(requirements) {
  if (!Array.isArray(requirements) || !requirements.length) return '—';
  return requirements.map((r) => `${r.key}: ${r.value}`).join(' · ');
}

export default function LuxeMauriceAiCrmPage({ initialLeads }) {
  const [leads, setLeads] = useState(Array.isArray(initialLeads) ? initialLeads : []);

  useEffect(() => {
    setLeads(listLeads());
  }, []);

  return (
    <LuxeMauriceAiPreviewShell
      active="advisor view"
      title="Advisor lead view"
      description="Operator preview of buyer enquiries and lead scoring for LuxeMaurice AI."
    >
      <section style={{ padding: '48px clamp(20px, 4vw, 56px)' }}>
        <LuxEyebrow>Advisor workflow</LuxEyebrow>
        <h1
          style={{
            marginTop: 14,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(32px, 5vw, 40px)',
            fontWeight: 500,
          }}
        >
          Lead list
        </h1>
        <p style={{ marginTop: 12, color: T.ivoryMuted, maxWidth: 620, lineHeight: 1.65 }}>
          Enquiries from the buyer wizard appear here with budget, location preferences, status, and
          match score. Submit a test enquiry on the{' '}
          <Link href={`${LUXE_MAURICE_AI_BASE}/buyer`} style={{ color: T.gold }}>
            buyer form
          </Link>{' '}
          to see a new row appear in this preview.
        </p>
        <LuxHairline />

        <div style={{ marginTop: 32, overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              minWidth: 720,
              borderCollapse: 'collapse',
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.hairline}` }}>
                {['Buyer', 'Budget', 'Location / type', 'Property', 'Status', 'Score', 'Created'].map(
                  (h) => (
                    <th
                      key={h}
                      scope="col"
                      style={{
                        textAlign: 'left',
                        padding: '12px 16px 12px 0',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: T.gold,
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} style={{ borderBottom: `1px solid ${T.hairlineSoft}` }}>
                  <td style={{ padding: '16px 16px 16px 0', verticalAlign: 'top' }}>
                    <strong style={{ display: 'block', color: T.ivory }}>
                      {lead.buyer?.full_name || '—'}
                    </strong>
                    <span style={{ fontSize: 13, color: T.ivoryMuted }}>{lead.buyer?.email}</span>
                  </td>
                  <td style={{ padding: '16px 16px 16px 0', color: T.ivoryMuted, verticalAlign: 'top' }}>
                    {formatBudget(lead.profile)}
                  </td>
                  <td style={{ padding: '16px 16px 16px 0', color: T.ivoryMuted, verticalAlign: 'top' }}>
                    {requirementSummary(lead.requirements)}
                  </td>
                  <td style={{ padding: '16px 16px 16px 0', color: T.ivoryMuted, verticalAlign: 'top' }}>
                    {lead.property?.title || 'General'}
                  </td>
                  <td style={{ padding: '16px 16px 16px 0', verticalAlign: 'top' }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: T.gold,
                      }}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 16px 16px 0', verticalAlign: 'top' }}>
                    {lead.score ? (
                      <>
                        <strong style={{ color: T.ivory }}>{lead.score.score}</strong>
                        <span style={{ color: T.ivoryMuted }}> · {lead.score.score_band}</span>
                        {lead.match?.match_score ? (
                          <div style={{ fontSize: 12, color: T.stoneSoft, marginTop: 4 }}>
                            Match {lead.match.match_score}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: '16px 0', color: T.ivoryMuted, verticalAlign: 'top' }}>
                    {formatDate(lead.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 ? (
            <p style={{ marginTop: 24, color: T.ivoryMuted }}>No leads in preview yet.</p>
          ) : null}
        </div>
      </section>
    </LuxeMauriceAiPreviewShell>
  );
}

export async function getStaticProps() {
  return {
    props: {
      initialLeads: listLeads(),
    },
  };
}
