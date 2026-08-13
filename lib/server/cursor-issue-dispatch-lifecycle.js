/**
 * Segregated GitHub → Cursor issue dispatch lifecycle.
 *
 * Extends the existing factory dispatcher route — does not replace it.
 * Scans `dispatch:cursor-ready` issues, classifies them, enforces WIP /
 * segregation, posts acknowledgement comments, and claims eligible work.
 *
 * @see docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md
 * @see docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md
 * @see docs/operations/ANTON_DECISION_INBOX_V1.md
 */

import {
  DECISION_INBOX_LABEL_CREATE_DEFAULTS,
  DECISION_INBOX_LABELS,
  LABEL_NEEDS_ANTON,
} from './anton-decision-inbox.js';
import {
  compareOldestReady,
  cursorReadyPriorityRank,
  evaluateCursorWipCapacity,
} from './cursor-wip-control.js';
import { evaluateOperatorGateAuthorization } from './operator-gate-authorization.js';

export const CURSOR_ISSUE_DISPATCH_LIFECYCLE_SCHEMA =
  'corpflow.cursor_issue_dispatch_lifecycle.v1';

export const DISPATCH_LABEL_READY = 'dispatch:cursor-ready';
export const DISPATCH_LABEL_CLAIMED = 'dispatch:cursor-claimed';
export const DISPATCH_LABEL_IN_PROGRESS = 'status:in-progress';
export const DISPATCH_LABEL_NEEDS_ANTON = LABEL_NEEDS_ANTON;
export const DISPATCH_LABEL_BLOCKED = 'dispatch:blocked';
/** CI auto-repair in progress for a Cursor-claimed issue/PR. */
export const DISPATCH_LABEL_CI_REPAIR = 'dispatch:ci-repair';
/** CI green — waiting for Anton/operator review (no auto-merge). */
export const DISPATCH_LABEL_OPERATOR_REVIEW = 'dispatch:operator-review';
/** Ready/queued work paused — excluded from new activation (#862). */
export const DISPATCH_LABEL_PAUSED = 'execution:paused';

/** Active execution labels released on terminal/reconcile (display state only for WIP). */
const ACTIVE_EXECUTION_LABELS = Object.freeze([
  DISPATCH_LABEL_CLAIMED,
  DISPATCH_LABEL_IN_PROGRESS,
]);

/** Lifecycle labels that must exist before claim mutation (auto-created when missing). */
export const DISPATCH_LIFECYCLE_LABELS = Object.freeze([
  DISPATCH_LABEL_CLAIMED,
  DISPATCH_LABEL_IN_PROGRESS,
  DISPATCH_LABEL_BLOCKED,
  DISPATCH_LABEL_NEEDS_ANTON,
  DISPATCH_LABEL_CI_REPAIR,
  DISPATCH_LABEL_OPERATOR_REVIEW,
  DISPATCH_LABEL_PAUSED,
  ...DECISION_INBOX_LABELS.filter((l) => l !== LABEL_NEEDS_ANTON),
]);

/** Default colours when auto-creating missing lifecycle labels (GitHub hex without #). */
export const DISPATCH_LABEL_CREATE_DEFAULTS = Object.freeze({
  [DISPATCH_LABEL_CLAIMED]: { color: '5319e7', description: 'Cursor run ID claimed — work in progress' },
  [DISPATCH_LABEL_IN_PROGRESS]: { color: 'fbca04', description: 'Active agent implementation' },
  [DISPATCH_LABEL_BLOCKED]: { color: 'b60205', description: 'Dispatch blocked — needs unblock' },
  [DISPATCH_LABEL_NEEDS_ANTON]: { color: 'd93f0b', description: 'Protected gate — Anton decision required' },
  [DISPATCH_LABEL_CI_REPAIR]: { color: 'e99695', description: 'Automatic CI repair follow-up in progress' },
  [DISPATCH_LABEL_OPERATOR_REVIEW]: { color: '0e8a16', description: 'CI green — operator review required' },
  [DISPATCH_LABEL_READY]: { color: '1d76db', description: 'Ready for Cursor dispatch activation' },
  [DISPATCH_LABEL_PAUSED]: {
    color: 'c5def5',
    description: 'Execution paused — excluded from new Cursor activation',
  },
  ...DECISION_INBOX_LABEL_CREATE_DEFAULTS,
});

/** Default WIP limits — Cursor slots are verified active runs (#862), not label counts. */
export const DEFAULT_WIP_LIMITS = Object.freeze({
  maxActiveCursorImplementationIssues: 2,
  maxActivePerTenant: 1,
  maxActiveDatabaseSchemaIssues: 1,
  maxActiveProductionDeployCandidates: 1,
});

/** Stale claimed work threshold (hours) before status-request comment. */
export const DEFAULT_STALE_CLAIM_HOURS = 12;

export const SYSTEM_BOUNDARIES = Object.freeze([
  'core',
  'corpflowai_business_system',
  'tenant',
]);

/**
 * Dispatcher environment enum (compat). Business meanings:
 * - `test` → corpflow_test (CorpFlowAI-hosted tenant/factory surfaces)
 * - `production` → client_production only (separately governed client prod)
 * - `preview` → ephemeral Preview / optional sandbox
 * - `local` → docs/local-only
 * @see docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md
 */
export const ENVIRONMENTS = Object.freeze([
  'local',
  'test',
  'preview',
  'production',
]);

/** Business-facing labels for WORK CLASSIFICATION comments (enum keys unchanged). */
export const ENVIRONMENT_BUSINESS_MEANING = Object.freeze({
  local: 'local',
  test: 'corpflow_test',
  preview: 'preview',
  production: 'client_production',
});

export const WORK_TYPES = Object.freeze([
  'research',
  'documentation',
  'ui',
  'api',
  'database',
  'integration',
  'deployment',
  'validation',
]);

export const PROTECTED_GATES = Object.freeze([
  'none',
  'production', // business: client_production approval only
  'database',
  'secrets',
  'messaging',
  'payment',
  'outreach',
  'paid_tool',
  'public_launch',
]);

/**
 * @typedef {{
 *   systemBoundary: 'core' | 'corpflowai_business_system' | 'tenant',
 *   tenantOrClient: string,
 *   environment: 'local' | 'test' | 'preview' | 'production',
 *   workTypes: string[],
 *   protectedGate: string,
 *   protectedSubjectsMentioned?: string[],
 *   consequentialActionRequested?: boolean,
 *   separateBranchRequired: boolean,
 *   separatePrRequired: boolean,
 *   mayRunConcurrently: boolean,
 *   concurrencyReason: string,
 *   productWorkstream?: string | null,
 * }} IssueWorkClassification
 */

/**
 * Subject mention ≠ consequential action (#896).
 * Claim-blocking gates fire only when the active task asks to execute the
 * protected consequence — not when it mentions, forbids, inspects, prepares,
 * or designs around that subject.
 *
 * @param {string} blob lowercased title+body
 * @returns {{
 *   subjects: string[],
 *   consequentialGate: string,
 * }}
 */
export function inferProtectedSubjectsAndConsequentialGate(blob) {
  const text = String(blob || '');
  /** @type {Set<string>} */
  const subjects = new Set();

  if (/schema|migration|prisma|postgres|\bdatabase\b|db\/schema/.test(text)) {
    subjects.add('database');
  }
  if (/secret|\.env|env var|infisical|credential|env\/secret/.test(text)) {
    subjects.add('secrets');
  }
  if (/whatsapp|\bsms\b|email runtime|\bmessaging\b/.test(text)) {
    subjects.add('messaging');
  }
  if (/\bpayment\b|checkout|\bstripe\b/.test(text)) {
    subjects.add('payment');
  }
  if (/outreach|cold email|bulk send/.test(text)) {
    subjects.add('outreach');
  }
  if (/paid tool|new vendor/.test(text)) {
    subjects.add('paid_tool');
  }
  if (/public launch|public client-facing launch/.test(text)) {
    subjects.add('public_launch');
  }
  if (
    /client[_ ]production|deploy to (client )?production|production deploy/.test(text)
  ) {
    subjects.add('production');
  }

  const forbidsProduction =
    /no production deploy|without.*production|not.*production deploy|no db\/schema|no schema change|no deployment into any client|no client.?production|not.*client.?production|classification\/documentation\/test-workflow correction only|open a pr only|do not merge|do not deploy/.test(
      text,
    );
  const forbidsDatabaseChange =
    /no db\/schema|no schema change|do not(?:\s+\w+){0,4}\s+(?:change|touch|alter|mutate|modify|run)(?:[\w\s.\/,-]{0,80})?(?:db\/schema|prisma\s+migrate|schema)|(?:do not|don't)[\s\S]{0,240}?(?:change|touch|alter|mutate|modify)\s+db\/schema|do not:[\s\S]{0,900}?(?:change|touch|alter|mutate|modify)\s+db\/schema|without(?:\s+\w+){0,12}\s+db\/schema(?:\s+change)?|db\/schema changes?(?:\s+are)?\s+(?:not\s+)?(?:authori[sz]ed|allowed)|unrelated db\/schema|not a corpflowai database\/schema task|do not touch corpflowai postgres|do not run prisma migrate|determine whether schema changes are needed/.test(
      text,
    );
  const forbidsPaidTool =
    /no.*paid tool|paid tool or public|without.*paid tool|paid tool or public launch|no paid tools/i.test(
      text,
    );
  const forbidsPaymentRuntime =
    /no.*payment runtime|without.*payment runtime|no payment|no live messaging,\s*payments|messaging,\s*payments,\s*outreach|payment runtime, messaging|real payment execution|do not perform real payment|without making a payment|test payment flow without/.test(
      text,
    );
  const forbidsSecretsChange =
    /do not expose secrets|approved secrets-management|no env\/secret change|no secret change|no env or secret changes|do not change(?:[\w\s.\/,-]{0,60})?env\/secrets|do not:[\s\S]{0,900}?change (?:vercel )?env\/secrets|mentions credentials\/secrets as things not to expose/.test(
      text,
    ) &&
    !/authorized.{0,80}(environment\/settings|env\/secrets)|explicitly approved.{0,120}(environment\/settings|secure cursor)/.test(
      text,
    );
  const forbidsOutreach =
    /no.*outreach|without.*outreach|no live messaging,\s*payments,\s*outreach|outreach, or public launch|do not perform.*outreach|prepare (an? )?email but do not send/.test(
      text,
    );
  const forbidsMessaging =
    /no.*whatsapp|no.*sms|no.*messaging|no email|no live messaging|prepare (an? )?message without sending|do not send|without sending/.test(
      text,
    );
  const forbidsPublicLaunch =
    /no.*public launch|without.*public launch|or public launch|open a pr only/.test(text);

  const isProtectedGateControlDesign =
    /central anton decision inbox|enforceable protected-action gates|decision inbox|protected-action gates|direct operator instruction authorizes ordinary|consequential-action gates stop only|protected subject/.test(
      text,
    ) &&
    (forbidsProduction ||
      /ordinary (delivery )?work|preparation continues|mention alone does not gate|must never be misclassified/.test(
        text,
      ));

  const ordinaryOrPreparationIntent =
    /inspect|read-only|readonly|discover|investigation|research|prepare (a |the )?(deployment|migration|message|email|release)|preparation|design (the |a )?(change|migration|schema)|determine whether|verify|probe|access probe|synthetic|corpflow.?test|create (a )?pr|open a pr|run ci|gather evidence|test (locally|without)|without (making|sending|executing)|do not (merge|deploy|send|expose)|ordinary (delivery |reversible )?work/.test(
      text,
    );

  // Affirmative consequential intents — exact protected operations only.
  // Strip simple "do not / don't / without … <verb>" spans before verb matching
  // so prohibition text cannot look like an activation request (#896).
  const affirmativeBlob = text
    .replace(
      /(?:do not|don't|without|never)\b[\s\S]{0,120}?(?:prisma\s+migrate|schema\s+migration|alter\s+(?:the\s+)?(?:postgres\s+)?schema|mutate\s+(?:the\s+)?(?:db|database|schema)|send\s+(?:a\s+)?(?:live\s+)?(?:whatsapp|sms|email|message)|execute\s+(?:a\s+)?(?:real\s+)?payment|change\s+(?:vercel\s+)?env\/secrets|deploy\s+to\s+(?:client\s+)?production)/gi,
      ' ',
    )
    .replace(/test payment flow without making a payment/gi, ' ')
    .replace(/prepare (?:an? )?(?:email|message) but do not send/gi, ' ');

  const databaseConsequential =
    !forbidsDatabaseChange &&
    !isProtectedGateControlDesign &&
    (/prisma\s+migrate|run\s+(the\s+)?migrations?|apply\s+(the\s+)?(schema\s+)?migration|execute\s+(a\s+)?(schema|database|db)\s+(change|migration)|alter\s+(the\s+)?(postgres\s+)?schema|mutate\s+(the\s+)?(db|database|schema)|schema\s+migration\s+and\s+data\s+mutation|real\s+db\/schema\s+change|add\s+prisma\s+migration|backfill\s+rows|migrate\s+production\s+database|change\s+corpflowai\s+(production\s+)?(db|database|schema)|requires?\s+protected\s*gate:?\s*`?database`?/.test(
      affirmativeBlob,
    ) ||
      (/actual\s+schema\s+migration/.test(affirmativeBlob) &&
        /data\s+mutation|alter\s+postgres/.test(affirmativeBlob)));

  const secretsConsequential =
    !forbidsSecretsChange &&
    !isProtectedGateControlDesign &&
    (/change\s+(vercel\s+)?env\/secrets|rotate\s+(the\s+)?secrets?|set\s+(a\s+)?(new\s+)?(vercel\s+)?(env|secret)|write\s+(a\s+)?secret\s+to|paste\s+credentials?|add\s+(a\s+)?new\s+(api\s+)?(key|credential|secret)\s+to\s+(vercel|production|infisical)|configure\s+(new\s+)?production\s+secrets?|secure\s+cursor\s+(cloud\s+)?environment\/settings(\s+path)?|secure\s+cursor\s+(cloud\s+)?environment\/settings\s+configuration|requires?\s+protected\s*gate:?\s*`?secrets`?/.test(
      affirmativeBlob,
    ) ||
      (/wiring.{0,120}secure\s+cursor/.test(text) &&
        /explicitly approved|explicit operator approval|operator authorization:\s*anton/.test(text)));

  const messagingConsequential =
    !forbidsMessaging &&
    !isProtectedGateControlDesign &&
    /(send|sending)\s+(a\s+)?(live\s+)?(whatsapp|sms|email|message)\b|live\s+(whatsapp|sms|email)\s+send|enable\s+(live\s+)?(email|whatsapp|sms)\s+runtime|activate\s+(live\s+)?messaging|requires?\s+protected\s*gate:?\s*`?messaging`?/.test(
      affirmativeBlob,
    );

  const paymentConsequential =
    !forbidsPaymentRuntime &&
    !isProtectedGateControlDesign &&
    /(execute|process|make|charge)\s+(a\s+)?(real\s+)?payment\b|enable\s+payment\s+runtime|payment\s+runtime\s+(enable|activation|implement)|charge\s+(a\s+)?(credit\s+)?card|capture\s+(a\s+)?live\s+payment|requires?\s+protected\s*gate:?\s*`?payment`?/.test(
      affirmativeBlob,
    );

  const outreachConsequential =
    !forbidsOutreach &&
    !isProtectedGateControlDesign &&
    /(send|launch|run)\s+(a\s+)?(cold\s+email|bulk\s+send|outreach\s+campaign)|cold\s+email\s+campaign|bulk\s+(external\s+)?send\s+to\s+prospects/.test(
      text,
    );

  const paidToolConsequential =
    !forbidsPaidTool &&
    !isProtectedGateControlDesign &&
    /(activate|purchase|subscribe\s+to|enable)\s+(a\s+)?(new\s+)?(paid\s+tool|vendor)|new\s+paid\s+(tool|vendor)\s+activation/.test(
      text,
    );

  const publicLaunchConsequential =
    !forbidsPublicLaunch &&
    !isProtectedGateControlDesign &&
    /(execute|perform|ship|launch)\s+(a\s+)?public\s+(client-facing\s+)?launch|public\s+client-facing\s+launch\s+now/.test(
      text,
    );

  const clientProductionIntent =
    /client[_ ]production|deploy to client.?owned|client-owned production|client.?approved production target|approval:production\b|deploy into (an? )?actual client production|separately governed client production/.test(
      text,
    ) &&
    !/not .*client.?production|until a separate production transition|future client production|treat.*as test|corpflow.?test|corpflowai-hosted.*test|false approval:production/.test(
      text,
    );

  const corpflowTestPublishIntent =
    /corpflow.?test|corpflowai-hosted|publish (directly )?to (the )?(relevant )?corpflow|lux\.corpflowai\.com|cipc(-desk)?\.corpflowai\.com|core\.corpflowai\.com|standing (internal )?test tenant|client test environment/.test(
      text,
    );

  const productionConsequential =
    !forbidsProduction &&
    !isProtectedGateControlDesign &&
    (clientProductionIntent ||
      (!corpflowTestPublishIntent &&
        (/deploy to (client )?production\b|production deploy to client/.test(text) ||
          (/production deploy|deploy to production/.test(text) &&
            !/no production deploy|without.*production|vercel production spine|corpflow.?test/.test(
              text,
            ) &&
            !/test environment|test surface|sign-off|demonstration|prepare (a |the )?deployment/.test(
              text,
            )))));

  /** @type {string} */
  let consequentialGate = 'none';
  if (productionConsequential) consequentialGate = 'production';
  else if (databaseConsequential) consequentialGate = 'database';
  else if (secretsConsequential) consequentialGate = 'secrets';
  else if (messagingConsequential) consequentialGate = 'messaging';
  else if (paymentConsequential) consequentialGate = 'payment';
  else if (outreachConsequential) consequentialGate = 'outreach';
  else if (paidToolConsequential) consequentialGate = 'paid_tool';
  else if (publicLaunchConsequential) consequentialGate = 'public_launch';

  // Governance / doctrine / prohibition sections that list protected subjects
  // are never claim-blocking activation requests (#676 / #896).
  if (
    consequentialGate !== 'none' &&
    (isProtectedGateControlDesign ||
      (/protected gates[\s\S]{0,500}without anton approval|## governance[\s\S]{0,800}no production deployment/i.test(
        text,
      ) &&
        !/\brequires? (production deploy|secret change|payment runtime|schema migration|client.?production)\b|\bmust (deploy to production|change secrets)\b/i.test(
          text,
        )))
  ) {
    consequentialGate = 'none';
  }

  // Preparation / inspect / forbid language without affirmative consequential verbs
  // must not leave a residual subject-based gate (#879 / #886 / #893 inspect lanes).
  if (
    consequentialGate !== 'none' &&
    ordinaryOrPreparationIntent &&
    !databaseConsequential &&
    !secretsConsequential &&
    !messagingConsequential &&
    !paymentConsequential &&
    !outreachConsequential &&
    !paidToolConsequential &&
    !publicLaunchConsequential &&
    !productionConsequential
  ) {
    consequentialGate = 'none';
  }

  return {
    subjects: [...subjects],
    consequentialGate,
  };
}

/**
 * @param {string} environment
 * @returns {string}
 */
export function formatEnvironmentBusinessLabel(environment) {
  const key = String(environment || '').trim();
  const meaning = ENVIRONMENT_BUSINESS_MEANING[key];
  if (!meaning) return key || 'preview';
  if (key === meaning) return key;
  return `${key} (${meaning})`;
}

/**
 * @typedef {{
 *   number: number,
 *   title: string,
 *   body?: string | null,
 *   labels?: Array<string | { name?: string }>,
 *   htmlUrl?: string | null,
 *   updatedAt?: string | null,
 *   createdAt?: string | null,
 *   state?: string | null,
 *   comments?: Array<{
 *     body?: string | null,
 *     author?: string | null,
 *     user?: { login?: string | null } | null,
 *     created_at?: string | null,
 *     createdAt?: string | null,
 *   }>,
 * }} DispatchIssue
 */

/**
 * @param {unknown} labels
 * @returns {string[]}
 */
export function normalizeIssueLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return labels
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object' && 'name' in entry) {
        return String(/** @type {{ name?: unknown }} */ (entry).name || '').trim();
      }
      return '';
    })
    .filter(Boolean);
}

/**
 * @param {string} text
 * @returns {string}
 */
function lower(text) {
  return String(text || '').toLowerCase();
}

/**
 * Infer a conservative classification from issue title/body/labels.
 * Operators should refine via WORK CLASSIFICATION comments; unclear → not eligible.
 *
 * @param {DispatchIssue} issue
 * @returns {IssueWorkClassification}
 */
export function inferIssueClassification(issue) {
  const title = String(issue?.title || '');
  const body = String(issue?.body || '');
  const blob = lower(`${title}\n${body}`);
  const labels = normalizeIssueLabels(issue?.labels).map((l) => l.toLowerCase());

  let systemBoundary = /** @type {IssueWorkClassification['systemBoundary']} */ (
    'corpflowai_business_system'
  );
  let tenantOrClient = 'N/A';
  let productWorkstream = /** @type {string | null} */ (null);

  if (labels.includes('lux') || labels.includes('luxe-maurice') || /\blux\b|luxe|rare\s*&\s*exclusive/.test(blob)) {
    systemBoundary = 'tenant';
    tenantOrClient = 'lux / Rare & Exclusive';
  } else if (labels.includes('cipc') || /cipc\s*desk/.test(blob)) {
    systemBoundary = 'tenant';
    tenantOrClient = 'CIPC Desk';
  } else if (/living\s*word/.test(blob)) {
    systemBoundary = 'tenant';
    tenantOrClient = 'Living Word';
  } else if (/\bcore\b/.test(blob) && /tenant/.test(blob) === false) {
    systemBoundary = 'core';
  }

  if (/website\s*rescue/i.test(title)) {
    productWorkstream = 'website-rescue';
  } else if (/lead\s*rescue|ai\s*lead\s*rescue/i.test(title) || labels.includes('lead-rescue')) {
    productWorkstream = 'lead-rescue';
  } else if (labels.includes('website-rescue')) {
    productWorkstream = 'website-rescue';
  }

  const gateInference = inferProtectedSubjectsAndConsequentialGate(blob);
  const protectedSubjectsMentioned = gateInference.subjects;
  let protectedGate = gateInference.consequentialGate;

  const forbidsProduction =
    /no production deploy|without.*production|not.*production deploy|no db\/schema|no schema change|no deployment into any client|no client.?production|not.*client.?production|classification\/documentation\/test-workflow correction only|open a pr only|do not merge|do not deploy/.test(
      blob,
    );
  const forbidsDatabaseChange =
    /no db\/schema|no schema change|do not(?:\s+\w+){0,4}\s+(?:change|touch|alter|mutate|modify|run)(?:[\w\s.\/,-]{0,80})?(?:db\/schema|prisma\s+migrate|schema)|(?:do not|don't)[\s\S]{0,240}?(?:change|touch|alter|mutate|modify)\s+db\/schema|do not:[\s\S]{0,900}?(?:change|touch|alter|mutate|modify)\s+db\/schema|without(?:\s+\w+){0,12}\s+db\/schema(?:\s+change)?|db\/schema changes?(?:\s+are)?\s+(?:not\s+)?(?:authori[sz]ed|allowed)|unrelated db\/schema|not a corpflowai database\/schema task|do not touch corpflowai postgres|do not run prisma migrate|determine whether schema changes are needed/.test(
      blob,
    );

  const clientProductionIntent =
    /client[_ ]production|deploy to client.?owned|client-owned production|client.?approved production target|approval:production\b|deploy into (an? )?actual client production|separately governed client production/.test(
      blob,
    ) &&
    !/not .*client.?production|until a separate production transition|future client production|treat.*as test|corpflow.?test|corpflowai-hosted.*test|false approval:production/.test(
      blob,
    );

  const corpflowTestPublishIntent =
    systemBoundary === 'tenant' ||
    /corpflow.?test|corpflowai-hosted|publish (directly )?to (the )?(relevant )?corpflow|lux\.corpflowai\.com|cipc(-desk)?\.corpflowai\.com|core\.corpflowai\.com|standing (internal )?test tenant|client test environment/.test(
      blob,
    );

  /** @type {string[]} */
  const workTypes = [];
  if (/research|gap matrix|comparison/.test(blob)) workTypes.push('research');
  if (/documentation|docs-only|runbook|checklist|quotation|product pack/.test(blob)) {
    workTypes.push('documentation');
  }
  if (/ui|landing|product page|cta|visual/.test(blob)) workTypes.push('ui');
  if (/\bapi\b|endpoint|intake/.test(blob)) workTypes.push('api');
  // Database work-type only for consequential schema work or explicit DB implementation packets.
  if (
    protectedGate === 'database' ||
    (/prisma\s+migrate|schema\s+migration|alter\s+postgres|database\s+schema\s+change/.test(blob) &&
      !forbidsDatabaseChange)
  ) {
    workTypes.push('database');
  }
  if (/integration|n8n|webhook/.test(blob)) workTypes.push('integration');
  if (/validat|smoke|live verify|delivery reality/.test(blob)) workTypes.push('validation');

  const mentionsDeployOrVercelProd =
    /deploy|production deployment|vercel production|publish to|prepare (a |the )?deployment/.test(
      blob,
    );

  if (
    clientProductionIntent ||
    (mentionsDeployOrVercelProd && !forbidsProduction && !corpflowTestPublishIntent)
  ) {
    workTypes.push('deployment');
  } else if (mentionsDeployOrVercelProd && corpflowTestPublishIntent && !forbidsProduction) {
    workTypes.push('deployment');
  }

  if (workTypes.length === 0) workTypes.push('documentation');

  // Drop false-positive deployment/database work types when the issue forbids production/schema.
  if ((forbidsProduction || forbidsDatabaseChange) && !clientProductionIntent) {
    const filtered = workTypes.filter((t) => {
      if (t === 'deployment' && forbidsProduction) return false;
      if (t === 'database' && (forbidsProduction || forbidsDatabaseChange)) return false;
      return true;
    });
    workTypes.length = 0;
    workTypes.push(...(filtered.length ? filtered : ['documentation']));
    if (forbidsProduction && protectedGate === 'production') protectedGate = 'none';
    if ((forbidsProduction || forbidsDatabaseChange) && protectedGate === 'database') {
      protectedGate = 'none';
    }
  }

  let environment = /** @type {IssueWorkClassification['environment']} */ ('preview');
  if (protectedGate === 'production' || clientProductionIntent) {
    environment = 'production';
  } else if (
    systemBoundary === 'tenant' ||
    corpflowTestPublishIntent ||
    /environment classification|corpflow.?test|treat.*test environment/.test(blob)
  ) {
    environment = 'test';
  } else if (
    (/local only|docs-only/.test(blob) && !workTypes.includes('ui')) ||
    (workTypes.length === 1 && workTypes[0] === 'documentation')
  ) {
    environment = 'local';
  } else if (systemBoundary === 'core') {
    environment = 'test';
  }

  const mayRunConcurrently =
    systemBoundary !== 'tenant' &&
    protectedGate === 'none' &&
    !workTypes.includes('database') &&
    environment !== 'production';

  return {
    systemBoundary,
    tenantOrClient,
    environment,
    workTypes: [...new Set(workTypes)],
    protectedGate,
    protectedSubjectsMentioned,
    consequentialActionRequested: protectedGate !== 'none',
    separateBranchRequired: true,
    separatePrRequired: true,
    mayRunConcurrently,
    concurrencyReason: mayRunConcurrently
      ? 'Non-tenant, non-schema, non-client_production work; still requires separate branch/PR and WIP check.'
      : 'Segregation by default — tenant, schema, client_production, or protected gate requires isolation.',
    productWorkstream,
  };
}

/**
 * @param {IssueWorkClassification} classification
 * @returns {string}
 */
export function formatWorkClassificationComment(issueNumber, classification) {
  const workType = classification.workTypes.join(' / ');
  const subjects = Array.isArray(classification.protectedSubjectsMentioned)
    ? classification.protectedSubjectsMentioned
    : [];
  const gateLabel =
    classification.protectedGate === 'production'
      ? 'production (client_production)'
      : classification.protectedGate;
  const consequentialNote =
    classification.protectedGate === 'none'
      ? 'ordinary delivery work proceeds; subject mentions alone do not block claim'
      : 'claim waits for exact-gate operator authorization; preparation/inspect/test may continue until this boundary';
  return `WORK CLASSIFICATION

Issue: #${issueNumber}
System boundary:
- ${classification.systemBoundary === 'corpflowai_business_system' ? 'CorpFlowAI business system' : classification.systemBoundary}

Tenant or client:
- ${classification.tenantOrClient}

Environment:
- ${formatEnvironmentBusinessLabel(classification.environment)}

Work type:
- ${workType}

Protected subjects mentioned:
- ${subjects.length ? subjects.join(', ') : 'none'}

Protected consequential gate:
- ${gateLabel}
- note: ${consequentialNote}

Execution isolation:
- separate branch required: ${classification.separateBranchRequired ? 'yes' : 'no'}
- separate PR required: ${classification.separatePrRequired ? 'yes' : 'no'}
- may run concurrently with other work: ${classification.mayRunConcurrently ? 'yes' : 'no'}
- reason: ${classification.concurrencyReason}${
    classification.productWorkstream
      ? `\n\nProduct workstream: ${classification.productWorkstream} (must not merge with sibling product streams)`
      : ''
  }
`;
}

/**
 * @param {{
 *   issueNumber: number,
 *   priority?: string,
 *   classificationComplete: boolean,
 *   eligibleToClaim: boolean,
 *   reason: string,
 *   nextAction: string,
 * }} opts
 */
export function formatDispatchDiscoveredComment(opts) {
  return `CURSOR DISPATCH DISCOVERED

Issue: #${opts.issueNumber}
Priority: ${opts.priority || 'unspecified'}
Classification complete: ${opts.classificationComplete ? 'Yes' : 'No'}
Eligible to claim: ${opts.eligibleToClaim ? 'Yes' : 'No'}
Reason: ${opts.reason}
Next action: ${opts.nextAction}
`;
}

/**
 * @param {{
 *   issueNumber: number,
 *   agentRunId?: string | null,
 *   branch?: string | null,
 *   workstream?: string | null,
 *   tenantOrClient?: string,
 *   environment?: string,
 *   startedIso?: string,
 *   protectedGate?: string,
 *   expectedOutputs?: string[],
 * }} opts
 */
export function formatDispatchClaimedComment(opts) {
  const outputs = (opts.expectedOutputs || [
    'implementation or research result',
    'linked PR where applicable',
    'tests/build evidence',
    'verification evidence',
  ])
    .map((line) => `- ${line}`)
    .join('\n');

  return `CURSOR WORK CLAIMED

Issue: #${opts.issueNumber}
Execution owner: Cursor
Agent/run identifier: ${opts.agentRunId || 'pending'}
Branch: ${opts.branch || 'pending'}
Workstream: ${opts.workstream || 'unspecified'}
Tenant/client: ${opts.tenantOrClient || 'N/A'}
Environment: ${formatEnvironmentBusinessLabel(opts.environment || 'preview')}
Started: ${opts.startedIso || new Date().toISOString()}
Protected gate encountered: ${opts.protectedGate && opts.protectedGate !== 'none' ? `Yes — ${opts.protectedGate === 'production' ? 'production (client_production)' : opts.protectedGate}` : 'No'}
Expected outputs:
${outputs}
`;
}

/**
 * @param {{
 *   issueNumber: number,
 *   status: string,
 *   progress: string,
 *   completed?: string[],
 *   currentlyWorkingOn?: string[],
 *   remaining?: string[],
 *   blockers?: string,
 *   pr?: string,
 *   antonRequired?: string,
 * }} opts
 */
export function formatProgressUpdateComment(opts) {
  const list = (items, empty) =>
    (items && items.length ? items : [empty]).map((line) => `- ${line}`).join('\n');

  return `CURSOR PROGRESS UPDATE

Issue: #${opts.issueNumber}
Status: ${opts.status}
Progress: ${opts.progress}
Completed:
${list(opts.completed, 'none yet')}

Currently working on:
${list(opts.currentlyWorkingOn, 'none')}

Remaining:
${list(opts.remaining, 'none')}

Blockers:
- ${opts.blockers || 'none'}

PR:
- ${opts.pr || 'none'}

Anton required:
- ${opts.antonRequired || 'No'}
`;
}

export function hasSiblingProductConflict(a, b) {
  if (!a?.productWorkstream || !b?.productWorkstream) return false;
  return a.productWorkstream !== b.productWorkstream;
}

/**
 * Decide whether two classifications may run concurrently.
 *
 * @param {IssueWorkClassification} a
 * @param {IssueWorkClassification} b
 */
export function canRunConcurrently(a, b) {
  if (!a || !b) return { ok: false, reason: 'missing classification' };
  if (a.systemBoundary === 'tenant' && b.systemBoundary === 'tenant') {
    if (a.tenantOrClient === b.tenantOrClient) {
      return { ok: false, reason: 'same tenant — max one active implementation issue per tenant' };
    }
  }
  if (
    a.productWorkstream &&
    b.productWorkstream &&
    a.productWorkstream === b.productWorkstream
  ) {
    return { ok: false, reason: 'same product workstream' };
  }
  if (hasSiblingProductConflict(a, b)) {
    return {
      ok: false,
      reason:
        'sibling products require sequential start (segregation by default; shared changes need their own issue)',
    };
  }
  if (a.workTypes.includes('database') && b.workTypes.includes('database')) {
    return { ok: false, reason: 'two database/schema issues cannot run concurrently' };
  }
  if (a.environment === 'production' && b.environment === 'production') {
    return { ok: false, reason: 'only one client_production-deployment candidate at a time' };
  }
  if (a.protectedGate !== 'none' && a.protectedGate === b.protectedGate && a.protectedGate !== 'none') {
    return { ok: false, reason: `same protected gate (${a.protectedGate})` };
  }
  return { ok: true, reason: 'different boundaries and no shared gate conflict' };
}

/**
 * @param {{
 *   readyIssues: DispatchIssue[],
 *   claimedIssues?: DispatchIssue[],
 *   trackedIssues?: DispatchIssue[],
 *   wipLimits?: typeof DEFAULT_WIP_LIMITS,
 *   preferIssueNumbers?: number[],
 *   openPrCount?: number,
 * }} input
 */
export function planCursorIssueClaims(input) {
  const limits = { ...DEFAULT_WIP_LIMITS, ...(input.wipLimits || {}) };
  const claimed = Array.isArray(input.claimedIssues) ? input.claimedIssues : [];
  const readyIssues = Array.isArray(input.readyIssues) ? input.readyIssues : [];
  const trackedIssues = Array.isArray(input.trackedIssues)
    ? input.trackedIssues
    : [...claimed, ...readyIssues];

  const wip = evaluateCursorWipCapacity({
    trackedIssues,
    readyIssues,
    maxSlots: limits.maxActiveCursorImplementationIssues,
    openPrCount: input.openPrCount,
    preferIssueNumbers: input.preferIssueNumbers,
  });

  const verifiedActiveNumbers = new Set(wip.verifiedActiveIssueNumbers);
  const verifiedActiveIssues = trackedIssues.filter((issue) =>
    verifiedActiveNumbers.has(Number(issue.number)),
  );
  const slots = wip.availableSlots;

  /** @type {Array<{
   *   issue: DispatchIssue,
   *   classification: IssueWorkClassification,
   *   decision: 'claim' | 'discover_only' | 'reject',
   *   eligibleToClaim: boolean,
   *   reason: string,
   * }>} */
  const decisions = [];

  const prefer = new Set((input.preferIssueNumbers || []).map((n) => Number(n)));

  const sorted = [...readyIssues].sort((a, b) => {
    const preferA = prefer.has(Number(a.number)) ? 0 : 1;
    const preferB = prefer.has(Number(b.number)) ? 0 : 1;
    if (preferA !== preferB) return preferA - preferB;
    const rankDiff = cursorReadyPriorityRank(a) - cursorReadyPriorityRank(b);
    if (rankDiff !== 0) return rankDiff;
    return compareOldestReady(a, b);
  });

  /** @type {IssueWorkClassification[]} */
  const activeClassifications = verifiedActiveIssues.map((issue) => inferIssueClassification(issue));
  /** @type {IssueWorkClassification[]} */
  const plannedClaimClassifications = [];
  let remainingSlots = slots;

  /**
   * @param {IssueWorkClassification} classification
   */
  function concurrencyBlockReason(classification) {
    for (const existing of activeClassifications) {
      const check = canRunConcurrently(existing, classification);
      if (!check.ok) return check.reason;
    }
    for (const existing of plannedClaimClassifications) {
      if (!hasSiblingProductConflict(existing, classification)) continue;
      const check = canRunConcurrently(existing, classification);
      if (!check.ok) return check.reason;
    }
    return null;
  }

  for (const issue of sorted) {
    const labels = normalizeIssueLabels(issue.labels).map((l) => l.toLowerCase());
    const classification = inferIssueClassification(issue);

    if (labels.includes(DISPATCH_LABEL_BLOCKED.toLowerCase())) {
      decisions.push({
        issue,
        classification,
        decision: 'reject',
        eligibleToClaim: false,
        reason: 'labelled dispatch:blocked',
      });
      continue;
    }

    if (labels.includes(DISPATCH_LABEL_PAUSED.toLowerCase())) {
      decisions.push({
        issue,
        classification,
        decision: 'discover_only',
        eligibleToClaim: false,
        reason: 'execution:paused — excluded from new activation',
      });
      continue;
    }

    if (labels.includes(DISPATCH_LABEL_CLAIMED.toLowerCase())) {
      decisions.push({
        issue,
        classification,
        decision: 'discover_only',
        eligibleToClaim: false,
        reason: 'already claimed',
      });
      continue;
    }

    // Operator-review means a prior generation completed and awaits human review.
    // Keeping dispatch:cursor-ready + operator-review must not consume the free WIP
    // slot — activator would SKIP_ALREADY_CLAIMED (operator_review) and waste capacity.
    // Explicit CURSOR REQUEUE + restored ready (without operator-review) is required
    // for a new generation (#896 queue recovery).
    if (labels.includes(DISPATCH_LABEL_OPERATOR_REVIEW.toLowerCase())) {
      decisions.push({
        issue,
        classification,
        decision: 'discover_only',
        eligibleToClaim: false,
        reason:
          'dispatch:operator-review — prior generation awaits operator review; not eligible for new claim without CURSOR REQUEUE',
      });
      continue;
    }

    if (classification.protectedGate !== 'none') {
      const gateAuth = evaluateOperatorGateAuthorization({
        issueNumber: Number(issue.number),
        gate: classification.protectedGate,
        body: issue.body,
        comments: issue.comments,
      });
      if (!gateAuth.allowed) {
        decisions.push({
          issue,
          classification,
          decision: 'discover_only',
          eligibleToClaim: false,
          reason:
            gateAuth.reason ||
            `protected gate ${classification.protectedGate} — classify and wait for Anton unlock before claim/activation`,
          gateAuthorization: gateAuth,
        });
        continue;
      }
      // Exact-gate authorization present — continue WIP/isolation/priority checks.
    }

    const blockedBy = concurrencyBlockReason(classification);
    if (blockedBy) {
      decisions.push({
        issue,
        classification,
        decision: 'discover_only',
        eligibleToClaim: false,
        reason: `concurrency hold: ${blockedBy}`,
      });
      continue;
    }

    if (
      classification.systemBoundary === 'tenant' &&
      [...activeClassifications, ...plannedClaimClassifications].some(
        (c) =>
          c.systemBoundary === 'tenant' && c.tenantOrClient === classification.tenantOrClient,
      )
    ) {
      decisions.push({
        issue,
        classification,
        decision: 'discover_only',
        eligibleToClaim: false,
        reason: `tenant WIP: already one active issue for ${classification.tenantOrClient}`,
      });
      continue;
    }

    if (remainingSlots <= 0) {
      decisions.push({
        issue,
        classification,
        decision: 'discover_only',
        eligibleToClaim: true,
        reason: `WIP cap reached (max ${limits.maxActiveCursorImplementationIssues} verified active Cursor runs)`,
      });
      continue;
    }

    decisions.push({
      issue,
      classification,
      decision: 'claim',
      eligibleToClaim: true,
      reason: 'eligible under segregation + WIP rules',
    });
    plannedClaimClassifications.push(classification);
    remainingSlots -= 1;
  }

  const eligibleIssueNumbers = decisions
    .filter((d) => d.eligibleToClaim)
    .map((d) => Number(d.issue.number));
  const claimIssueNumbers = decisions
    .filter((d) => d.decision === 'claim')
    .map((d) => Number(d.issue.number));

  return {
    schema: CURSOR_ISSUE_DISPATCH_LIFECYCLE_SCHEMA,
    wipLimits: limits,
    /** @deprecated label-count; prefer verifiedActiveCount (#862) */
    claimedCount: claimed.length,
    verifiedActiveCount: wip.used,
    availableSlots: slots,
    decisions,
    eligibleIssueNumbers,
    claimIssueNumbers,
    activationTargetIssue: claimIssueNumbers[0] ?? null,
    wipCapacity: wip,
    capacityPacket: wip.capacityPacket,
    reconcileActions: wip.reconcileActions,
  };
}

/**
 * Suggest a segregated branch name for an issue.
 *
 * @param {number} issueNumber
 * @param {IssueWorkClassification} classification
 * @param {string} [suffix]
 */
export function suggestIssueBranchName(issueNumber, classification, suffix = '1e9e') {
  const stream =
    classification.productWorkstream ||
    (classification.systemBoundary === 'tenant'
      ? classification.tenantOrClient.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : classification.workTypes[0] || 'ops');
  const slug = String(stream || 'issue')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `cursor/${slug}-${issueNumber}-${suffix}`;
}

/**
 * @param {DispatchIssue} issue
 * @param {string} [nowIso]
 * @param {number} [staleHours]
 */
export function isClaimStale(issue, nowIso = new Date().toISOString(), staleHours = DEFAULT_STALE_CLAIM_HOURS) {
  const labels = normalizeIssueLabels(issue.labels).map((l) => l.toLowerCase());
  if (!labels.includes(DISPATCH_LABEL_CLAIMED.toLowerCase())) return false;
  const updated = issue.updatedAt ? Date.parse(issue.updatedAt) : NaN;
  if (!Number.isFinite(updated)) return false;
  const now = Date.parse(nowIso);
  return now - updated >= staleHours * 3600 * 1000;
}

/**
 * Exception-only stale status request (no heartbeat noise).
 *
 * @param {number} issueNumber
 * @param {string} owner
 */
export function formatStaleWorkStatusRequest(issueNumber, owner = 'Cursor') {
  return `CURSOR STALE WORK STATUS REQUEST

Issue: #${issueNumber}
Owner: ${owner}
Observation: No meaningful movement within the stale threshold.
Required response: resume, requeue, or mark blocked with named blocker.
Do not leave claimed indefinitely.
`;
}

/**
 * @param {Record<string, unknown>} item
 */
export function mapGitHubIssueToDispatchIssue(item) {
  const labelsRaw = item.labels;
  /** @type {Array<string | { name?: string }>} */
  let labels = [];
  if (Array.isArray(labelsRaw)) {
    labels = labelsRaw;
  } else if (labelsRaw && typeof labelsRaw === 'object' && 'nodes' in labelsRaw) {
    const nodes = /** @type {{ nodes?: unknown[] }} */ (labelsRaw).nodes;
    labels = Array.isArray(nodes) ? nodes : [];
  }
  const stateRaw =
    item.state != null && String(item.state).trim()
      ? String(item.state)
      : item.closed === true
        ? 'closed'
        : 'open';
  return {
    number: Number(item.number),
    title: String(item.title || ''),
    body: String(item.body || ''),
    labels,
    htmlUrl: item.html_url || item.url ? String(item.html_url || item.url) : null,
    updatedAt: item.updated_at || item.updatedAt ? String(item.updated_at || item.updatedAt) : null,
    createdAt: item.created_at || item.createdAt ? String(item.created_at || item.createdAt) : null,
    state: String(stateRaw || 'open').toLowerCase() === 'closed' ? 'closed' : 'open',
  };
}

/** @param {DispatchIssue[]} issues @param {string} label */
export function filterIssuesByLabel(issues, label) {
  const want = String(label || '').trim().toLowerCase();
  if (!want) return [];
  return (issues || []).filter((issue) =>
    normalizeIssueLabels(issue.labels).some((l) => l.toLowerCase() === want),
  );
}

/** @param {string} token @param {string} repo @param {string} label @param {typeof fetch} [fetchFn] */
export async function listOpenIssuesByLabelRest(token, repo, label, fetchFn = globalThis.fetch) {
  const want = String(label || '').trim();
  if (!repo.includes('/')) throw new Error('repo must be owner/name');
  const [owner, name] = repo.split('/');
  /** @type {DispatchIssue[]} */
  const all = [];
  for (let page = 1; page <= 10; page += 1) {
    const params = new URLSearchParams({ state: 'open', per_page: '100', page: String(page) });
    const url = `https://api.github.com/repos/${owner}/${name}/issues?${params.toString()}`;
    const res = await fetchFn(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`GitHub list issues HTTP ${res.status}: ${text.slice(0, 300)}`);
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : [];
    if (items.length === 0) break;
    for (const item of items) {
      if (item?.pull_request) continue;
      all.push(mapGitHubIssueToDispatchIssue(item));
    }
    if (items.length < 100) break;
  }
  return filterIssuesByLabel(all, want);
}

/** @param {string} token @param {string} repo @param {string} label @param {typeof fetch} [fetchFn] */
export async function listOpenIssuesByLabelGraphql(token, repo, label, fetchFn = globalThis.fetch) {
  const want = String(label || '').trim();
  if (!repo.includes('/')) throw new Error('repo must be owner/name');
  const [owner, name] = repo.split('/');
  /** @type {DispatchIssue[]} */
  const issues = [];
  let cursor = null;
  for (let page = 0; page < 10; page += 1) {
    const query = `query($owner:String!,$name:String!,$label:String!,$cursor:String){repository(owner:$owner,name:$name){issues(first:100,after:$cursor,labels:[$label],states:OPEN){nodes{number title body url updatedAt labels(first:20){nodes{name}}}pageInfo{hasNextPage endCursor}}}}`;
    const res = await fetchFn('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { owner, name, label: want, cursor } }),
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`GitHub GraphQL HTTP ${res.status}: ${text.slice(0, 300)}`);
    const json = JSON.parse(text);
    if (Array.isArray(json.errors) && json.errors.length) {
      throw new Error(`GitHub GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
    }
    const nodes = json?.data?.repository?.issues?.nodes;
    if (Array.isArray(nodes)) for (const node of nodes) issues.push(mapGitHubIssueToDispatchIssue(node));
    const pageInfo = json?.data?.repository?.issues?.pageInfo;
    if (!pageInfo?.hasNextPage) break;
    cursor = pageInfo.endCursor || null;
    if (!cursor) break;
  }
  return filterIssuesByLabel(issues, want);
}

/** @param {string} token @param {string} repo @param {string} label @param {{ fetch?: typeof fetch, prefer?: 'graphql' | 'rest' }} [opts] */
export async function discoverOpenIssuesByLabel(token, repo, label, opts = {}) {
  const fetchFn = opts.fetch || globalThis.fetch;
  if (opts.prefer === 'rest') return listOpenIssuesByLabelRest(token, repo, label, fetchFn);
  try {
    return await listOpenIssuesByLabelGraphql(token, repo, label, fetchFn);
  } catch {
    return listOpenIssuesByLabelRest(token, repo, label, fetchFn);
  }
}

/** @param {string} token @param {string} repo @param {typeof fetch} [fetchFn] */
export async function listRepoLabelNames(token, repo, fetchFn = globalThis.fetch) {
  const res = await fetchFn(`https://api.github.com/repos/${repo}/labels?per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub list labels HTTP ${res.status}: ${text.slice(0, 300)}`);
  const parsed = JSON.parse(text);
  return (Array.isArray(parsed) ? parsed : [])
    .map((entry) => (entry?.name ? String(entry.name) : ''))
    .filter(Boolean);
}

/**
 * Create a single repo label if missing (idempotent).
 * @param {string} token
 * @param {string} repo
 * @param {string} name
 * @param {{ color?: string, description?: string }} [meta]
 * @param {typeof fetch} [fetchFn]
 */
export async function ensureRepoLabelExists(token, repo, name, meta = {}, fetchFn = globalThis.fetch) {
  const labelName = String(name || '').trim();
  if (!labelName) throw new Error('ensureRepoLabelExists requires label name');
  const defaults = DISPATCH_LABEL_CREATE_DEFAULTS[labelName] || {};
  const color = String(meta.color || defaults.color || 'ededed').replace(/^#/, '');
  const description = String(meta.description || defaults.description || '').slice(0, 100);
  const res = await fetchFn(`https://api.github.com/repos/${repo}/labels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: labelName, color, description }),
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 422) {
    // Already exists (or validation) — treat as ok when name exists.
    return { ok: true, created: false, name: labelName };
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub create label HTTP ${res.status}: ${text.slice(0, 300)}`);
  return { ok: true, created: true, name: labelName };
}

/**
 * Ensure all dispatch lifecycle labels exist; auto-create missing ones.
 * Fail closed only when create is denied after labels are confirmed missing.
 * @param {string} token
 * @param {string} repo
 * @param {typeof fetch} [fetchFn]
 */
export async function ensureDispatchLifecycleLabels(token, repo, fetchFn = globalThis.fetch) {
  const existing = new Set((await listRepoLabelNames(token, repo, fetchFn)).map((l) => l.toLowerCase()));
  const missing = DISPATCH_LIFECYCLE_LABELS.filter((l) => !existing.has(l.toLowerCase()));
  const created = [];
  for (const label of missing) {
    const result = await ensureRepoLabelExists(token, repo, label, {}, fetchFn);
    if (result.created) created.push(label);
  }
  const after = new Set((await listRepoLabelNames(token, repo, fetchFn)).map((l) => l.toLowerCase()));
  const stillMissing = DISPATCH_LIFECYCLE_LABELS.filter((l) => !after.has(l.toLowerCase()));
  if (stillMissing.length) {
    throw new Error(
      `Missing GitHub labels required for dispatch lifecycle (auto-create failed — grant issues:write or create manually): ${stillMissing.join(', ')}`,
    );
  }
  return { ok: true, labels: [...DISPATCH_LIFECYCLE_LABELS], created };
}

/** @deprecated Prefer ensureDispatchLifecycleLabels (auto-creates). */
export async function assertDispatchLifecycleLabelsExist(token, repo, fetchFn = globalThis.fetch) {
  return ensureDispatchLifecycleLabels(token, repo, fetchFn);
}

/** @param {{ issueNumber: number, agentRunId: string, agentUrl?: string | null, branch?: string | null, workstream?: string | null, tenantOrClient?: string, environment?: string, startedIso?: string, protectedGate?: string }} opts */
export function formatDispatchActivatedComment(opts) {
  return `CURSOR DISPATCH ACTIVATED

Issue: #${opts.issueNumber}
Cursor run identifier: ${opts.agentRunId}
Agent URL: ${opts.agentUrl || 'n/a'}
Branch: ${opts.branch || 'pending'}
Workstream: ${opts.workstream || 'unspecified'}
Tenant/client: ${opts.tenantOrClient || 'N/A'}
Environment: ${formatEnvironmentBusinessLabel(opts.environment || 'preview')}
Activated: ${opts.startedIso || new Date().toISOString()}
Protected gate encountered: ${opts.protectedGate && opts.protectedGate !== 'none' ? `Yes — ${opts.protectedGate === 'production' ? 'production (client_production)' : opts.protectedGate}` : 'No'}

Labels applied: ${DISPATCH_LABEL_CLAIMED}, ${DISPATCH_LABEL_IN_PROGRESS}
Removed label: ${DISPATCH_LABEL_READY}
`;
}

/** @param {string} token @param {string} repo @param {number} issueNumber @param {string[]} labels @param {typeof fetch} [fetchFn] */
export async function addIssueLabelsApi(token, repo, issueNumber, labels, fetchFn = globalThis.fetch) {
  const res = await fetchFn(`https://api.github.com/repos/${repo}/issues/${issueNumber}/labels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ labels }),
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub add labels HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

/** @param {string} token @param {string} repo @param {number} issueNumber @param {string} label @param {typeof fetch} [fetchFn] */
export async function removeIssueLabelApi(token, repo, issueNumber, label, fetchFn = globalThis.fetch) {
  const res = await fetchFn(
    `https://api.github.com/repos/${repo}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(30000),
    },
  );
  if (res.status === 404) return { ok: true, missing: true };
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub remove label HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return { ok: true };
}

/** @param {{ token: string, repo: string, issueNumber: number, agentRunId: string, agentUrl?: string | null, branch?: string | null, classification?: IssueWorkClassification | null, postComment?: (issueNumber: number, body: string) => Promise<unknown>, fetch?: typeof fetch }} opts */
export async function finalizeIssueClaimAfterActivation(opts) {
  const runId = String(opts.agentRunId || '').trim();
  if (!runId) throw new Error('finalizeIssueClaimAfterActivation requires a real Cursor run ID');
  await ensureDispatchLifecycleLabels(opts.token, opts.repo, opts.fetch);
  await addIssueLabelsApi(
    opts.token,
    opts.repo,
    opts.issueNumber,
    [DISPATCH_LABEL_CLAIMED, DISPATCH_LABEL_IN_PROGRESS],
    opts.fetch,
  );
  await removeIssueLabelApi(opts.token, opts.repo, opts.issueNumber, DISPATCH_LABEL_READY, opts.fetch);
  const classification = opts.classification || null;
  if (opts.postComment) {
    await opts.postComment(
      opts.issueNumber,
      formatDispatchActivatedComment({
        issueNumber: opts.issueNumber,
        agentRunId: runId,
        agentUrl: opts.agentUrl,
        branch: opts.branch,
        workstream: classification?.productWorkstream || classification?.workTypes?.[0] || null,
        tenantOrClient: classification?.tenantOrClient,
        environment: classification?.environment,
        protectedGate: classification?.protectedGate,
      }),
    );
  }
  return {
    ok: true,
    issueNumber: opts.issueNumber,
    agentRunId: runId,
    labelsApplied: [DISPATCH_LABEL_CLAIMED, DISPATCH_LABEL_IN_PROGRESS],
    labelsRemoved: [DISPATCH_LABEL_READY],
  };
}

/** @param {{ token: string, repo: string, issueNumber: number, fetch?: typeof fetch }} opts */
export async function rollbackPrematureIssueClaim(opts) {
  await removeIssueLabelApi(opts.token, opts.repo, opts.issueNumber, DISPATCH_LABEL_CLAIMED, opts.fetch);
  await removeIssueLabelApi(opts.token, opts.repo, opts.issueNumber, DISPATCH_LABEL_IN_PROGRESS, opts.fetch);
  try {
    await addIssueLabelsApi(opts.token, opts.repo, opts.issueNumber, [DISPATCH_LABEL_READY], opts.fetch);
  } catch {
    // ready label may still be present
  }
  return { ok: true, issueNumber: opts.issueNumber, restoredReady: true };
}

/**
 * Release Cursor execution slot labels (terminal / reconcile). Preserves comment history.
 * Does not restore dispatch:cursor-ready (unlike failed-activation rollback).
 *
 * @param {{
 *   token?: string | null,
 *   repo?: string | null,
 *   issueNumber: number,
 *   labels?: string[],
 *   fetch?: typeof fetch,
 *   removeLabel?: (issueNumber: number, label: string) => Promise<unknown>,
 * }} opts
 */
export async function releaseCursorExecutionSlotLabels(opts) {
  const issueNumber = Number(opts.issueNumber);
  const labels = Array.isArray(opts.labels) && opts.labels.length
    ? opts.labels
    : [...ACTIVE_EXECUTION_LABELS];
  /** @type {string[]} */
  const removed = [];
  for (const label of labels) {
    if (opts.removeLabel) {
      await opts.removeLabel(issueNumber, label);
      removed.push(label);
      continue;
    }
    if (!opts.token || !opts.repo) {
      throw new Error('releaseCursorExecutionSlotLabels requires token/repo or removeLabel');
    }
    await removeIssueLabelApi(opts.token, opts.repo, issueNumber, label, opts.fetch);
    removed.push(label);
  }
  return { ok: true, issueNumber, removedLabels: removed };
}

/**
 * List closed issues carrying a label (for stale-label reconciliation).
 * @param {string} token
 * @param {string} repo
 * @param {string} label
 * @param {typeof fetch} [fetchFn]
 */
export async function listClosedIssuesByLabelGraphql(token, repo, label, fetchFn = globalThis.fetch) {
  const want = String(label || '').trim();
  if (!repo.includes('/')) throw new Error('repo must be owner/name');
  const [owner, name] = repo.split('/');
  /** @type {DispatchIssue[]} */
  const issues = [];
  let cursor = null;
  for (let page = 0; page < 5; page += 1) {
    const query = `query($owner:String!,$name:String!,$label:String!,$cursor:String){repository(owner:$owner,name:$name){issues(first:50,after:$cursor,labels:[$label],states:CLOSED){nodes{number title body url updatedAt createdAt state labels(first:20){nodes{name}}}pageInfo{hasNextPage endCursor}}}}`;
    const res = await fetchFn('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { owner, name, label: want, cursor } }),
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`GitHub GraphQL HTTP ${res.status}: ${text.slice(0, 300)}`);
    const json = JSON.parse(text);
    if (Array.isArray(json.errors) && json.errors.length) {
      throw new Error(`GitHub GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
    }
    const nodes = json?.data?.repository?.issues?.nodes;
    if (Array.isArray(nodes)) {
      for (const node of nodes) {
        const mapped = mapGitHubIssueToDispatchIssue(node);
        mapped.state = 'closed';
        issues.push(mapped);
      }
    }
    const pageInfo = json?.data?.repository?.issues?.pageInfo;
    if (!pageInfo?.hasNextPage) break;
    cursor = pageInfo.endCursor || null;
    if (!cursor) break;
  }
  return filterIssuesByLabel(issues, want);
}
