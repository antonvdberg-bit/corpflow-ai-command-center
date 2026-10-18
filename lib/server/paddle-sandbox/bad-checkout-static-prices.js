/**
 * Static NEXT_PUBLIC Price ID reads for the BAD sandbox checkout page.
 * Next.js inlines these only when each env key is a literal property access.
 */
import { APPROVED_BAD_ZAR_SERVICES, isPaddleSandboxPriceId } from './bad-zar-catalog.js';

export function staticBadCheckoutPriceEnv() {
  return {
    NEXT_PUBLIC_PADDLE_BAD_ONBOARD_EXISTING_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_BAD_ONBOARD_EXISTING_PRICE_ID,
    NEXT_PUBLIC_PADDLE_BAD_REG_ONBOARD_BUNDLE_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_BAD_REG_ONBOARD_BUNDLE_PRICE_ID,
    NEXT_PUBLIC_PADDLE_BAD_ANNUAL_RETURN_BO_CURRENT_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_BAD_ANNUAL_RETURN_BO_CURRENT_PRICE_ID,
    NEXT_PUBLIC_PADDLE_BAD_BO_SIMPLE_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_BAD_BO_SIMPLE_PRICE_ID,
    NEXT_PUBLIC_PADDLE_BAD_DIRECTOR_APPT_RESIGN_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_BAD_DIRECTOR_APPT_RESIGN_PRICE_ID,
    NEXT_PUBLIC_PADDLE_BAD_ADDRESS_CHANGE_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_BAD_ADDRESS_CHANGE_PRICE_ID,
    NEXT_PUBLIC_PADDLE_BAD_SHARE_CERT_VERIFIED_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_BAD_SHARE_CERT_VERIFIED_PRICE_ID,
    NEXT_PUBLIC_PADDLE_BAD_NAME_RESERVATION_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_BAD_NAME_RESERVATION_PRICE_ID,
    NEXT_PUBLIC_PADDLE_BAD_FYE_CHANGE_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_BAD_FYE_CHANGE_PRICE_ID,
  };
}

export function configuredBadCheckoutPriceId(itemCode, env = staticBadCheckoutPriceEnv()) {
  const service = APPROVED_BAD_ZAR_SERVICES.find((row) => row.item_code === itemCode);
  if (!service) return '';
  const raw = String(env[service.env_key] || '').trim();
  return isPaddleSandboxPriceId(raw) ? raw : '';
}

export function configuredBadCheckoutServices(env = staticBadCheckoutPriceEnv()) {
  return APPROVED_BAD_ZAR_SERVICES.map((row) => ({
    ...row,
    paddle_price_id: configuredBadCheckoutPriceId(row.item_code, env),
  }));
}
