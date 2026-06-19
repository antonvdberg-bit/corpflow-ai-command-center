import LivingWordWorkflowOperatorList from '../../components/LivingWordWorkflowOperatorList.js';
import { requireAdminPageSession } from '../../lib/server/admin-page-gate.js';
import { LWM_CHATBOT_LEAD_WORKFLOW_KEY, LWM_TENANT_ID } from '../../lib/server/tenant-workflow/constants.js';
import { loadTenantWorkflowStepsForOperator } from '../../lib/server/tenant-workflow/operator.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default function FactoryLivingWordWorkflowsPage(props) {
  return <LivingWordWorkflowOperatorList {...props} />;
}

/**
 * Factory-only operator inbox for Living Word chatbot workflow steps.
 * Requires admin session (same gate as /admin/lead-rescue).
 */
export async function getServerSideProps({ req, query }) {
  const gate = requireAdminPageSession(req, '/factory/living-word-workflows');
  if ('redirect' in gate) return gate;

  const statusRaw = query?.status;
  const initialStatus = Array.isArray(statusRaw)
    ? String(statusRaw[0] || 'open')
    : String(statusRaw || 'open');

  let initialSteps = null;
  /** @type {{ error?: string; message?: string } | null} */
  let initialError = null;

  try {
    const result = await loadTenantWorkflowStepsForOperator(prisma, {
      tenantId: LWM_TENANT_ID,
      status: initialStatus,
      workflowKey: LWM_CHATBOT_LEAD_WORKFLOW_KEY,
      limit: 100,
    });
    if (result.ok) {
      initialSteps = result.steps;
    } else {
      initialError = { error: result.error, message: result.message };
    }
  } catch (e) {
    initialError = {
      error: 'SSR_LOAD_FAILED',
      message: e instanceof Error ? e.message : String(e),
    };
  }

  return {
    props: {
      ...gate.props,
      initialSteps,
      initialError,
      initialStatus,
    },
  };
}
