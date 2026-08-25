import { useState } from 'react';

/**
 * #1074 — Rapid Delivery proposal-ready summary on shared Prospect detail.
 * Reuses buildRapidDeliveryProposalSummary. Copy only. No live send.
 *
 * @param {{
 *   prospect: Record<string, unknown>,
 * }} props
 */
export default function RapidDeliveryProposalPanel({ prospect }) {
  const proposal =
    prospect?.rapid_delivery_proposal && typeof prospect.rapid_delivery_proposal === 'object'
      ? /** @type {Record<string, unknown>} */ (prospect.rapid_delivery_proposal)
      : null;
  const [flash, setFlash] = useState('');
  if (!proposal || proposal.applicable !== true) return null;

  async function copy(label, text) {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      setFlash(label);
      setTimeout(() => setFlash(''), 1600);
    } catch {
      setFlash('Copy failed');
      setTimeout(() => setFlash(''), 1600);
    }
  }

  const sections =
    proposal.sections && typeof proposal.sections === 'object'
      ? /** @type {Record<string, unknown>} */ (proposal.sections)
      : {};
  const proof =
    sections.delivery_proof && typeof sections.delivery_proof === 'object'
      ? /** @type {Record<string, unknown>} */ (sections.delivery_proof)
      : {};

  return (
    <section className="cf-app-panel" data-testid="rapid-delivery-proposal" style={{ marginTop: 18 }}>
      <h2 className="cf-app-comp-title">Proposal-ready summary</h2>
      <p className="cf-app-muted">
        Generated from the existing rapid-delivery lead. Copy for a manual send after Anton
        approval. This does not email, WhatsApp, SMS, or take payment.
      </p>
      {proposal.error ? (
        <p className="cf-app-error" data-testid="rapid-delivery-proposal-error">
          {String(proposal.error)}
        </p>
      ) : (
        <>
          <dl className="cf-app-kv" data-testid="rapid-delivery-proposal-summary">
            <dt>Reference</dt>
            <dd>{String(proposal.reference || '—')}</dd>
            <dt>Recommended sprint</dt>
            <dd>{String(sections.recommended_sprint || proposal.offer_slug || '—')}</dd>
            <dt>Starting price</dt>
            <dd>{String(sections.starting_price || '—')}</dd>
            <dt>Delivery proof</dt>
            <dd>{String(proof.statement || '—')}</dd>
          </dl>
          <div className="cf-app-actions">
            <button
              type="button"
              className="cf-app-btn"
              data-primary="true"
              data-testid="rapid-delivery-proposal-copy-markdown"
              onClick={() => copy('Proposal copied', proposal.markdown)}
            >
              Copy proposal summary
            </button>
            <button
              type="button"
              className="cf-app-btn"
              data-testid="rapid-delivery-proposal-copy-plain"
              onClick={() => copy('Plain text copied', proposal.plain_text)}
            >
              Copy plain text
            </button>
          </div>
          {flash ? (
            <p className="cf-app-ok" role="status" data-testid="rapid-delivery-proposal-flash">
              {flash}
            </p>
          ) : null}
          <pre
            className="cf-app-muted"
            data-testid="rapid-delivery-proposal-preview"
            style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}
          >
            {String(proposal.markdown || '').slice(0, 1200)}
          </pre>
        </>
      )}
    </section>
  );
}
