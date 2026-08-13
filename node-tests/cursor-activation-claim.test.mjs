import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  acquireCursorIssueActivationClaim,
  buildCursorActivationClaim,
  buildCursorRequeueMarker,
  CLAIM_ACQUIRED,
  evaluateCursorIssueActivationClaim,
  formatCursorActivationClaimComment,
  formatCursorRequeueComment,
  parseCursorActivationClaimFromText,
  parseCursorActivationClaimsFromComments,
  releaseCursorIssueActivationClaim,
  SKIP_ALREADY_CLAIMED,
} from '../lib/server/cursor-activation-claim.js';
import {
  buildCursorOriginMetadata,
  formatCursorOriginMetadataComment,
} from '../lib/server/cursor-origin-metadata.js';
import { DISPATCH_LIFECYCLE_LABELS } from '../lib/server/cursor-issue-dispatch-lifecycle.js';

const ALL_LABELS_JSON = JSON.stringify(DISPATCH_LIFECYCLE_LABELS.map((name) => ({ name })));

function mockGithubFetch() {
  return async (url, init) => {
    const method = String(init?.method || 'GET').toUpperCase();
    const u = String(url);
    if (method === 'GET' && u.includes('/repos/') && u.includes('/labels')) {
      return { ok: true, status: 200, text: async () => ALL_LABELS_JSON };
    }
    if (method === 'POST' && u.includes('/labels')) {
      return { ok: true, status: 200, text: async () => '[]' };
    }
    if (method === 'DELETE') {
      return { ok: true, status: 200, text: async () => '' };
    }
    return { ok: true, status: 200, text: async () => ALL_LABELS_JSON };
  };
}

describe('cursor activation claim (double-activation guard)', () => {
  it('first activation evaluates ACQUIRE', () => {
    const gate = evaluateCursorIssueActivationClaim({
      issueNumber: 900,
      labels: ['dispatch:cursor-ready'],
      comments: [],
    });
    assert.equal(gate.decision, 'ACQUIRE');
    assert.equal(gate.reason, 'first_activation');
    assert.equal(gate.generation, 1);
  });

  it('immediate duplicate with claimed label skips', () => {
    const gate = evaluateCursorIssueActivationClaim({
      issueNumber: 900,
      labels: ['dispatch:cursor-claimed', 'status:in-progress'],
      comments: [
        {
          body: formatCursorActivationClaimComment(
            buildCursorActivationClaim({
              sourceIssue: 900,
              generation: 1,
              claimToken: 'aaa',
              status: 'pending',
            }),
          ),
        },
      ],
    });
    assert.equal(gate.decision, SKIP_ALREADY_CLAIMED);
    assert.equal(gate.reason, 'claimed_label');
  });

  it('completed agent origin blocks reactivation', () => {
    const gate = evaluateCursorIssueActivationClaim({
      issueNumber: 900,
      labels: ['dispatch:operator-review'],
      comments: [
        {
          body: formatCursorOriginMetadataComment(
            buildCursorOriginMetadata({
              sourceIssue: 900,
              cursorAgentId: 'bc-completed-agent',
              cursorRunId: 'run-completed',
            }),
          ),
        },
      ],
    });
    assert.equal(gate.decision, SKIP_ALREADY_CLAIMED);
    assert.ok(['operator_review', 'completed_agent_present'].includes(gate.reason));
  });

  it('explicit requeue marker permits a new generation', () => {
    const comments = [
      {
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 900,
            generation: 1,
            claimToken: 'old',
            status: 'activated',
            agentRunId: 'bc-old',
          }),
        ),
      },
      {
        body: formatCursorOriginMetadataComment(
          buildCursorOriginMetadata({
            sourceIssue: 900,
            cursorAgentId: 'bc-old',
          }),
        ),
      },
      {
        body: formatCursorRequeueComment(
          buildCursorRequeueMarker({
            sourceIssue: 900,
            generation: 2,
            reason: 'operator requested retry',
          }),
        ),
      },
    ];

    const blocked = evaluateCursorIssueActivationClaim({
      issueNumber: 900,
      labels: ['dispatch:cursor-claimed'],
      comments,
    });
    assert.equal(blocked.decision, SKIP_ALREADY_CLAIMED);

    const gate = evaluateCursorIssueActivationClaim({
      issueNumber: 900,
      labels: ['dispatch:cursor-ready'],
      comments,
    });
    assert.equal(gate.decision, 'ACQUIRE');
    assert.equal(gate.reason, 'explicit_requeue');
    assert.equal(gate.generation, 2);
  });

  it('allowExplicitRequeue flag permits new attempt even with prior completion', () => {
    const gate = evaluateCursorIssueActivationClaim({
      issueNumber: 900,
      labels: ['dispatch:cursor-claimed'],
      comments: [
        {
          body: formatCursorOriginMetadataComment(
            buildCursorOriginMetadata({
              sourceIssue: 900,
              cursorAgentId: 'bc-old',
            }),
          ),
        },
      ],
      allowExplicitRequeue: true,
    });
    assert.equal(gate.decision, 'ACQUIRE');
    assert.equal(gate.reason, 'explicit_requeue');
  });

  it('concurrent race: earliest claimToken wins', async () => {
    const loserToken = 'token-zzz';
    const winnerToken = 'token-aaa';
    /** @type {string[]} */
    const posted = [];

    const result = await acquireCursorIssueActivationClaim({
      token: 't',
      repo: 'o/r',
      issueNumber: 901,
      labels: ['dispatch:cursor-ready'],
      comments: [],
      claimToken: loserToken,
      postComment: async (_n, body) => {
        posted.push(body);
      },
      listComments: async () => [
        {
          body: formatCursorActivationClaimComment(
            buildCursorActivationClaim({
              sourceIssue: 901,
              generation: 1,
              claimToken: winnerToken,
              status: 'pending',
            }),
          ),
        },
        {
          body: formatCursorActivationClaimComment(
            buildCursorActivationClaim({
              sourceIssue: 901,
              generation: 1,
              claimToken: loserToken,
              status: 'pending',
            }),
          ),
        },
      ],
      fetch: mockGithubFetch(),
    });

    assert.equal(result.decision, SKIP_ALREADY_CLAIMED);
    assert.equal(result.reason, 'lost_claim_race');
    assert.equal(result.winnerClaimToken, winnerToken);
    assert.equal(posted.length, 1);
  });

  it('first acquire succeeds when sole claimToken', async () => {
    const result = await acquireCursorIssueActivationClaim({
      token: 't',
      repo: 'o/r',
      issueNumber: 904,
      labels: ['dispatch:cursor-ready'],
      comments: [],
      claimToken: 'solo-token',
      postComment: async () => {},
      listComments: async () => [
        {
          body: formatCursorActivationClaimComment(
            buildCursorActivationClaim({
              sourceIssue: 904,
              generation: 1,
              claimToken: 'solo-token',
              status: 'pending',
            }),
          ),
        },
      ],
      fetch: mockGithubFetch(),
    });
    assert.equal(result.decision, CLAIM_ACQUIRED);
    assert.equal(result.claim?.claimToken, 'solo-token');
  });

  it('failed activation releases claim', async () => {
    /** @type {string[]} */
    const removed = [];
    /** @type {string[]} */
    const added = [];
    /** @type {string[]} */
    const comments = [];

    const claim = buildCursorActivationClaim({
      sourceIssue: 902,
      generation: 1,
      claimToken: 'release-me',
      status: 'pending',
    });

    const result = await releaseCursorIssueActivationClaim({
      token: 't',
      repo: 'o/r',
      issueNumber: 902,
      claim,
      postComment: async (_n, body) => {
        comments.push(body);
      },
      fetch: async (url, init) => {
        const method = String(init?.method || 'GET').toUpperCase();
        if (method === 'DELETE') {
          removed.push(decodeURIComponent(String(url)));
          return { ok: true, status: 200, text: async () => '' };
        }
        if (method === 'POST' && String(url).includes('/labels')) {
          added.push('ready');
          return { ok: true, status: 200, text: async () => '[]' };
        }
        return { ok: true, status: 200, text: async () => '[]' };
      },
    });

    assert.equal(result.decision, 'CLAIM_RELEASED');
    assert.ok(removed.some((u) => u.includes('dispatch:cursor-claimed')));
    assert.ok(added.includes('ready'));
    assert.equal(comments.length, 1);
    const parsed = parseCursorActivationClaimFromText(comments[0]);
    assert.equal(parsed?.status, 'released');
  });

  it('parses claim marker round-trip', () => {
    const claim = buildCursorActivationClaim({
      sourceIssue: 903,
      generation: 3,
      claimToken: 'round-trip',
      status: 'pending',
      workflowRunId: '123',
    });
    const body = formatCursorActivationClaimComment(claim);
    const parsed = parseCursorActivationClaimFromText(body);
    assert.deepEqual(parsed, claim);
    const list = parseCursorActivationClaimsFromComments([{ body }]);
    assert.equal(list.length, 1);
    assert.equal(list[0].claimToken, 'round-trip');
  });

  it('collapses same-token pending then released to released (#922)', () => {
    const token = 'gen2-same-token';
    const list = parseCursorActivationClaimsFromComments([
      {
        created_at: '2026-08-13T07:00:00Z',
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 881,
            generation: 2,
            claimToken: token,
            status: 'pending',
            claimedAt: '2026-08-13T07:00:00Z',
          }),
        ),
      },
      {
        created_at: '2026-08-13T07:05:00Z',
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 881,
            generation: 2,
            claimToken: token,
            status: 'released',
            claimedAt: '2026-08-13T07:00:00Z',
          }),
        ),
      },
    ]);
    assert.equal(list.length, 1);
    assert.equal(list[0].status, 'released');
    assert.equal(list[0].claimToken, token);
    assert.equal(list[0].generation, 2);
  });

  it('released supersedes pending for the same token even if pending is later in the array', () => {
    const token = 'order-independent';
    const list = parseCursorActivationClaimsFromComments([
      {
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 881,
            generation: 2,
            claimToken: token,
            status: 'released',
          }),
        ),
      },
      {
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 881,
            generation: 2,
            claimToken: token,
            status: 'pending',
          }),
        ),
      },
    ]);
    assert.equal(list.length, 1);
    assert.equal(list[0].status, 'released');
  });

  it('preserves race detection between different claim tokens in the same generation', () => {
    const list = parseCursorActivationClaimsFromComments([
      {
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 901,
            generation: 1,
            claimToken: 'token-zzz',
            status: 'pending',
          }),
        ),
      },
      {
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 901,
            generation: 1,
            claimToken: 'token-aaa',
            status: 'pending',
          }),
        ),
      },
    ]);
    assert.equal(list.length, 2);
    assert.deepEqual(
      list.map((c) => c.claimToken),
      ['token-aaa', 'token-zzz'],
    );
  });

  it('#881 gen1 activated + gen2 requeue + gen2 pending + gen2 released + ready => ACQUIRE', () => {
    const gen1Run = 'run-fe56d0ab-41b1-4e51-b71f-e8249043e441';
    const gen2Token = 'gen2-881-claim';
    const comments = [
      {
        created_at: '2026-08-12T10:00:00Z',
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 881,
            generation: 1,
            claimToken: 'gen1-token',
            status: 'activated',
            agentRunId: gen1Run,
          }),
        ),
      },
      {
        created_at: '2026-08-12T10:00:05Z',
        body: formatCursorOriginMetadataComment(
          buildCursorOriginMetadata({
            sourceIssue: 881,
            cursorAgentId: 'bc-fe56d0ab-41b1-4e51-b71f-e8249043e441',
            cursorRunId: gen1Run,
          }),
        ),
      },
      {
        created_at: '2026-08-13T06:49:30Z',
        body: formatCursorRequeueComment(
          buildCursorRequeueMarker({
            sourceIssue: 881,
            generation: 2,
            reason: 'continue existing work',
          }),
        ),
      },
      {
        created_at: '2026-08-13T07:00:00Z',
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 881,
            generation: 2,
            claimToken: gen2Token,
            status: 'pending',
          }),
        ),
      },
      {
        created_at: '2026-08-13T07:05:00Z',
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 881,
            generation: 2,
            claimToken: gen2Token,
            status: 'released',
          }),
        ),
      },
    ];

    const gate = evaluateCursorIssueActivationClaim({
      issueNumber: 881,
      labels: ['dispatch:cursor-ready'],
      comments,
    });
    assert.equal(gate.decision, 'ACQUIRE');
    assert.equal(gate.reason, 'explicit_requeue');
    assert.equal(gate.generation, 2);
    assert.equal(gate.activeClaim, null);
  });

  it('#881 gen2 pending in flight still skips as active_claim_marker', () => {
    const comments = [
      {
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 881,
            generation: 1,
            claimToken: 'gen1-token',
            status: 'activated',
            agentRunId: 'run-fe56d0ab-41b1-4e51-b71f-e8249043e441',
          }),
        ),
      },
      {
        body: formatCursorRequeueComment(
          buildCursorRequeueMarker({
            sourceIssue: 881,
            generation: 2,
            reason: 'retry',
          }),
        ),
      },
      {
        body: formatCursorActivationClaimComment(
          buildCursorActivationClaim({
            sourceIssue: 881,
            generation: 2,
            claimToken: 'gen2-in-flight',
            status: 'pending',
          }),
        ),
      },
    ];
    const gate = evaluateCursorIssueActivationClaim({
      issueNumber: 881,
      labels: ['dispatch:cursor-claimed', 'status:in-progress'],
      comments,
    });
    assert.equal(gate.decision, SKIP_ALREADY_CLAIMED);
    assert.ok(['claimed_label', 'active_claim_marker'].includes(gate.reason));
  });
});
