import { useMemo, useState } from 'react';
import pricingConfig from '../config/cipc-pricing-model.v1.json';
import {
  changeSelectContainStyle,
  changeTextContainStyle,
} from '../lib/cmp/_lib/change-console-layout.js';
import {
  CIPC_PRICING_INTERNAL_BANNER,
  CIPC_PRICING_ROUTES,
  evaluateCipcPricingModel,
  listCipcPricingServiceIds,
} from '../lib/cipc-desk/pricing-model.js';

const inputStyle = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(148,163,184,0.28)',
  background: 'rgba(15,23,42,0.45)',
  color: '#e2e8f0',
  fontSize: 12,
};

/**
 * Internal CIPC pricing decision panel on `/change` (#989).
 * Modelling only. No public price, quotation, send, or payment.
 *
 * @param {{ visible?: boolean }} props
 */
export default function CipcPricingOperatorPanel({ visible = true }) {
  const services = listCipcPricingServiceIds(pricingConfig);
  const [serviceId, setServiceId] = useState(services[0] || 'annual_returns');
  const [route, setRoute] = useState(CIPC_PRICING_ROUTES[0]);
  const [discountPct, setDiscountPct] = useState(20);
  const [complexity, setComplexity] = useState('standard');
  const [rush, setRush] = useState(false);
  const [statutoryFee, setStatutoryFee] = useState('');
  const [operatorMinutes, setOperatorMinutes] = useState('');
  const [specialistMinutes, setSpecialistMinutes] = useState('');

  const result = useMemo(() => {
    /** @type {Record<string, unknown>} */
    const assumption_overrides = {};
    if (String(operatorMinutes).trim() !== '') assumption_overrides.operator_minutes = Number(operatorMinutes);
    if (String(specialistMinutes).trim() !== '') assumption_overrides.specialist_minutes = Number(specialistMinutes);
    return evaluateCipcPricingModel(
      {
        service_id: serviceId,
        route,
        partner_discount_pct: Number(discountPct),
        complexity,
        rush,
        statutory_fee_passthrough_zar: statutoryFee === '' ? null : Number(statutoryFee),
        assumption_overrides,
      },
      pricingConfig,
    );
  }, [
    serviceId,
    route,
    discountPct,
    complexity,
    rush,
    statutoryFee,
    operatorMinutes,
    specialistMinutes,
  ]);

  if (!visible) return null;

  const range = result?.recommended_internal_test_range_zar && typeof result.recommended_internal_test_range_zar === 'object'
    ? result.recommended_internal_test_range_zar
    : {};
  const partner = result?.partner && typeof result.partner === 'object' ? result.partner : null;
  const statutory =
    result?.statutory_fee_passthrough && typeof result.statutory_fee_passthrough === 'object'
      ? result.statutory_fee_passthrough
      : {};
  const cost = result?.cost && typeof result.cost === 'object' ? result.cost : {};

  return (
    <div
      data-testid="cipc-pricing-operator-panel"
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
        border: '1px solid rgba(251,191,36,0.4)',
        background: 'rgba(251,191,36,0.08)',
        minWidth: 0,
        ...changeTextContainStyle(),
      }}
    >
      <div
        data-testid="cipc-pricing-internal-banner"
        style={{
          fontSize: 12,
          fontWeight: 950,
          color: '#fef3c7',
          letterSpacing: '0.02em',
          ...changeTextContainStyle(),
        }}
      >
        {CIPC_PRICING_INTERNAL_BANNER}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 850, color: '#e2e8f0' }}>
        CIPC pricing decision model — internal test bands only
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
        Direct-SME and partner PAYG modelling with statutory CIPC fees shown separately.
        This panel does not publish prices, create a client quotation, send a message, or take payment.
      </div>

      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
          minWidth: 0,
        }}
      >
        <label style={{ fontSize: 11, color: '#94a3b8', minWidth: 0 }}>
          Service
          <select
            data-testid="cipc-pricing-service"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            style={{ ...inputStyle, ...changeSelectContainStyle(), marginTop: 4 }}
          >
            {services.map((id) => (
              <option key={id} value={id}>
                {String(pricingConfig.services?.[id]?.title || id)}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 11, color: '#94a3b8', minWidth: 0 }}>
          Route
          <select
            data-testid="cipc-pricing-route"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            style={{ ...inputStyle, ...changeSelectContainStyle(), marginTop: 4 }}
          >
            <option value="direct_sme">Direct SME</option>
            <option value="partner_payg">Partner PAYG</option>
            <option value="partner_capacity">Partner Capacity (modelling only)</option>
          </select>
        </label>
        <label style={{ fontSize: 11, color: '#94a3b8', minWidth: 0 }}>
          Partner discount % (20–35)
          <input
            data-testid="cipc-pricing-discount"
            type="number"
            min={20}
            max={35}
            step={1}
            value={discountPct}
            onChange={(e) => setDiscountPct(e.target.value)}
            disabled={route !== 'partner_payg'}
            style={{ ...inputStyle, marginTop: 4 }}
          />
        </label>
        <label style={{ fontSize: 11, color: '#94a3b8', minWidth: 0 }}>
          Complexity
          <select
            data-testid="cipc-pricing-complexity"
            value={complexity}
            onChange={(e) => setComplexity(e.target.value)}
            style={{ ...inputStyle, ...changeSelectContainStyle(), marginTop: 4 }}
          >
            <option value="standard">Standard / clean case</option>
            <option value="complex">Complex / historical / specialist</option>
          </select>
        </label>
        <label style={{ fontSize: 11, color: '#94a3b8', minWidth: 0 }}>
          Statutory CIPC fee (informational, not revenue)
          <input
            data-testid="cipc-pricing-statutory-fee"
            type="number"
            min={0}
            step="0.01"
            placeholder="Optional pass-through ZAR"
            value={statutoryFee}
            onChange={(e) => setStatutoryFee(e.target.value)}
            style={{ ...inputStyle, marginTop: 4 }}
          />
        </label>
        <label style={{ fontSize: 11, color: '#94a3b8', minWidth: 0 }}>
          Operator minutes override (optional)
          <input
            data-testid="cipc-pricing-operator-minutes"
            type="number"
            min={0}
            step="1"
            placeholder="Leave blank to use TBC default"
            value={operatorMinutes}
            onChange={(e) => setOperatorMinutes(e.target.value)}
            style={{ ...inputStyle, marginTop: 4 }}
          />
        </label>
        <label style={{ fontSize: 11, color: '#94a3b8', minWidth: 0 }}>
          Specialist minutes override (optional)
          <input
            data-testid="cipc-pricing-specialist-minutes"
            type="number"
            min={0}
            step="1"
            placeholder="Leave blank to use TBC default"
            value={specialistMinutes}
            onChange={(e) => setSpecialistMinutes(e.target.value)}
            style={{ ...inputStyle, marginTop: 4 }}
          />
        </label>
        <label style={{ fontSize: 11, color: '#fde68a', minWidth: 0, display: 'flex', alignItems: 'end', gap: 8 }}>
          <input
            data-testid="cipc-pricing-rush"
            type="checkbox"
            checked={rush}
            onChange={(e) => setRush(e.target.checked)}
          />
          Rush / exception flag (never a CIPC turnaround guarantee)
        </label>
      </div>

      <div
        data-testid="cipc-pricing-result"
        style={{
          marginTop: 12,
          padding: 10,
          borderRadius: 12,
          border: '1px solid rgba(148,163,184,0.22)',
          background: 'rgba(2,6,23,0.28)',
          fontSize: 12,
          color: '#e2e8f0',
          lineHeight: 1.5,
          minWidth: 0,
          ...changeTextContainStyle(),
        }}
      >
        <div>
          <strong>Outcome:</strong> {String(result?.outcome || '—')}
        </div>
        <div style={{ marginTop: 6 }}>
          Internal cost estimate:{' '}
          {cost.ok === true ? `R${cost.internal_cost_zar}` : 'not modelled (missing assumption or scoped quote)'}
        </div>
        <div>
          Contribution:{' '}
          {result?.contribution_zar == null
            ? 'n/a'
            : `R${result.contribution_zar} (${Math.round(Number(result.contribution_margin_pct || 0) * 1000) / 10}%)`}
        </div>
        <div>
          Recommended internal test range:{' '}
          {range.floor != null ? `R${range.floor}–R${range.ceiling} (target R${range.target})` : 'scoped quote — no fixed band'}
        </div>
        {route === 'partner_payg' && partner ? (
          <div data-testid="cipc-pricing-partner-range">
            Partner PAYG candidate:{' '}
            {partner.partner_service_fee_zar != null ? `R${partner.partner_service_fee_zar}` : 'n/a'}
            {partner.candidate_range_zar
              ? ` · viable range R${partner.candidate_range_zar.min}–R${partner.candidate_range_zar.max}`
              : ''}
            {partner.viable === false ? ' · discount rejected/raised to margin floor' : ''}
          </div>
        ) : null}
        {route === 'partner_capacity' ? (
          <div>Partner Capacity remains operator-set. No automated monthly retainer is invented.</div>
        ) : null}
        <div data-testid="cipc-pricing-statutory-note">
          Statutory CIPC fee: {statutory.amount_zar == null ? 'not supplied' : `R${statutory.amount_zar}`} — pass-through,
          explicitly not revenue. CorpFlowAI modelled revenue: R{String(result?.corpflowai_revenue_zar ?? 0)}
        </div>
        <div>Fixed-price eligible: {result?.fixed_price_eligible === true ? 'YES' : 'NO'}</div>
        <div>Specialist review required: {result?.specialist_review_required === true ? 'YES' : 'NO'}</div>
        {Array.isArray(result?.warnings) && result.warnings.length ? (
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#fde68a' }}>
            {result.warnings.map((w) => (
              <li key={String(w)}>{String(w)}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
