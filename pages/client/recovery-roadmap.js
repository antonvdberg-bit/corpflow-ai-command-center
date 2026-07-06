import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { LuxeMauriceFontStylesheet, LuxeMauriceWordmark, LuxEyebrow, LuxHairline } from '../../components/LuxeMauriceBrandPrimitives.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../../lib/client/luxe-maurice-brand-theme.js';
import {
  LUX_RECOVERY_EFFORT_NOTE,
  LUX_RECOVERY_JAN_MUST_PROVIDE,
  LUX_RECOVERY_LATER_ITEMS,
  LUX_RECOVERY_NOT_MVP,
  LUX_RECOVERY_RELEASE1_PACKAGES,
  LUX_RECOVERY_RELEASE1_SUMMARY,
  LUX_RECOVERY_RELEASE1_TITLE,
  LUX_RECOVERY_SITUATION_PARAGRAPH,
} from '../../lib/client/lux-recovery-roadmap-content.js';

const THANK_YOU_RECOVERY =
  "Thank you — we've received your decision on Release 1. Your team will review and follow up.";

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

function decisionLabel(value) {
  const v = String(value || '').trim();
  if (v === 'approve') return 'Approve Release 1 scope';
  if (v === 'request_changes') return 'Request changes';
  if (v === 'not_approved') return 'Not approved — explain concerns';
  return v || '—';
}

export default function LuxRecoveryRoadmapPage() {
  const router = useRouter();

  const [ticketId, setTicketId] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadBusy, setLoadBusy] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [answersByKey, setAnswersByKey] = useState(/** @type {Record<string, { answer: string }>} */ ({}));
  const [sufficientToProceed, setSufficientToProceed] = useState(false);
  const [magicClosed, setMagicClosed] = useState(false);
  const [thankYouBanner, setThankYouBanner] = useState('');

  const idFromUrl = router.isReady ? ticketIdFromQuery(router.query) : '';
  const magicToken = router.isReady ? magicTokenFromQuery(router.query) : '';
  const hasMagicLink = magicToken.length >= 32;
  const hasTicket = ticketId.trim().length >= 18;

  useEffect(() => {
    if (!router.isReady) return;
    const fromQuery = ticketIdFromQuery(router.query);
    if (fromQuery.length >= 18) setTicketId(fromQuery);
  }, [router.isReady, router.query]);

  const getHeaders = useMemo(() => {
    const h = { 'Content-Type': 'application/json' };
    return h;
  }, []);

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
    if (id.length < 18) {
      setItems([]);
      setSufficientToProceed(false);
      return;
    }
    if (!hasMagicLink) {
      setError('Open the personalised link your team sent you to view this roadmap and submit your decision.');
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
        setSufficientToProceed(j.client_decisions?.sufficient_to_proceed === true);
        return;
      }
      const cd = safeObj(j.client_decisions) || {};
      const list = Array.isArray(cd.items) ? cd.items.map((x) => (safeObj(x) ? { ...x } : {})) : [];
      setItems(list);
      setSufficientToProceed(cd.sufficient_to_proceed === true);
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
    const id = ticketId.trim();
    if (id.length < 18) return;
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
        setThankYouBanner(THANK_YOU_RECOVERY);
      } else {
        setError('Please choose a decision before submitting.');
        seedAnswers(Array.isArray(cd.items) ? cd.items : items);
      }
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const decisionItem = items.find((it) => safeObj(it)?.key === 'lux_recovery_release1_decision');
  const notesItem = items.find((it) => safeObj(it)?.key === 'lux_recovery_release1_notes');
  const decisionOpts = Array.isArray(safeObj(decisionItem)?.select_options)
    ? /** @type {Array<{ value: string, label: string }>} */ (safeObj(decisionItem).select_options)
    : [
        { value: '', label: 'Choose one…' },
        { value: 'approve', label: 'Approve Release 1 scope' },
        { value: 'request_changes', label: 'Request changes' },
        { value: 'not_approved', label: 'Not approved — explain concerns' },
      ];

  const showForm = hasMagicLink && hasTicket && !magicClosed && items.length > 0;

  const pageStyle = {
    minHeight: '100vh',
    background: T.charcoal,
    color: T.ivory,
    fontFamily: T.fontBody,
  };

  const sectionStyle = {
    maxWidth: 760,
    margin: '0 auto',
    padding: '0 24px 48px',
  };

  const cardStyle = {
    border: `1px solid ${T.hairline}`,
    borderRadius: T.radiusLg,
    padding: '20px 22px',
    background: T.charcoalSoft,
    marginBottom: 16,
  };

  return (
    <>
      <Head>
        <title>Recovery roadmap — LuxeMaurice</title>
        <meta name="robots" content="noindex,nofollow" />
        <LuxeMauriceFontStylesheet />
      </Head>
      <div style={pageStyle}>
        <header style={{ ...sectionStyle, paddingTop: 32, paddingBottom: 24, textAlign: 'center' }}>
          <LuxeMauriceWordmark />
          <LuxEyebrow style={{ marginTop: 20 }}>Private platform recovery</LuxEyebrow>
          <h1
            style={{
              margin: '12px 0 0',
              fontFamily: T.fontDisplay,
              fontWeight: 500,
              fontSize: 'clamp(1.75rem, 4vw, 2.35rem)',
              lineHeight: 1.2,
              color: T.ivory,
            }}
          >
            Your delivery roadmap
          </h1>
        </header>

        <main style={sectionStyle}>
          <p style={{ margin: '0 0 28px', color: T.ivoryMuted, fontSize: 16, lineHeight: 1.65 }}>{LUX_RECOVERY_SITUATION_PARAGRAPH}</p>

          <div style={{ marginBottom: 28 }}>
            <LuxHairline />
          </div>

          <LuxEyebrow>{LUX_RECOVERY_RELEASE1_TITLE}</LuxEyebrow>
          <p style={{ margin: '10px 0 20px', fontSize: 15, lineHeight: 1.6, color: T.ivoryMuted }}>{LUX_RECOVERY_RELEASE1_SUMMARY}</p>

          <div style={{ display: 'grid', gap: 14, marginBottom: 32 }}>
            {LUX_RECOVERY_RELEASE1_PACKAGES.map((pkg) => (
              <div key={pkg.priority} style={cardStyle}>
                <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.gold, marginBottom: 6 }}>
                  Step {pkg.priority}
                </div>
                <div style={{ fontFamily: T.fontDisplay, fontSize: '1.25rem', marginBottom: 8 }}>{pkg.name}</div>
                <div style={{ fontSize: 14, color: T.ivoryMuted, lineHeight: 1.55, marginBottom: 10 }}>{pkg.whatYouSee}</div>
                <div style={{ fontSize: 13, color: T.stoneSoft, lineHeight: 1.5 }}>
                  <span style={{ color: T.gold }}>After this step: </span>
                  {pkg.valueAfter}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 28 }}>
            <LuxHairline />
          </div>

          <LuxEyebrow>What we need from you</LuxEyebrow>
          <ul style={{ margin: '12px 0 32px', paddingLeft: 20, color: T.ivoryMuted, fontSize: 14, lineHeight: 1.65 }}>
            {LUX_RECOVERY_JAN_MUST_PROVIDE.map((row) => (
              <li key={row.item} style={{ marginBottom: 10 }}>
                <strong style={{ color: T.ivory, fontWeight: 600 }}>{row.item}</strong> — {row.why}
              </li>
            ))}
          </ul>

          <LuxEyebrow>Later — not part of Release 1</LuxEyebrow>
          <ul style={{ margin: '12px 0 16px', paddingLeft: 20, color: T.ivoryMuted, fontSize: 14, lineHeight: 1.6 }}>
            {LUX_RECOVERY_LATER_ITEMS.map((item) => (
              <li key={item} style={{ marginBottom: 6 }}>
                {item}
              </li>
            ))}
          </ul>

          <div style={{ ...cardStyle, marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ivory, marginBottom: 10 }}>Not included in this release</div>
            {LUX_RECOVERY_NOT_MVP.map((row) => (
              <div key={row.label} style={{ fontSize: 13, color: T.ivoryMuted, lineHeight: 1.55, marginBottom: 8 }}>
                <span style={{ color: T.ivory }}>{row.label}</span> — {row.meaning}
              </div>
            ))}
          </div>

          <p style={{ margin: '0 0 32px', fontSize: 13, color: T.stoneSoft, lineHeight: 1.55 }}>{LUX_RECOVERY_EFFORT_NOTE}</p>

          <div style={{ marginBottom: 28 }}>
            <LuxHairline />
          </div>

          <LuxEyebrow>Your decision</LuxEyebrow>

          {!hasMagicLink ? (
            <div style={{ ...cardStyle, marginTop: 14, color: T.ivoryMuted, fontSize: 14, lineHeight: 1.55 }}>
              This page is shared through a private link from your CorpFlowAI team. If you expected to submit a decision here,
              use the link they sent you (it includes a secure token).
            </div>
          ) : null}

          {loadBusy ? (
            <p style={{ marginTop: 14, fontSize: 14, color: T.ivoryMuted }}>Loading…</p>
          ) : null}

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
              {thankYouBanner || THANK_YOU_RECOVERY}
            </div>
          ) : null}

          {showForm ? (
            <div style={{ marginTop: 14, ...cardStyle }}>
              <label
                htmlFor="lux-recovery-decision"
                style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 10, color: T.ivory }}
              >
                {typeof safeObj(decisionItem)?.question === 'string'
                  ? String(safeObj(decisionItem).question)
                  : 'Do you approve Release 1 — First Real Opportunity — as proposed above?'}
              </label>
              <select
                id="lux-recovery-decision"
                value={answersByKey.lux_recovery_release1_decision?.answer || ''}
                onChange={(e) =>
                  setAnswersByKey((prev) => ({
                    ...prev,
                    lux_recovery_release1_decision: { answer: e.target.value },
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
                {decisionOpts.map((opt, i) => (
                  <option key={`${opt.value}_${i}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <label
                htmlFor="lux-recovery-notes"
                style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 10, color: T.ivory }}
              >
                {typeof safeObj(notesItem)?.question === 'string'
                  ? String(safeObj(notesItem).question)
                  : 'Notes, changes requested, or concerns'}
              </label>
              <textarea
                id="lux-recovery-notes"
                value={answersByKey.lux_recovery_release1_notes?.answer || ''}
                onChange={(e) =>
                  setAnswersByKey((prev) => ({
                    ...prev,
                    lux_recovery_release1_notes: { answer: e.target.value },
                  }))
                }
                placeholder="Optional if you fully approve. Required detail if you request changes or are not approving."
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
                {busy ? 'Submitting…' : 'Submit decision'}
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

          {magicClosed && answersByKey.lux_recovery_release1_decision?.answer ? (
            <p style={{ marginTop: 12, fontSize: 13, color: T.stoneSoft }}>
              Recorded: {decisionLabel(answersByKey.lux_recovery_release1_decision.answer)}
            </p>
          ) : null}
        </main>
      </div>
    </>
  );
}
