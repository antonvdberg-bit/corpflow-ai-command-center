import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RAPID_DELIVERY_OFFER_SLUGS,
  getRapidDeliveryOffer,
} from '../../lib/public/rapid-delivery-offers.js';
import { RAPID_DELIVERY_PRODUCT } from '../../lib/cmp/_lib/rapid-delivery-operator.js';
import {
  CORPFLOW_SERVICE_PATHS,
  CORPFLOW_ENQUIRY_URGENCY_OPTIONS,
  isCorpFlowServicePathId,
} from '../../lib/public/corpflow-service-paths.js';
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

function readPathQuery() {
  if (typeof window === 'undefined') return '';
  try {
    return new URLSearchParams(window.location.search).get('path') || '';
  } catch {
    return '';
  }
}

/**
 * Structured CorpFlowAI enquiry → POST /api/tenant/intake.
 * Market paths use service_path; offer pages may lock a sprint offer_slug.
 *
 * @param {{
 *   defaultOfferSlug?: string,
 *   lockedOffer?: boolean,
 *   defaultServicePath?: string,
 *   heading?: string,
 * }} props
 */
export default function DiscoveryIntakeForm({
  defaultOfferSlug = 'ai-lead-rescue',
  lockedOffer = false,
  defaultServicePath = '',
  heading = 'Start a qualified enquiry',
}) {
  const initialPath = isCorpFlowServicePathId(defaultServicePath) ? defaultServicePath : '';
  const [servicePath, setServicePath] = useState(initialPath);
  const [offerSlug, setOfferSlug] = useState(
    RAPID_DELIVERY_OFFER_SLUGS.includes(/** @type {any} */ (defaultOfferSlug))
      ? defaultOfferSlug
      : 'ai-lead-rescue',
  );
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [enquiryChannels, setEnquiryChannels] = useState('');
  const [primaryPain, setPrimaryPain] = useState('');
  const [urgency, setUrgency] = useState('this_month');
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** @type {[{ reference: string, lead_id: string, offer_slug: string | null, service_path: string | null } | null, Function]} */
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (lockedOffer || initialPath) return;
    const fromQuery = readPathQuery();
    if (isCorpFlowServicePathId(fromQuery)) setServicePath(fromQuery);
  }, [lockedOffer, initialPath]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError('Please confirm you consent to be contacted about this enquiry.');
      return;
    }
    if (!phone.trim()) {
      setError('Telephone or WhatsApp number is required.');
      return;
    }
    if (!lockedOffer && !isCorpFlowServicePathId(servicePath)) {
      setError('Please choose a preferred service path.');
      return;
    }
    if (lockedOffer && !enquiryChannels.trim()) {
      setError('Please tell us how customers reach you today.');
      return;
    }
    setBusy(true);
    try {
      const channels = lockedOffer
        ? enquiryChannels.trim()
        : enquiryChannels.trim() || 'Telephone / WhatsApp (stated on form)';
      const r = await fetch('/api/tenant/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim() || primaryPain.trim(),
          intent: lockedOffer
            ? `Discovery — ${getRapidDeliveryOffer(offerSlug)?.title || offerSlug}`
            : `Enquiry — ${CORPFLOW_SERVICE_PATHS.find((p) => p.id === servicePath)?.title || servicePath}`,
          meta: {
            product: RAPID_DELIVERY_PRODUCT,
            offer_slug: lockedOffer ? offerSlug : undefined,
            business_name: businessName.trim(),
            enquiry_channels: channels,
            primary_pain: primaryPain.trim(),
            message: message.trim(),
            discovery_form: true,
            market_enquiry: !lockedOffer,
            service_path: lockedOffer ? undefined : servicePath,
            website: website.trim() || undefined,
            urgency: lockedOffer ? undefined : urgency.trim(),
            consent_to_contact: true,
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
        offer_slug: data.offer_slug || (lockedOffer ? offerSlug : null),
        service_path: data.service_path || (!lockedOffer ? servicePath : null),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const offer = done.offer_slug ? getRapidDeliveryOffer(done.offer_slug) : null;
    const path = done.service_path
      ? CORPFLOW_SERVICE_PATHS.find((p) => p.id === done.service_path)
      : null;
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
          ENQUIRY RECEIVED
        </p>
        <h2 style={{ margin: '0 0 10px', fontSize: 22, color: '#eef6ff' }}>Your reference: {done.reference}</h2>
        <p style={{ margin: '0 0 12px', color: '#c9d8e8', lineHeight: 1.65, fontSize: 15 }}>
          We logged your enquiry
          {path ? ` for ${path.title}` : ''}
          {offer ? ` (${offer.title})` : ''}. Keep this reference for follow-up. A CorpFlowAI operator will review fit
          and reply — no payment is taken on this form, and no automatic message is sent.
        </p>
        <p style={{ margin: '0 0 16px', color: '#9fb2c8', fontSize: 13 }}>
          Internal id: <code style={{ color: '#7dd3fc' }}>{done.lead_id}</code>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link href={offer?.path || '/#service-paths'} style={cfBtnSecondary}>
            {offer ? 'Review the offer' : 'Review service paths'}
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
        Structured enquiry — you get an on-screen reference immediately. A human operator reviews fit before any
        commercial next step. No automatic email, WhatsApp or SMS is sent from this form.
      </p>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14, maxWidth: 560 }}>
        {lockedOffer ? (
          <p style={{ margin: 0, color: CF.link, fontSize: 14, fontWeight: 600 }}>
            Offer: {getRapidDeliveryOffer(offerSlug)?.title}
          </p>
        ) : (
          <label>
            <span style={labelStyle}>Preferred service path</span>
            <select
              required
              value={servicePath}
              onChange={(ev) => setServicePath(ev.target.value)}
              style={fieldStyle}
            >
              <option value="">Select a path…</option>
              {CORPFLOW_SERVICE_PATHS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span style={labelStyle}>Your name</span>
          <input required value={name} onChange={(ev) => setName(ev.target.value)} style={fieldStyle} autoComplete="name" />
        </label>
        <label>
          <span style={labelStyle}>Business name</span>
          <input
            required
            value={businessName}
            onChange={(ev) => setBusinessName(ev.target.value)}
            style={fieldStyle}
            autoComplete="organization"
          />
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
          <span style={labelStyle}>Telephone or WhatsApp number</span>
          <input
            required
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
            style={fieldStyle}
            autoComplete="tel"
            placeholder="+230 …"
          />
        </label>
        {!lockedOffer ? (
          <label>
            <span style={labelStyle}>Website (if any)</span>
            <input
              value={website}
              onChange={(ev) => setWebsite(ev.target.value)}
              style={fieldStyle}
              autoComplete="url"
              placeholder="https://"
            />
          </label>
        ) : null}
        {lockedOffer ? (
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
        ) : null}
        <label>
          <span style={labelStyle}>Business problem or desired outcome</span>
          <textarea
            required
            value={primaryPain}
            onChange={(ev) => setPrimaryPain(ev.target.value)}
            rows={3}
            placeholder={
              lockedOffer
                ? 'Slow follow-up, weak landing page, reputation recovery…'
                : 'What should work better — intake, follow-up, approvals, website, client review…'
            }
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
        </label>
        {!lockedOffer ? (
          <label>
            <span style={labelStyle}>Urgency / timing</span>
            <select required value={urgency} onChange={(ev) => setUrgency(ev.target.value)} style={fieldStyle}>
              {CORPFLOW_ENQUIRY_URGENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span style={labelStyle}>Anything else we should know? (optional)</span>
          <textarea
            value={message}
            onChange={(ev) => setMessage(ev.target.value)}
            rows={2}
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
        </label>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(ev) => setConsent(ev.target.checked)}
            required
            style={{ marginTop: 4, width: 18, height: 18 }}
          />
          <span style={{ color: '#c9d8e8', fontSize: 14, lineHeight: 1.5 }}>
            I consent to be contacted by CorpFlowAI about this enquiry. No automated marketing messages are sent from
            this form.
          </span>
        </label>
        {error ? (
          <p role="alert" style={{ margin: 0, color: '#fda4af', fontSize: 14 }}>
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy} style={{ ...cfBtnPrimary, opacity: busy ? 0.7 : 1, border: 'none', cursor: 'pointer' }}>
          {busy ? 'Submitting…' : 'Submit enquiry'}
        </button>
      </form>
    </section>
  );
}
