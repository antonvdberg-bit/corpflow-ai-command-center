import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import {
  LuxeMauriceFontStylesheet,
  RARE_EXCLUSIVE_PUBLIC_BRAND,
  RareExclusiveIvoryFooter,
  RareExclusiveIvoryHeader,
  rareExclusivePageShellStyle,
} from './RareExclusiveIvoryShell.js';
const JAN_DECISIONS = ['APPROVE', 'CHANGES', 'HOLD', 'REVIEW_FURTHER'];
const JAN_DECISION_COPY = {
  APPROVE: { button: 'Approve this version', meaning: 'This version matches what you want. We will record your yes against this exact version.' },
  CHANGES: { button: 'Request changes', meaning: 'This is not ready. Tell the team the actionable implementation changes you need.' },
  HOLD: { button: 'Hold for now', meaning: 'Pause for a governance or external dependency. Nothing moves forward.' },
  REVIEW_FURTHER: { button: 'Ask AI to review further', meaning: 'Request a further review before deciding. Nothing will merge or release.' },
};

/**
 * @param {string} key
 */
function buttonStyle(key, busy) {
  const isApprove = key === 'APPROVE';
  const isHold = key === 'HOLD';
  return {
    display: 'block',
    width: '100%',
    padding: '16px 20px',
    borderRadius: 2,
    border: isApprove ? 'none' : `1px solid ${T.gold}`,
    background: isApprove ? T.gold : 'transparent',
    color: isApprove ? '#FFFFFF' : T.charcoal,
    fontFamily: T.fontBody,
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.7 : isHold ? 0.92 : 1,
    textAlign: 'left',
  };
}

/**
 * Rare & Exclusive decision page for Jan — product language, not a developer console.
 */
export default function JanApprovalReviewPage({
  initialPayload = null,
  canDecide = false,
  signedInLabel = '',
  viewOnly = false,
  loadError = '',
}) {
  const [payload, setPayload] = useState(initialPayload);
  const [error, setError] = useState(loadError || '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [rationale, setRationale] = useState('');
  const [approvalScope, setApprovalScope] = useState('review-approval-only');

  const presented = payload?.presented || null;
  const reviewItems = presented?.review_items || [];
  const blockers = presented?.release_blockers || [];

  const refresh = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/factory/jan-approval', { credentials: 'same-origin' });
      const json = await res.json();
      if (!res.ok || json.ok !== true) {
        setError(json.message || json.error || 'Could not load the decision page.');
        return;
      }
      setPayload(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the decision page.');
    }
  }, []);

  useEffect(() => {
    if (!initialPayload) {
      refresh();
    }
  }, [refresh]);

  async function decide(item, decisionKey) {
    if (!canDecide || busy) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/factory/jan-approval/decision', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.id,
          decision: decisionKey,
          expected_head_sha: item.version_token,
          evidence_manifest: payload?.evidence_manifest_by_item?.[item.id] || '',
          approval_scope: approvalScope,
          note: rationale,
          decision_capability: payload?.decision_capability || '',
        }),
      });
      const json = await res.json();
      if (!res.ok || json.ok !== true) {
        setError(json.message || json.error || 'The decision could not be recorded.');
        setBusy(false);
        return;
      }
      setResult(json);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The decision could not be recorded.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={rareExclusivePageShellStyle()}>
      <Head>
        <title>{`Your decision · ${RARE_EXCLUSIVE_PUBLIC_BRAND}`}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <LuxeMauriceFontStylesheet />
      <RareExclusiveIvoryHeader activeHref="/rare-exclusive/review" />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        <p
          style={{
            fontFamily: T.fontBody,
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: T.gold,
            margin: 0,
          }}
        >
          {presented?.eyebrow || RARE_EXCLUSIVE_PUBLIC_BRAND}
        </p>
        <h1
          style={{
            fontFamily: T.fontDisplay,
            fontWeight: 500,
            fontSize: 'clamp(32px, 5vw, 48px)',
            margin: '12px 0 16px',
            color: T.charcoal,
          }}
        >
          {presented?.page_title || 'Your decision'}
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: T.stone, margin: '0 0 12px' }}>
          {presented?.intro}
        </p>
        {signedInLabel ? (
          <p style={{ fontSize: 13, color: T.stone, margin: '0 0 28px' }}>Signed in as {signedInLabel}</p>
        ) : null}
        {viewOnly ? (
          <p
            style={{
              border: `1px solid ${T.gold}`,
              padding: '12px 16px',
              fontSize: 14,
              color: T.charcoal,
              marginBottom: 24,
            }}
          >
            You can look at this page, but only Jan can record a product decision.
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            style={{
              background: '#F7E8E3',
              color: T.charcoal,
              padding: '12px 16px',
              marginBottom: 24,
              fontSize: 14,
            }}
          >
            {error}
          </p>
        ) : null}
        {result?.ok ? (
          <p
            role="status"
            style={{
              background: '#EFE8D8',
              color: T.charcoal,
              padding: '14px 16px',
              marginBottom: 24,
              fontSize: 15,
            }}
          >
            {result.idempotent
              ? 'Already recorded for this exact version — nothing was duplicated.'
              : 'Recorded. This yes, hold, change request, or further-review ask is locked to this exact version so it cannot be reused if the work changes.'}
            {' '}
            Nothing was merged, released, or sent.
          </p>
        ) : null}

        {reviewItems.length === 0 ? (
          <p style={{ fontSize: 16, color: T.stone }}>{presented?.empty_review_copy}</p>
        ) : (
          reviewItems.map((item) => (
            <section
              key={item.id}
              style={{
                background: '#FBF7F1',
                padding: '28px 24px',
                marginBottom: 32,
                boxShadow: '0 18px 40px rgba(17,17,17,0.06)',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: T.gold,
                  margin: '0 0 8px',
                }}
              >
                Waiting for you
              </p>
              <h2
                style={{
                  fontFamily: T.fontDisplay,
                  fontWeight: 500,
                  fontSize: 28,
                  margin: '0 0 12px',
                }}
              >
                {item.heading}
              </h2>
              <p style={{ margin: '0 0 8px', color: T.stone, fontSize: 14 }}>{item.what_this_is}</p>
              <p style={{ margin: '0 0 16px', fontSize: 16, lineHeight: 1.55 }}>{item.summary}</p>
              <dl style={{ margin: '0 0 20px', fontSize: 15, lineHeight: 1.5 }}>
                <dt style={{ fontWeight: 600, marginBottom: 4 }}>What we checked</dt>
                <dd style={{ margin: '0 0 12px', color: T.stone }}>{item.what_we_checked}</dd>
                <dt style={{ fontWeight: 600, marginBottom: 4 }}>Recommendation</dt>
                <dd style={{ margin: '0 0 12px', color: T.stone }}>{item.recommendation}</dd>
                <dt style={{ fontWeight: 600, marginBottom: 4 }}>Still open</dt>
                <dd style={{ margin: 0, color: T.stone }}>
                  {(item.still_open || []).join(' ')}
                </dd>
              </dl>
              <p style={{ fontSize: 12, color: T.stone, margin: '0 0 20px' }}>{item.version_label}</p>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Your reason
                <textarea
                  value={rationale}
                  onChange={(event) => setRationale(event.target.value.slice(0, 500))}
                  placeholder="Required for changes or a hold. Keep this focused."
                  maxLength={500}
                  rows={3}
                  style={{ display: 'block', width: '100%', marginTop: 8, padding: 10, font: 'inherit' }}
                />
              </label>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, margin: '0 0 18px' }}>
                Decision scope
                <select
                  value={approvalScope}
                  onChange={(event) => setApprovalScope(event.target.value)}
                  style={{ display: 'block', marginTop: 8, padding: 8, font: 'inherit' }}
                >
                  <option value="review-approval-only">Review approval only</option>
                  <option value="merge-only">Merge-only recommendation (not merge authority)</option>
                </select>
              </label>
              {item.last_decision ? (
                <p style={{ fontSize: 14, margin: '0 0 16px' }}>
                  Last recorded decision: {String(item.last_decision.decision)}
                </p>
              ) : null}
              <div style={{ display: 'grid', gap: 10 }}>
                {JAN_DECISIONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    disabled={!canDecide || busy}
                    onClick={() => decide(item, key)}
                    style={buttonStyle(key, busy)}
                  >
                    {JAN_DECISION_COPY[key].button}
                    <span
                      style={{
                        display: 'block',
                        marginTop: 6,
                        fontWeight: 500,
                        letterSpacing: 0,
                        textTransform: 'none',
                        fontSize: 13,
                        opacity: 0.9,
                      }}
                    >
                      {JAN_DECISION_COPY[key].meaning}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}

        <section
          aria-labelledby="release-blockers-heading"
          style={{
            borderTop: `1px solid ${T.gold}`,
            paddingTop: 28,
            marginTop: 8,
          }}
        >
          <h2
            id="release-blockers-heading"
            style={{
              fontFamily: T.fontDisplay,
              fontWeight: 500,
              fontSize: 26,
              margin: '0 0 10px',
            }}
          >
            {presented?.release_blockers_heading || 'Before we can release'}
          </h2>
          <p style={{ color: T.stone, fontSize: 15, lineHeight: 1.55, margin: '0 0 16px' }}>
            {presented?.release_blockers_intro}
          </p>
          {blockers.map((b) => (
            <div key={b.id} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, margin: '0 0 6px' }}>{b.heading}</h3>
              <p style={{ margin: 0, color: T.stone, fontSize: 15, lineHeight: 1.5 }}>{b.summary}</p>
            </div>
          ))}
        </section>
      </main>
      <RareExclusiveIvoryFooter note="Decision page — not a public marketing surface." />
    </div>
  );
}
