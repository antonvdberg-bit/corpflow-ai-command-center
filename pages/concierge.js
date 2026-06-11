import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import { resolveLuxPropertyRef } from '../lib/client/luxe-maurice-property-resolve.js';
import { buildConciergeSeo } from '../lib/client/concierge-seo.js';
import {
  LuxeMauriceFontStylesheet,
  LuxeMauriceWordmark,
  LuxEyebrow,
  LuxHairline,
} from '../components/LuxeMauriceBrandPrimitives.js';

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
 * `/concierge` — *Private Advisory* surface for `lux.corpflowai.com` (also
 * rendered with the same Lux content on apex `/concierge` until the
 * host-aware split lands).
 *
 * Brand-fidelity rebuild (2026-06-11). Editorial form: serif heading,
 * underline-only inputs (no card chrome), single private-consultation CTA.
 * Reference benchmarks: Aman concierge enquiry, Sotheby's Private Office
 * enquiry page.
 *
 * The lead-creation API and the persisted `property_slug` / `property_title`
 * payload are deliberately unchanged so existing operator workflows on
 * `/change` continue to receive the same lead context. No DB schema change.
 * No new env vars.
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
  const [propertyRefState, setPropertyRefState] = useState({
    ready: false,
    matched: false,
  });

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
            highlights: Array.isArray(L.highlights)
              ? L.highlights.map((h) => String(h)).filter(Boolean)
              : [],
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
      const intentPrefix = intentLabels.length
        ? `Seeking: ${intentLabels.join(', ')}.\n\n`
        : '';
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

  /* ─── Atom: editorial input — hairline underline, transparent bg ── */
  const editorialInput = (props) => (
    <input
      {...props}
      style={{
        display: 'block',
        width: '100%',
        marginTop: 12,
        padding: '14px 0',
        border: 'none',
        borderBottom: `1px solid ${T.hairlineSoft}`,
        background: 'transparent',
        color: T.ivory,
        fontFamily: T.fontBody,
        fontSize: 16,
        outline: 'none',
        letterSpacing: 'normal',
        textTransform: 'none',
        fontWeight: 400,
      }}
    />
  );

  return (
    <div
      style={{
        fontFamily: T.fontBody,
        minHeight: '100vh',
        background: T.charcoal,
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
        <LuxeMauriceFontStylesheet />
      </Head>

      {/* ─── Header ───────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          padding: '28px clamp(20px, 4vw, 56px)',
        }}
      >
        <LuxeMauriceWordmark
          variant="compact"
          tone="ivory"
          showSignature={false}
          href="/"
        />
        <Link
          href="/properties"
          style={{
            fontFamily: T.fontBody,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: T.gold,
            textDecoration: 'none',
          }}
        >
          Private Opportunities →
        </Link>
      </header>

      <main
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '56px clamp(20px, 4vw, 56px) 120px',
        }}
      >
        {/* ─── Title block ──────────────────────────────────────────── */}
        <section style={{ marginBottom: 64, textAlign: 'left' }}>
          <LuxEyebrow>Private Advisory</LuxEyebrow>
          <h1
            style={{
              margin: '28px 0 28px',
              fontFamily: T.fontDisplay,
              fontWeight: 400,
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              lineHeight: 1.1,
              letterSpacing: -0.4,
              color: T.ivory,
            }}
          >
            Request a private consultation.
          </h1>
          <div style={{ width: 40, marginBottom: 28 }}>
            <LuxHairline tone="gold" />
          </div>
          <p
            style={{
              margin: '0 0 16px',
              maxWidth: 560,
              fontFamily: T.fontDisplay,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(1.15rem, 1.7vw, 1.35rem)',
              lineHeight: 1.65,
              color: T.ivoryMuted,
            }}
          >
            Tell us briefly what you are seeking in Mauritius.
          </p>
          <p
            style={{
              margin: 0,
              maxWidth: 560,
              fontFamily: T.fontBody,
              fontSize: 15,
              lineHeight: 1.85,
              color: T.ivoryMuted,
            }}
          >
            Your note is read by a single private advisor and held in complete
            discretion. A response follows within one business day. Nothing here is
            an offer; terms are agreed in writing once a private advisory
            conversation is under way.
          </p>
        </section>

        {/* ─── Referenced opportunity (when arrived from /property) ─── */}
        {propertyInterest ? (
          <section
            style={{
              marginBottom: 56,
              padding: '24px 0',
              borderTop: `1px solid ${T.hairline}`,
              borderBottom: `1px solid ${T.hairline}`,
            }}
          >
            <div
              style={{
                fontFamily: T.fontBody,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.36em',
                textTransform: 'uppercase',
                color: T.gold,
              }}
            >
              Private opportunity referenced
            </div>
            <div
              style={{
                marginTop: 12,
                fontFamily: T.fontDisplay,
                fontSize: 22,
                fontWeight: 500,
                color: T.ivory,
              }}
            >
              {propertyInterest.title}
              {propertyInterest.status ? (
                <span
                  style={{
                    color: T.ivoryMuted,
                    fontFamily: T.fontBody,
                    fontStyle: 'italic',
                    fontSize: 14,
                    marginLeft: 12,
                  }}
                >
                  · {propertyInterest.status}
                </span>
              ) : null}
            </div>
            <div
              style={{
                marginTop: 8,
                fontFamily: T.fontBody,
                fontSize: 13,
                color: T.ivoryMuted,
              }}
            >
              {propertyInterest.location} · {propertyInterest.property_type}
            </div>
            {propertyInterest.price_range ? (
              <div
                style={{
                  marginTop: 10,
                  fontFamily: T.fontDisplay,
                  fontStyle: 'italic',
                  fontSize: 18,
                  color: T.gold,
                }}
              >
                {propertyInterest.price_range}
              </div>
            ) : null}
          </section>
        ) : router.isReady &&
          String(router.query?.property || '').trim() &&
          propertyRefState.ready &&
          !propertyRefState.matched ? (
          <p
            style={{
              marginBottom: 40,
              padding: '18px 0',
              borderTop: `1px solid ${T.hairlineSoft}`,
              borderBottom: `1px solid ${T.hairlineSoft}`,
              fontFamily: T.fontDisplay,
              fontStyle: 'italic',
              fontSize: 15,
              color: T.ivoryMuted,
              maxWidth: 560,
            }}
          >
            We could not match that private opportunity reference. You can still send
            a general enquiry below.
          </p>
        ) : null}

        {/* ─── Editorial form — hairline underline inputs ─────────── */}
        <form
          onSubmit={onSubmit}
          style={{
            display: 'grid',
            gap: 40,
          }}
        >
          <label
            style={{
              fontFamily: T.fontBody,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: T.gold,
            }}
          >
            Name
            {editorialInput({
              value: name,
              onChange: (e) => setName(e.target.value),
              placeholder: 'Full name',
              type: 'text',
              autoComplete: 'name',
            })}
          </label>

          <label
            style={{
              fontFamily: T.fontBody,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: T.gold,
            }}
          >
            Preferred contact
            {editorialInput({
              value: contact,
              onChange: (e) => setContact(e.target.value),
              placeholder: 'Email or telephone',
              type: 'text',
              autoComplete: 'email',
            })}
          </label>

          <div>
            <div
              style={{
                fontFamily: T.fontBody,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color: T.gold,
              }}
            >
              Tell us what you are seeking in Mauritius
            </div>
            <div
              style={{
                marginTop: 18,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              {INTENT_OPTIONS.map((opt) => {
                const active = intentTags.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleIntent(opt.id)}
                    aria-pressed={active}
                    style={{
                      padding: '11px 18px',
                      borderRadius: T.radiusEditorial,
                      border: `1px solid ${active ? T.gold : T.hairlineSoft}`,
                      background: active ? T.gold : 'transparent',
                      color: active ? T.charcoal : T.ivoryMuted,
                      fontFamily: T.fontBody,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label
            style={{
              fontFamily: T.fontBody,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: T.gold,
            }}
          >
            Your message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A few words about timing, location, family context, or anything you would like the advisor to know in advance."
              style={{
                display: 'block',
                width: '100%',
                minHeight: 180,
                marginTop: 12,
                padding: '14px 0',
                border: 'none',
                borderBottom: `1px solid ${T.hairlineSoft}`,
                background: 'transparent',
                color: T.ivory,
                fontFamily: T.fontBody,
                fontSize: 16,
                lineHeight: 1.7,
                outline: 'none',
                letterSpacing: 'normal',
                textTransform: 'none',
                fontWeight: 400,
                resize: 'vertical',
              }}
            />
          </label>

          <div style={{ marginTop: 12 }}>
            <button
              type="submit"
              disabled={!canSubmit || busy}
              style={{
                border: 'none',
                borderRadius: T.radiusEditorial,
                padding: '18px 32px',
                background:
                  !canSubmit || busy ? 'rgba(168, 132, 44, 0.32)' : T.gold,
                color: T.charcoal,
                fontFamily: T.fontBody,
                fontWeight: 700,
                fontSize: 12.5,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                cursor: !canSubmit || busy ? 'not-allowed' : 'pointer',
              }}
            >
              {busy ? 'Submitting…' : 'Request a Private Consultation'}
            </button>
          </div>
        </form>

        {success ? (
          <p
            style={{
              marginTop: 40,
              padding: '20px 0',
              borderTop: `1px solid ${T.hairline}`,
              borderBottom: `1px solid ${T.hairline}`,
              fontFamily: T.fontDisplay,
              fontStyle: 'italic',
              fontSize: 17,
              lineHeight: 1.6,
              color: T.ivory,
            }}
          >
            {success}
          </p>
        ) : null}

        {error ? (
          <p
            style={{
              marginTop: 28,
              padding: '16px 0',
              borderTop: '1px solid rgba(220,38,38,0.45)',
              borderBottom: '1px solid rgba(220,38,38,0.45)',
              color: '#f1c4c4',
              fontFamily: T.fontBody,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {error}
          </p>
        ) : null}

        {showDebugPayload && payload ? (
          <pre
            style={{
              marginTop: 32,
              padding: 16,
              border: `1px solid ${T.hairlineSoft}`,
              background: T.charcoalSoft,
              color: T.ivoryMuted,
              overflowX: 'auto',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          >
            {JSON.stringify(payload, null, 2)}
          </pre>
        ) : null}

        <p
          style={{
            marginTop: 64,
            textAlign: 'center',
            fontFamily: T.fontBody,
            fontSize: 11.5,
            lineHeight: 1.8,
            color: T.ivoryMuted,
            letterSpacing: 0.04,
          }}
        >
          Information is used solely to respond to your enquiry. Not legal, tax, or
          immigration advice.
        </p>
      </main>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer
        style={{
          padding: '56px 32px 64px',
          background: T.charcoalDeep,
          borderTop: `1px solid ${T.hairlineSoft}`,
          textAlign: 'center',
        }}
      >
        <LuxeMauriceWordmark variant="stacked" tone="ivory" showSignature />
      </footer>
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
