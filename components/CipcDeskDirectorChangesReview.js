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
  buildDirectorChangesReviewFeedbackEmail,
  buildCipcDeskDirectorChangesReviewContent,
  CIPC_DESK_DIRECTOR_CHANGES_REVIEW_VERSION,
} from '../lib/cipc-desk/director-changes-review.js';
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

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 8,
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(3,15,34,0.55)',
  color: CF.text,
  fontSize: 14.5,
  lineHeight: 1.5,
  fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block',
  marginTop: 16,
  fontSize: 13.5,
  fontWeight: 650,
  color: CF.text,
};

/**
 * Standing CIPC Desk Director Changes review page for Sarah (#980).
 * Feedback posts to existing POST /api/cipc-desk/email-intake.
 *
 * @param {{ content?: Record<string, unknown> | null }} props
 */
export default function CipcDeskDirectorChangesReview({ content }) {
  const c =
    content && typeof content === 'object' ? content : buildCipcDeskDirectorChangesReviewContent();
  const meta = c.meta && typeof c.meta === 'object' ? c.meta : {};
  const banners = c.banners && typeof c.banners === 'object' ? c.banners : {};
  const explanation = c.explanation && typeof c.explanation === 'object' ? c.explanation : {};
  const scenarios = c.scenarios && typeof c.scenarios === 'object' ? c.scenarios : {};
  const covers = c.covers && typeof c.covers === 'object' ? c.covers : {};
  const doesNot = c.does_not_cover && typeof c.does_not_cover === 'object' ? c.does_not_cover : {};
  const checklist = c.client_checklist && typeof c.client_checklist === 'object' ? c.client_checklist : {};
  const operatorNotes = c.operator_notes && typeof c.operator_notes === 'object' ? c.operator_notes : {};
  const statusFlow = c.status_flow && typeof c.status_flow === 'object' ? c.status_flow : {};
  const exceptions = c.exceptions && typeof c.exceptions === 'object' ? c.exceptions : {};
  const openQuestions = c.open_questions && typeof c.open_questions === 'object' ? c.open_questions : {};
  const feedbackPrompt =
    c.feedback_prompt && typeof c.feedback_prompt === 'object' ? c.feedback_prompt : {};

  const pageTitle = safeStr(meta.page_title) || 'CIPC Desk · Director Changes review';
  const description =
    safeStr(meta.description) ||
    'Internal corpflow_test Director Changes review surface for specialist feedback.';

  const visualHero = buildPublicVisualHero('process') || buildPublicVisualHero('standards');

  const [form, setForm] = useState({
    reviewer_name: 'Sarah Fourie',
    correctness: '',
    missing_documents: '',
    confusing_wording: '',
    specialist_boundaries: '',
    inclusions_exclusions: '',
    unsafe_to_publish: '',
    readiness: '',
    other_notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(/** @type {{ ticket_id?: string, magic_link_url?: string } | null} */ (null));

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);

    const built = buildDirectorChangesReviewFeedbackEmail(form);
    if (!built.ok) {
      setError(built.error);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/cipc-desk/email-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email_text: built.email_text,
          client_path: '/director-changes',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(
          safeStr(json?.error) ||
            safeStr(json?.detail) ||
            `Feedback submit failed (HTTP ${res.status})`,
        );
        return;
      }
      setResult({
        ticket_id: safeStr(json.ticket_id),
        magic_link_url: safeStr(json.magic_link_url),
      });
    } catch (err) {
      setError(String(err?.message || err || 'Network error'));
    } finally {
      setSubmitting(false);
    }
  }

  const scenarioItems = Array.isArray(scenarios.items) ? scenarios.items : [];
  const coverItems = Array.isArray(covers.items) ? covers.items : [];
  const excludeItems = Array.isArray(doesNot.items) ? doesNot.items : [];
  const checklistGroups = Array.isArray(checklist.groups) ? checklist.groups : [];
  const operatorItems = Array.isArray(operatorNotes.items) ? operatorNotes.items : [];
  const statusSteps = Array.isArray(statusFlow.steps) ? statusFlow.steps : [];
  const statusNotes = Array.isArray(statusFlow.notes) ? statusFlow.notes : [];
  const exceptionItems = Array.isArray(exceptions.items) ? exceptions.items : [];
  const questionItems = Array.isArray(openQuestions.items) ? openQuestions.items : [];

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="noindex,nofollow" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="/assets/visuals/corpflow-process-hero.jpg" />
        <meta name="theme-color" content="#06111f" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media (max-width: 768px) {
                .cipc-desk-dc-review [data-cf-public-scrim] {
                  background: linear-gradient(180deg, rgba(3,15,34,0.9) 0%, rgba(3,15,34,0.82) 62%, rgba(3,15,34,0.72) 100%) !important;
                }
              }
            `,
          }}
        />
      </Head>

      <PublicMarketingPhotoGlassShell
        pageClassName="cipc-desk-dc-review"
        maxWidth={960}
        hero={visualHero}
        scrimTone="dark"
        scrimStyle={{ background: CORPFLOW_PUBLIC_HERO_SCRIM_DESKTOP }}
        publicScrimHook
        footer={
          <div>
            <div style={{ fontWeight: 800, color: CF.text, marginBottom: 6 }}>CIPC Desk</div>
            <p style={{ ...cfBody, margin: 0, fontSize: 13.5 }}>
              Internal working name pending brand decision. Independent company-administration support —
              not CIPC, not a law firm, and not an authorised government channel. Powered by CorpFlowAI.
              Content version {CIPC_DESK_DIRECTOR_CHANGES_REVIEW_VERSION}.
            </p>
          </div>
        }
      >
        <nav
          aria-label="CIPC Desk Director Changes"
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
              CIPC Desk
            </div>
            <div style={{ color: CF.textFaint, fontSize: 12, marginTop: 2 }}>
              Director Changes · specialist review
            </div>
          </div>
          <a href="/" style={{ ...cfBtnSecondary, fontSize: 13, minHeight: 40, padding: '10px 16px' }}>
            Back to desk home
          </a>
        </nav>

        <HeroGlassBlock
          eyebrow={<p style={{ ...cfKicker, marginBottom: 10 }}>Specialist review · corpflow_test</p>}
          title={
            <h1
              style={{
                margin: '0 0 10px',
                fontSize: 'clamp(30px, 5vw, 46px)',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                color: CF.text,
                maxWidth: 720,
              }}
            >
              Director Changes
            </h1>
          }
          lead={
            <>
              <p style={{ ...cfLead, marginBottom: 12 }}>
                Six-layer Director Changes v1 review for Sarah (#980), grounded in the official CIPC
                director-amendment sources from #740. Unresolved specialist items are labelled. Not a
                public launch.
              </p>
              <p style={{ ...cfBody, marginBottom: 0, fontSize: 14 }}>{safeStr(banners.environment)}</p>
            </>
          }
          actions={
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
              <a href="#dc-feedback" style={cfBtnPrimary}>
                Give structured feedback
              </a>
              <a href="#dc-questions" style={cfBtnSecondary}>
                Jump to Sarah questions
              </a>
            </div>
          }
        />

        <section style={cfSection} aria-labelledby="dc-notices-title">
          <h2 id="dc-notices-title" style={{ ...cfH2, position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            Important notices
          </h2>
          <GlassPanel
            variant={{
              fill: 'rgba(45,212,191,0.10)',
              border: 'rgba(45,212,191,0.30)',
              padding: 22,
              elevation: 2,
            }}
          >
            <p style={{ ...cfBody, marginBottom: 10, color: CF.text }}>
              <strong style={{ color: CF.accent }}>Independence:</strong> {safeStr(banners.independence)}
            </p>
            <p style={{ ...cfBody, marginBottom: 10, color: CF.text }}>
              <strong style={{ color: CF.accent }}>No guarantees:</strong> {safeStr(banners.no_guarantee)}
            </p>
            <p style={{ ...cfBody, margin: 0, color: CF.text }}>
              <strong style={{ color: CF.accent }}>v1 status:</strong> {safeStr(banners.provisional)}
            </p>
          </GlassPanel>
        </section>

        <section style={cfSection} aria-labelledby="dc-explain-title">
          <p style={cfKicker}>{safeStr(explanation.tag) || 'Explanation'}</p>
          <h2 id="dc-explain-title" style={cfH2}>
            {safeStr(explanation.title) || 'What a director change is'}
          </h2>
          <GlassPanel variant={{ padding: 22, elevation: 2 }}>
            <p style={{ ...cfBody, margin: 0, color: CF.text }}>{safeStr(explanation.body)}</p>
          </GlassPanel>
        </section>

        <section style={cfSection} aria-labelledby="dc-scenarios-title">
          <p style={cfKicker}>{safeStr(scenarios.tag) || 'Scenarios'}</p>
          <h2 id="dc-scenarios-title" style={cfH2}>
            {safeStr(scenarios.title) || 'v1 scenarios'}
          </h2>
          {safeStr(scenarios.intro) ? <p style={cfBody}>{safeStr(scenarios.intro)}</p> : null}
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            {scenarioItems.map((item, idx) => (
              <GlassPanel key={`sc-${idx}`} as="article" variant={{ padding: 18, elevation: 1 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 15.5, color: CF.text }}>{safeStr(item?.name)}</h3>
                <p style={{ ...cfBody, margin: '0 0 6px', fontSize: 13.5, color: CF.accent }}>
                  {safeStr(item?.posture)}
                </p>
                <p style={{ ...cfBody, margin: 0, fontSize: 14 }}>{safeStr(item?.note)}</p>
              </GlassPanel>
            ))}
          </div>
        </section>

        <section style={cfSection} aria-labelledby="dc-covers-title">
          <p style={cfKicker}>{safeStr(covers.tag) || 'Service scope'}</p>
          <h2 id="dc-covers-title" style={cfH2}>
            {safeStr(covers.title) || 'What this service covers'}
          </h2>
          <GlassPanel variant={{ padding: 22, elevation: 1 }}>
            <ul style={{ margin: 0, paddingLeft: 20, color: CF.textMuted, lineHeight: 1.7 }}>
              {coverItems.map((item, idx) => (
                <li key={`cover-${idx}`} style={{ marginBottom: 8 }}>
                  {safeStr(item)}
                </li>
              ))}
            </ul>
          </GlassPanel>
        </section>

        <section style={cfSection} aria-labelledby="dc-excludes-title">
          <p style={cfKicker}>{safeStr(doesNot.tag) || 'Exclusions'}</p>
          <h2 id="dc-excludes-title" style={cfH2}>
            {safeStr(doesNot.title) || 'What the service does not automatically include'}
          </h2>
          <GlassPanel variant={{ padding: 22, elevation: 1 }}>
            <ul style={{ margin: 0, paddingLeft: 20, color: CF.textMuted, lineHeight: 1.7 }}>
              {excludeItems.map((item, idx) => (
                <li key={`excl-${idx}`} style={{ marginBottom: 8 }}>
                  {safeStr(item)}
                </li>
              ))}
            </ul>
          </GlassPanel>
        </section>

        <section style={cfSection} id="dc-checklist" aria-labelledby="dc-checklist-title">
          <p style={cfKicker}>Layer 2 · Intake</p>
          <h2 id="dc-checklist-title" style={cfH2}>
            {safeStr(checklist.title) || 'Client information and document checklist'}
          </h2>
          {safeStr(checklist.intro) ? <p style={cfBody}>{safeStr(checklist.intro)}</p> : null}
          <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
            {checklistGroups.map((group, gIdx) => {
              const items = Array.isArray(group?.items) ? group.items : [];
              return (
                <GlassPanel key={`grp-${gIdx}`} as="article" variant={{ padding: 20, elevation: 1 }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 17, color: CF.text }}>
                    {safeStr(group?.name) || `Group ${gIdx + 1}`}
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 20, color: CF.textMuted, lineHeight: 1.65, fontSize: 14.5 }}>
                    {items.map((item, iIdx) => (
                      <li key={`grp-${gIdx}-${iIdx}`} style={{ marginBottom: 6 }}>
                        {safeStr(item)}
                      </li>
                    ))}
                  </ul>
                </GlassPanel>
              );
            })}
          </div>
        </section>

        <section style={cfSection} aria-labelledby="dc-operator-title">
          <p style={cfKicker}>{safeStr(operatorNotes.tag) || 'Layer 3 · Operators'}</p>
          <h2 id="dc-operator-title" style={cfH2}>
            {safeStr(operatorNotes.title) || 'Internal operator checklist'}
          </h2>
          <GlassPanel variant={{ padding: 22, elevation: 1 }}>
            <ul style={{ margin: 0, paddingLeft: 20, color: CF.textMuted, lineHeight: 1.7 }}>
              {operatorItems.map((item, idx) => (
                <li key={`op-${idx}`} style={{ marginBottom: 8 }}>
                  {safeStr(item)}
                </li>
              ))}
            </ul>
          </GlassPanel>
        </section>

        <section style={cfSection} aria-labelledby="dc-status-title">
          <p style={cfKicker}>Layer 5 · Status</p>
          <h2 id="dc-status-title" style={cfH2}>
            {safeStr(statusFlow.title) || 'Visible steps / status flow'}
          </h2>
          {safeStr(statusFlow.intro) ? <p style={cfBody}>{safeStr(statusFlow.intro)}</p> : null}
          <ol
            style={{
              listStyle: 'none',
              margin: '12px 0 0',
              padding: 0,
              display: 'grid',
              gap: 10,
            }}
          >
            {statusSteps.map((step, idx) => (
              <li key={safeStr(step?.key) || `step-${idx}`}>
                <GlassPanel variant={{ padding: '14px 18px', elevation: 1 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ color: CF.accent, fontWeight: 800, fontSize: 13 }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <strong style={{ color: CF.text, fontSize: 15.5 }}>{safeStr(step?.label)}</strong>
                  </div>
                  <p style={{ ...cfBody, margin: '6px 0 0', fontSize: 14 }}>{safeStr(step?.meaning)}</p>
                </GlassPanel>
              </li>
            ))}
          </ol>
          {statusNotes.length ? (
            <ul style={{ margin: '14px 0 0', paddingLeft: 20, color: CF.textMuted, fontSize: 14 }}>
              {statusNotes.map((n, idx) => (
                <li key={`note-${idx}`} style={{ marginBottom: 6 }}>
                  {safeStr(n)}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section style={cfSection} aria-labelledby="dc-exceptions-title">
          <p style={cfKicker}>Layer 6 · Escalations</p>
          <h2 id="dc-exceptions-title" style={cfH2}>
            {safeStr(exceptions.title) || 'Exceptions and escalation examples'}
          </h2>
          {safeStr(exceptions.intro) ? <p style={cfBody}>{safeStr(exceptions.intro)}</p> : null}
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            {exceptionItems.map((item, idx) => (
              <GlassPanel key={`ex-${idx}`} as="article" variant={{ padding: 18, elevation: 1 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 15.5, color: CF.text }}>{safeStr(item?.name)}</h3>
                <p style={{ ...cfBody, margin: 0, fontSize: 14 }}>{safeStr(item?.action)}</p>
              </GlassPanel>
            ))}
          </div>
        </section>

        <section style={cfSection} id="dc-questions" aria-labelledby="dc-questions-title">
          <p style={cfKicker}>SARAH CONFIRM</p>
          <h2 id="dc-questions-title" style={cfH2}>
            {safeStr(openQuestions.title) || 'Unresolved items for Sarah'}
          </h2>
          {safeStr(openQuestions.intro) ? <p style={cfBody}>{safeStr(openQuestions.intro)}</p> : null}
          <GlassPanel
            variant={{
              fill: 'rgba(251,191,36,0.08)',
              border: 'rgba(251,191,36,0.28)',
              padding: 22,
              elevation: 1,
            }}
          >
            <ol style={{ margin: 0, paddingLeft: 20, color: CF.textMuted, lineHeight: 1.7 }}>
              {questionItems.map((q, idx) => (
                <li key={`q-${idx}`} style={{ marginBottom: 8 }}>
                  {safeStr(q)}
                </li>
              ))}
            </ol>
          </GlassPanel>
        </section>

        <section style={{ ...cfSection, marginTop: 48 }} id="dc-feedback" aria-labelledby="dc-feedback-title">
          <p style={cfKicker}>Feedback</p>
          <h2 id="dc-feedback-title" style={cfH2}>
            {safeStr(feedbackPrompt.title) || 'Structured specialist feedback'}
          </h2>
          {safeStr(feedbackPrompt.intro) ? <p style={cfBody}>{safeStr(feedbackPrompt.intro)}</p> : null}

          <GlassPanel
            variant={{
              fill: 'rgba(45,212,191,0.08)',
              border: 'rgba(45,212,191,0.28)',
              padding: 24,
              elevation: 2,
            }}
          >
            {result ? (
              <div role="status">
                <p style={{ ...cfBody, color: CF.text, marginBottom: 8 }}>
                  Feedback recorded via existing email-intake for tenant <code>cipc-desk</code>.
                </p>
                {result.ticket_id ? (
                  <p style={{ ...cfBody, marginBottom: 8 }}>
                    Ticket id: <code>{result.ticket_id}</code>
                  </p>
                ) : null}
                <p style={{ ...cfBody, marginBottom: 16, fontSize: 14 }}>
                  Thank you. Operators can review the synthetic ticket in /change. No live email was sent.
                </p>
                <button
                  type="button"
                  style={cfBtnSecondary}
                  onClick={() => {
                    setResult(null);
                    setForm((prev) => ({
                      ...prev,
                      correctness: '',
                      missing_documents: '',
                      confusing_wording: '',
                      specialist_boundaries: '',
                      inclusions_exclusions: '',
                      unsafe_to_publish: '',
                      other_notes: '',
                      readiness: '',
                    }));
                  }}
                >
                  Submit another response
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate>
                <label style={labelStyle} htmlFor="dc-reviewer">
                  Reviewer name
                </label>
                <input
                  id="dc-reviewer"
                  name="reviewer_name"
                  style={fieldStyle}
                  value={form.reviewer_name}
                  onChange={(ev) => updateField('reviewer_name', ev.target.value)}
                  autoComplete="name"
                />

                <label style={labelStyle} htmlFor="dc-correctness">
                  Correctness — what is accurate or inaccurate?
                </label>
                <textarea
                  id="dc-correctness"
                  name="correctness"
                  rows={3}
                  style={fieldStyle}
                  value={form.correctness}
                  onChange={(ev) => updateField('correctness', ev.target.value)}
                />

                <label style={labelStyle} htmlFor="dc-missing">
                  Missing document requirements
                </label>
                <textarea
                  id="dc-missing"
                  name="missing_documents"
                  rows={3}
                  style={fieldStyle}
                  value={form.missing_documents}
                  onChange={(ev) => updateField('missing_documents', ev.target.value)}
                />

                <label style={labelStyle} htmlFor="dc-wording">
                  Confusing wording
                </label>
                <textarea
                  id="dc-wording"
                  name="confusing_wording"
                  rows={3}
                  style={fieldStyle}
                  value={form.confusing_wording}
                  onChange={(ev) => updateField('confusing_wording', ev.target.value)}
                />

                <label style={labelStyle} htmlFor="dc-boundaries">
                  Specialist-review boundaries
                </label>
                <textarea
                  id="dc-boundaries"
                  name="specialist_boundaries"
                  rows={3}
                  style={fieldStyle}
                  value={form.specialist_boundaries}
                  onChange={(ev) => updateField('specialist_boundaries', ev.target.value)}
                />

                <label style={labelStyle} htmlFor="dc-scope">
                  Service inclusions / exclusions
                </label>
                <textarea
                  id="dc-scope"
                  name="inclusions_exclusions"
                  rows={3}
                  style={fieldStyle}
                  value={form.inclusions_exclusions}
                  onChange={(ev) => updateField('inclusions_exclusions', ev.target.value)}
                />

                <label style={labelStyle} htmlFor="dc-unsafe">
                  Anything unsafe to publish
                </label>
                <textarea
                  id="dc-unsafe"
                  name="unsafe_to_publish"
                  rows={3}
                  style={fieldStyle}
                  value={form.unsafe_to_publish}
                  onChange={(ev) => updateField('unsafe_to_publish', ev.target.value)}
                />

                <fieldset style={{ border: 0, margin: '18px 0 0', padding: 0 }}>
                  <legend style={{ ...labelStyle, marginTop: 0 }}>Overall readiness</legend>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
                    {[
                      { value: 'approve', label: 'Approve' },
                      { value: 'approve_with_changes', label: 'Approve with changes' },
                      { value: 'not_ready', label: 'Not ready' },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          color: CF.text,
                          fontSize: 14.5,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name="readiness"
                          value={opt.value}
                          checked={form.readiness === opt.value}
                          onChange={(ev) => updateField('readiness', ev.target.value)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label style={labelStyle} htmlFor="dc-other">
                  Other notes (optional)
                </label>
                <textarea
                  id="dc-other"
                  name="other_notes"
                  rows={3}
                  style={fieldStyle}
                  value={form.other_notes}
                  onChange={(ev) => updateField('other_notes', ev.target.value)}
                />

                {error ? (
                  <p role="alert" style={{ ...cfBody, color: '#fca5a5', marginTop: 16, marginBottom: 0 }}>
                    {error}
                  </p>
                ) : null}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
                  <button type="submit" style={cfBtnPrimary} disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit Director Changes review feedback'}
                  </button>
                </div>
                <p style={{ ...cfBody, marginTop: 14, marginBottom: 0, fontSize: 13 }}>
                  Uses <code>POST /api/cipc-desk/email-intake</code> with subject cue “Director Changes review
                  feedback”. Fictional / specialist comments only — no real client or identity documents.
                </p>
              </form>
            )}
          </GlassPanel>
        </section>
      </PublicMarketingPhotoGlassShell>
    </>
  );
}
