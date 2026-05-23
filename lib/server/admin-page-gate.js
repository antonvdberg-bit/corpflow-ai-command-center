/**
 * SSR gate for factory-admin Next.js pages (operator / internal only).
 */

import { getSessionFromRequest } from './session.js';

/**
 * @param {import('http').IncomingMessage} req
 * @param {string} nextPath
 */
export function requireAdminPageSession(req, nextPath) {
  const sess = getSessionFromRequest(req);
  if (sess?.ok === true && sess.payload?.typ === 'admin') {
    return { props: { signedIn: true, username: sess.payload.username || null } };
  }
  const dest = `/login?next=${encodeURIComponent(nextPath)}`;
  return { redirect: { destination: dest, permanent: false } };
}
