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

/** Synthetic #879-style body (ERPNext access; classifier sets database gate). */
const ISSUE_879_BODY = `Source: Anton decision 2026-08-11
## Explicit Anton authorization
Anton has authorized Cursor to use the full ERPNext access already granted.
## Objective
Inspect ERPNext Company, Customer, database-backed DocTypes for commercial work.
Do not request credentials or secrets.
`;

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

function gatedReadyIssue(number, body, comments = []) {
  return {
    number,
    title: `P0 ERPNext gated issue #${number}`,
    body,
    labels: ['priority:P0', 'dispatch:cursor-ready'],
    comments,
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

  it('1) gated issue with no operator authorization -> eligible=false', () => {
    const issue = gatedReadyIssue(879, ISSUE_879_BODY, []);
    assert.equal(inferIssueClassification(issue).protectedGate, 'database');
    const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
    const d = plan.decisions.find((x) => x.issue.number === 879);
    assert.equal(d?.eligibleToClaim, false);
    assert.equal(d?.decision, 'discover_only');
    assert.match(String(d?.reason || ''), /no valid operator authorization|wait for Anton unlock/);
  });

  it('2) matching explicit authorization -> eligible=true when capacity exists', () => {
    const issue = gatedReadyIssue(879, ISSUE_879_BODY, [
      {
        body: ISSUE_879_AUTH_COMMENT,
        author: 'antonvdberg-bit',
        created_at: '2026-08-11T05:02:03Z',
      },
    ]);
    const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
    const d = plan.decisions.find((x) => x.issue.number === 879);
    assert.equal(d?.eligibleToClaim, true);
    assert.equal(d?.decision, 'claim');
    assert.equal(plan.activationTargetIssue, 879);
  });

  it('3) authorization for another gate -> still eligible=false', () => {
    const authSecrets = formatOperatorGateAuthorization({
      issue: 879,
      gate: 'secrets',
      author: 'antonvdberg-bit',
      decision: 'approve',
      recorded_at: '2026-08-11T06:00:00.000Z',
    });
    const issue = gatedReadyIssue(879, ISSUE_879_BODY, [
      {
        body: authSecrets,
        author: 'antonvdberg-bit',
        created_at: '2026-08-11T06:00:00.000Z',
      },
    ]);
    const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
    const d = plan.decisions.find((x) => x.issue.number === 879);
    assert.equal(d?.eligibleToClaim, false);
    assert.match(String(d?.reason || ''), /no valid operator authorization|protected gate database/);
  });

  it('4) newer rejection/revocation -> eligible=false', () => {
    const approve = formatOperatorGateAuthorization({
      issue: 879,
      gate: 'database',
      author: 'antonvdberg-bit',
      decision: 'approve',
      recorded_at: '2026-08-11T05:00:00.000Z',
    });
    const revoke = formatOperatorGateAuthorization({
      issue: 879,
      gate: 'database',
      author: 'antonvdberg-bit',
      decision: 'revoke',
      recorded_at: '2026-08-11T07:00:00.000Z',
    });
    const issue = gatedReadyIssue(879, ISSUE_879_BODY, [
      { body: approve, author: 'antonvdberg-bit', created_at: '2026-08-11T05:00:00.000Z' },
      { body: revoke, author: 'antonvdberg-bit', created_at: '2026-08-11T07:00:00.000Z' },
    ]);
    const plan = planCursorIssueClaims({ readyIssues: [issue], claimedIssues: [] });
    const d = plan.decisions.find((x) => x.issue.number === 879);
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

  it('6) WIP cap=2 and verified-run accounting unchanged', () => {
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
      gatedReadyIssue(n, `${ISSUE_879_BODY}\nissue ${n}`, [
        { body: auth, author: 'antonvdberg-bit', created_at: '2026-08-11T05:00:00.000Z' },
      ]);

    const verifiedActive = [
      {
        number: 10,
        title: 'Active A',
        body: 'docs only',
        labels: ['dispatch:cursor-claimed', 'status:in-progress'],
        comments: [
          {
            body: `CURSOR DISPATCH ACTIVATED\n\nIssue: #10\nCursor run identifier: run-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa\n`,
          },
        ],
      },
      {
        number: 11,
        title: 'Active B',
        body: 'docs only',
        labels: ['dispatch:cursor-claimed', 'status:in-progress'],
        comments: [
          {
            body: `CURSOR DISPATCH ACTIVATED\n\nIssue: #11\nCursor run identifier: run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb\n`,
          },
        ],
      },
    ];

    const plan = planCursorIssueClaims({
      readyIssues: [mk(901, authA), mk(902, authB), mk(903, authC)],
      claimedIssues: verifiedActive,
      trackedIssues: [...verifiedActive, mk(901, authA), mk(902, authB), mk(903, authC)],
    });

    assert.equal(plan.wipLimits.maxActiveCursorImplementationIssues, 2);
    assert.equal(plan.verifiedActiveCount, 2);
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

  it('7) #879/#886 stuck-after-approval clears after fix', () => {
    // Before-fix shape: gated + later Anton authorization present, but old planner ignored it.
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

    assert.equal(inferIssueClassification(stuck879).protectedGate, 'database');
    assert.equal(inferIssueClassification(stuck886).protectedGate, 'database');

    const beforeFixSimulation = (issue) => {
      const classification = inferIssueClassification(issue);
      if (classification.protectedGate !== 'none') {
        return {
          eligibleToClaim: false,
          reason: `protected gate ${classification.protectedGate} — classify and wait for Anton unlock before claim/activation`,
        };
      }
      return { eligibleToClaim: true, reason: 'eligible' };
    };

    assert.equal(beforeFixSimulation(stuck879).eligibleToClaim, false);
    assert.equal(beforeFixSimulation(stuck886).eligibleToClaim, false);

    const plan = planCursorIssueClaims({
      readyIssues: [stuck879, stuck886],
      claimedIssues: [],
    });
    const d879 = plan.decisions.find((d) => d.issue.number === 879);
    const d886 = plan.decisions.find((d) => d.issue.number === 886);
    assert.equal(d879?.eligibleToClaim, true);
    assert.equal(d886?.eligibleToClaim, true);
    assert.equal(d879?.decision, 'claim');
    // WIP allows 2 claims; both authorized database issues — concurrency may hold the second.
    assert.ok(
      d886?.decision === 'claim' || /concurrency hold|same protected gate/i.test(String(d886?.reason)),
    );
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
});
