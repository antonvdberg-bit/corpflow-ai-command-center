import AiLeadRescueAdminList from '../../../components/AiLeadRescueAdminList.js';
import { requireAdminPageSession } from '../../../lib/server/admin-page-gate.js';

export default function AdminLeadRescueIndexPage() {
  return <AiLeadRescueAdminList />;
}

export async function getServerSideProps({ req }) {
  return requireAdminPageSession(req, '/admin/lead-rescue');
}
