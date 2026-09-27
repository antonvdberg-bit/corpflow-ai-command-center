import React from 'react';
import Image from 'next/image';

export const BUSINESS_ADMIN_DESK_MARK_PATH = '/assets/brand/business-admin-desk-mark.svg';

export default function BusinessAdminDeskBrand({
  subtitle = '',
  compact = false,
  href = '/',
  priority = false,
}) {
  const markSize = compact ? 34 : 46;
  const nameSize = compact ? 16 : 20;

  const content = (
    <>
      <Image
        src={BUSINESS_ADMIN_DESK_MARK_PATH}
        alt=""
        aria-hidden="true"
        width={markSize}
        height={markSize}
        priority={priority}
        style={{ flex: '0 0 auto', width: markSize, height: markSize }}
      />
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            color: '#eef6ff',
            fontSize: nameSize,
            fontWeight: 900,
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            whiteSpace: 'nowrap',
          }}
        >
          Business Admin Desk
        </span>
        {subtitle ? (
          <span
            style={{
              display: 'block',
              color: '#9fb2c8',
              fontSize: compact ? 11 : 12,
              lineHeight: 1.3,
              marginTop: 3,
            }}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </>
  );

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: compact ? 8 : 10,
    textDecoration: 'none',
    maxWidth: '100%',
  };

  return href ? (
    <a href={href} aria-label="Business Admin Desk home" style={style}>
      {content}
    </a>
  ) : (
    <span aria-label="Business Admin Desk" style={style}>
      {content}
    </span>
  );
}
