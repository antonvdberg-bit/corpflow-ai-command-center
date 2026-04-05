import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isHobbySafeCronSchedule,
  validateVercelJsonCronsForHobby,
} from '../scripts/lib/vercel-cron-hobby.mjs';

test('rejects */20 * * * * (sub-daily)', () => {
  assert.equal(isHobbySafeCronSchedule('*/20 * * * *').ok, false);
});

test('rejects 0 */6 * * * (multiple runs per day)', () => {
  assert.equal(isHobbySafeCronSchedule('0 */6 * * *').ok, false);
});

test('rejects wildcard minute', () => {
  assert.equal(isHobbySafeCronSchedule('* 3 * * *').ok, false);
});

test('accepts once-daily schedules', () => {
  assert.equal(isHobbySafeCronSchedule('0 0 * * *').ok, true);
  assert.equal(isHobbySafeCronSchedule('0 2 * * *').ok, true);
  assert.equal(isHobbySafeCronSchedule('30 14 * * *').ok, true);
});

test('validateVercelJsonCronsForHobby passes current vercel.json shape', () => {
  const r = validateVercelJsonCronsForHobby({
    crons: [
      { path: '/a', schedule: '0 0 * * *' },
      { path: '/b', schedule: '0 2 * * *' },
      { path: '/c', schedule: '0 4 * * *' },
    ],
  });
  assert.equal(r.ok, true);
});

test('validateVercelJsonCronsForHobby fails on bad entry', () => {
  const r = validateVercelJsonCronsForHobby({
    crons: [{ path: '/x', schedule: '*/20 * * * *' }],
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.length >= 1);
});
