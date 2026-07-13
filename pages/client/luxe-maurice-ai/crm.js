import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import LuxeMauriceAiPreviewShell, { LUXE_MAURICE_AI_BASE } from '../../../components/LuxeMauriceAiPreviewShell.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../../../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow, LuxHairline } from '../../../components/LuxeMauriceBrandPrimitives.js';
import { getCategoryLabel, listDemonstrationAdvisorLeads } from '../../../lib/client/luxe-maurice-ai-data.js';
import {
  LUXE_MAURICE_AI_SECTION_PAD,
  luxeMauriceAiCtaSecondary,
} from '../../../lib/client/luxe-maurice-ai-layout.js';

const PRIVATE_ACCESS_REQUESTS_API = '/api/lux/luxe-maurice-ai/private-access-requests';

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

function formatLocation(lead) {
  const loc = lead.profile?.desired_location || lead.desired_location;
  return loc ? String(loc) : '—';
}

/** @param {{ lead: Record<string, unknown>, showReference?: boolean }} props */
function LeadCard({ lead, showReference = false }) {
  const statusLabel =
    lead.status === 'review_required' || lead.status === 'new'
      ? 'Pending advisor review'
      : String(lead.status || 'Pending advisor review');

  return (
    <article
      style={{
        padding: '16px 18px',
        border: `1px solid ${T.hairlineSoft}`,
        background: lead.demonstration ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
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
          {statusLabel}
        </span>
      </div>
      {showReference && lead.reference_id ? (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: T.ivoryMuted, letterSpacing: '0.04em' }}>
          Reference: <strong style={{ color: T.ivory }}>{lead.reference_id}</strong>
        </p>
      ) : null}
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
            Region
          </dt>
          <dd style={{ margin: '4px 0 0', color: T.ivoryMuted }}>{formatLocation(lead)}</dd>
        </div>
        <div>
          <dt style={{ margin: 0, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.gold }}>
            Opportunity
          </dt>
          <dd style={{ margin: '4px 0 0', color: T.ivoryMuted }}>
            {lead.opportunity?.title || lead.property?.title || lead.opportunity?.slug || 'General mandate'}
          </dd>
        </div>
        <div>
          <dt style={{ margin: 0, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.gold }}>
            Next action
          </dt>
          <dd style={{ margin: '4px 0 0', color: T.stoneSoft }}>{lead.next_action || 'Pending advisor review'}</dd>
        </div>
      </dl>
      {lead.notes_summary ? (
        <p style={{ margin: '12px 0 0', fontSize: 12, color: T.ivoryMuted, lineHeight: 1.55 }}>{lead.notes_summary}</p>
      ) : null}
      <p style={{ margin: '12px 0 0', fontSize: 12, color: T.ivoryMuted }}>Received {formatDate(lead.created_at)}</p>
    </article>
  );
}

export default function LuxeMauriceAiCrmPage({ demonstrationLeads }) {
  const [persistedRequests, setPersistedRequests] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPersistedRequests() {
      setLoadState('loading');
      setLoadError('');
      try {
        const res = await fetch(PRIVATE_ACCESS_REQUESTS_API, { credentials: 'include' });
        const payload = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (res.status === 403) {
          setPersistedRequests([]);
          setLoadState('session_required');
          return;
        }

        if (!res.ok || payload?.ok !== true) {
          setPersistedRequests([]);
          setLoadState('error');
          setLoadError('Unable to load private access requests right now.');
          return;
        }

        const rows = Array.isArray(payload.requests) ? payload.requests : [];
        setPersistedRequests(rows);
        setLoadState('ready');
      } catch {
        if (!cancelled) {
          setPersistedRequests([]);
          setLoadState('error');
          setLoadError('Unable to load private access requests. Check your connection and try again.');
        }
      }
    }

    void loadPersistedRequests();
    return () => {
      cancelled = true;
    };
  }, []);

  const demoLeads = Array.isArray(demonstrationLeads) ? demonstrationLeads : [];

  return (
    <LuxeMauriceAiPreviewShell
      active="pipeline"
      title="Advisor review workspace"
      description="Private access requests across LuxeMaurice AI channels — received for advisor review."
    >
      <Head>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <section style={{ padding: LUXE_MAURICE_AI_SECTION_PAD }}>
        <LuxEyebrow>Advisor review workspace</LuxEyebrow>
        <h1
          style={{
            marginTop: 14,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(28px, 6vw, 40px)',
            fontWeight: 500,
            lineHeight: 1.15,
          }}
        >
          Private access requests
        </h1>
        <p style={{ marginTop: 12, color: T.ivoryMuted, maxWidth: 640, lineHeight: 1.65 }}>
          Every submitted private access request — across residences, yachts, aviation, experiences, and advisory —
          appears here for advisor triage after LuxeMaurice sign-in.
        </p>

        <div
          style={{
            marginTop: 18,
            padding: '14px 16px',
            border: `1px solid ${T.hairline}`,
            background: 'rgba(201, 169, 98, 0.08)',
            fontSize: 13,
            lineHeight: 1.55,
            color: T.ivoryMuted,
          }}
        >
          <strong style={{ color: T.ivory }}>Advisor review workspace.</strong> Persisted requests require LuxeMaurice
          sign-in. This page is not indexed. Demonstration records below are for layout reference only.
        </div>

        <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link href={`${LUXE_MAURICE_AI_BASE}/buyer`} style={luxeMauriceAiCtaSecondary({ minWidth: 0 })}>
            + New access request
          </Link>
          <Link href={`${LUXE_MAURICE_AI_BASE}/properties`} style={luxeMauriceAiCtaSecondary({ minWidth: 0 })}>
            Browse catalogue
          </Link>
        </div>

        <LuxHairline />

        {loadState === 'loading' ? (
          <p style={{ marginTop: 24, color: T.ivoryMuted, lineHeight: 1.6 }}>Loading private access requests…</p>
        ) : null}

        {loadState === 'session_required' ? (
          <p style={{ marginTop: 24, color: T.ivoryMuted, lineHeight: 1.6 }}>
            Sign in to LuxeMaurice to view received private access requests.{' '}
            <Link href="/login?next=%2Fclient%2Fluxe-maurice-ai%2Fcrm" style={{ color: T.gold }}>
              Sign in →
            </Link>
          </p>
        ) : null}

        {loadError ? (
          <p style={{ marginTop: 24, color: '#e8a598', lineHeight: 1.6 }} role="alert">
            {loadError}
          </p>
        ) : null}

        {loadState === 'ready' ? (
          <>
            <h2
              style={{
                marginTop: 28,
                fontFamily: T.fontDisplay,
                fontSize: 20,
                fontWeight: 500,
                color: T.ivory,
              }}
            >
              Received for advisor review
            </h2>
            <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
              {persistedRequests.map((lead) => (
                <LeadCard key={lead.id} lead={lead} showReference />
              ))}
            </div>
            {persistedRequests.length === 0 ? (
              <p style={{ marginTop: 16, color: T.ivoryMuted, lineHeight: 1.6 }}>
                No private access requests yet.{' '}
                <Link href={`${LUXE_MAURICE_AI_BASE}/buyer`} style={{ color: T.gold }}>
                  Submit the first request →
                </Link>
              </p>
            ) : null}
          </>
        ) : null}

        {demoLeads.length > 0 ? (
          <>
            <h2
              style={{
                marginTop: 36,
                fontFamily: T.fontDisplay,
                fontSize: 18,
                fontWeight: 500,
                color: T.ivoryMuted,
              }}
            >
              Demonstration records
            </h2>
            <p style={{ marginTop: 8, fontSize: 13, color: T.ivoryMuted, lineHeight: 1.55 }}>
              Sample layout rows for training — not live client submissions.
            </p>
            <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
              {demoLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          </>
        ) : null}
      </section>
    </LuxeMauriceAiPreviewShell>
  );
}

export async function getStaticProps() {
  return {
    props: {
      demonstrationLeads: listDemonstrationAdvisorLeads(),
    },
  };
}
