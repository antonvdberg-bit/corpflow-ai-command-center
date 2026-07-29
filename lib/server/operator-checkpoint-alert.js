import { cfg } from './runtime-config.js';
import { forwardOpsAlert } from './ops-alerts.js';

/** @typedef {'production_validation_failure' | 'client_approval_needed' | 'production_approval_needed' | 'external_email_client_send_approval_needed'} OperatorCheckpointKind */

export const OPERATOR_CHECKPOINT_KINDS = Object.freeze({
  PRODUCTION_VALIDATION_FAILURE: 'production_validation_failure',
  CLIENT_APPROVAL_NEEDED: 'client_approval_needed',
  PRODUCTION_APPROVAL_NEEDED: 'production_approval_needed',
  EXTERNAL_EMAIL_CLIENT_SEND_APPROVAL_NEEDED: 'external_email_client_send_approval_needed',
});

/** @type {ReadonlySet<string>} */
export const ALLOWED_OPERATOR_CHECKPOINT_KINDS = new Set(Object.values(OPERATOR_CHECKPOINT_KINDS));

const DEFAULT_RISK_BY_KIND = Object.freeze({
  [OPERATOR_CHECKPOINT_KINDS.PRODUCTION_VALIDATION_FAILURE]:
    'Live corpflow_test URL may not match intended delivery; do not tell the client it is done. This is not client_production.',
  [OPERATOR_CHECKPOINT_KINDS.CLIENT_APPROVAL_NEEDED]:
    'Work cannot proceed until the client records a preview decision on /change.',
  [OPERATOR_CHECKPOINT_KINDS.PRODUCTION_APPROVAL_NEEDED]:
    'Operator merge/promote onto the CorpFlowAI test spine (corpflow_test) is required. This is not client_production approval.',
  [OPERATOR_CHECKPOINT_KINDS.EXTERNAL_EMAIL_CLIENT_SEND_APPROVAL_NEEDED]:
    'A client-facing message is withheld until operator review; no auto-send.',
});

function str(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * True when the existing n8n automation-forward consumer is configured.
 *
 * @returns {boolean}
 */
export function isOperatorCheckpointAlertPathConfigured() {
  return Boolean(str(cfg('CORPFLOW_AUTOMATION_FORWARD_URL', '')));
}

/**
 * @param {{
 *   kind: OperatorCheckpointKind | string,
 *   whatNeedsApproval: string,
 *   link?: string | null,
 *   risk?: string | null,
 * }} input
 * @returns {string}
 */
export function formatOperatorCheckpointMessage(input) {
  const kind = str(input?.kind);
  const what = str(input?.whatNeedsApproval) || 'Operator checkpoint';
  const link = str(input?.link) || '(no link recorded)';
  const risk = str(input?.risk) || DEFAULT_RISK_BY_KIND[kind] || 'Operator decision required before proceeding.';
  return [
    'CorpFlowAI checkpoint:',
    `- What needs approval: ${what}`,
    `- Link: ${link}`,
    `- Risk: ${risk}`,
    '- Required answer: APPROVE / HOLD / FIX',
  ].join('\n');
}

/**
 * Best-effort operator checkpoint alert via the existing n8n forward path only.
 * No direct Telegram call; n8n routes `corpflow.ops_alert.v1` to Telegram when configured.
 *
 * @param {{
 *   kind: OperatorCheckpointKind | string,
 *   whatNeedsApproval: string,
 *   link?: string | null,
 *   risk?: string | null,
 *   tenant_id?: string | null,
 *   ticket_id?: string | null,
 *   meta?: Record<string, unknown>,
 * }} input
 * @returns {Promise<boolean>}
 */
export async function notifyOperatorCheckpoint(input) {
  const kind = str(input?.kind);
  if (!ALLOWED_OPERATOR_CHECKPOINT_KINDS.has(kind)) return false;
  if (!isOperatorCheckpointAlertPathConfigured()) return false;

  const whatNeedsApproval = str(input?.whatNeedsApproval);
  if (!whatNeedsApproval) return false;

  const notification_text = formatOperatorCheckpointMessage({
    kind,
    whatNeedsApproval,
    link: input?.link,
    risk: input?.risk,
  });

  await forwardOpsAlert({
    kind,
    title: `CorpFlowAI checkpoint: ${kind.replace(/_/g, ' ')}`,
    message: notification_text,
    tenant_id: input?.tenant_id != null ? str(input.tenant_id) : null,
    ticket_id: input?.ticket_id != null ? str(input.ticket_id) : null,
    meta: {
      checkpoint_kind: kind,
      notification_text,
      what_needs_approval: whatNeedsApproval,
      link: str(input?.link) || null,
      risk: str(input?.risk) || DEFAULT_RISK_BY_KIND[kind] || null,
      required_answer: 'APPROVE / HOLD / FIX',
      audience: 'operator_only',
      client_send: false,
      ...(input?.meta && typeof input.meta === 'object' ? input.meta : {}),
    },
  });

  return true;
}

/**
 * @param {string} ticketId
 * @param {string | null | undefined} [baseUrl]
 * @returns {string}
 */
export function changeConsoleCheckpointLink(ticketId, baseUrl) {
  const id = str(ticketId);
  const base = str(baseUrl).replace(/\/+$/, '');
  const path = `/change?ticket=${encodeURIComponent(id)}`;
  return base ? `${base}${path}` : path;
}
