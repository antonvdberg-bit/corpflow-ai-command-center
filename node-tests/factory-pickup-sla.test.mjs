import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FACTORY_PICKUP_HARD_MINUTES,
  FACTORY_PICKUP_WARNING_MINUTES,
  evaluateFactoryPickupSla,
  findLatestReadyLabelAt,
  findPickupRecoveryForGeneration,
  formatFactoryPickupSlaComment,
} from '../lib/server/factory-pickup-sla.js';

describe('factory pickup SLA',()=>{
  it('uses latest ready label event, not issue updated_at',()=>{
    assert.equal(findLatestReadyLabelAt([
      {event:'labeled',label:{name:'dispatch:cursor-ready'},created_at:'2026-09-19T09:00:00Z'},
      {event:'unlabeled',label:{name:'dispatch:cursor-ready'},created_at:'2026-09-19T09:10:00Z'},
      {event:'labeled',label:{name:'dispatch:cursor-ready'},created_at:'2026-09-19T09:20:00Z'},
    ]),'2026-09-19T09:20:00Z');
  });
  it('warns and requests exactly one recovery after 15 minutes with free capacity',()=>{
    const r=evaluateFactoryPickupSla({
      sourceIssue:551,readyAt:'2026-09-19T09:00:00Z',
      now:new Date('2026-09-19T09:16:00Z'),eligible:true,availableSlots:1,
      recoveryAlreadyRequested:false,
    });
    assert.equal(FACTORY_PICKUP_WARNING_MINUTES,15);
    assert.equal(r.state,'WARNING'); assert.equal(r.should_recover,true);
  });
  it('hard-exception does not retry after one recovery',()=>{
    const r=evaluateFactoryPickupSla({
      sourceIssue:551,readyAt:'2026-09-19T09:00:00Z',
      now:new Date('2026-09-19T09:31:00Z'),eligible:true,availableSlots:1,
      recoveryAlreadyRequested:true,
    });
    assert.equal(FACTORY_PICKUP_HARD_MINUTES,30);
    assert.equal(r.state,'HARD_EXCEPTION'); assert.equal(r.should_recover,false);
  });
  it('does not recover when WIP is full or selector says not eligible',()=>{
    assert.equal(evaluateFactoryPickupSla({
      sourceIssue:1,readyAt:'2026-09-19T09:00:00Z',now:new Date('2026-09-19T10:00:00Z'),
      eligible:true,availableSlots:0
    }).should_recover,false);
    assert.equal(evaluateFactoryPickupSla({
      sourceIssue:1,readyAt:'2026-09-19T09:00:00Z',now:new Date('2026-09-19T10:00:00Z'),
      eligible:false,availableSlots:1
    }).should_recover,false);
  });
  it('dedupes recovery by issue plus ready generation',()=>{
    const rec=evaluateFactoryPickupSla({
      sourceIssue:551,readyAt:'2026-09-19T09:00:00Z',now:new Date('2026-09-19T09:16:00Z'),
      eligible:true,availableSlots:1
    });
    const body=formatFactoryPickupSlaComment({...rec,recovery_requested_at:'2026-09-19T09:16:00Z'});
    assert.ok(findPickupRecoveryForGeneration([{body}],551,'2026-09-19T09:00:00Z'));
    assert.equal(findPickupRecoveryForGeneration([{body}],551,'2026-09-19T11:00:00Z'),null);
  });
});
