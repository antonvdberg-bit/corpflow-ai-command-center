import React from 'react';

import { CF } from './public/corpflow-public-styles.js';

const items = [
  ['Home', '/'],
  ['Annual Returns', '/annual-returns'],
  ['Director Changes', '/director-changes'],
  ['Beneficial Ownership', '/beneficial-ownership'],
  ['Partner Support', '/partners'],
];

export default function BusinessAdminDeskSectionNav({ currentPath = '/' }) {
  return (
    <nav
      aria-label="Business Admin Desk sections"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        margin: '0 0 20px',
      }}
    >
      {items.map(([label, href]) => {
        const active = currentPath === href;
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 36,
              padding: '8px 11px',
              borderRadius: 999,
              border: active ? '1px solid rgba(45,212,191,0.55)' : '1px solid rgba(255,255,255,0.14)',
              background: active ? 'rgba(45,212,191,0.14)' : 'rgba(255,255,255,0.06)',
              color: active ? '#b8fff2' : CF.text,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
