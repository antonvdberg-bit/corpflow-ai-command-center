import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import { resolveLuxPropertyRef } from '../lib/client/luxe-maurice-property-resolve.js';
import { buildConciergeSeo } from '../lib/client/concierge-seo.js';

function str(v) {
  return v != null ? String(v) : '';
}

const INTENT_OPTIONS = [
  { id: 'completed_residence', label: 'Completed residence' },
  { id: 'development_partnership', label: 'Development partnership' },
  { id: 'relocation', label: 'Relocation to Mauritius' },
  { id: 'investment', label: 'Investment / diversification' },
  { id: 'ownership_support', label: 'Ongoing ownership support' },
];

/**
 * `/concierge` — *Private Advisory* on `lux.corpflowai.com` (also rendered with
 * the same Lux content on apex `/concierge` until the host-aware split lands).
 *
 * Repositioned 2026-06-11 to the LuxeMaurice Private Wealth & Lifestyle
 * Platform direction. The lead-creation API and the persisted `property_slug`
 * / `property_title` payload are deliberately unchanged so existing operator
 * workflows on `/change` continue to receive the same lead context.
 */
export default function ConciergePage({ seoHost = '' } = {}) {
  const router = useRouter();
  const showDebugPayload = router.query?.debug === '1';

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [intentTags, setIntentTags] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payload, setPayload] = useState(null);
  const [propertyInterest, setPropertyInterest] = useState(null);
  /** After client resolve: whether we finished matching `property` query (staged or `/api/lux/listing`). */
  const [propertyRefState, setPropertyRefState] = useState({ ready: false, matched: false });

  useEffect(() => {
    if (!router.isReady) return;
    const rawProp = router.query?.property != null ? String(router.query.property).trim() : '';
    if (!rawProp) {
      setPropertyInterest(null);
      setPropertyRefState({ ready: false, matched: false });
      return;
    }
    const sync = resolveLuxPropertyRef(rawProp);
    if (sync) {
      setPropertyInterest(sync);
      setPropertyRefState({ ready: true, matched: true });
      return;
    }
    let cancelled = false;
    setPropertyInterest(null);
    setPropertyRefState({ ready: false, matched: false });
    (async () => {
      try {
        const r = await fetch(`/api/lux/listing?slug=${encodeURIComponent(rawProp)}`);
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.ok && j && j.ok === true && j.listing && typeof j.listing === 'object') {
          const L = j.listing;
          setPropertyInterest({
            ref: String(L.slug || '').trim(),
            title: String(L.title || '').trim(),
            location: String(L.region_label || '').trim(),
            property_type: String(L.property_type || '').trim(),
            status: L.listing_status != null ? String(L.listing_status).trim() : null,
            price_range: L.price_range != null ? String(L.price_range).trim() : null,
            discovery_source: 'lux_postgres',
            summary_text: L.short_teaser != null ? String(L.short_teaser).trim() : '',
            highlights: Array.isArray(L.highlights) ? L.highlights.map((h) => String(h)).filter(Boolean) : [],
          });
          setPropertyRefState({ ready: true, matched: true });
        } else {
          setPropertyInterest(null);
          setPropertyRefState({ ready: true, matched: false });
        }
      } catch {
        if (!cancelled) {
          setPropertyInterest(null);
          setPropertyRefState({ ready: true, matched: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query?.property]);

  useEffect(() => {
    if (!propertyInterest) return;
    setMessage((prev) => {
      const p = prev.trim();
      if (p.length > 0 && p.includes(propertyInterest.ref)) return prev;
      const seed = `I am writing about "${propertyInterest.title}" (${propertyInterest.ref}).\n\n`;
      if (p.length > 0) return prev;
      return seed;
    });
  }, [propertyInterest?.ref]);

  const seo = useMemo(
    () =>
      buildConciergeSeo({
        host: seoHost,
        propertyTitle: propertyInterest ? propertyInterest.title : '',
        propertyRef: propertyInterest ? propertyInterest.ref : '',
      }),
    [seoHost, propertyInterest],
  );

  const canSubmit = useMemo(
    () => name.trim().length > 1 && contact.trim().length > 2 && message.trim().length > 2,
    [name, contact, message],
  );

  function toggleIntent(id) {
    setIntentTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    setPayload(null);
    try {
      const intentLabels = intentTags
        .map((id) => INTENT_OPTIONS.find((o) => o.id === id))
        .filter(Boolean)
        .map((o) => o.label);
      const intentPrefix = intentLabels.length ? `Seeking: ${intentLabels.join(', ')}.\n\n` : '';
      const body = {
        name: name.trim(),
        contact: contact.trim(),
        message: `${intentPrefix}${message.trim()}`,
      };
      if (propertyInterest) {
        body.property_slug = propertyInterest.ref;
        body.property_title = propertyInterest.title;
      }
      const r = await fetch('/api/cmp/router?action=concierge-lead-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.detail || `http_${r.status}`);
      setPayload(j);
      setSuccess('Thank you. A private advisor will be in touch within one business day.');
      setName('');
      setContact('');
      setIntentTags([]);
      setMessage('');
    } catch (err) {
      setError(str(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        fontFamily: T.fontUi,
        minHeight: '100vh',
        background: T.charcoalDeep,
        color: T.ivory,
      }}
    >
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="robots" content={seo.robots} />
        <link rel="canonical" href={seo.canonical} />
        <meta property="og:title" content={seo.ogTitle} />
        <meta property="og:description" content={seo.ogDescription} />
        <meta property="og:url" content={seo.ogUrl} />
        <meta property="og:type" content={seo.ogType} />
        <meta property="og:site_name" content={seo.ogSiteName} />
        <meta name="twitter:card" content={seo.twitterCard} />
        <meta name="twitter:title" content={seo.twitterTitle} />
        <meta name="twitter:description" content={seo.twitterDescription} />
      </Head>

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          padding: '22px 32px',
          background: T.charcoalDeep,
          borderBottom: `1px solid ${T.dividerSoft}`,
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: T.goldEditorial,
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          ← LuxeMaurice
        </Link>
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: T.ivoryMuted,
            fontWeight: 700,
          }}
        >
          Private advisory
        </span>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '56px 32px 96px' }}>
        <p
          style={{
            margin: '0 0 14px',
            fontSize: 11,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: T.goldEditorial,
            fontWeight: 700,
          }}
        >
          Begin a private conversation
        </p>
        <h1
          style={{
            margin: '0 0 18px',
            fontSize: 'clamp(2rem, 4.6vw, 2.8rem)',
            lineHeight: 1.1,
            fontWeight: 500,
            letterSpacing: -0.3,
            fontFamily: T.fontDisplay,
            color: T.ivory,
          }}
        >
          Request a private consultation.
        </h1>
        <p style={{ margin: '0 0 14px', fontSize: 17, lineHeight: 1.7, color: T.ivoryMuted, maxWidth: 580 }}>
          Tell us briefly what you are seeking in Mauritius. Your note is read by a single private advisor and held in
          complete discretion.
        </p>
        <p style={{ margin: '0 0 40px', fontSize: 14, lineHeight: 1.65, color: T.ivoryMuted, maxWidth: 580 }}>
          A private advisor responds within one business day. Nothing here is an offer; terms are agreed in writing once
          a private advisory conversation is under way.
        </p>

        {propertyInterest ? (
          <div
            style={{
              marginBottom: 26,
              padding: 18,
              borderRadius: T.radiusMd,
              border: `1px solid ${T.divider}`,
              background: T.charcoalSoft,
              color: T.ivory,
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: T.goldEditorial,
                fontWeight: 800,
              }}
            >
              Private opportunity referenced
            </div>
            <div style={{ marginTop: 10, fontWeight: 600 }}>
              {propertyInterest.title}
              {propertyInterest.status ? (
                <span style={{ color: T.ivoryMuted, fontWeight: 500 }}> · {propertyInterest.status}</span>
              ) : null}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: T.ivoryMuted }}>
              {propertyInterest.location} · {propertyInterest.property_type}
            </div>
            {propertyInterest.price_range ? (
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: T.ivory }}>{propertyInterest.price_range}</div>
            ) : null}
          </div>
        ) : router.isReady &&
          String(router.query?.property || '').trim() &&
          propertyRefState.ready &&
          !propertyRefState.matched ? (
          <div
            style={{
              marginBottom: 26,
              padding: 16,
              borderRadius: T.radiusMd,
              border: `1px solid ${T.dividerSoft}`,
              background: T.charcoalSoft,
              color: T.ivoryMuted,
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            We could not match that private opportunity reference. You can still send a general enquiry below.
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          style={{
            border: `1px solid ${T.dividerSoft}`,
            borderRadius: T.radiusLg,
            background: T.charcoalSoft,
            padding: 28,
            display: 'grid',
            gap: 18,
          }}
        >
          <label style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.goldEditorial, fontWeight: 700 }}>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              style={{
                display: 'block',
                width: '100%',
                marginTop: 10,
                padding: '13px 14px',
                borderRadius: T.radiusMd,
                border: `1px solid ${T.dividerSoft}`,
                background: T.charcoal,
                color: T.ivory,
                fontSize: 15,
                letterSpacing: 'normal',
                textTransform: 'none',
                fontWeight: 500,
              }}
            />
          </label>

          <label style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.goldEditorial, fontWeight: 700 }}>
            Preferred contact
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email or telephone"
              style={{
                display: 'block',
                width: '100%',
                marginTop: 10,
                padding: '13px 14px',
                borderRadius: T.radiusMd,
                border: `1px solid ${T.dividerSoft}`,
                background: T.charcoal,
                color: T.ivory,
                fontSize: 15,
                letterSpacing: 'normal',
                textTransform: 'none',
                fontWeight: 500,
              }}
            />
          </label>

          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.goldEditorial, fontWeight: 700 }}>
              Tell us what you are seeking in Mauritius
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {INTENT_OPTIONS.map((opt) => {
                const active = intentTags.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleIntent(opt.id)}
                    aria-pressed={active}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 999,
                      border: `1px solid ${active ? T.goldEditorial : T.dividerSoft}`,
                      background: active ? T.goldEditorial : 'transparent',
                      color: active ? T.charcoalDeep : T.ivory,
                      fontSize: 11.5,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.goldEditorial, fontWeight: 700 }}>
            Your message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A few words about timing, location, family context, or anything you would like the advisor to know in advance."
              style={{
                display: 'block',
                width: '100%',
                minHeight: 160,
                marginTop: 10,
                padding: '13px 14px',
                borderRadius: T.radiusMd,
                border: `1px solid ${T.dividerSoft}`,
                background: T.charcoal,
                color: T.ivory,
                fontSize: 15,
                lineHeight: 1.5,
                letterSpacing: 'normal',
                textTransform: 'none',
                fontWeight: 500,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit || busy}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '16px 22px',
              background: !canSubmit || busy ? 'rgba(201,164,74,0.32)' : T.goldEditorial,
              color: T.charcoalDeep,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: !canSubmit || busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? 'Submitting…' : 'Request a private consultation'}
          </button>
        </form>

        {success ? (
          <div
            style={{
              marginTop: 22,
              border: `1px solid ${T.divider}`,
              background: T.charcoalSoft,
              color: T.ivory,
              borderRadius: T.radiusMd,
              padding: 18,
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            {success}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 22,
              border: '1px solid rgba(220,38,38,0.45)',
              background: 'rgba(127,29,29,0.25)',
              color: '#fecaca',
              borderRadius: T.radiusMd,
              padding: 16,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {error}
          </div>
        ) : null}

        {showDebugPayload && payload ? (
          <pre
            style={{
              marginTop: 22,
              padding: 16,
              borderRadius: T.radiusMd,
              border: `1px solid ${T.dividerSoft}`,
              background: T.charcoal,
              color: T.ivoryMuted,
              overflowX: 'auto',
              fontSize: 11,
            }}
          >
            {JSON.stringify(payload, null, 2)}
          </pre>
        ) : null}

        <p style={{ marginTop: 44, textAlign: 'center', fontSize: 12, color: T.ivoryMuted, lineHeight: 1.7 }}>
          Information is used solely to respond to your enquiry. Not legal, tax, or immigration advice.
        </p>
      </main>
    </div>
  );
}

// __concierge_gssp_v1__
// Server-side capture of the request host so the SEO canonical + og:url
// reflect the host the visitor actually arrived on (vs. always hard-coding
// the primary host). This runs in `getServerSideProps` because the value
// must be in the SSR'd HTML for crawlers and social-preview generators
// that do not execute client JS.
//
// Today the `/concierge` route renders Lux-branded content regardless of
// host (see `lib/client/concierge-seo.js` header). When the host-aware
// tenant rendering described in `docs/quality/LUX_TRUST_AND_POLICY_REMEDIATION_PLAN.md`
// ships, this function gains the tenant lookup; today it stays minimal.
export async function getServerSideProps({ req }) {
  let seoHost = '';
  try {
    const raw = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').toString();
    seoHost = raw.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  } catch {
    seoHost = '';
  }
  return { props: { seoHost } };
}
