import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  RAPID_DELIVERY_OFFER_SLUGS,
  getRapidDeliveryOffer,
} from '../../lib/public/rapid-delivery-offers.js';
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
 * Structured MUR sprint discovery → POST /api/tenant/intake.
 *
 * @param {{
 *   defaultOfferSlug?: string,
 *   lockedOffer?: boolean,
 *   heading?: string,
 * }} props
 */
export default function DiscoveryIntakeForm({
  defaultOfferSlug = 'ai-lead-rescue',
  lockedOffer = false,
  heading = 'Request a discovery conversation',
}) {
  const offers = useMemo(
    () => RAPID_DELIVERY_OFFER_SLUGS.map((slug) => getRapidDeliveryOffer(slug)).filter(Boolean),
    [],
  );
  const [offerSlug, setOfferSlug] = useState(
    RAPID_DELIVERY_OFFER_SLUGS.includes(/** @type {any} */ (defaultOfferSlug))
      ? defaultOfferSlug
      : 'ai-lead-rescue',
  );
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [enquiryChannels, setEnquiryChannels] = useState('');
  const [primaryPain, setPrimaryPain] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** @type {[{ reference: string, lead_id: string, offer_slug: string } | null, Function]} */
  const [done, setDone] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/tenant/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          message: message.trim() || primaryPain.trim(),
          intent: `Discovery — ${getRapidDeliveryOffer(offerSlug)?.title || offerSlug}`,
          meta: {
            product: RAPID_DELIVERY_PRODUCT,
            offer_slug: offerSlug,
            business_name: businessName.trim(),
            enquiry_channels: enquiryChannels.trim(),
            primary_pain: primaryPain.trim(),
            message: message.trim(),
            discovery_form: true,
          },
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        throw new Error(data.error || data.hint || `Request failed (${r.status})`);
      }
      setDone({
        reference: data.reference || data.lead_id,
        lead_id: data.lead_id,
        offer_slug: data.offer_slug || offerSlug,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const offer = getRapidDeliveryOffer(done.offer_slug);
    return (
      <section
        style={{
          marginTop: 8,
          padding: '22px 20px',
          borderRadius: 16,
          border: '1px solid rgba(45,212,191,0.35)',
          background: 'rgba(15, 118, 110, 0.18)',
        }}
      >
        <p style={{ margin: '0 0 8px', fontSize: 12, letterSpacing: '0.14em', color: '#5eead4', fontWeight: 700 }}>
          REQUEST RECEIVED
        </p>
        <h2 style={{ margin: '0 0 10px', fontSize: 22, color: '#eef6ff' }}>Your reference: {done.reference}</h2>
        <p style={{ margin: '0 0 12px', color: '#c9d8e8', lineHeight: 1.65, fontSize: 15 }}>
          We logged your discovery request
          {offer ? ` for ${offer.title}` : ''}. Keep this reference for follow-up. A CorpFlowAI operator will review fit
          and reply — no payment is taken on this form.
        </p>
        <p style={{ margin: '0 0 16px', color: '#9fb2c8', fontSize: 13 }}>
          Internal id: <code style={{ color: '#7dd3fc' }}>{done.lead_id}</code>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link href={offer?.path || '/offers/ai-lead-rescue'} style={cfBtnSecondary}>
            Review the offer
          </Link>
          <Link href="/" style={cfBtnPrimary}>
            Back to home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginTop: 8 }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, color: '#eef6ff' }}>{heading}</h2>
      <p style={{ margin: '0 0 16px', color: '#aebfd1', lineHeight: 1.65, fontSize: 15 }}>
        Structured request — you get an on-screen reference immediately. We confirm scope before any invoice.
      </p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14, maxWidth: 560 }}>
        {!lockedOffer ? (
          <label>
            <span style={labelStyle}>Which sprint?</span>
            <select
              required
              value={offerSlug}
              onChange={(ev) => setOfferSlug(ev.target.value)}
              style={fieldStyle}
            >
              {offers.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.title} — from MUR {o.startingPriceMur.toLocaleString('en-MU')}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p style={{ margin: 0, color: CF.link, fontSize: 14, fontWeight: 600 }}>
            Offer: {getRapidDeliveryOffer(offerSlug)?.title}
          </p>
        )}
        <label>
          <span style={labelStyle}>Business name</span>
          <input required value={businessName} onChange={(ev) => setBusinessName(ev.target.value)} style={fieldStyle} />
        </label>
        <label>
          <span style={labelStyle}>Your name</span>
          <input required value={name} onChange={(ev) => setName(ev.target.value)} style={fieldStyle} />
        </label>
        <label>
          <span style={labelStyle}>Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            style={fieldStyle}
            autoComplete="email"
          />
        </label>
        <label>
          <span style={labelStyle}>Phone (optional)</span>
          <input value={phone} onChange={(ev) => setPhone(ev.target.value)} style={fieldStyle} autoComplete="tel" />
        </label>
        <label>
          <span style={labelStyle}>How do customers reach you today?</span>
          <input
            required
            placeholder="WhatsApp, website form, email, Instagram…"
            value={enquiryChannels}
            onChange={(ev) => setEnquiryChannels(ev.target.value)}
            style={fieldStyle}
          />
        </label>
        <label>
          <span style={labelStyle}>Which problem hurts most right now?</span>
          <input
            required
            placeholder="Slow follow-up, weak landing page, reputation recovery…"
            value={primaryPain}
            onChange={(ev) => setPrimaryPain(ev.target.value)}
            style={fieldStyle}
          />
        </label>
        <label>
          <span style={labelStyle}>Anything else we should know? (optional)</span>
          <textarea
            value={message}
            onChange={(ev) => setMessage(ev.target.value)}
            rows={3}
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
        </label>
        {error ? (
          <p role="alert" style={{ margin: 0, color: '#fda4af', fontSize: 14 }}>
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy} style={{ ...cfBtnPrimary, opacity: busy ? 0.7 : 1, border: 'none', cursor: 'pointer' }}>
          {busy ? 'Submitting…' : 'Submit discovery request'}
        </button>
      </form>
    </section>
  );
}
