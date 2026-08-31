import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatDurableApproval } from '../lib/server/anton-decision-inbox.js';
import {
  evaluateOperatorGateAuthorization,
  formatOperatorGateAuthorization,
  parseExplicitOperatorAuthorizationText,
  parseOperatorGateAuthorizationRecords,
} from '../lib/server/operator-gate-authorization.js';
import {
  inferIssueClassification,
  planCursorIssueClaims,
} from '../lib/server/cursor-issue-dispatch-lifecycle.js';
import { CURSOR_WIP_MAX_SLOTS } from '../lib/server/cursor-wip-control.js';

/** Synthetic #879-style body — inspect/access only (subject mention, not consequential). */
const ISSUE_879_BODY = `Source: Anton decision 2026-08-11
## Explicit Anton authorization
Anton has authorized Cursor to use the full ERPNext access already granted.
## Objective
Inspect ERPNext Company, Customer, database-backed DocTypes for commercial work.
Do not request credentials or secrets.
`;

/** Affirmative schema mutation — claim-blocking without exact-gate auth. */
const ISSUE_SCHEMA_MUTATION_BODY = `Actual schema migration and data mutation required.
Run prisma migrate to alter Postgres schema and backfill rows.
This is a real DB/schema change packet.
Requires protected gate: database.`;

const ISSUE_879_AUTH_COMMENT = `ANTON EXPLICIT OPERATOR AUTHORIZATION — ERPNext ACCESS UNLOCK

Anton has explicitly authorized Cursor to use the full ERPNext access that was previously granted to it.

Authorization intent:
- This authorization is intended to remove the dispatcher \`protected gate: database\` block that prevented #879 from even testing access.
- Do not request credentials, tokens, passwords, cookies or secrets from Anton.

Next action: claim and execute #879 immediately.`;

/** Synthetic #886-style body (stuck after source authorization, no structured marker). */
const ISSUE_886_BODY = `Supersedes dispatch mechanics only for #879.

Source authorization: Anton 2026-08-11 has explicitly authorized Cursor to use the full ERPNext application access already granted to its existing authorized session/integration.

## Outcome
Connect to ERPNext using already-authorized access.

## Do now
- Do not touch CorpFlowAI Postgres, repository schema, environment variables or unrelated infrastructure.
- Do not perform real payment, external send or public launch actions.

This is an ERPNext application/integration task, not a CorpFlowAI database/schema task. No agent merge required.`;

/** #893-style — secrets consequential already authorized in the active task. */
const ISSUE_893_BODY = `Operator authorization: Anton 2026-08-12
## Explicit operator approval
Anton has explicitly approved wiring the already-authorized ERPNext access into Cursor Cloud using the secure Cursor environment/settings path.
No credentials, tokens, keys, cookies, session material or private client data may be pasted into GitHub.
Authorized by Anton for this workstream:
- secure Cursor Cloud environment/settings configuration needed solely to connect to the approved ERPNext sandbox;
Still not authorized:
- changing CorpFlowAI production DB/schema;
- real payments;
- unrelated env/secrets changes;
`;

function gatedReadyIssue(number, body, comments = []) {
  return {
    number,
    title: `P0 ERPNext gated issue #${number}`,
    body,
    labels: ['priority:P0', 'dispatch:cursor-ready'],
    comments,
  };
}

function verifiedActiveIssue(number, runId) {
  return {
    number,
    title: `Active ${number}`,
    body: 'docs only',
    labels: ['dispatch:cursor-claimed', 'status:in-progress'],
    comments: [
      {
        body: `CURSOR DISPATCH ACTIVATED\n\nIssue: #${number}\nCursor run identifier: ${runId}\n`,
      },
    ],
  };
}

describe('operator-gate-authorization', () => {
  it('formats and parses machine-readable operator gate authorization', () => {
    const text = formatOperatorGateAuthorization({
      issue: 886,
      gate: 'database',
      author: 'antonvdberg-bit',
      decision: 'approve',
      recorded_at: '2026-08-11T05:02:03.000Z',
      notes: 'unlock',
    });
    assert.match(text, /### OPERATOR GATE AUTHORIZATION/);
    assert.match(text, /corpflow\.operator_gate_authorization\.v1/);
    const parsed = parseOperatorGateAuthorizationRecords(text);
    assert.equal(parsed.length >= 1, true);
    assert.equal(parsed.some((r) => r.gate === 'database' && r.decision === 'approve'), true);
  });

  it('parses free-form Anton unlock that names protected gate: database', () => {
    const records = parseExplicitOperatorAuthorizationText(ISSUE_879_AUTH_COMMENT, {
      author: 'antonvdberg-bit',
      created_at: '2026-08-11T05:02:03Z',
    });
    assert.equal(records.length, 1);
    assert.equal(records[0].gate, 'database');
    assert.equal(records[0].decision, 'approve');
  });

  it('#879 inspect/access subject mention is not claim-blocking (#896)', () => {
    const issue = gatedReadyIssue(879, ISSUE_879_BODY, []);
    const c = inferIssueClassification(issue);
    assert.equal(c.protectedGate, 'none');
    assert.ok((c.protectedSubjectsMentioned || []).includes('database'));
    const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
    const d = plan.decisions.find((x) => x.issue.number === 879);
    assert.equal(d?.eligibleToClaim, true);
    assert.equal(d?.decision, 'claim');
  });

  it('1) consequential database mutation with no operator authorization -> eligible=false', () => {
    const issue = gatedReadyIssue(9001, ISSUE_SCHEMA_MUTATION_BODY, []);
    assert.equal(inferIssueClassification(issue).protectedGate, 'database');
    const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
    const d = plan.decisions.find((x) => x.issue.number === 9001);
    assert.equal(d?.eligibleToClaim, false);
    assert.equal(d?.decision, 'discover_only');
    assert.match(String(d?.reason || ''), /no valid operator authorization|wait for Anton unlock/);
  });

  it('2) matching explicit authorization -> eligible=true when capacity exists', () => {
    const issue = gatedReadyIssue(9001, ISSUE_SCHEMA_MUTATION_BODY, [
      {
        body: ISSUE_879_AUTH_COMMENT,
        author: 'antonvdberg-bit',
        created_at: '2026-08-11T05:02:03Z',
      },
    ]);
    const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
    const d = plan.decisions.find((x) => x.issue.number === 9001);
    assert.equal(d?.eligibleToClaim, true);
    assert.equal(d?.decision, 'claim');
    assert.equal(plan.activationTargetIssue, 9001);
  });

  it('3) authorization for another gate -> still eligible=false', () => {
    const authSecrets = formatOperatorGateAuthorization({
      issue: 9001,
      gate: 'secrets',
      author: 'antonvdberg-bit',
      decision: 'approve',
      recorded_at: '2026-08-11T06:00:00.000Z',
    });
    const issue = gatedReadyIssue(9001, ISSUE_SCHEMA_MUTATION_BODY, [
      {
        body: authSecrets,
        author: 'antonvdberg-bit',
        created_at: '2026-08-11T06:00:00.000Z',
      },
    ]);
    const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
    const d = plan.decisions.find((x) => x.issue.number === 9001);
    assert.equal(d?.eligibleToClaim, false);
    assert.match(String(d?.reason || ''), /no valid operator authorization|protected gate database/);
  });

  it('4) newer rejection/revocation -> eligible=false', () => {
    const approve = formatOperatorGateAuthorization({
      issue: 9001,
      gate: 'database',
      author: 'antonvdberg-bit',
      decision: 'approve',
      recorded_at: '2026-08-11T05:00:00.000Z',
    });
    const revoke = formatOperatorGateAuthorization({
      issue: 9001,
      gate: 'database',
      author: 'antonvdberg-bit',
      decision: 'revoke',
      recorded_at: '2026-08-11T07:00:00.000Z',
    });
    const issue = gatedReadyIssue(9001, ISSUE_SCHEMA_MUTATION_BODY, [
      { body: approve, author: 'antonvdberg-bit', created_at: '2026-08-11T05:00:00.000Z' },
      { body: revoke, author: 'antonvdberg-bit', created_at: '2026-08-11T07:00:00.000Z' },
    ]);
    const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
    const d = plan.decisions.find((x) => x.issue.number === 9001);
    assert.equal(d?.eligibleToClaim, false);
    assert.match(String(d?.reason || ''), /revoke/);
  });

  it('5) rescan with same authorization remains eligible; no duplicate activation when claimed', () => {
    const auth = formatOperatorGateAuthorization({
      issue: 886,
      gate: 'database',
      author: 'antonvdberg-bit',
      decision: 'approve',
      recorded_at: '2026-08-11T05:02:03.000Z',
    });
    const comments = [
      { body: auth, author: 'antonvdberg-bit', created_at: '2026-08-11T05:02:03.000Z' },
    ];
    const ready = gatedReadyIssue(886, ISSUE_886_BODY, comments);
    const plan1 = planCursorIssueClaims({ readyIssues: [ready], claimedIssues: [] });
    assert.equal(plan1.decisions[0]?.eligibleToClaim, true);
    assert.equal(plan1.decisions[0]?.decision, 'claim');

    const plan2 = planCursorIssueClaims({ readyIssues: [ready], claimedIssues: [] });
    assert.equal(plan2.decisions[0]?.eligibleToClaim, true);
    assert.equal(plan2.claimIssueNumbers.length, 1);

    const claimed = {
      ...ready,
      labels: ['priority:P0', 'dispatch:cursor-claimed', 'status:in-progress'],
    };
    const plan3 = planCursorIssueClaims({
      readyIssues: [claimed],
      claimedIssues: [claimed],
      trackedIssues: [claimed],
    });
    const dClaimed = plan3.decisions.find((x) => x.issue.number === 886);
    assert.equal(dClaimed?.eligibleToClaim, false);
    assert.equal(dClaimed?.decision, 'discover_only');
    assert.match(String(dClaimed?.reason || ''), /already claimed/);
    assert.equal(plan3.claimIssueNumbers.includes(886), false);
  });

  it('6) WIP at catch-up cap still holds authorized work', () => {
    const authA = formatOperatorGateAuthorization({
      issue: 901,
      gate: 'database',
      author: 'Anton',
      decision: 'approve',
      recorded_at: '2026-08-11T05:00:00.000Z',
    });
    const authB = formatOperatorGateAuthorization({
      issue: 902,
      gate: 'database',
      author: 'Anton',
      decision: 'approve',
      recorded_at: '2026-08-11T05:00:00.000Z',
    });
    const authC = formatOperatorGateAuthorization({
      issue: 903,
      gate: 'database',
      author: 'Anton',
      decision: 'approve',
      recorded_at: '2026-08-11T05:00:00.000Z',
    });

    const mk = (n, auth) =>
      gatedReadyIssue(n, `${ISSUE_SCHEMA_MUTATION_BODY}\nissue ${n}`, [
        { body: auth, author: 'antonvdberg-bit', created_at: '2026-08-11T05:00:00.000Z' },
      ]);

    const verifiedActive = [
      verifiedActiveIssue(10, 'run-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ];

    const plan = planCursorIssueClaims({
      readyIssues: [mk(901, authA), mk(902, authB), mk(903, authC)],
      claimedIssues: verifiedActive,
      trackedIssues: [...verifiedActive, mk(901, authA), mk(902, authB), mk(903, authC)],
    });

    assert.equal(plan.wipLimits.maxActiveCursorImplementationIssues, CURSOR_WIP_MAX_SLOTS);
    assert.equal(plan.verifiedActiveCount, CURSOR_WIP_MAX_SLOTS);
    assert.equal(plan.availableSlots, 0);
    assert.deepEqual(plan.claimIssueNumbers, []);
    // Eligible under authorization, but held by WIP (eligible=true + discover_only).
    for (const n of [901, 902, 903]) {
      const d = plan.decisions.find((x) => x.issue.number === n);
      assert.equal(d?.eligibleToClaim, true, `issue ${n} should remain eligible`);
      assert.equal(d?.decision, 'discover_only');
      assert.match(String(d?.reason || ''), /WIP cap reached/);
    }
  });

  it('6b) one verified run leaves zero catch-up slots', () => {
    const auth = formatOperatorGateAuthorization({
      issue: 904,
      gate: 'database',
      author: 'Anton',
      decision: 'approve',
      recorded_at: '2026-08-11T05:00:00.000Z',
    });
    const ready = gatedReadyIssue(904, `${ISSUE_SCHEMA_MUTATION_BODY}\nissue 904`, [
      { body: auth, author: 'antonvdberg-bit', created_at: '2026-08-11T05:00:00.000Z' },
    ]);
    const verifiedActive = [
      verifiedActiveIssue(10, 'run-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ];

    const plan = planCursorIssueClaims({
      readyIssues: [ready],
      claimedIssues: verifiedActive,
      trackedIssues: [...verifiedActive, ready],
    });

    assert.equal(plan.wipLimits.maxActiveCursorImplementationIssues, CURSOR_WIP_MAX_SLOTS);
    assert.equal(plan.verifiedActiveCount, 1);
    assert.equal(plan.availableSlots, 0);
    assert.deepEqual(plan.claimIssueNumbers, []);
    const held = plan.decisions.find((x) => x.issue.number === 904);
    assert.equal(held?.eligibleToClaim, true);
    assert.equal(held?.decision, 'discover_only');
    assert.match(String(held?.reason || ''), /WIP cap reached/);
  });

  it('7) #879/#886 inspect packets claim without database gate (#896)', () => {
    const stuck879 = gatedReadyIssue(879, ISSUE_879_BODY, [
      {
        body: 'CURSOR DISPATCH DISCOVERED\nEligible to claim: No\nReason: protected gate database',
        author: 'github-actions[bot]',
        created_at: '2026-08-11T03:24:10Z',
      },
      {
        body: ISSUE_879_AUTH_COMMENT,
        author: 'antonvdberg-bit',
        created_at: '2026-08-11T05:02:03Z',
      },
    ]);
    const stuck886 = gatedReadyIssue(886, ISSUE_886_BODY, [
      {
        body: 'CURSOR DISPATCH DISCOVERED\nEligible to claim: No\nReason: protected gate database',
        author: 'github-actions[bot]',
        created_at: '2026-08-11T08:04:50Z',
      },
    ]);

    assert.equal(inferIssueClassification(stuck879).protectedGate, 'none');
    assert.equal(inferIssueClassification(stuck886).protectedGate, 'none');

    const plan = planCursorIssueClaims({
      readyIssues: [stuck879, stuck886],
      claimedIssues: [],
    });
    const d879 = plan.decisions.find((d) => d.issue.number === 879);
    const d886 = plan.decisions.find((d) => d.issue.number === 886);
    assert.equal(d879?.eligibleToClaim, true);
    assert.equal(d886?.eligibleToClaim, true);
    assert.equal(d879?.decision, 'claim');
    assert.ok(d886?.decision === 'claim' || /WIP|concurrency/i.test(String(d886?.reason)));
    assert.ok(plan.eligibleIssueNumbers.includes(879));
    assert.ok(plan.eligibleIssueNumbers.includes(886));
  });

  it('durable approval for approval:db-schema unlocks database gate only', () => {
    const durable = formatDurableApproval({
      approver: 'Anton',
      approval_type: 'approval:db-schema',
      issue_or_pr: '#910',
      target_sha: 'n/a',
      target_environment: 'n/a',
      decision: 'approve',
      recorded_at: '2026-08-11T09:00:00.000Z',
    });
    const evalDb = evaluateOperatorGateAuthorization({
      issueNumber: 910,
      gate: 'database',
      body: '',
      comments: [{ body: durable, author: 'antonvdberg-bit', created_at: '2026-08-11T09:00:00.000Z' }],
    });
    assert.equal(evalDb.allowed, true);
    const evalSecrets = evaluateOperatorGateAuthorization({
      issueNumber: 910,
      gate: 'secrets',
      body: '',
      comments: [{ body: durable, author: 'antonvdberg-bit', created_at: '2026-08-11T09:00:00.000Z' }],
    });
    assert.equal(evalSecrets.allowed, false);
  });

  it('9) #893 active-task secrets authorization unlocks without second ceremony', () => {
    const issue = gatedReadyIssue(893, ISSUE_893_BODY, []);
    assert.equal(inferIssueClassification(issue).protectedGate, 'secrets');
    const auth = evaluateOperatorGateAuthorization({
      issueNumber: 893,
      gate: 'secrets',
      body: ISSUE_893_BODY,
      comments: [],
    });
    assert.equal(auth.allowed, true);
    const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
    assert.equal(plan.decisions[0]?.eligibleToClaim, true);
    assert.equal(plan.decisions[0]?.decision, 'claim');
  });
});
