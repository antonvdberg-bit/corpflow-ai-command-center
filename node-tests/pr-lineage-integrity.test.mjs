import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCursorOriginMetadata,
  collectAuthoritativeSourceIssue,
  extractAuthoritativeSourceIssue,
  formatCiOperatorReviewLineage,
  formatCursorOriginMetadataComment,
  originMarkerCompatible,
  resolvePrBoundCursorOrigin,
} from '../lib/server/cursor-origin-metadata.js';

const PR_947_HEAD = '42f8fc2b1c05d60febe8bfd24e65c9364d6f10a8';
const AGENT_701 = 'bc-19dc252a-8a9b-4b66-877d-2c0669464f35';
const AGENT_721 = 'bc-46ed341b-c433-4b9d-ab16-7741af65abfb';
const RUN_701 = 'run-70170170-1701-4701-a701-701701701701';
const RUN_721 = 'run-ffdef720-8661-408f-b38e-f56941d0329b';

/**
 * PR #947 body shape: first `#N` is #721 (Prospect Operations), while the
 * authoritative factory field is Source issue #701 plus the #701 agent.
 */
const PR_947_BODY = `## Summary

- Maps everyday pipeline names (new → closed) onto the stages already in Prospect Operations (#721) and maturation (#713).
- Closes the first #701 deliverable (docs + configuration mapping). Does not merge itself.

## Factory / issue evidence (#701)

- **Source issue:** #701
- **Cursor agent:** \`${AGENT_701}\`
- **Handoff run:** https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/31769454703

Canonical Context Preflight: PASS
Source item: #701
`;

const ISSUE_721_ORIGIN = formatCursorOriginMetadataComment(
  buildCursorOriginMetadata({
    sourceIssue: 721,
    cursorAgentId: AGENT_721,
    cursorRunId: RUN_721,
    prNumber: 900,
    headSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  }),
);

const ISSUE_701_ORIGIN = formatCursorOriginMetadataComment(
  buildCursorOriginMetadata({
    sourceIssue: 701,
    cursorAgentId: AGENT_701,
    cursorRunId: RUN_701,
    prNumber: 947,
    headSha: PR_947_HEAD,
  }),
);

const ISSUE_701_HANDOFF = `<!-- corpflow.factory_cursor_handoff.v1 -->
# CORPFLOW FACTORY HANDOFF

Selected source issue: #701
GitHub Actions run: https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/31769454703
`;

const WRONG_OPERATOR_REVIEW = `OPERATOR REVIEW REQUIRED — CI GREEN

Source issue: #721
PR: #947 https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/947
Cursor agent: ${AGENT_721}
Cursor run: ${RUN_721}
Commit SHA: ${PR_947_HEAD}
`;

describe('PR lineage integrity (#949 / incident #947)', () => {
  it('does not treat the first #N in PR prose as the source issue', () => {
    const firstHash = String(PR_947_BODY).match(/#(\d+)/);
    assert.equal(Number(firstHash[1]), 721, 'fixture must mention #721 first, matching the incident');

    const extracted = extractAuthoritativeSourceIssue(PR_947_BODY);
    assert.equal(extracted.ambiguous, false);
    assert.equal(extracted.sourceIssue, 701);
    assert.equal(extracted.reason, 'authoritative_pr_source');
  });

  it('returns #701 and the #701 agent when #721 origin evidence exists elsewhere', () => {
    const origin = resolvePrBoundCursorOrigin({
      prBody: PR_947_BODY,
      comments: [
        { body: WRONG_OPERATOR_REVIEW },
        { body: ISSUE_721_ORIGIN },
        { body: ISSUE_701_HANDOFF },
      ],
      prNumber: 947,
      branch: 'cursor/corpflowai-worker-protocol-e4ac',
      headSha: PR_947_HEAD,
    });

    assert.equal(origin.sourceIssue, 701);
    assert.equal(origin.lineageStatus, 'authoritative');
    assert.equal(origin.cursorAgentId, AGENT_701);
    assert.notEqual(origin.cursorAgentId, AGENT_721);
    assert.notEqual(origin.cursorRunId, RUN_721);
    assert.equal(origin.prNumber, 947);
    assert.equal(origin.headSha, PR_947_HEAD);
  });

  it('uses exact #701 origin run id and still ignores unrelated #721 evidence', () => {
    const origin = resolvePrBoundCursorOrigin({
      prBody: PR_947_BODY,
      comments: [{ body: ISSUE_721_ORIGIN }, { body: ISSUE_701_ORIGIN }],
      prNumber: 947,
      headSha: PR_947_HEAD,
      expectedSourceIssue: 701,
    });

    assert.equal(origin.sourceIssue, 701);
    assert.equal(origin.cursorAgentId, AGENT_701);
    assert.equal(origin.cursorRunId, RUN_701);
    assert.notEqual(origin.cursorRunId, RUN_721);
    assert.notEqual(origin.cursorAgentId, AGENT_721);
  });

  it('formats the CI-green packet as #701, not #721', () => {
    const origin = resolvePrBoundCursorOrigin({
      prBody: PR_947_BODY,
      comments: [{ body: ISSUE_721_ORIGIN }, { body: ISSUE_701_ORIGIN }],
      prNumber: 947,
      headSha: PR_947_HEAD,
    });
    const header = formatCiOperatorReviewLineage(origin);
    assert.match(header, /Source issue: #701/);
    assert.match(header, new RegExp(`Cursor agent: ${AGENT_701}`));
    assert.match(header, new RegExp(`Cursor run: ${RUN_701}`));
    assert.doesNotMatch(header, /Source issue: #721/);
    assert.doesNotMatch(header, new RegExp(AGENT_721));
    assert.doesNotMatch(header, new RegExp(RUN_721));
  });

  it('fails closed when authoritative Source issue fields disagree', () => {
    const extracted = extractAuthoritativeSourceIssue(
      '**Source issue:** #701\nSource item: #800\nProspect Operations (#721)',
    );
    assert.equal(extracted.ambiguous, true);
    assert.equal(extracted.sourceIssue, null);

    const origin = resolvePrBoundCursorOrigin({
      prBody: '**Source issue:** #701\nSource item: #800\nCursor agent: `' + AGENT_701 + '`',
      comments: [{ body: ISSUE_721_ORIGIN }],
      prNumber: 947,
      headSha: PR_947_HEAD,
    });
    assert.equal(origin.sourceIssue, null);
    assert.equal(origin.lineageStatus, 'ambiguous');
    assert.notEqual(origin.cursorAgentId, AGENT_721);
    const header = formatCiOperatorReviewLineage(origin);
    assert.match(header, /Source issue: unknown/);
    assert.doesNotMatch(header, /Source issue: #721/);
    assert.doesNotMatch(header, /Source issue: #701/);
  });

  it('rejects a #721 origin marker for PR #947 / source #701', () => {
    const parsed = buildCursorOriginMetadata({
      sourceIssue: 721,
      cursorAgentId: AGENT_721,
      cursorRunId: RUN_721,
      prNumber: 900,
    });
    assert.equal(
      originMarkerCompatible(parsed, { prNumber: 947, headSha: PR_947_HEAD }, 701),
      false,
    );
    assert.equal(
      originMarkerCompatible(
        buildCursorOriginMetadata({
          sourceIssue: 701,
          cursorAgentId: AGENT_701,
          cursorRunId: RUN_701,
          prNumber: 947,
          headSha: PR_947_HEAD,
        }),
        { prNumber: 947, headSha: PR_947_HEAD },
        701,
      ),
      true,
    );
  });

  it('does not take source from a contaminated operator-review comment', () => {
    const collected = collectAuthoritativeSourceIssue({
      prBody: PR_947_BODY,
      comments: [{ body: WRONG_OPERATOR_REVIEW }],
    });
    assert.equal(collected.sourceIssue, 701);
    assert.equal(collected.ambiguous, false);
  });
});
