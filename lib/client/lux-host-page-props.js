/**
 * Shared host helpers for Lux vs apex page dispatch.
 * Pure — safe for getServerSideProps and node tests.
 */

import { isLuxHost } from './concierge-seo.js';

export { isLuxHost };

export function readRequestHost(req) {
  try {
    const raw = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').toString();
    return raw.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  } catch {
    return '';
  }
}

/**
 * Lux-only editorial routes (lifestyle / destination / private-services).
 * Non-Lux hosts get notFound so apex CorpFlow surfaces stay clean.
 */
export function luxOnlyPageProps(req) {
  const seoHost = readRequestHost(req);
  if (!isLuxHost(seoHost)) {
    return { notFound: true };
  }
  return { props: { seoHost } };
}

/** Host-aware about/contact: Lux Ivory pages on Lux hosts; apex CorpFlow otherwise. */
export function luxOrApexPageProps(req) {
  const seoHost = readRequestHost(req);
  return {
    props: {
      seoHost,
      luxMode: isLuxHost(seoHost),
    },
  };
}
