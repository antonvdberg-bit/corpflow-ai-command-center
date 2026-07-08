import { useEffect, useState } from 'react';
import Link from 'next/link';

import LuxeMauriceAiPreviewShell, { LUXE_MAURICE_AI_BASE } from '../../../components/LuxeMauriceAiPreviewShell.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../../../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow, LuxHairline } from '../../../components/LuxeMauriceBrandPrimitives.js';
import { getCategoryLabel, listLeads } from '../../../lib/client/luxe-maurice-ai-data.js';
import {
  LUXE_MAURICE_AI_SECTION_PAD,
  luxeMauriceAiCtaSecondary,
} from '../../../lib/client/luxe-maurice-ai-layout.js';

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

/** @param {{ lead: Record<string, unknown> }} props */
function LeadCard({ lead }) {
  return (
    <article
      style={{
        padding: '16px 18px',
        border: `1px solid ${T.hairlineSoft}`,
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <strong style={{ display: 'block', color: T.ivory, fontSize: 15 }}>
            {lead.buyer?.full_name || '—'}
          </strong>
          <span style={{ fontSize: 13, color: T.ivoryMuted }}>{lead.buyer?.email}</span>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: T.gold,
          }}
        >
          {lead.status}
        </span>
      </div>
      <dl
        style={{
          margin: '14px 0 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px 16px',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <div>
          <dt style={{ margin: 0, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.gold }}>
            Channel
          </dt>
          <dd style={{ margin: '4px 0 0', color: T.ivoryMuted }}>{getCategoryLabel(lead.access_category)}</dd>
        </div>
        <div>
          <dt style={{ margin: 0, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.gold }}>
            Access intent
          </dt>
          <dd style={{ margin: '4px 0 0', color: T.ivoryMuted }}>
            {lead.access_intent || lead.profile?.timeline || '—'}
          </dd>
        </div>
        <div>
          <dt style={{ margin: 0, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.gold }}>
            Budget
          </dt>
          <dd style={{ margin: '4px 0 0', color: T.ivoryMuted }}>{formatBudget(lead.profile)}</dd>
        </div>
        <div>
          <dt style={{ margin: 0, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.gold }}>
            Opportunity
          </dt>
          <dd style={{ margin: '4px 0 0', color: T.ivoryMuted }}>
            {lead.opportunity?.title || lead.property?.title || 'General mandate'}
          </dd>
        </div>
        <div>
          <dt style={{ margin: 0, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.gold }}>
            Score
          </dt>
          <dd style={{ margin: '4px 0 0', color: T.ivoryMuted }}>
            {lead.score ? (
              <>
                <strong style={{ color: T.ivory }}>{lead.score.score}</strong> · {lead.score.score_band}
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt style={{ margin: 0, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.gold }}>
            Next action
          </dt>
          <dd style={{ margin: '4px 0 0', color: T.stoneSoft }}>{lead.next_action || 'Schedule private consultation'}</dd>
        </div>
      </dl>
      <p style={{ margin: '12px 0 0', fontSize: 12, color: T.ivoryMuted }}>Created {formatDate(lead.created_at)}</p>
    </article>
  );
}

export default function LuxeMauriceAiCrmPage({ initialLeads }) {
  const [leads, setLeads] = useState(Array.isArray(initialLeads) ? initialLeads : []);

  useEffect(() => {
    setLeads(listLeads());
  }, []);

  return (
    <LuxeMauriceAiPreviewShell
      active="pipeline"
      title="Advisor pipeline"
      description="Operator preview of private access requests across all LuxeMaurice AI channels."
    >
      <section style={{ padding: LUXE_MAURICE_AI_SECTION_PAD }}>
        <LuxEyebrow>Advisor pipeline</LuxEyebrow>
        <h1
          style={{
            marginTop: 14,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(28px, 6vw, 40px)',
            fontWeight: 500,
            lineHeight: 1.15,
          }}
        >
          Advisor pipeline
        </h1>
        <p style={{ marginTop: 12, color: T.ivoryMuted, maxWidth: 640, lineHeight: 1.65 }}>
          Every private access request — across residences, yachts, aviation, experiences, and advisory — lands here for
          operator triage. Submit a test on the{' '}
          <Link href={`${LUXE_MAURICE_AI_BASE}/buyer`} style={{ color: T.gold }}>
            access request form
          </Link>{' '}
          to add a row.
        </p>

        <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link href={`${LUXE_MAURICE_AI_BASE}/buyer`} style={luxeMauriceAiCtaSecondary({ minWidth: 0 })}>
            + New access request
          </Link>
          <Link href={`${LUXE_MAURICE_AI_BASE}/properties`} style={luxeMauriceAiCtaSecondary({ minWidth: 0 })}>
            Browse catalogue
          </Link>
        </div>

        <LuxHairline />

        <div style={{ marginTop: 24, display: 'grid', gap: 14 }}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>

        {leads.length === 0 ? (
          <p style={{ marginTop: 24, color: T.ivoryMuted, lineHeight: 1.6 }}>
            No requests in preview yet.{' '}
            <Link href={`${LUXE_MAURICE_AI_BASE}/buyer`} style={{ color: T.gold }}>
              Submit the first private access request →
            </Link>
          </p>
        ) : null}
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
