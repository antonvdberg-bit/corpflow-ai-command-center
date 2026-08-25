import { canonicalRedirectForLegacyAdminPath } from '../../../lib/app/legacy-route-retirement.js';
import { requireAdminPageSession } from '../../../lib/server/admin-page-gate.js';

/**
 * #1074 — /admin/rapid-delivery redirects into the canonical Action Queue.
 * Admin / factory-master session required (same gate as before).
 */
export default function AdminRapidDeliveryRedirectPage() {
  return null;
}

export async function getServerSideProps({ req }) {
  const destination = canonicalRedirectForLegacyAdminPath('/admin/rapid-delivery');
  const gate = requireAdminPageSession(req, destination);
  if ('redirect' in gate) return gate;
  return { redirect: { destination, permanent: false } };
}
