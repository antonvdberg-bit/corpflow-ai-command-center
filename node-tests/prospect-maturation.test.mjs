/**
 * Prospect Maturation and Nurture — unit tests (#713).
 *
 * Requirements-to-test matrix:
 *
 * R1  Canonical lifecycle stages map to existing PROSPECT_CANONICAL_STAGES
 * R2  Entry/exit criteria available via config for every stage
 * R3  owner, next_action, next_action_due required for every ACTIVE prospect
 * R4  closure_reason required for closure/terminal stages
 * R5  Lead Rescue qualification gate: business_name + email + region/source
 * R6  Website Rescue qualification gate: business_name + email + service_path
 * R7  Draft assets exist for all 8 communication types
 * R8  ALL draft assets have send=false (no external send)
 * R9  Module never imports any messaging sender (static import check)
 * R10 Overdue detection: active + next_action_due in past
 * R11 Stale detection: no meaningful activity for > stale_days_threshold
 * R12 Reactivation due: stalled + last activity > reactivation_window_days ago
 * R13 Daily operator summary counts: overdue, due today, stalled, missing owner, missing next action
 * R14 Weekly pipeline summary: by_stage counts and health indicator
 * R15 Stage transition guard enforces entry criteria (owner required for qualifying)
 * R16 Stage transition to lost/stalled requires closure_reason
 * R17 8 synthetic fixture scenarios load and produce expected signals/validation
 * R18 Existing prospect-operations-view-model tests still pass (run separately)
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  ACTIVE_STAGES,
  TERMINAL_STAGES,
  CLOSURE_STAGES,
  MATURATION_CONFIG,
  DRAFT_ASSETS_CONFIG,
  validateActiveProspectRequiredFields,
  validateClosureReason,
  validateProspect,
  getStageConfig,
  getStageEntryCriteria,
  getStageExitCriteria,
  getStageSlaHours,
  isActiveStage,
  isTerminalStage,
  isProspectOverdue,
  isProspectStale,
  isReactivationDue,
  getQualificationGate,
  checkQualificationGate,
  getDraftAsset,
  getDraftAssetIds,
  getDraftAssetsForStage,
  assertDraftAssetConfigNoSend,
  computeDailyOperatorSummary,
  computeWeeklyPipelineSummary,
  validateStageTransition,
} from '../lib/prospects/maturation.js';

import { PROSPECT_CANONICAL_STAGES } from '../lib/cmp/_lib/prospect-operations-view-model.js';

const _require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NOW = new Date('2026-08-04T12:00:00.000Z');

// ---------------------------------------------------------------------------
// Helper: load a fixture by scenario number
// ---------------------------------------------------------------------------
function loadFixture(n) {
  const pad = String(n).padStart(2, '0');
  const dir = path.join(__dirname, '..', 'fixtures', 'prospect-maturation');
  const files = [
    `${pad}-new-lead-rescue-prospect.json`,
    `${pad}-qualified-website-rescue-prospect.json`,
    `${pad}-overdue-prospect.json`,
    `${pad}-stalled-prospect.json`,
    `${pad}-lost-prospect-with-reason.json`,
    `${pad}-reactivation-due-prospect.json`,
    `${pad}-active-prospect-missing-owner.json`,
    `${pad}-active-prospect-missing-next-action.json`,
  ];
  for (const f of files) {
    try {
      return JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
    } catch {
      // try next
    }
  }
  throw new Error(`No fixture found for scenario ${n}`);
}

// ---------------------------------------------------------------------------
// R1 — Stage mapping to canonical stages
// ---------------------------------------------------------------------------
describe('prospect-maturation — R1 canonical stage alignment', () => {
  it('all active/terminal/closure stage keys are subsets of PROSPECT_CANONICAL_STAGES', () => {
    for (const s of ACTIVE_STAGES) {
      assert.ok(
        PROSPECT_CANONICAL_STAGES.includes(s),
        `Active stage '${s}' not in PROSPECT_CANONICAL_STAGES`,
      );
    }
    for (const s of TERMINAL_STAGES) {
      assert.ok(
        PROSPECT_CANONICAL_STAGES.includes(s),
        `Terminal stage '${s}' not in PROSPECT_CANONICAL_STAGES`,
      );
    }
    for (const s of CLOSURE_STAGES) {
      assert.ok(
        PROSPECT_CANONICAL_STAGES.includes(s),
        `Closure stage '${s}' not in PROSPECT_CANONICAL_STAGES`,
      );
    }
  });

  it('every PROSPECT_CANONICAL_STAGE appears in maturation config lifecycle_stages', () => {
    for (const s of PROSPECT_CANONICAL_STAGES) {
      const cfg = getStageConfig(s);
      assert.ok(cfg !== null, `Stage '${s}' missing from maturation config`);
    }
  });
});

// ---------------------------------------------------------------------------
// R2 — Entry/exit criteria
// ---------------------------------------------------------------------------
describe('prospect-maturation — R2 entry/exit criteria', () => {
  it('every active stage has non-empty entry and exit criteria', () => {
    for (const s of ACTIVE_STAGES) {
      const entry = getStageEntryCriteria(s);
      const exit = getStageExitCriteria(s);
      assert.ok(entry.length > 0, `Stage '${s}' missing entry criteria`);
      assert.ok(exit.length > 0, `Stage '${s}' missing exit criteria`);
    }
  });

  it('active stages have SLA hours defined', () => {
    for (const s of ACTIVE_STAGES) {
      const sla = getStageSlaHours(s);
      assert.ok(typeof sla === 'number' && sla > 0, `Stage '${s}' missing SLA hours`);
    }
  });

  it('terminal stages have null SLA (no active intervention expected)', () => {
    for (const s of TERMINAL_STAGES) {
      const sla = getStageSlaHours(s);
      assert.equal(sla, null, `Terminal stage '${s}' should have null SLA`);
    }
  });
});

// ---------------------------------------------------------------------------
// R3 — Required fields for active prospects
// ---------------------------------------------------------------------------
describe('prospect-maturation — R3 active prospect required fields', () => {
  it('valid active prospect with owner + next_action + next_action_due passes', () => {
    const p = {
      canonical_stage: 'qualifying',
      owner: 'anton',
      next_action: 'Book discovery call',
      next_action_due: '2026-08-10T09:00:00.000Z',
    };
    assert.deepEqual(validateActiveProspectRequiredFields(p), { valid: true });
  });

  it('active prospect missing owner fails with owner in missing list', () => {
    const p = {
      canonical_stage: 'qualifying',
      owner: null,
      next_action: 'Call prospect',
      next_action_due: '2026-08-10T09:00:00.000Z',
    };
    const result = validateActiveProspectRequiredFields(p);
    assert.equal(result.valid, false);
    assert.ok(result.missing.includes('owner'));
  });

  it('active prospect missing next_action fails', () => {
    const p = {
      canonical_stage: 'proposal_sent',
      owner: 'anton',
      next_action: null,
      next_action_due: '2026-08-10T09:00:00.000Z',
    };
    const result = validateActiveProspectRequiredFields(p);
    assert.equal(result.valid, false);
    assert.ok(result.missing.includes('next_action'));
  });

  it('active prospect missing next_action_due fails', () => {
    const p = {
      canonical_stage: 'qualifying',
      owner: 'anton',
      next_action: 'Send follow-up',
      next_action_due: null,
    };
    const result = validateActiveProspectRequiredFields(p);
    assert.equal(result.valid, false);
    assert.ok(result.missing.includes('next_action_due'));
  });

  it('non-active stage (won) skips required field validation', () => {
    const p = { canonical_stage: 'won', owner: null, next_action: null, next_action_due: null };
    assert.deepEqual(validateActiveProspectRequiredFields(p), { valid: true });
  });

  it('terminal stage (lost) skips active field validation', () => {
    const p = { canonical_stage: 'lost', owner: null, next_action: null };
    assert.deepEqual(validateActiveProspectRequiredFields(p), { valid: true });
  });
});

// ---------------------------------------------------------------------------
// R4 — Closure reason required for closure/terminal stages
// ---------------------------------------------------------------------------
describe('prospect-maturation — R4 closure reason', () => {
  it('lost stage without closure_reason fails', () => {
    const p = { canonical_stage: 'lost', closure_reason: null };
    const result = validateClosureReason(p);
    assert.equal(result.valid, false);
    assert.ok(result.missing.includes('closure_reason'));
  });

  it('lost stage with closure_reason passes', () => {
    const p = { canonical_stage: 'lost', closure_reason: 'No budget' };
    assert.deepEqual(validateClosureReason(p), { valid: true });
  });

  it('stalled stage without closure_reason fails', () => {
    const p = { canonical_stage: 'stalled', closure_reason: '' };
    const result = validateClosureReason(p);
    assert.equal(result.valid, false);
  });

  it('active stage (qualifying) does not require closure_reason', () => {
    const p = { canonical_stage: 'qualifying', closure_reason: null };
    assert.deepEqual(validateClosureReason(p), { valid: true });
  });
});

// ---------------------------------------------------------------------------
// R5 — Lead Rescue qualification gate
// ---------------------------------------------------------------------------
describe('prospect-maturation — R5 Lead Rescue qualification gate', () => {
  it('exposes ai_lead_rescue gate config', () => {
    const gate = getQualificationGate('ai_lead_rescue');
    assert.ok(gate !== null);
    assert.ok(Array.isArray(gate.required));
    assert.ok(gate.required.length >= 4);
  });

  it('qualified Lead Rescue prospect passes gate check', () => {
    const p = {
      business_name: 'Alice Spa',
      email: 'alice@example-spa.com',
      product_service_path: 'ai-lead-rescue',
      qualification_complete: true,
    };
    const result = checkQualificationGate(p, 'ai_lead_rescue');
    assert.equal(result.qualified, true);
  });

  it('Lead Rescue prospect missing business_name fails gate', () => {
    const p = {
      business_name: null,
      email: 'alice@example-spa.com',
      product_service_path: 'ai-lead-rescue',
      qualification_complete: true,
    };
    const result = checkQualificationGate(p, 'ai_lead_rescue');
    assert.equal(result.qualified, false);
    assert.ok(result.missing.includes('business_name'));
  });

  it('Lead Rescue prospect missing email fails gate', () => {
    const p = {
      business_name: 'Alice Spa',
      email: null,
      product_service_path: 'ai-lead-rescue',
      qualification_complete: true,
    };
    const result = checkQualificationGate(p, 'ai_lead_rescue');
    assert.equal(result.qualified, false);
    assert.ok(result.missing.includes('email'));
  });

  it('Lead Rescue prospect with qualification_complete=false fails gate', () => {
    const p = {
      business_name: 'Alice Spa',
      email: 'alice@example-spa.com',
      product_service_path: 'ai-lead-rescue',
      qualification_complete: false,
    };
    const result = checkQualificationGate(p, 'ai_lead_rescue');
    assert.equal(result.qualified, false);
    assert.ok(result.missing.includes('qualification_complete_flag'));
  });
});

// ---------------------------------------------------------------------------
// R6 — Website Rescue qualification gate
// ---------------------------------------------------------------------------
describe('prospect-maturation — R6 Website Rescue qualification gate', () => {
  it('exposes website_rescue gate config', () => {
    const gate = getQualificationGate('website_rescue');
    assert.ok(gate !== null);
    assert.ok(Array.isArray(gate.required));
  });

  it('qualified Website Rescue prospect passes gate check', () => {
    const p = {
      business_name: 'Bernard Boutique Hotel',
      email: 'bernard@example-hotel.com',
      product_service_path: 'website_rescue',
      qualification_complete: true,
    };
    const result = checkQualificationGate(p, 'website_rescue');
    assert.equal(result.qualified, true);
  });

  it('Website Rescue prospect missing service path fails gate', () => {
    const p = {
      business_name: 'Bernard Boutique Hotel',
      email: 'bernard@example-hotel.com',
      product_service_path: null,
      qualification_complete: true,
    };
    const result = checkQualificationGate(p, 'website_rescue');
    assert.equal(result.qualified, false);
    assert.ok(result.missing.includes('service_path_or_product'));
  });

  it('unknown gate key returns not qualified with missing gate error', () => {
    const p = { business_name: 'X', email: 'x@x.com', product_service_path: 'x' };
    const result = checkQualificationGate(p, 'nonexistent_product');
    assert.equal(result.qualified, false);
    assert.ok(result.missing.some((m) => m.startsWith('unknown_gate:')));
  });
});

// ---------------------------------------------------------------------------
// R7 — Draft assets exist for all required types
// ---------------------------------------------------------------------------
describe('prospect-maturation — R7 draft asset coverage', () => {
  const REQUIRED_ASSET_IDS = [
    'acknowledgement',
    'qualification_outreach',
    'discovery_invite',
    'follow_up_no_response',
    'nurture_value_share',
    'objection_response',
    'proposal_handoff',
    'lost_close',
    'stalled_check_in',
    'reactivation',
  ];

  it('all required draft assets are present', () => {
    const ids = getDraftAssetIds();
    for (const id of REQUIRED_ASSET_IDS) {
      assert.ok(ids.includes(id), `Missing draft asset: ${id}`);
    }
  });

  it('getDraftAsset returns asset with expected structure', () => {
    const asset = getDraftAsset('acknowledgement');
    assert.ok(asset !== null);
    assert.ok(typeof asset.subject_template === 'string');
    assert.ok(typeof asset.body_template === 'string');
    assert.ok(Array.isArray(asset.variables));
    assert.ok(typeof asset.stage_trigger === 'string');
  });

  it('getDraftAsset returns null for unknown id', () => {
    assert.equal(getDraftAsset('does_not_exist'), null);
  });

  it('getDraftAssetsForStage returns correct assets for qualifying stage', () => {
    const assets = getDraftAssetsForStage('qualifying');
    assert.ok(assets.length >= 2, 'Expected at least 2 qualifying assets');
    for (const a of assets) {
      assert.equal(a.stage_trigger, 'qualifying');
    }
  });
});

// ---------------------------------------------------------------------------
// R8 — ALL draft assets have send=false (no external send)
// ---------------------------------------------------------------------------
describe('prospect-maturation — R8 no-send guarantee', () => {
  it('draft asset config global $send flag is false', () => {
    assert.equal(DRAFT_ASSETS_CONFIG.$send, false);
    assert.equal(DRAFT_ASSETS_CONFIG.$protected, true);
  });

  it('every individual draft asset has send=false', () => {
    const ids = getDraftAssetIds();
    for (const id of ids) {
      const asset = getDraftAsset(id);
      assert.equal(
        asset?.send,
        false,
        `Draft asset '${id}' must have send=false`,
      );
    }
  });

  it('assertDraftAssetConfigNoSend returns safe=true', () => {
    const result = assertDraftAssetConfigNoSend();
    assert.equal(result.safe, true, `No-send assertion failed: ${JSON.stringify(result)}`);
  });

  it('getDraftAsset always enforces send=false even if config were mutated', () => {
    const asset = getDraftAsset('acknowledgement');
    assert.ok(asset !== null);
    assert.equal(asset.send, false);
    assert.equal(asset.protected, true);
  });
});

// ---------------------------------------------------------------------------
// R9 — Module does not import any messaging sender
// ---------------------------------------------------------------------------
describe('prospect-maturation — R9 no sender imports', () => {
  it('maturation.js import statements do not reference email/WhatsApp/SMS senders', () => {
    const src = readFileSync(
      path.join(__dirname, '..', 'lib', 'prospects', 'maturation.js'),
      'utf8',
    );
    // Extract only import/require lines to avoid false positives in comments or docs.
    const importLines = src
      .split('\n')
      .filter((line) => /^\s*(import\s|from\s|require\s*\()/.test(line))
      .join('\n')
      .toLowerCase();
    const forbidden = [
      'nodemailer',
      'sendgrid',
      '@sendgrid',
      'mailgun',
      'twilio',
      'send-email',
      'send-sms',
      'send-message',
      'aws-sdk/ses',
      'resend',
      'postmark',
    ];
    for (const f of forbidden) {
      assert.ok(
        !importLines.includes(f.toLowerCase()),
        `maturation.js imports forbidden sender: ${f}`,
      );
    }
  });

  it('draft assets config does not reference any send endpoint', () => {
    const raw = JSON.stringify(DRAFT_ASSETS_CONFIG);
    const forbidden = ['smtp', 'twilio', 'whatsapp.com/api', 'send_email', 'dispatch_sms'];
    for (const f of forbidden) {
      assert.ok(
        !raw.toLowerCase().includes(f.toLowerCase()),
        `draft assets config references forbidden send endpoint: ${f}`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// R10 — Overdue detection
// ---------------------------------------------------------------------------
describe('prospect-maturation — R10 overdue detection', () => {
  it('returns true for active prospect with past due date', () => {
    const p = {
      canonical_stage: 'qualifying',
      owner: 'anton',
      next_action: 'Call',
      next_action_due: '2026-07-30T09:00:00.000Z',
      last_meaningful_activity_at: '2026-07-30T09:00:00.000Z',
    };
    assert.equal(isProspectOverdue(p, NOW), true);
  });

  it('returns false for active prospect with future due date', () => {
    const p = {
      canonical_stage: 'qualifying',
      owner: 'anton',
      next_action: 'Call',
      next_action_due: '2026-08-20T09:00:00.000Z',
      last_meaningful_activity_at: NOW.toISOString(),
    };
    assert.equal(isProspectOverdue(p, NOW), false);
  });

  it('returns false for non-active stage (won)', () => {
    const p = {
      canonical_stage: 'won',
      next_action_due: '2026-07-01T00:00:00.000Z',
    };
    assert.equal(isProspectOverdue(p, NOW), false);
  });

  it('fixture 03 (overdue) is detected as overdue', () => {
    const fixture = loadFixture(3);
    assert.equal(isProspectOverdue(fixture, NOW), true);
  });
});

// ---------------------------------------------------------------------------
// R11 — Stale detection
// ---------------------------------------------------------------------------
describe('prospect-maturation — R11 stale detection', () => {
  it('returns true when last activity is older than stale_days_threshold', () => {
    const p = { last_meaningful_activity_at: '2026-07-01T00:00:00.000Z' };
    assert.equal(isProspectStale(p, NOW), true);
  });

  it('returns false when last activity is recent', () => {
    const p = { last_meaningful_activity_at: NOW.toISOString() };
    assert.equal(isProspectStale(p, NOW), false);
  });

  it('returns true when no last activity recorded', () => {
    const p = {};
    assert.equal(isProspectStale(p, NOW), true);
  });

  it('respects custom staleDays threshold', () => {
    const p = { last_meaningful_activity_at: '2026-08-03T00:00:00.000Z' };
    assert.equal(isProspectStale(p, NOW, 0.5), true);
    assert.equal(isProspectStale(p, NOW, 30), false);
  });
});

// ---------------------------------------------------------------------------
// R12 — Reactivation due detection
// ---------------------------------------------------------------------------
describe('prospect-maturation — R12 reactivation due', () => {
  it('returns false for non-stalled stage', () => {
    const p = {
      canonical_stage: 'qualifying',
      last_meaningful_activity_at: '2026-01-01T00:00:00.000Z',
    };
    assert.equal(isReactivationDue(p, NOW), false);
  });

  it('returns true for stalled prospect with last activity > 90 days ago', () => {
    const p = {
      canonical_stage: 'stalled',
      last_meaningful_activity_at: '2026-04-01T00:00:00.000Z',
    };
    assert.equal(isReactivationDue(p, NOW), true);
  });

  it('returns false for stalled prospect with last activity within 90 days', () => {
    const p = {
      canonical_stage: 'stalled',
      last_meaningful_activity_at: '2026-07-28T00:00:00.000Z',
    };
    assert.equal(isReactivationDue(p, NOW), false);
  });

  it('fixture 06 (reactivation-due) triggers reactivation detection', () => {
    const fixture = loadFixture(6);
    assert.equal(isReactivationDue(fixture, NOW), true);
  });

  it('fixture 04 (stalled but recent) does not trigger reactivation', () => {
    const fixture = loadFixture(4);
    assert.equal(isReactivationDue(fixture, NOW), false);
  });
});

// ---------------------------------------------------------------------------
// R13 — Daily operator summary
// ---------------------------------------------------------------------------
describe('prospect-maturation — R13 daily operator summary', () => {
  it('returns zeroed summary for empty list', () => {
    const summary = computeDailyOperatorSummary([], NOW);
    assert.equal(summary.total, 0);
    assert.equal(summary.overdue, 0);
    assert.equal(summary.missing_owner, 0);
  });

  it('counts overdue, missing owner, new_unreviewed correctly', () => {
    const prospects = [
      {
        id: 'a',
        canonical_stage: 'qualifying',
        owner: 'anton',
        next_action: 'Call',
        next_action_due: '2026-07-30T00:00:00.000Z',
        last_meaningful_activity_at: NOW.toISOString(),
      },
      {
        id: 'b',
        canonical_stage: 'qualifying',
        owner: null,
        next_action: null,
        next_action_due: null,
        last_meaningful_activity_at: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'c',
        canonical_stage: 'new',
        native_status: 'NEW_INTAKE',
        owner: 'anton',
        next_action: null,
        next_action_due: null,
        last_meaningful_activity_at: NOW.toISOString(),
      },
      {
        id: 'd',
        canonical_stage: 'lost',
        owner: null,
        closure_reason: 'No budget',
        last_meaningful_activity_at: '2026-06-01T00:00:00.000Z',
      },
    ];
    const summary = computeDailyOperatorSummary(prospects, NOW);
    assert.equal(summary.total, 4);
    assert.equal(summary.overdue, 1);
    assert.equal(summary.missing_owner, 1);
    assert.equal(summary.new_unreviewed, 1);
    assert.ok(summary.action_required_ids.includes('a'));
    assert.ok(summary.action_required_ids.includes('b'));
    assert.ok(summary.action_required_ids.includes('c'));
    assert.ok(!summary.action_required_ids.includes('d'));
  });

  it('includes generated_at ISO timestamp', () => {
    const summary = computeDailyOperatorSummary([], NOW);
    assert.equal(summary.generated_at, NOW.toISOString());
  });
});

// ---------------------------------------------------------------------------
// R14 — Weekly pipeline summary
// ---------------------------------------------------------------------------
describe('prospect-maturation — R14 weekly pipeline summary', () => {
  it('returns by_stage counts and correct total', () => {
    const prospects = [
      { canonical_stage: 'new' },
      { canonical_stage: 'qualifying' },
      { canonical_stage: 'qualifying' },
      { canonical_stage: 'lost' },
    ];
    const summary = computeWeeklyPipelineSummary(prospects, NOW);
    assert.equal(summary.total, 4);
    assert.equal(summary.by_stage.new, 1);
    assert.equal(summary.by_stage.qualifying, 2);
    assert.equal(summary.by_stage.lost, 1);
    assert.equal(summary.terminal, 1);
  });

  it('health is critical when >50% active prospects are stale', () => {
    const staleDate = '2026-06-01T00:00:00.000Z';
    const prospects = [
      { canonical_stage: 'qualifying', last_meaningful_activity_at: staleDate },
      { canonical_stage: 'qualifying', last_meaningful_activity_at: staleDate },
      { canonical_stage: 'qualifying', last_meaningful_activity_at: staleDate },
      { canonical_stage: 'qualifying', last_meaningful_activity_at: NOW.toISOString() },
    ];
    const summary = computeWeeklyPipelineSummary(prospects, NOW);
    assert.equal(summary.health, 'critical');
    assert.equal(summary.stale_active, 3);
  });

  it('health is healthy when no active prospects are stale', () => {
    const prospects = [
      { canonical_stage: 'qualifying', last_meaningful_activity_at: NOW.toISOString() },
      { canonical_stage: 'proposal_sent', last_meaningful_activity_at: NOW.toISOString() },
    ];
    const summary = computeWeeklyPipelineSummary(prospects, NOW);
    assert.equal(summary.health, 'healthy');
    assert.equal(summary.stale_active, 0);
  });
});

// ---------------------------------------------------------------------------
// R15 — Stage transition guard (entry criteria)
// ---------------------------------------------------------------------------
describe('prospect-maturation — R15 stage transition guard', () => {
  it('new → qualifying requires owner', () => {
    const p = { canonical_stage: 'new', owner: null };
    const result = validateStageTransition(p, 'qualifying');
    assert.equal(result.allowed, false);
    assert.ok(result.reason.includes('Owner'));
  });

  it('new → qualifying succeeds with owner', () => {
    const p = { canonical_stage: 'new', owner: 'anton' };
    const result = validateStageTransition(p, 'qualifying');
    assert.equal(result.allowed, true);
  });

  it('qualifying → discovery_booked requires owner', () => {
    const p = { canonical_stage: 'qualifying', owner: null };
    const result = validateStageTransition(p, 'discovery_booked');
    assert.equal(result.allowed, false);
  });

  it('qualifying → discovery_booked succeeds with owner', () => {
    const p = { canonical_stage: 'qualifying', owner: 'anton' };
    const result = validateStageTransition(p, 'discovery_booked');
    assert.equal(result.allowed, true);
  });

  it('qualifying → won is rejected by canonical transition guard', () => {
    const p = { canonical_stage: 'qualifying', owner: 'anton' };
    const result = validateStageTransition(p, 'won');
    assert.equal(result.allowed, false);
    assert.ok(result.reason.includes('not allowed'));
  });

  it('transition to unknown stage is rejected', () => {
    const p = { canonical_stage: 'qualifying', owner: 'anton' };
    const result = validateStageTransition(p, 'bogus_stage');
    assert.equal(result.allowed, false);
  });
});

// ---------------------------------------------------------------------------
// R16 — Stage transition to closure requires reason
// ---------------------------------------------------------------------------
describe('prospect-maturation — R16 closure reason required on transition', () => {
  it('qualifying → lost requires closure_reason', () => {
    const p = { canonical_stage: 'qualifying', owner: 'anton', closure_reason: null };
    const result = validateStageTransition(p, 'lost');
    assert.equal(result.allowed, false);
    assert.ok(result.reason.includes('closure_reason'));
  });

  it('qualifying → lost succeeds with closure_reason', () => {
    const p = { canonical_stage: 'qualifying', owner: 'anton', closure_reason: 'No budget' };
    const result = validateStageTransition(p, 'lost');
    assert.equal(result.allowed, true);
  });

  it('qualifying → stalled requires closure_reason', () => {
    const p = { canonical_stage: 'qualifying', owner: 'anton', closure_reason: '' };
    const result = validateStageTransition(p, 'stalled');
    assert.equal(result.allowed, false);
  });

  it('qualifying → not_fit requires closure_reason', () => {
    const p = { canonical_stage: 'qualifying', owner: 'anton', closure_reason: null };
    const result = validateStageTransition(p, 'not_fit');
    assert.equal(result.allowed, false);
  });
});

// ---------------------------------------------------------------------------
// R17 — 8 synthetic fixture scenarios
// ---------------------------------------------------------------------------
describe('prospect-maturation — R17 synthetic fixtures', () => {
  it('fixture 01: new Lead Rescue prospect — missing owner/next_action/next_action_due', () => {
    const f = loadFixture(1);
    assert.equal(f.canonical_stage, 'new');
    assert.equal(isActiveStage(f.canonical_stage), true);
    assert.equal(f.owner, null);
    const v = validateProspect(f);
    assert.equal(v.valid, false);
    const activeError = v.errors.find((e) => e.check === 'active_fields');
    assert.ok(activeError);
    assert.ok(activeError.missing.includes('owner'));
    assert.ok(activeError.missing.includes('next_action'));
    assert.ok(activeError.missing.includes('next_action_due'));
  });

  it('fixture 02: qualified Website Rescue — passes validation', () => {
    const f = loadFixture(2);
    assert.equal(f.canonical_stage, 'discovery_booked');
    assert.equal(isActiveStage(f.canonical_stage), true);
    const v = validateProspect(f);
    assert.equal(v.valid, true, `Expected valid but got errors: ${JSON.stringify(v.errors)}`);
  });

  it('fixture 03: overdue prospect — detected as overdue', () => {
    const f = loadFixture(3);
    assert.equal(f.canonical_stage, 'qualifying');
    assert.equal(isProspectOverdue(f, NOW), true);
    const v = validateProspect(f);
    assert.equal(v.valid, true);
  });

  it('fixture 04: stalled prospect — not active, has closure reason', () => {
    const f = loadFixture(4);
    assert.equal(f.canonical_stage, 'stalled');
    assert.equal(isActiveStage(f.canonical_stage), false);
    assert.ok(f.closure_reason && f.closure_reason.length > 0);
    const v = validateProspect(f);
    assert.equal(v.valid, true);
  });

  it('fixture 05: lost prospect with reason — terminal, closure valid', () => {
    const f = loadFixture(5);
    assert.equal(f.canonical_stage, 'lost');
    assert.equal(isTerminalStage(f.canonical_stage), true);
    assert.ok(f.closure_reason);
    const v = validateProspect(f);
    assert.equal(v.valid, true);
  });

  it('fixture 06: reactivation-due — stalled + last activity >90 days', () => {
    const f = loadFixture(6);
    assert.equal(f.canonical_stage, 'stalled');
    assert.equal(isReactivationDue(f, NOW), true);
  });

  it('fixture 07: active missing owner — validation fails on owner', () => {
    const f = loadFixture(7);
    assert.equal(f.canonical_stage, 'qualifying');
    assert.equal(isActiveStage(f.canonical_stage), true);
    assert.equal(f.owner, null);
    const v = validateProspect(f);
    assert.equal(v.valid, false);
    const activeError = v.errors.find((e) => e.check === 'active_fields');
    assert.ok(activeError);
    assert.ok(activeError.missing.includes('owner'));
  });

  it('fixture 08: active missing next_action + next_action_due — validation fails', () => {
    const f = loadFixture(8);
    assert.equal(f.canonical_stage, 'proposal_sent');
    assert.equal(isActiveStage(f.canonical_stage), true);
    assert.equal(f.next_action, null);
    assert.equal(f.next_action_due, null);
    const v = validateProspect(f);
    assert.equal(v.valid, false);
    const activeError = v.errors.find((e) => e.check === 'active_fields');
    assert.ok(activeError);
    assert.ok(activeError.missing.includes('next_action'));
    assert.ok(activeError.missing.includes('next_action_due'));
  });
});

// ---------------------------------------------------------------------------
// Combined: all 8 fixtures load without JSON parse errors
// ---------------------------------------------------------------------------
describe('prospect-maturation — fixture file integrity', () => {
  it('all 8 fixture files are valid JSON with required id field', () => {
    for (let n = 1; n <= 8; n += 1) {
      const f = loadFixture(n);
      assert.ok(f.id, `Fixture ${n} missing id`);
      assert.ok(f.canonical_stage, `Fixture ${n} missing canonical_stage`);
      assert.ok(PROSPECT_CANONICAL_STAGES.includes(f.canonical_stage), `Fixture ${n} canonical_stage invalid`);
    }
  });
});

// ---------------------------------------------------------------------------
// Maturation config integrity
// ---------------------------------------------------------------------------
describe('prospect-maturation — config integrity', () => {
  it('maturation config has correct version and required top-level keys', () => {
    assert.equal(MATURATION_CONFIG.$schema_version, '1');
    assert.ok(MATURATION_CONFIG.lifecycle_stages);
    assert.ok(MATURATION_CONFIG.qualification_gates);
    assert.ok(MATURATION_CONFIG.nurture_config);
    assert.ok(Array.isArray(MATURATION_CONFIG.active_stage_keys));
    assert.ok(Array.isArray(MATURATION_CONFIG.terminal_stage_keys));
  });

  it('nurture config has stale_days_threshold and reactivation_window_days', () => {
    const nc = MATURATION_CONFIG.nurture_config;
    assert.ok(typeof nc.stale_days_threshold === 'number' && nc.stale_days_threshold > 0);
    assert.ok(typeof nc.reactivation_window_days === 'number' && nc.reactivation_window_days > 0);
    assert.ok(Array.isArray(nc.follow_up_cadence_days));
  });

  it('draft assets config has $send=false and $protected=true', () => {
    assert.equal(DRAFT_ASSETS_CONFIG.$send, false);
    assert.equal(DRAFT_ASSETS_CONFIG.$protected, true);
    assert.ok(DRAFT_ASSETS_CONFIG.$warning);
    assert.ok(typeof DRAFT_ASSETS_CONFIG.draft_assets === 'object');
  });
});

// ---------------------------------------------------------------------------
// isActiveStage / isTerminalStage helpers
// ---------------------------------------------------------------------------
describe('prospect-maturation — stage classification helpers', () => {
  it('isActiveStage returns true for all active_stage_keys', () => {
    for (const s of ACTIVE_STAGES) {
      assert.equal(isActiveStage(s), true, `Expected ${s} to be active`);
    }
  });

  it('isActiveStage returns false for stalled/won/delivery/lost/not_fit', () => {
    for (const s of ['stalled', 'won', 'delivery', 'lost', 'not_fit']) {
      assert.equal(isActiveStage(s), false, `Expected ${s} to be non-active`);
    }
  });

  it('isTerminalStage returns true only for lost and not_fit', () => {
    assert.equal(isTerminalStage('lost'), true);
    assert.equal(isTerminalStage('not_fit'), true);
    assert.equal(isTerminalStage('stalled'), false);
    assert.equal(isTerminalStage('qualifying'), false);
  });
});
