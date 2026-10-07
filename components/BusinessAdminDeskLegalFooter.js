import React from 'react';

import { CF } from './public/corpflow-public-styles.js';

const EMAIL = 'swart829@gmail.com';
const REVIEW_EMAIL = 'info@businessadmindesk.co.za';
const REVIEW_IDENTITIES = [
  ['info@businessadmindesk.co.za', 'general enquiries'],
  ['support@businessadmindesk.co.za', 'ERPNext support/ticketing only'],
  ['accounts@businessadmindesk.co.za', 'billing/account administration'],
  ['Serah.Fourie@businessadmindesk.co.za', 'named contact'],
];

export default function BusinessAdminDeskLegalFooter({ internalReview = false }) {
  const email = internalReview ? REVIEW_EMAIL : EMAIL;

  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
      {internalReview ? (
        <p style={{ margin: 0, color: CF.textMuted, fontSize: 11.5, lineHeight: 1.55 }}>
          Business Admin Desk is a service brand operated by CorpFlowAI Ltd.
        </p>
      ) : (
        <p style={{ margin: 0, color: CF.textMuted, fontSize: 11.5, lineHeight: 1.55 }}>
          Business Admin Desk is a trading name of CorpFlowAI LTD, registered in Mauritius · Company/BRN C25228280
        </p>
      )}
      <details style={{ marginTop: 6, color: CF.textMuted, fontSize: 11.5, lineHeight: 1.55 }}>
        <summary style={{ cursor: 'pointer', color: CF.link, fontWeight: 700 }}>
          Legal & supplier information
        </summary>
        <div style={{ marginTop: 8 }}>
          <div><strong style={{ color: CF.text }}>Legal entity:</strong> CorpFlowAI LTD</div>
          <div><strong style={{ color: CF.text }}>{internalReview ? 'Service brand' : 'Trading name'}:</strong> Business Admin Desk</div>
          <div><strong style={{ color: CF.text }}>Place of registration:</strong> Mauritius</div>
          <div><strong style={{ color: CF.text }}>Company/BRN:</strong> C25228280</div>
          <div><strong style={{ color: CF.text }}>Directors:</strong> Serah Fourie, Anton van den Berg, Paul Perdreau</div>
          <div>
            <strong style={{ color: CF.text }}>Registered office:</strong>{' '}
            Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Pamplemousses District, Mauritius, 22301
          </div>
          <div><strong style={{ color: CF.text }}>Telephone:</strong> +230 5901 4284</div>
          <div><strong style={{ color: CF.text }}>Email:</strong> {email}</div>
          <div><strong style={{ color: CF.text }}>Website:</strong> businessadmindesk.co.za</div>
          {internalReview ? (
            <div style={{ marginTop: 10, padding: 10, border: '1px solid rgba(45,212,191,0.28)', borderRadius: 8 }}>
              <strong style={{ color: CF.text }}>Email routing pending verification</strong>
              {REVIEW_IDENTITIES.map(([address, purpose]) => (
                <div key={address}>{address} — {purpose}</div>
              ))}
            </div>
          ) : null}
          <div style={{ marginTop: 6 }}>
            Independent company-administration support. Not a government or regulatory service, and not a law firm.
          </div>

        </div>
      </details>
    </div>
  );
}
