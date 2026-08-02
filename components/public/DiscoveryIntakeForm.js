import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  RAPID_DELIVERY_OFFER_SLUGS,
  getRapidDeliveryOffer,
} from '../../lib/public/rapid-delivery-offers.js';
import {
  MARKET_SERVICE_PATHS,
  MARKET_URGENCY_OPTIONS,
  resolveOfferSlugForMarketEnquiry,
} from '../../lib/public/corpflow-market-service-paths.js';
import { RAPID_DELIVERY_PRODUCT } from '../../lib/cmp/_lib/rapid-delivery-operator.js';
import { cfBtnPrimary, cfBtnSecondary, CF } from './corpflow-public-styles.js';

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

/**
 * Map a locked rapid-delivery offer slug to the matching market service path.
 * @param {string} offerSlug
 */
function defaultServicePathForOffer(offerSlug) {
  const match = MARKET_SERVICE_PATHS.find((p) => p.offerSlug === offerSlug);
  return match?.id || 'client-lead-service';
}

/**
 * Qualified CorpFlowAI enquiry → POST /api/tenant/intake (#699).
 * Reuses rapid-delivery product marker and Postgres `leads` — no schema change.
 *
 * @param {{
 *   defaultOfferSlug?: string,
 *   lockedOffer?: boolean,
 *   heading?: string,
 *   defaultServicePath?: string,
 * }} props
 */
export default function DiscoveryIntakeForm({
  defaultOfferSlug = 'ai-lead-rescue',
  lockedOffer = false,
  heading = 'Request a qualified conversation',
  defaultServicePath,
}) {
  const offers = useMemo(
    () => RAPID_DELIVERY_OFFER_SLUGS.map((slug) => getRapidDeliveryOffer(slug)).filter(Boolean),
    [],
  );
  const initialOffer = RAPID_DELIVERY_OFFER_SLUGS.includes(/** @type {any} */ (defaultOfferSlug))
    ? defaultOfferSlug
    : 'ai-lead-rescue';
  const [servicePath, setServicePath] = useState(
    defaultServicePath || defaultServicePathForOffer(initialOffer),
  );
  const [offerSlug, setOfferSlug] = useState(initialOffer);
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [enquiryChannels, setEnquiryChannels] = useState('');
  const [primaryPain, setPrimaryPain] = useState('');
  const [urgency, setUrgency] = useState('this-month');
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** @type {[{ reference: string, lead_id: string, offer_slug: string, service_path: string } | null, Function]} */
  const [done, setDone] = useState(null);

  function onServicePathChange(nextPathId) {
    setServicePath(nextPathId);
    if (lockedOffer) return;
    const mapped = resolveOfferSlugForMarketEnquiry(nextPathId, '');
    if (mapped && RAPID_DELIVERY_OFFER_SLUGS.includes(/** @type {any} */ (mapped))) {
      setOfferSlug(mapped);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError('Please confirm we may contact you about this enquiry.');
      return;
    }
    if (!phone.trim()) {
      setError('Telephone or WhatsApp number is required.');
      return;
    }
    setBusy(true);
    try {
      const mappedFromPath = resolveOfferSlugForMarketEnquiry(servicePath, '');
      /** @type {string} */
      let finalOfferSlug = '';
      if (lockedOffer) {
        finalOfferSlug = offerSlug;
      } else if (mappedFromPath) {
        finalOfferSlug = mappedFromPath;
      } else if (
        offerSlug &&
        servicePath !== 'workflow-administration' &&
        RAPID_DELIVERY_OFFER_SLUGS.includes(/** @type {any} */ (offerSlug))
      ) {
        finalOfferSlug = offerSlug;
      }

      /** @type {Record<string, unknown>} */
      const meta = {
        product: RAPID_DELIVERY_PRODUCT,
        service_path: servicePath,
        business_name: businessName.trim(),
        website: website.trim(),
        enquiry_channels: enquiryChannels.trim() || 'Not specified',
        primary_pain: primaryPain.trim(),
        urgency,
        consent_contact: true,
        message: message.trim(),
        discovery_form: true,
        source: 'corpflow-market-gateway',
        page: typeof window !== 'undefined' ? window.location.pathname : '/contact',
      };
      if (finalOfferSlug) meta.offer_slug = finalOfferSlug;

      const r = await fetch('/api/tenant/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim() || primaryPain.trim(),
          intent: `Qualified enquiry — ${MARKET_SERVICE_PATHS.find((p) => p.id === servicePath)?.title || servicePath}`,
          meta,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        throw new Error(data.error || data.hint || `Request failed (${r.status})`);
      }
      setDone({
        reference: data.reference || data.lead_id,
        lead_id: data.lead_id,
        offer_slug: data.offer_slug || finalOfferSlug,
        service_path: servicePath,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const offer = getRapidDeliveryOffer(done.offer_slug);
    const path = MARKET_SERVICE_PATHS.find((p) => p.id === done.service_path);
    return (
      <section
        style={{
          marginTop: 8,
          padding: '22px 20px',
          borderRadius: 16,
          border: '1px solid rgba(45,212,191,0.35)',
          background: 'rgba(15, 118, 110, 0.18)',
        }}
        data-enquiry-success
      >
        <p style={{ margin: '0 0 8px', fontSize: 12, letterSpacing: '0.14em', color: '#5eead4', fontWeight: 700 }}>
          REQUEST RECEIVED
        </p>
        <h2 style={{ margin: '0 0 10px', fontSize: 22, color: '#eef6ff' }}>Your reference: {done.reference}</h2>
        <p style={{ margin: '0 0 12px', color: '#c9d8e8', lineHeight: 1.65, fontSize: 15 }}>
          We logged your qualified enquiry
          {path ? ` for ${path.title}` : ''}
          {offer ? ` (${offer.title})` : ''}. Keep this reference for follow-up. A CorpFlowAI operator will review fit
          and reply — no payment is taken on this form, and nothing is sent automatically to email, WhatsApp or SMS.
        </p>
        <p style={{ margin: '0 0 16px', color: '#9fb2c8', fontSize: 13 }}>
          Internal id: <code style={{ color: '#7dd3fc' }}>{done.lead_id}</code>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link href={path?.productHref || offer?.path || '/lead-rescue'} style={cfBtnSecondary}>
            Review related product
          </Link>
          <Link href="/" style={cfBtnPrimary}>
            Back to home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginTop: 8 }} data-qualified-enquiry-form>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, color: '#eef6ff' }}>{heading}</h2>
      <p style={{ margin: '0 0 16px', color: '#aebfd1', lineHeight: 1.65, fontSize: 15 }}>
        Structured request — you get an on-screen reference immediately. We confirm scope before any invoice. No
        automatic email, WhatsApp or SMS is sent from this form.
      </p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14, maxWidth: 560 }}>
        <label>
          <span style={labelStyle}>Preferred service path</span>
          <select
            required
            value={servicePath}
            onChange={(ev) => onServicePathChange(ev.target.value)}
            style={fieldStyle}
            name="service_path"
          >
            {MARKET_SERVICE_PATHS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        {lockedOffer ? (
          <p style={{ margin: 0, color: CF.link, fontSize: 14, fontWeight: 600 }}>
            Product focus: {getRapidDeliveryOffer(offerSlug)?.title}
          </p>
        ) : (
          <label>
            <span style={labelStyle}>Related product sprint (optional focus)</span>
            <select
              value={offerSlug}
              onChange={(ev) => setOfferSlug(ev.target.value)}
              style={fieldStyle}
              name="offer_slug"
            >
              {offers.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span style={labelStyle}>Business name</span>
          <input
            required
            name="business_name"
            value={businessName}
            onChange={(ev) => setBusinessName(ev.target.value)}
            style={fieldStyle}
          />
        </label>
        <label>
          <span style={labelStyle}>Your name</span>
          <input required name="name" value={name} onChange={(ev) => setName(ev.target.value)} style={fieldStyle} />
        </label>
        <label>
          <span style={labelStyle}>Email</span>
          <input
            required
            type="email"
            name="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            style={fieldStyle}
            autoComplete="email"
          />
        </label>
        <label>
          <span style={labelStyle}>Telephone or WhatsApp</span>
          <input
            required
            name="phone"
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
            style={fieldStyle}
            autoComplete="tel"
            placeholder="+230 …"
          />
        </label>
        <label>
          <span style={labelStyle}>Website (if any)</span>
          <input
            name="website"
            type="url"
            placeholder="https://"
            value={website}
            onChange={(ev) => setWebsite(ev.target.value)}
            style={fieldStyle}
          />
        </label>
        <label>
          <span style={labelStyle}>How do customers reach you today? (optional)</span>
          <input
            name="enquiry_channels"
            placeholder="WhatsApp, website form, email, Instagram…"
            value={enquiryChannels}
            onChange={(ev) => setEnquiryChannels(ev.target.value)}
            style={fieldStyle}
          />
        </label>
        <label>
          <span style={labelStyle}>Business problem or desired outcome</span>
          <input
            required
            name="primary_pain"
            placeholder="Slow follow-up, weak website enquiry path, scattered approvals…"
            value={primaryPain}
            onChange={(ev) => setPrimaryPain(ev.target.value)}
            style={fieldStyle}
          />
        </label>
        <label>
          <span style={labelStyle}>Urgency / timing</span>
          <select
            required
            name="urgency"
            value={urgency}
            onChange={(ev) => setUrgency(ev.target.value)}
            style={fieldStyle}
          >
            {MARKET_URGENCY_OPTIONS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Anything else we should know? (optional)</span>
          <textarea
            name="message"
            value={message}
            onChange={(ev) => setMessage(ev.target.value)}
            rows={3}
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
        </label>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#c9d8e8', fontSize: 14 }}>
          <input
            required
            type="checkbox"
            name="consent_contact"
            checked={consent}
            onChange={(ev) => setConsent(ev.target.checked)}
            style={{ marginTop: 3, width: 18, height: 18 }}
          />
          <span>I consent to be contacted by CorpFlowAI about this enquiry. No marketing automation is triggered by this form.</span>
        </label>
        {error ? (
          <p role="alert" style={{ margin: 0, color: '#fda4af', fontSize: 14 }}>
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          style={{ ...cfBtnPrimary, opacity: busy ? 0.7 : 1, border: 'none', cursor: 'pointer' }}
        >
          {busy ? 'Submitting…' : 'Submit qualified enquiry'}
        </button>
      </form>
    </section>
  );
}
