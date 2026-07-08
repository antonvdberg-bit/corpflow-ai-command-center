import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

import LuxeMauriceAiPreviewShell, { LUXE_MAURICE_AI_BASE } from '../../../components/LuxeMauriceAiPreviewShell.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../../../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow } from '../../../components/LuxeMauriceBrandPrimitives.js';
import { createEnquiry, getPropertyById, listProperties } from '../../../lib/client/luxe-maurice-ai-data.js';

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  border: `1px solid ${T.hairlineSoft}`,
  background: T.charcoalSoft,
  color: T.ivory,
  fontFamily: T.fontBody,
  fontSize: 15,
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  marginBottom: 6,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: T.gold,
};

export default function LuxeMauriceAiBuyerPage({ properties }) {
  const router = useRouter();
  const propertyOptions = Array.isArray(properties) ? properties : [];

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    budget_min: '',
    budget_max: '',
    desired_location: '',
    property_type: '',
    buying_intent: '',
    notes: '',
    property_id: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    const raw = router.query.property;
    const slug = Array.isArray(raw) ? raw[0] : raw;
    if (typeof slug === 'string' && slug.trim()) {
      const match = getPropertyById(slug.trim());
      if (match?.property?.id) {
        setForm((prev) => ({ ...prev, property_id: match.property.id }));
      }
    }
  }, [router.isReady, router.query.property]);

  const selectedProperty = useMemo(() => {
    if (!form.property_id) return null;
    return getPropertyById(form.property_id)?.property ?? null;
  }, [form.property_id]);

  const onChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setBusy(true);
      setError('');
      setSuccess('');
      const result = createEnquiry({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        budget_min: form.budget_min,
        budget_max: form.budget_max,
        currency_code: 'USD',
        desired_location: form.desired_location,
        property_type: form.property_type,
        buying_intent: form.buying_intent,
        notes: form.notes,
        property_id: form.property_id || undefined,
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.error || 'Unable to submit enquiry.');
        return;
      }
      setSuccess('Thank you — your enquiry has been received. An advisor will follow up privately.');
      setForm({
        full_name: '',
        email: '',
        phone: '',
        budget_min: '',
        budget_max: '',
        desired_location: '',
        property_type: '',
        buying_intent: '',
        notes: '',
        property_id: form.property_id,
      });
    },
    [form],
  );

  return (
    <LuxeMauriceAiPreviewShell
      active="enquire"
      title="Buyer enquiry"
      description="Register your buying intent for private Mauritius property opportunities."
    >
      <section style={{ padding: '48px clamp(20px, 4vw, 56px)', maxWidth: 720 }}>
        <LuxEyebrow>Buyer wizard</LuxEyebrow>
        <h1
          style={{
            marginTop: 14,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(32px, 5vw, 40px)',
            fontWeight: 500,
          }}
        >
          Register your buying intent
        </h1>
        <p style={{ marginTop: 12, color: T.ivoryMuted, lineHeight: 1.65 }}>
          Share your preferences confidentially. Your details feed directly into the advisor lead
          workflow shown in the preview CRM view.
        </p>

        {selectedProperty ? (
          <p
            style={{
              marginTop: 20,
              padding: '12px 16px',
              border: `1px solid ${T.hairline}`,
              fontSize: 14,
              color: T.ivoryMuted,
            }}
          >
            Enquiring about: <strong style={{ color: T.ivory }}>{selectedProperty.title}</strong>
          </p>
        ) : null}

        {success ? (
          <div
            style={{
              marginTop: 24,
              padding: 20,
              background: T.goldSoft,
              border: `1px solid ${T.hairline}`,
              color: T.ivory,
            }}
          >
            {success}{' '}
            <Link href={`${LUXE_MAURICE_AI_BASE}/crm`} style={{ color: T.gold }}>
              View in advisor lead list →
            </Link>
          </div>
        ) : null}

        {error ? (
          <p style={{ marginTop: 16, color: '#e8a598', fontSize: 14 }} role="alert">
            {error}
          </p>
        ) : null}

        <form onSubmit={onSubmit} style={{ marginTop: 32, display: 'grid', gap: 20 }}>
          <div>
            <label htmlFor="full_name" style={labelStyle}>
              Full name
            </label>
            <input
              id="full_name"
              name="full_name"
              required
              value={form.full_name}
              onChange={onChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="email" style={labelStyle}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={onChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="phone" style={labelStyle}>
              Contact number
            </label>
            <input id="phone" name="phone" value={form.phone} onChange={onChange} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label htmlFor="budget_min" style={labelStyle}>
                Budget from (USD)
              </label>
              <input
                id="budget_min"
                name="budget_min"
                inputMode="numeric"
                value={form.budget_min}
                onChange={onChange}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="budget_max" style={labelStyle}>
                Budget to (USD)
              </label>
              <input
                id="budget_max"
                name="budget_max"
                inputMode="numeric"
                value={form.budget_max}
                onChange={onChange}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label htmlFor="desired_location" style={labelStyle}>
              Desired location
            </label>
            <input
              id="desired_location"
              name="desired_location"
              placeholder="e.g. West Coast, Grand Baie"
              value={form.desired_location}
              onChange={onChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="property_type" style={labelStyle}>
              Property type
            </label>
            <select
              id="property_type"
              name="property_type"
              value={form.property_type}
              onChange={onChange}
              style={inputStyle}
            >
              <option value="">Select…</option>
              <option value="Completed residence">Completed residence</option>
              <option value="Off-plan villa">Off-plan villa</option>
              <option value="Apartment">Apartment</option>
              <option value="Estate / land">Estate / land</option>
            </select>
          </div>
          <div>
            <label htmlFor="property_id" style={labelStyle}>
              Property of interest (optional)
            </label>
            <select
              id="property_id"
              name="property_id"
              value={form.property_id}
              onChange={onChange}
              style={inputStyle}
            >
              <option value="">General enquiry</option>
              {propertyOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="buying_intent" style={labelStyle}>
              Buying intent / timeline
            </label>
            <select
              id="buying_intent"
              name="buying_intent"
              value={form.buying_intent}
              onChange={onChange}
              style={inputStyle}
            >
              <option value="">Select…</option>
              <option value="Ready within 3 months">Ready within 3 months</option>
              <option value="6-12 months">6–12 months</option>
              <option value="12+ months — exploring">12+ months — exploring</option>
            </select>
          </div>
          <div>
            <label htmlFor="notes" style={labelStyle}>
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={form.notes}
              onChange={onChange}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            style={{
              marginTop: 8,
              padding: '16px 28px',
              background: T.gold,
              color: T.charcoal,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            Submit enquiry
          </button>
        </form>
      </section>
    </LuxeMauriceAiPreviewShell>
  );
}

export async function getStaticProps() {
  return {
    props: {
      properties: listProperties(),
    },
  };
}
