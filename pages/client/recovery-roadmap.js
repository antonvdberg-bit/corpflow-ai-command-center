import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { LuxeMauriceFontStylesheet, LuxeMauriceWordmark, LuxEyebrow, LuxHairline } from '../../components/LuxeMauriceBrandPrimitives.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../../lib/client/luxe-maurice-brand-theme.js';
import {
  LUX_FIRST_VISIBLE_RELEASE_BODY,
  LUX_FIRST_VISIBLE_RELEASE_TITLE,
  LUX_PILLAR_CLIENT_CHOICES,
  LUX_PRODUCT_DIRECTION_EVIDENCE_NOTE,
  LUX_PRODUCT_DIRECTION_INTRO,
  LUX_PRODUCT_DIRECTION_PAGE_TITLE,
  LUX_PRODUCT_DIRECTION_PILLARS,
} from '../../lib/client/lux-product-direction-content.js';

const THANK_YOU_PRODUCT_DIRECTION =
  "Thank you — we've received your product direction confirmation. Your team will review and follow up.";

/** @param {unknown} v */
function safeObj(v) {
  return v && typeof v === 'object' ? /** @type {Record<string, unknown>} */ (v) : null;
}

/** @param {import('next/router').NextRouter['query'] | undefined} q */
function ticketIdFromQuery(q) {
  if (!q) return '';
  const raw = q.id != null ? q.id : q.ticket_id != null ? q.ticket_id : '';
  const s = Array.isArray(raw) ? raw[0] : raw;
  return typeof s === 'string' ? s.trim() : '';
}

/** @param {import('next/router').NextRouter['query'] | undefined} q */
function magicTokenFromQuery(q) {
  if (!q || q.token == null) return '';
  const raw = q.token;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return typeof s === 'string' ? s.trim() : '';
}

/** @param {string} value */
function pillarChoiceLabel(value) {
  const hit = LUX_PILLAR_CLIENT_CHOICES.find((o) => o.value === value);
  return hit?.label || value || '—';
}

/** @param {string} value */
function overallLabel(value) {
  if (value === 'confirm') return 'Confirm our understanding';
  if (value === 'correct') return 'Correct our understanding';
  return value || '—';
}

export default function LuxRecoveryRoadmapPage() {
  const router = useRouter();

  const [ticketId, setTicketId] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadBusy, setLoadBusy] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [answersByKey, setAnswersByKey] = useState(/** @type {Record<string, { answer: string }>} */ ({}));
  const [magicClosed, setMagicClosed] = useState(false);
  const [thankYouBanner, setThankYouBanner] = useState('');

  const magicToken = router.isReady ? magicTokenFromQuery(router.query) : '';
  const hasMagicLink = magicToken.length >= 32;
  const hasTicket = ticketId.trim().length >= 18;

  useEffect(() => {
    if (!router.isReady) return;
    const fromQuery = ticketIdFromQuery(router.query);
    if (fromQuery.length >= 18) setTicketId(fromQuery);
  }, [router.isReady, router.query]);

  const getHeaders = useMemo(() => ({ 'Content-Type': 'application/json' }), []);
  const getHeadersForGet = useMemo(() => ({}), []);

  const seedAnswers = useCallback((list) => {
    /** @type {Record<string, { answer: string }>} */
    const next = {};
    for (const it of list) {
      const o = safeObj(it) || {};
      const key = typeof o.key === 'string' ? o.key.trim() : '';
      if (!key) continue;
      next[key] = { answer: typeof o.answer === 'string' ? o.answer : '' };
    }
    setAnswersByKey(next);
  }, []);

  const load = useCallback(async () => {
    const id = ticketId.trim();
    setError('');
    if (id.length < 18) return;
    if (!hasMagicLink) {
      setError('Open the personalised link your team sent you to review product direction and submit your confirmation.');
      return;
    }
    setLoadBusy(true);
    try {
      const tokQ = `&token=${encodeURIComponent(magicToken)}`;
      const r = await fetch(`/api/cmp/router?action=client-decisions-get&id=${encodeURIComponent(id)}${tokQ}`, {
        method: 'GET',
        headers: getHeadersForGet,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          String(j?.error || j?.hint || '').trim() ||
            'This link is invalid or has expired. Ask your team for a new link.',
        );
      }
      if (typeof j.thank_you_message === 'string' && j.thank_you_message.trim()) {
        setThankYouBanner(j.thank_you_message.trim());
      }
      if (j.already_submitted === true) {
        setMagicClosed(true);
        setItems([]);
        return;
      }
      const cd = safeObj(j.client_decisions) || {};
      const list = Array.isArray(cd.items) ? cd.items.map((x) => (safeObj(x) ? { ...x } : {})) : [];
      setItems(list);
      seedAnswers(list);
      setMagicClosed(false);
    } catch (e) {
      setError(String(e?.message || e));
      setItems([]);
    } finally {
      setLoadBusy(false);
    }
  }, [ticketId, getHeadersForGet, seedAnswers, hasMagicLink, magicToken]);

  useEffect(() => {
    if (!router.isReady || !hasMagicLink) return;
    if (ticketId.trim().length < 18) return;
    const t = setTimeout(() => load(), 200);
    return () => clearTimeout(t);
  }, [router.isReady, ticketId, load, hasMagicLink]);

  async function submit() {
    const id = ticketId.trim();
    if (!hasMagicLink || id.length < 18) {
      setError('Use the personalised link your team sent you.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      /** @type {Record<string, { answer: string }>} */
      const answers = {};
      for (const it of items) {
        const o = safeObj(it) || {};
        const key = typeof o.key === 'string' ? o.key.trim() : '';
        if (!key) continue;
        answers[key] = { answer: answersByKey[key]?.answer || '' };
      }
      const tokQ = `&token=${encodeURIComponent(magicToken)}`;
      const r = await fetch(`/api/cmp/router?action=submit-client-decisions${tokQ}`, {
        method: 'POST',
        headers: getHeaders,
        body: JSON.stringify({ ticket_id: id, answers }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          String(j?.error || j?.hint || '').trim() ||
            'This link is invalid or has expired. Ask your team for a new link.',
        );
      }
      if (j.already_submitted === true || j.magic_link_completed === true) {
        setMagicClosed(true);
        setItems([]);
        if (typeof j.thank_you_message === 'string' && j.thank_you_message.trim()) {
          setThankYouBanner(j.thank_you_message.trim());
        }
        return;
      }
      const cd = safeObj(j.client_decisions) || {};
      if (cd.sufficient_to_proceed === true) {
        setMagicClosed(true);
        setThankYouBanner(THANK_YOU_PRODUCT_DIRECTION);
      } else {
        setError('Please confirm or correct the overall direction and choose a priority for each pillar.');
        seedAnswers(Array.isArray(cd.items) ? cd.items : items);
      }
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const showForm = hasMagicLink && hasTicket && !magicClosed && items.length > 0;

  const cardStyle = {
    border: `1px solid ${T.hairline}`,
    borderRadius: T.radiusLg,
    padding: '18px 20px',
    background: T.charcoalSoft,
    marginBottom: 14,
  };

  const sectionStyle = { maxWidth: 800, margin: '0 auto', padding: '0 24px 48px' };
  const pageStyle = { minHeight: '100vh', background: T.charcoal, color: T.ivory, fontFamily: T.fontBody };

  return (
    <>
      <Head>
        <title>{LUX_PRODUCT_DIRECTION_PAGE_TITLE} — LuxeMaurice</title>
        <meta name="robots" content="noindex,nofollow" />
        <LuxeMauriceFontStylesheet />
      </Head>
      <div style={pageStyle}>
        <header style={{ ...sectionStyle, paddingTop: 32, paddingBottom: 20, textAlign: 'center' }}>
          <LuxeMauriceWordmark />
          <LuxEyebrow>Private platform recovery</LuxEyebrow>
          <h1
            style={{
              margin: '12px 0 0',
              fontFamily: T.fontDisplay,
              fontWeight: 500,
              fontSize: 'clamp(1.75rem, 4vw, 2.35rem)',
              lineHeight: 1.2,
            }}
          >
            {LUX_PRODUCT_DIRECTION_PAGE_TITLE}
          </h1>
        </header>

        <main style={sectionStyle}>
          <p style={{ margin: '0 0 16px', color: T.ivoryMuted, fontSize: 16, lineHeight: 1.65 }}>{LUX_PRODUCT_DIRECTION_INTRO}</p>
          <p
            style={{
              margin: '0 0 28px',
              padding: '14px 16px',
              borderRadius: T.radiusLg,
              border: `1px solid ${T.hairline}`,
              background: 'rgba(168, 132, 44, 0.08)',
              color: T.ivoryMuted,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {LUX_PRODUCT_DIRECTION_EVIDENCE_NOTE}
          </p>

          <div style={{ marginBottom: 28 }}>
            <LuxHairline />
          </div>

          <LuxEyebrow>Product pillars — our working understanding</LuxEyebrow>
          <p style={{ margin: '10px 0 20px', fontSize: 14, color: T.ivoryMuted, lineHeight: 1.55 }}>
            For each area below: what we think you want, what exists today, the gap, and our suggested priority. Please
            correct anything that is wrong.
          </p>

          <div style={{ display: 'grid', gap: 14, marginBottom: 32 }}>
            {LUX_PRODUCT_DIRECTION_PILLARS.map((pillar) => (
              <div key={pillar.key} style={cardStyle}>
                <div style={{ fontFamily: T.fontDisplay, fontSize: '1.2rem', marginBottom: 12 }}>{pillar.title}</div>
                <div style={{ display: 'grid', gap: 8, fontSize: 13, lineHeight: 1.55, color: T.ivoryMuted }}>
                  <div>
                    <span style={{ color: T.gold, fontWeight: 600 }}>What we understand you want: </span>
                    {pillar.whatWeUnderstand}
                  </div>
                  <div>
                    <span style={{ color: T.gold, fontWeight: 600 }}>What exists today: </span>
                    {pillar.corpflowToday}
                  </div>
                  <div>
                    <span style={{ color: T.gold, fontWeight: 600 }}>Gap: </span>
                    {pillar.gap}
                  </div>
                  <div>
                    <span style={{ color: T.gold, fontWeight: 600 }}>Suggested priority: </span>
                    {pillar.suggestedPriorityLabel}
                  </div>
                </div>
                {showForm ? (
                  <div style={{ marginTop: 14 }}>
                    <label
                      htmlFor={pillar.key}
                      style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: T.ivory }}
                    >
                      Your choice for this pillar
                    </label>
                    <select
                      id={pillar.key}
                      value={answersByKey[pillar.key]?.answer || ''}
                      onChange={(e) =>
                        setAnswersByKey((prev) => ({
                          ...prev,
                          [pillar.key]: { answer: e.target.value },
                        }))
                      }
                      style={{
                        width: '100%',
                        maxWidth: 420,
                        padding: '10px 12px',
                        borderRadius: T.radiusLg,
                        border: `1px solid ${T.hairline}`,
                        background: T.charcoal,
                        color: T.ivory,
                        fontSize: 14,
                      }}
                    >
                      {LUX_PILLAR_CLIENT_CHOICES.map((opt) => (
                        <option key={`${pillar.key}_${opt.value}`} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 28 }}>
            <LuxHairline />
          </div>

          <LuxEyebrow>{LUX_FIRST_VISIBLE_RELEASE_TITLE}</LuxEyebrow>
          <p style={{ margin: '10px 0 28px', fontSize: 14, color: T.ivoryMuted, lineHeight: 1.65 }}>
            {LUX_FIRST_VISIBLE_RELEASE_BODY}
          </p>

          <div style={{ marginBottom: 28 }}>
            <LuxHairline />
          </div>

          <LuxEyebrow>Your confirmation</LuxEyebrow>

          {!hasMagicLink ? (
            <div style={{ ...cardStyle, marginTop: 14, color: T.ivoryMuted, fontSize: 14, lineHeight: 1.55 }}>
              This page is shared through a private link from your team. Use that link to submit pillar priorities and
              correct our understanding.
            </div>
          ) : null}

          {loadBusy ? <p style={{ marginTop: 14, fontSize: 14, color: T.ivoryMuted }}>Loading…</p> : null}

          {magicClosed ? (
            <div
              style={{
                marginTop: 14,
                ...cardStyle,
                borderColor: 'rgba(74, 222, 128, 0.35)',
                background: 'rgba(74, 222, 128, 0.08)',
                color: '#bbf7d0',
                fontSize: 15,
                lineHeight: 1.55,
              }}
            >
              {thankYouBanner || THANK_YOU_PRODUCT_DIRECTION}
            </div>
          ) : null}

          {showForm ? (
            <div style={{ marginTop: 14, ...cardStyle }}>
              <label
                htmlFor="lux-product-direction-overall"
                style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 10, color: T.ivory }}
              >
                Confirm or correct our understanding of the LuxeMaurice product direction
              </label>
              <select
                id="lux-product-direction-overall"
                value={answersByKey.lux_product_direction_overall?.answer || ''}
                onChange={(e) =>
                  setAnswersByKey((prev) => ({
                    ...prev,
                    lux_product_direction_overall: { answer: e.target.value },
                  }))
                }
                style={{
                  width: '100%',
                  maxWidth: 520,
                  padding: '12px 14px',
                  borderRadius: T.radiusLg,
                  border: `1px solid ${T.hairline}`,
                  background: T.charcoal,
                  color: T.ivory,
                  fontSize: 14,
                  marginBottom: 16,
                }}
              >
                <option value="">Choose one…</option>
                <option value="confirm">Confirm our understanding of the product direction</option>
                <option value="correct">Correct our understanding — priorities need changes</option>
              </select>

              <label
                htmlFor="lux-product-direction-misunderstood"
                style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 10, color: T.ivory }}
              >
                What have we misunderstood?
              </label>
              <textarea
                id="lux-product-direction-misunderstood"
                value={answersByKey.lux_product_direction_misunderstood?.answer || ''}
                onChange={(e) =>
                  setAnswersByKey((prev) => ({
                    ...prev,
                    lux_product_direction_misunderstood: { answer: e.target.value },
                  }))
                }
                placeholder="Tell us what we got wrong about your vision, priorities, or the materials you supplied."
                style={{
                  width: '100%',
                  minHeight: 120,
                  padding: 14,
                  borderRadius: T.radiusLg,
                  border: `1px solid ${T.hairline}`,
                  background: T.charcoal,
                  color: T.ivory,
                  fontSize: 14,
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
              />

              <button
                type="button"
                onClick={() => submit()}
                disabled={busy}
                style={{
                  marginTop: 18,
                  width: '100%',
                  maxWidth: 420,
                  padding: '14px 18px',
                  borderRadius: T.radiusLg,
                  border: 'none',
                  background: busy ? T.stone : T.gold,
                  color: T.charcoal,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? 'Submitting…' : 'Submit product direction confirmation'}
              </button>
            </div>
          ) : null}

          {error ? (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: T.radiusLg,
                border: '1px solid rgba(248, 113, 113, 0.4)',
                background: 'rgba(127, 29, 29, 0.25)',
                color: '#fecaca',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          ) : null}

          {magicClosed && answersByKey.lux_product_direction_overall?.answer ? (
            <p style={{ marginTop: 12, fontSize: 13, color: T.stoneSoft }}>
              Recorded: {overallLabel(answersByKey.lux_product_direction_overall.answer)}
            </p>
          ) : null}
        </main>
      </div>
    </>
  );
}
