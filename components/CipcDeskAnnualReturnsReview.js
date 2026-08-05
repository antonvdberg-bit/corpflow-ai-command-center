import React, { useState } from 'react';
import Head from 'next/head';

import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js';
import HeroGlassBlock from './beauty/HeroGlassBlock.js';
import GlassPanel from './beauty/GlassPanel.js';
import {
  buildPublicVisualHero,
  CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP,
} from '../lib/public/corpflow-public-visuals.js';
import {
  ANNUAL_RETURNS_CANNOT_GUARANTEE,
  ANNUAL_RETURNS_CHECKLIST,
  ANNUAL_RETURNS_COVERS,
  ANNUAL_RETURNS_DISCLAIMERS,
  ANNUAL_RETURNS_DOES_NOT_COVER,
  ANNUAL_RETURNS_EXCEPTIONS,
  ANNUAL_RETURNS_EXPLANATION,
  ANNUAL_RETURNS_FEEDBACK_PROMPTS,
  ANNUAL_RETURNS_REVIEW_META,
  ANNUAL_RETURNS_STATUS_FLOW,
  buildAnnualReturnsFeedbackMessage,
} from '../lib/public/cipc-desk-annual-returns-review-content.js';
import { TestEnvironmentRibbon } from '../lib/sandbox/test-environment-ribbon.js';
import {
  CF,
  cfBody,
  cfBtnPrimary,
  cfBtnSecondary,
  cfH2,
  cfKicker,
  cfLead,
  cfSection,
} from './public/corpflow-public-styles.js';

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(3,15,34,0.55)',
  color: '#eef6ff',
  fontSize: 15,
  fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block',
  fontSize: 13,
  color: '#9fb2c8',
  marginBottom: 6,
  fontWeight: 600,
};

const tagStyle = {
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: CF.accent,
  marginBottom: 8,
};

/**
 * CIPC Desk Annual Returns specialist-review page (#761).
 * Feedback reuses existing POST /api/tenant/intake → Postgres `leads` (host-scoped).
 */
export default function CipcDeskAnnualReturnsReview() {
  const brand = ANNUAL_RETURNS_REVIEW_META.brand;
  const pageTitle = ANNUAL_RETURNS_REVIEW_META.page_title;
  const description = ANNUAL_RETURNS_REVIEW_META.description;
  const visualHero = buildPublicVisualHero('process') || buildPublicVisualHero('services');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [readiness, setReadiness] = useState('');
  const [topicNotes, setTopicNotes] = useState(() => {
    /** @type {Record<string, string>} */
    const init = {};
    for (const t of ANNUAL_RETURNS_FEEDBACK_PROMPTS.topics) init[t.id] = '';
    return init;
  });
  const [overallNotes, setOverallNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** @type {[{ lead_id: string } | null, Function]} */
  const [done, setDone] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email is required so we can follow up on your review.');
      return;
    }
    if (!readiness) {
      setError('Please select overall readiness: approve / approve with changes / not ready.');
      return;
    }
    const message = buildAnnualReturnsFeedbackMessage({ readiness, topicNotes, overallNotes });
    setBusy(true);
    try {
      const r = await fetch('/api/tenant/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || email.trim(),
          email: email.trim().toLowerCase(),
          intent: ANNUAL_RETURNS_FEEDBACK_PROMPTS.intent_prefix,
          message,
          meta: {
            product: ANNUAL_RETURNS_FEEDBACK_PROMPTS.meta_product,
            service: ANNUAL_RETURNS_FEEDBACK_PROMPTS.meta_service,
            page: ANNUAL_RETURNS_FEEDBACK_PROMPTS.meta_page,
            feedback_type: ANNUAL_RETURNS_FEEDBACK_PROMPTS.meta_feedback_type,
            readiness,
            topic_ids: ANNUAL_RETURNS_FEEDBACK_PROMPTS.topics.map((t) => t.id),
            synthetic_ok: true,
          },
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data?.error || data?.hint || `Submit failed (${r.status})`);
        return;
      }
      setDone({ lead_id: data?.lead_id || data?.id || 'ok' });
    } catch (err) {
      setError(err?.message || 'Network error submitting feedback');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="noindex,nofollow" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta name="theme-color" content="#06111f" />
      </Head>

      <TestEnvironmentRibbon message={ANNUAL_RETURNS_DISCLAIMERS.test_ribbon} />

      <PublicMarketingPhotoGlassShell
        pageClassName="cipc-desk-annual-returns-review"
        maxWidth={1120}
        hero={visualHero}
        scrimTone="dark"
        scrimStyle={{ background: CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP }}
        publicScrimHook
        contentStyle={{ paddingTop: 88 }}
        footer={
          <div>
            <div style={{ fontWeight: 800, color: CF.text, marginBottom: 6 }}>{brand}</div>
            <p style={{ ...cfBody, margin: 0, fontSize: 13.5 }}>
              {ANNUAL_RETURNS_DISCLAIMERS.independence} {ANNUAL_RETURNS_REVIEW_META.working_name_note}{' '}
              Powered by CorpFlowAI · corpflow_test only.
            </p>
          </div>
        }
      >
        <nav
          aria-label="CIPC Desk Annual Returns"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 900,
                fontSize: 22,
                letterSpacing: '-0.02em',
                color: CF.text,
              }}
            >
              {brand}
            </div>
            <div style={{ color: CF.textFaint, fontSize: 12, marginTop: 2 }}>
              Annual Returns · specialist review
            </div>
          </div>
          <a href="/" style={{ ...cfBtnSecondary, fontSize: 13, minHeight: 40, padding: '10px 16px' }}>
            Back to desk home
          </a>
        </nav>

        <HeroGlassBlock
          eyebrow={<p style={{ ...cfKicker, marginBottom: 10 }}>Specialist review surface · #761</p>}
          title={
            <h1
              style={{
                margin: '0 0 10px',
                fontSize: 'clamp(30px, 5vw, 48px)',
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                color: CF.text,
                maxWidth: 720,
              }}
            >
              Annual Returns
            </h1>
          }
          lead={
            <>
              <p style={{ ...cfLead, marginBottom: 12 }}>
                Review-level process pack for Sarah — plain English, checklist, status flow, exceptions, and
                structured feedback. Content basis: process pack #750 / PR #758; research #740.
              </p>
              <GlassPanel
                variant={{
                  fill: 'rgba(45,212,191,0.10)',
                  border: 'rgba(45,212,191,0.30)',
                  padding: 16,
                  elevation: 1,
                }}
              >
                <p style={{ ...cfBody, margin: 0, fontSize: 14 }}>{ANNUAL_RETURNS_DISCLAIMERS.independence}</p>
                <p style={{ ...cfBody, margin: '10px 0 0', fontSize: 14 }}>{ANNUAL_RETURNS_DISCLAIMERS.no_guarantee}</p>
              </GlassPanel>
            </>
          }
        />

        <section style={cfSection} aria-labelledby="ar-explain-title">
          <p style={cfKicker}>1 · Explanation</p>
          <div style={tagStyle}>{ANNUAL_RETURNS_EXPLANATION.tag}</div>
          <h2 id="ar-explain-title" style={cfH2}>
            {ANNUAL_RETURNS_EXPLANATION.title}
          </h2>
          <GlassPanel variant={{ padding: 24, elevation: 2 }} style={{ marginTop: 8 }}>
            <p style={{ ...cfBody, marginBottom: 12 }}>{ANNUAL_RETURNS_EXPLANATION.body}</p>
            {ANNUAL_RETURNS_EXPLANATION.extras.map((line) => (
              <p key={line} style={{ ...cfBody, margin: 0, fontSize: 14 }}>
                {line}
              </p>
            ))}
            <p style={{ ...cfBody, margin: '12px 0 0', fontSize: 14 }}>{ANNUAL_RETURNS_DISCLAIMERS.not_checklist}</p>
          </GlassPanel>
        </section>

        <section style={cfSection} aria-labelledby="ar-covers-title">
          <p style={cfKicker}>2 · Coverage</p>
          <h2 id="ar-covers-title" style={cfH2}>
            What the service covers and does not cover
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
              marginTop: 12,
            }}
          >
            <GlassPanel as="article" variant={{ padding: 22, elevation: 2 }}>
              <div style={tagStyle}>{ANNUAL_RETURNS_COVERS.tag}</div>
              <h3 style={{ ...cfH2, fontSize: 18, marginBottom: 10 }}>{ANNUAL_RETURNS_COVERS.title}</h3>
              <ul style={{ ...cfBody, margin: 0, paddingLeft: 18 }}>
                {ANNUAL_RETURNS_COVERS.items.map((item) => (
                  <li key={item} style={{ marginBottom: 8 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </GlassPanel>
            <GlassPanel as="article" variant={{ padding: 22, elevation: 2 }}>
              <div style={tagStyle}>{ANNUAL_RETURNS_DOES_NOT_COVER.tag}</div>
              <h3 style={{ ...cfH2, fontSize: 18, marginBottom: 10 }}>{ANNUAL_RETURNS_DOES_NOT_COVER.title}</h3>
              <ul style={{ ...cfBody, margin: 0, paddingLeft: 18 }}>
                {ANNUAL_RETURNS_DOES_NOT_COVER.items.map((item) => (
                  <li key={item} style={{ marginBottom: 8 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </GlassPanel>
          </div>
        </section>

        <section style={cfSection} aria-labelledby="ar-checklist-title">
          <p style={cfKicker}>3 · Checklist</p>
          <h2 id="ar-checklist-title" style={cfH2}>
            {ANNUAL_RETURNS_CHECKLIST.title}
          </h2>
          <p style={cfBody}>{ANNUAL_RETURNS_CHECKLIST.intro}</p>
          {ANNUAL_RETURNS_CHECKLIST.groups.map((group) => (
            <GlassPanel
              key={group.name}
              as="article"
              variant={{ padding: 20, elevation: 1 }}
              style={{ marginTop: 12 }}
            >
              <h3 style={{ margin: '0 0 10px', fontSize: 16.5, color: CF.text }}>{group.name}</h3>
              <ul style={{ ...cfBody, margin: 0, paddingLeft: 18, fontSize: 14 }}>
                {group.items.map((row) => (
                  <li key={row.text} style={{ marginBottom: 8 }}>
                    <strong style={{ color: CF.text }}>{row.text}</strong>
                    <span style={{ color: CF.textFaint }}>
                      {' '}
                      — {row.when} · {row.tag}
                    </span>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          ))}
          <p style={{ ...cfBody, marginTop: 14, fontSize: 14 }}>{ANNUAL_RETURNS_CHECKLIST.missing_info_rule}</p>
        </section>

        <section style={cfSection} aria-labelledby="ar-status-title">
          <p style={cfKicker}>4 · Status flow</p>
          <h2 id="ar-status-title" style={cfH2}>
            {ANNUAL_RETURNS_STATUS_FLOW.title}
          </h2>
          <p style={cfBody}>{ANNUAL_RETURNS_STATUS_FLOW.intro}</p>
          <ol
            style={{
              listStyle: 'none',
              margin: '16px 0 0',
              padding: 0,
              display: 'grid',
              gap: 10,
            }}
          >
            {ANNUAL_RETURNS_STATUS_FLOW.steps.map((step, idx) => (
              <li key={step.id}>
                <GlassPanel variant={{ padding: '14px 18px', elevation: 1 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ color: CF.accent, fontWeight: 800, fontSize: 13 }}>
                      {idx + 1}. {step.label}
                    </span>
                    <span style={{ ...cfBody, margin: 0, fontSize: 14 }}>{step.meaning}</span>
                  </div>
                </GlassPanel>
              </li>
            ))}
          </ol>
          <GlassPanel variant={{ padding: 20, elevation: 1 }} style={{ marginTop: 16 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, color: CF.text }}>Official CIPC filing backbone</h3>
            <ol style={{ ...cfBody, margin: 0, paddingLeft: 18, fontSize: 14 }}>
              {ANNUAL_RETURNS_STATUS_FLOW.official_backbone.map((s) => (
                <li key={s} style={{ marginBottom: 6 }}>
                  {s}
                </li>
              ))}
            </ol>
          </GlassPanel>
          <ul style={{ ...cfBody, marginTop: 14, paddingLeft: 18, fontSize: 14 }}>
            {ANNUAL_RETURNS_STATUS_FLOW.rules.map((r) => (
              <li key={r} style={{ marginBottom: 6 }}>
                {r}
              </li>
            ))}
          </ul>
        </section>

        <section style={cfSection} aria-labelledby="ar-exceptions-title">
          <p style={cfKicker}>5 · Exceptions</p>
          <h2 id="ar-exceptions-title" style={cfH2}>
            {ANNUAL_RETURNS_EXCEPTIONS.title}
          </h2>
          <p style={cfBody}>{ANNUAL_RETURNS_EXCEPTIONS.intro}</p>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {ANNUAL_RETURNS_EXCEPTIONS.items.map((row) => (
              <GlassPanel key={row.exception} as="article" variant={{ padding: '14px 18px', elevation: 1 }}>
                <div style={{ fontWeight: 700, color: CF.text, marginBottom: 4 }}>{row.exception}</div>
                <div style={{ ...cfBody, margin: 0, fontSize: 14 }}>{row.action}</div>
              </GlassPanel>
            ))}
          </div>
          <p style={{ ...cfBody, marginTop: 14, fontSize: 14 }}>{ANNUAL_RETURNS_EXCEPTIONS.tone}</p>
        </section>

        <section style={cfSection} aria-labelledby="ar-noguarantee-title">
          <p style={cfKicker}>6 · Guarantees</p>
          <div style={tagStyle}>{ANNUAL_RETURNS_CANNOT_GUARANTEE.tag}</div>
          <h2 id="ar-noguarantee-title" style={cfH2}>
            {ANNUAL_RETURNS_CANNOT_GUARANTEE.title}
          </h2>
          <GlassPanel variant={{ padding: 22, elevation: 2 }} style={{ marginTop: 8 }}>
            <ul style={{ ...cfBody, margin: 0, paddingLeft: 18 }}>
              {ANNUAL_RETURNS_CANNOT_GUARANTEE.items.map((item) => (
                <li key={item} style={{ marginBottom: 8 }}>
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ ...cfBody, margin: '14px 0 0', fontSize: 14 }}>{ANNUAL_RETURNS_DISCLAIMERS.no_guarantee}</p>
          </GlassPanel>
        </section>

        <section style={{ ...cfSection, marginTop: 48 }} aria-labelledby="ar-feedback-title" id="feedback">
          <p style={cfKicker}>7 · Feedback</p>
          <h2 id="ar-feedback-title" style={cfH2}>
            {ANNUAL_RETURNS_FEEDBACK_PROMPTS.title}
          </h2>
          <p style={cfBody}>{ANNUAL_RETURNS_FEEDBACK_PROMPTS.intro}</p>

          {done ? (
            <GlassPanel
              variant={{
                fill: 'rgba(45,212,191,0.12)',
                border: 'rgba(45,212,191,0.35)',
                padding: 24,
                elevation: 2,
              }}
              style={{ marginTop: 12 }}
            >
              <p style={{ ...cfBody, margin: 0, fontWeight: 700 }}>Thank you — feedback received.</p>
              <p style={{ ...cfBody, margin: '8px 0 0', fontSize: 14 }}>
                Stored via the existing tenant intake path (Postgres <code>leads</code>, tenant-scoped). Reference:{' '}
                <code>{done.lead_id}</code>
              </p>
            </GlassPanel>
          ) : (
            <GlassPanel as="form" onSubmit={onSubmit} variant={{ padding: 24, elevation: 2 }} style={{ marginTop: 12 }}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label htmlFor="ar-fb-name" style={labelStyle}>
                    Your name
                  </label>
                  <input
                    id="ar-fb-name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={fieldStyle}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label htmlFor="ar-fb-email" style={labelStyle}>
                    Email (required)
                  </label>
                  <input
                    id="ar-fb-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={fieldStyle}
                    autoComplete="email"
                  />
                </div>
                <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
                  <legend style={{ ...labelStyle, marginBottom: 10 }}>Overall readiness (required)</legend>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {ANNUAL_RETURNS_FEEDBACK_PROMPTS.readiness_options.map((opt) => (
                      <label
                        key={opt.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 14,
                          color: CF.text,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name="readiness"
                          value={opt.id}
                          checked={readiness === opt.id}
                          onChange={() => setReadiness(opt.id)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {ANNUAL_RETURNS_FEEDBACK_PROMPTS.topics.map((topic) => (
                  <div key={topic.id}>
                    <label htmlFor={`ar-fb-${topic.id}`} style={labelStyle}>
                      {topic.label}
                    </label>
                    <p style={{ ...cfBody, margin: '0 0 6px', fontSize: 12.5 }}>{topic.hint}</p>
                    <textarea
                      id={`ar-fb-${topic.id}`}
                      name={topic.id}
                      rows={3}
                      value={topicNotes[topic.id] || ''}
                      onChange={(e) =>
                        setTopicNotes((prev) => ({
                          ...prev,
                          [topic.id]: e.target.value,
                        }))
                      }
                      style={{ ...fieldStyle, resize: 'vertical', minHeight: 72 }}
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="ar-fb-overall" style={labelStyle}>
                    Overall notes (optional)
                  </label>
                  <textarea
                    id="ar-fb-overall"
                    name="overall_notes"
                    rows={3}
                    value={overallNotes}
                    onChange={(e) => setOverallNotes(e.target.value)}
                    style={{ ...fieldStyle, resize: 'vertical', minHeight: 72 }}
                  />
                </div>
                {error ? (
                  <p role="alert" style={{ color: '#fda4af', margin: 0, fontSize: 14 }}>
                    {error}
                  </p>
                ) : null}
                <div>
                  <button type="submit" disabled={busy} style={{ ...cfBtnPrimary, opacity: busy ? 0.7 : 1 }}>
                    {busy ? 'Submitting…' : 'Submit structured feedback'}
                  </button>
                  <p style={{ ...cfBody, margin: '10px 0 0', fontSize: 12.5 }}>
                    Uses existing <code>POST /api/tenant/intake</code> on this tenant host. No new database, schema,
                    auth, or email runtime.
                  </p>
                </div>
              </div>
            </GlassPanel>
          )}
        </section>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
