import React from 'react';

import {
  BAD_STATUTORY_FEE_NOTE,
  BUSINESS_ADMIN_DESK_PACKAGES,
  formatZarServiceFee,
} from '../lib/public/business-admin-desk-packages.js';

const cell = {
  textAlign: 'left',
  verticalAlign: 'top',
  padding: '12px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.12)',
  color: '#dbe7f5',
  fontSize: 14.5,
  lineHeight: 1.5,
};

export default function BusinessAdminDeskPackageTable() {
  return (
    <div style={{ overflowX: 'auto', minWidth: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
        <caption style={{ captionSide: 'bottom', textAlign: 'left', color: '#9fb2c8', paddingTop: 12 }}>
          {BAD_STATUTORY_FEE_NOTE} Every amount is a one-time service fee.
        </caption>
        <thead>
          <tr>
            {['Package', 'Code', 'Service fee', 'What this package covers'].map((label) => (
              <th key={label} scope="col" style={{ ...cell, color: '#eef6ff', fontSize: 13 }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BUSINESS_ADMIN_DESK_PACKAGES.map((pkg) => (
            <tr key={pkg.code} id={pkg.code}>
              <th scope="row" style={{ ...cell, color: '#eef6ff', fontWeight: 700 }}>
                {pkg.name}
              </th>
              <td style={{ ...cell, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }}>
                {pkg.code}
              </td>
              <td style={{ ...cell, whiteSpace: 'nowrap', fontWeight: 800 }}>{formatZarServiceFee(pkg.amountZar)}</td>
              <td style={cell}>{pkg.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
