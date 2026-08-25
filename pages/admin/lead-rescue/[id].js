import { canonicalRedirectForLegacyAdminPath } from '../../../lib/app/legacy-route-retirement.js';
import { requireAdminPageSession } from '../../../lib/server/admin-page-gate.js';

/**
 * #1074 — /admin/lead-rescue/[id] redirects into shared Prospect detail.
 * Admin / factory-master session required (same gate as before).
 */
export default function AdminLeadRescueDetailRedirectPage() {
  return null;
}

export async function getServerSideProps({ req, params }) {
  const id = typeof params?.id === 'string' ? params.id : '';
  const destination = canonicalRedirectForLegacyAdminPath(
    id ? `/admin/lead-rescue/${id}` : '/admin/lead-rescue',
    { id },
  );
  const gate = requireAdminPageSession(req, destination);
  if ('redirect' in gate) return gate;
  return { redirect: { destination, permanent: false } };
}
