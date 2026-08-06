import CompanyMasterApp from '../../../components/CompanyMasterApp.js';
import { requireAdminPageSession } from '../../../lib/server/admin-page-gate.js';
import { listCompanies } from '../../../lib/server/company-master-service.js';

export default function CompanyMasterPage({ initialCompanies, initialError, signedIn, username }) {
  return (
    <CompanyMasterApp
      initialCompanies={initialCompanies}
      initialError={initialError}
      signedIn={signedIn}
      username={username}
    />
  );
}

export async function getServerSideProps({ req }) {
  const gate = requireAdminPageSession(req, '/admin/company-master');
  if ('redirect' in gate) return gate;

  let initialCompanies = null;
  let initialError = null;
  try {
    const result = await listCompanies({}, { limit: 100 });
    if (result?.ok) {
      initialCompanies = result.companies;
    } else {
      initialError = { error: result?.code || 'LOAD_FAILED', message: 'Could not load companies' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    initialError = {
      error: msg.includes('company_master') || msg.includes('does not exist')
        ? 'COMPANY_MASTER_SCHEMA_MISSING'
        : 'SSR_LOAD_FAILED',
      message: msg.includes('does not exist')
        ? 'Company Master tables missing — run factory ensure-schema on this environment.'
        : msg.slice(0, 300),
    };
    initialCompanies = [];
  }

  return {
    props: {
      ...gate.props,
      initialCompanies,
      initialError,
    },
  };
}
