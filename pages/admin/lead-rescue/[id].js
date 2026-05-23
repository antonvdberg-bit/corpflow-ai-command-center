import AiLeadRescueAdminDetail from '../../../components/AiLeadRescueAdminDetail.js';
import { requireAdminPageSession } from '../../../lib/server/admin-page-gate.js';

export default function AdminLeadRescueDetailPage() {
  return <AiLeadRescueAdminDetail />;
}

export async function getServerSideProps({ req, params }) {
  const id = typeof params?.id === 'string' ? params.id : '';
  const nextPath = id ? `/admin/lead-rescue/${id}` : '/admin/lead-rescue';
  return requireAdminPageSession(req, nextPath);
}
