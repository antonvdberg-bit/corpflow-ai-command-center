import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

import LuxeMauriceAiPreviewShell, { LUXE_MAURICE_AI_BASE } from '../../../components/LuxeMauriceAiPreviewShell.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../../../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow } from '../../../components/LuxeMauriceBrandPrimitives.js';
import {
  LUXE_MAURICE_AI_ACCESS_CATEGORIES,
  createEnquiry,
  getPropertyById,
  listProperties,
} from '../../../lib/client/luxe-maurice-ai-data.js';
import {
  LUXE_MAURICE_AI_SECTION_PAD,
  luxeMauriceAiCtaPrimary,
} from '../../../lib/client/luxe-maurice-ai-layout.js';

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
  const opportunityOptions = Array.isArray(properties) ? properties : [];

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    budget_min: '',
    budget_max: '',
    desired_location: '',
    access_category: '',
    property_type: '',
    access_intent: '',
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
        setForm((prev) => ({
          ...prev,
          property_id: match.property.id,
          access_category: match.detail?.opportunity_category || match.property.opportunity_category || '',
        }));
      }
    }
    const catRaw = router.query.category;
    const cat = Array.isArray(catRaw) ? catRaw[0] : catRaw;
    if (typeof cat === 'string' && cat.trim()) {
      setForm((prev) => ({ ...prev, access_category: cat.trim() }));
    }
  }, [router.isReady, router.query.property, router.query.category]);

  const selectedOpportunity = useMemo(() => {
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
        access_category: form.access_category,
        property_type: form.property_type,
        access_intent: form.access_intent,
        notes: form.notes,
        property_id: form.property_id || undefined,
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.error || 'Unable to submit request.');
        return;
      }
      setSuccess(
        'Thank you — your private access request has been received. An advisor will follow up discreetly.',
      );
      setForm({
        full_name: '',
        email: '',
        phone: '',
        budget_min: '',
        budget_max: '',
        desired_location: '',
        access_category: form.access_category,
        property_type: '',
        access_intent: '',
        notes: '',
        property_id: form.property_id,
      });
    },
    [form],
  );

  return (
    <LuxeMauriceAiPreviewShell
      active="request"
      title="Private access request"
      description="Request private access across any LuxeMaurice AI channel — residence, yacht, aviation, experience, or advisory."
    >
      <section style={{ padding: LUXE_MAURICE_AI_SECTION_PAD, maxWidth: 720, margin: '0 auto', boxSizing: 'border-box' }}>
        <LuxEyebrow>Private access request</LuxEyebrow>
        <h1
          style={{
            marginTop: 14,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(28px, 6vw, 40px)',
            fontWeight: 500,
            lineHeight: 1.15,
          }}
        >
          Request private access
        </h1>
        <p style={{ marginTop: 12, color: T.ivoryMuted, lineHeight: 1.65, fontSize: 'clamp(14px, 2.5vw, 16px)' }}>
          Choose your channel — residence, yacht, aviation, island experience, or advisory mandate. Your request
          appears immediately in the{' '}
          <Link href={`${LUXE_MAURICE_AI_BASE}/crm`} style={{ color: T.gold }}>
            advisor pipeline
          </Link>{' '}
          preview for operator review.
        </p>

        <div
          style={{
            marginTop: 20,
            padding: '14px 16px',
            border: `1px solid ${T.hairline}`,
            background: 'rgba(201, 169, 98, 0.08)',
            fontSize: 13,
            lineHeight: 1.55,
            color: T.ivoryMuted,
          }}
        >
          <strong style={{ color: T.ivory }}>What happens next:</strong> submit → advisor pipeline row → discreet
          follow-up. No automatic email or messaging in this preview.
        </div>

        {selectedOpportunity ? (
          <p
            style={{
              marginTop: 20,
              padding: '12px 16px',
              border: `1px solid ${T.hairline}`,
              fontSize: 14,
              color: T.ivoryMuted,
            }}
          >
            Relating to: <strong style={{ color: T.ivory }}>{selectedOpportunity.title}</strong>
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
              View advisor pipeline →
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
          <div>
            <label htmlFor="access_category" style={labelStyle}>
              Desired category
            </label>
            <select
              id="access_category"
              name="access_category"
              value={form.access_category}
              onChange={onChange}
              style={inputStyle}
            >
              <option value="">Select category…</option>
              {LUXE_MAURICE_AI_ACCESS_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: 16,
            }}
          >
            <div>
              <label htmlFor="budget_min" style={labelStyle}>
                Access budget from (USD)
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
                Access budget to (USD)
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
              Location / region
            </label>
            <input
              id="desired_location"
              name="desired_location"
              placeholder="e.g. West Coast, Grand Baie, SSR arrival"
              value={form.desired_location}
              onChange={onChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="property_type" style={labelStyle}>
              Preference detail (optional)
            </label>
            <input
              id="property_type"
              name="property_type"
              placeholder="e.g. 4-bed villa, 42m yacht, light jet"
              value={form.property_type}
              onChange={onChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="property_id" style={labelStyle}>
              Specific opportunity (optional)
            </label>
            <select
              id="property_id"
              name="property_id"
              value={form.property_id}
              onChange={onChange}
              style={inputStyle}
            >
              <option value="">General access request</option>
              {opportunityOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.category_label} — {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="access_intent" style={labelStyle}>
              Access intent / timing
            </label>
            <select
              id="access_intent"
              name="access_intent"
              value={form.access_intent}
              onChange={onChange}
              style={inputStyle}
            >
              <option value="">Select…</option>
              <option value="Ready within 3 months">Ready within 3 months</option>
              <option value="6-12 months">6–12 months</option>
              <option value="Seasonal window">Seasonal window</option>
              <option value="Exploring — advisory introduction">Exploring — advisory introduction</option>
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
            style={luxeMauriceAiCtaPrimary({
              marginTop: 8,
              width: '100%',
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
            })}
          >
            Submit access request
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
