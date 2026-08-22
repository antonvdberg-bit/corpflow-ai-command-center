import Link from 'next/link';
import { prospectLegacyDeprecationNotice } from '../../lib/app/prospect-operations-route-matrix.js';

const wrap = {
  margin: '0 0 16px',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid rgba(250, 204, 21, 0.35)',
  background: 'rgba(250, 204, 21, 0.08)',
  color: '#f8fafc',
  fontSize: 13,
  lineHeight: 1.5,
};

/**
 * Clear deprecation routing for TEMPORARY legacy prospect desks.
 * Does not hard-redirect; unique capabilities stay on the current page.
 *
 * @param {{ routePath: string, canonicalHrefOverride?: string }} props
 */
export default function ProspectLegacyDeprecationBanner({ routePath, canonicalHrefOverride }) {
  const notice = prospectLegacyDeprecationNotice(routePath);
  if (!notice) return null;
  const href = canonicalHrefOverride || notice.canonical_href;
  return (
    <aside style={wrap} data-testid="prospect-legacy-deprecation" data-disposition={notice.disposition}>
      <strong>{notice.title}</strong>
      <p style={{ margin: '6px 0 0' }}>{notice.body}</p>
      {notice.unique_capability ? (
        <p style={{ margin: '6px 0 0' }}>
          Kept here: {notice.unique_capability}
        </p>
      ) : null}
      {href ? (
        <p style={{ margin: '8px 0 0' }}>
          Canonical surface:{' '}
          <Link href={href} style={{ color: '#7dd3fc', fontWeight: 700 }}>
            {href}
          </Link>
        </p>
      ) : null}
    </aside>
  );
}
