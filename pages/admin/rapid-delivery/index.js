import RapidDeliveryRevenueDesk from '../../../components/RapidDeliveryRevenueDesk.js';
import { requireAdminPageSession } from '../../../lib/server/admin-page-gate.js';
import { loadRapidDeliveryListData } from '../../../lib/server/admin-rapid-delivery-api.js';

/**
 * CorpFlowAI revenue operator desk — rapid-delivery discovery prospects.
 * Auth gate unchanged: admin / factory-master session required.
 */
export default function AdminRapidDeliveryPage({ initialLeads, initialError }) {
  return <RapidDeliveryRevenueDesk initialLeads={initialLeads} initialError={initialError} />;
}

export async function getServerSideProps({ req }) {
  const gate = requireAdminPageSession(req, '/admin/rapid-delivery');
  if ('redirect' in gate) return gate;

  let initialLeads = null;
  let initialError = null;
  try {
    const result = await loadRapidDeliveryListData({ filters: {} });
    if (result?.ok) initialLeads = result.leads || [];
    else {
      initialError = {
        message: 'Could not load discovery prospects. Retry in a moment.',
        error: result?.error || 'LOAD_FAILED',
        http_status: result?.http_status || 500,
      };
    }
  } catch {
    initialError = {
      message: 'Could not load discovery prospects. Retry in a moment.',
      error: 'LOAD_FAILED',
      http_status: 500,
    };
  }
  return { props: { initialLeads, initialError } };
}
