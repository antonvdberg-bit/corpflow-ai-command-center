import { canonicalRedirectForLegacyAdminPath } from '../../../lib/app/legacy-route-retirement.js';
import { requireAdminPageSession } from '../../../lib/server/admin-page-gate.js';

/**
 * #1074 — /admin/lead-rescue redirects into the canonical Workbench (Lead Rescue filter).
 * Admin / factory-master session required (same gate as before).
 */
export default function AdminLeadRescueIndexRedirectPage() {
  return null;
}

export async function getServerSideProps({ req }) {
  const destination = canonicalRedirectForLegacyAdminPath('/admin/lead-rescue');
  const gate = requireAdminPageSession(req, destination);
  if ('redirect' in gate) return gate;
  return { redirect: { destination, permanent: false } };
}
