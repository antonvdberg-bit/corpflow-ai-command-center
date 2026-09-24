import React from 'react';

import { CF } from './public/corpflow-public-styles.js';

const EMAIL = 'swart829@gmail.com';

export default function BusinessAdminDeskLegalFooter({ internalReview = false }) {
  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
      <p style={{ margin: 0, color: CF.textMuted, fontSize: 11.5, lineHeight: 1.55 }}>
        Business Admin Desk is a trading name of CorpFlowAI LTD, registered in Mauritius · Company/BRN C25228280
      </p>
      <details style={{ marginTop: 6, color: CF.textMuted, fontSize: 11.5, lineHeight: 1.55 }}>
        <summary style={{ cursor: 'pointer', color: CF.link, fontWeight: 700 }}>
          Legal & supplier information
        </summary>
        <div style={{ marginTop: 8 }}>
          <div><strong style={{ color: CF.text }}>Legal entity:</strong> CorpFlowAI LTD</div>
          <div><strong style={{ color: CF.text }}>Trading name:</strong> Business Admin Desk</div>
          <div><strong style={{ color: CF.text }}>Place of registration:</strong> Mauritius</div>
          <div><strong style={{ color: CF.text }}>Company/BRN:</strong> C25228280</div>
          <div><strong style={{ color: CF.text }}>Directors:</strong> Serah Fourie, Anton van den Berg, Paul Perdreau</div>
          <div>
            <strong style={{ color: CF.text }}>Registered office:</strong>{' '}
            Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Pamplemousses District, Mauritius, 22301
          </div>
          <div><strong style={{ color: CF.text }}>Telephone:</strong> +230 5901 4284</div>
          <div><strong style={{ color: CF.text }}>Email:</strong> {EMAIL}</div>
          <div><strong style={{ color: CF.text }}>Website:</strong> businessadmindesk.co.za</div>
          <div style={{ marginTop: 6 }}>
            Independent company-administration support. Not a government or regulatory service, and not a law firm.
          </div>

        </div>
      </details>
    </div>
  );
}
