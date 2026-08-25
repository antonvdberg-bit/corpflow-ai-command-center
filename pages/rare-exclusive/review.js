import JanApprovalReviewPage from '../../components/JanApprovalReviewPage.js';
import { getSessionFromRequest } from '../../lib/server/session.js';
import { verifyFactoryMasterAuth } from '../../lib/server/factory-master-auth.js';
import {
  resolveJanApprovalAccess,
} from '../../lib/server/jan-approval-control.js';

const LOGIN_NEXT = '/rare-exclusive/review';

export default function RareExclusiveJanReviewRoute(props) {
  return <JanApprovalReviewPage {...props} />;
}

/**
 * Authenticated decision page for Jan. Evidence is always loaded through the
 * routed API so live mode cannot render a synthetic SSR fallback.
 */
export async function getServerSideProps({ req }) {
  const sess = getSessionFromRequest(req);
  const payload = sess?.ok === true ? sess.payload : null;
  const access = resolveJanApprovalAccess(payload, {
    factoryMasterAuth: verifyFactoryMasterAuth(req),
  });

  if (!access.canView) {
    return {
      redirect: {
        destination: `/login?next=${encodeURIComponent(LOGIN_NEXT)}`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      signedInLabel: access.actor?.displayName || access.actor?.username || '',
      canDecide: access.canDecide === true,
      viewOnly: access.canDecide !== true,
      loadError: '',
      initialPayload: null,
    },
  };
}
