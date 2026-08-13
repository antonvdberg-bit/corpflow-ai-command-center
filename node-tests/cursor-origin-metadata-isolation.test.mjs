import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCursorOriginMetadata,
  formatCursorOriginMetadataComment,
  resolveCursorOriginMetadata,
} from '../lib/server/cursor-origin-metadata.js';

describe('Cursor origin metadata isolation (#862)', () => {
  it('does not inherit another issue run id from a factory capacity packet', () => {
    const meta = resolveCursorOriginMetadata({
      issueBody: 'P0 ERPNext Commercial Documents #882',
      comments: [
        {
          body: `<!-- corpflow.factory_cursor_handoff.v1 -->\n# CORPFLOW FACTORY HANDOFF\n\nSelected source issue: #882\nCapacity packet:\n\`\`\`\nCURSOR CAPACITY: 1/2 active\nSlot 1: #881 — running — run-fe56d0ab-41b1-4e51-b71f-e8249043e441\nSlot 2: FREE\nNext eligible: #882\n\`\`\``,
        },
      ],
    });

    assert.equal(meta.cursorRunId, null);
    assert.equal(meta.cursorAgentId, null);
  });

  it('still reads an explicit same-issue Cursor origin marker', () => {
    const runId = 'run-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const agentId = 'bc-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const body = formatCursorOriginMetadataComment(
      buildCursorOriginMetadata({
        sourceIssue: 882,
        activationWorkflowRunId: '123456789',
        cursorRunId: runId,
        cursorAgentId: agentId,
      }),
    );

    const meta = resolveCursorOriginMetadata({
      issueBody: 'P0 ERPNext Commercial Documents #882',
      comments: [{ body }],
    });

    assert.equal(meta.sourceIssue, 882);
    assert.equal(meta.cursorRunId, runId);
    assert.equal(meta.cursorAgentId, agentId);
    assert.equal(meta.activationWorkflowRunId, '123456789');
  });

  it('still reads direct dispatch-activated evidence but ignores quoted factory packets', () => {
    const runId = 'run-cccccccc-cccc-cccc-cccc-cccccccccccc';
    const meta = resolveCursorOriginMetadata({
      issueBody: 'Factory repair #862',
      comments: [
        {
          body: `CURSOR DISPATCH ACTIVATED\n\nIssue: #862\nCursor run identifier: ${runId}`,
        },
        {
          body: `# CORPFLOW FACTORY HANDOFF\nSlot 1: #881 — running — run-dddddddd-dddd-dddd-dddd-dddddddddddd`,
        },
      ],
    });

    assert.equal(meta.cursorRunId, runId);
  });
});
