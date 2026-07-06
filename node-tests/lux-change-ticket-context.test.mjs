/**
 * Lux /change selected-ticket context — panel default visibility.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyLuxChangeContextHashOverrides,
  classifyLuxChangeTicketContext,
} from '../lib/client/lux-change-ticket-context.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readRepo(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

test('classifyLuxChangeTicketContext — recovery/build ticket focuses control plane', () => {
  const p = classifyLuxChangeTicketContext({
    ticket_id: 'cmrecovery01',
    requested_change: 'LuxeMaurice recovery programme — MVP build approval',
    workflow_state: 'estimated',
  });
  assert.equal(p.context, 'build_recovery');
  assert.equal(p.buildControlFocus, true);
  assert.equal(p.mediaWorkspaceDefaultOpen, false);
  assert.equal(p.crmLeadsDefaultOpen, false);
  assert.equal(p.attachmentsDefaultOpen, false);
});

test('classifyLuxChangeTicketContext — property/media sprint opens media panels', () => {
  const p = classifyLuxChangeTicketContext({
    ticket_id: 'cmsprintc1',
    requested_change: 'C1 hero slot',
    lux_sprint_meta: { sprint_code: 'C1' },
  });
  assert.equal(p.context, 'media_property');
  assert.equal(p.mediaWorkspaceDefaultOpen, true);
  assert.equal(p.attachmentsDefaultOpen, true);
  assert.equal(p.uploadPanelDefaultOpen, true);
});

test('classifyLuxChangeTicketContext — concierge ticket opens CRM', () => {
  const p = classifyLuxChangeTicketContext({
    ticket_id: 'cmcrm01',
    requested_change: 'Concierge lead intake workflow',
  });
  assert.equal(p.context, 'concierge_crm');
  assert.equal(p.crmLeadsDefaultOpen, true);
  assert.equal(p.mediaWorkspaceDefaultOpen, false);
});

test('applyLuxChangeContextHashOverrides — hash opens media workspace', () => {
  const base = classifyLuxChangeTicketContext({
    ticket_id: 'cmrecovery01',
    requested_change: 'Recovery MVP audit',
  });
  const withHash = applyLuxChangeContextHashOverrides(base, { mediaWorkspaceHashOpen: true });
  assert.equal(withHash.mediaWorkspaceDefaultOpen, true);
  assert.equal(withHash.mediaLibraryDefaultOpen, true);
});

test('change.js — wires ticket context classifier for panel defaults', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /classifyLuxChangeTicketContext/);
  assert.match(change, /luxTicketContextProfile/);
  assert.match(change, /data-testid="lux-change-context-profile"/);
  assert.match(change, /remountKey=/);
});
