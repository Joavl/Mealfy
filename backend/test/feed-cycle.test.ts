import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getCurrentCycleStart,
  nextCycleStart,
  SAO_PAULO_TIME_ZONE,
  wasFedThisCycle,
  wasRequestedThisCycle,
} from '../src/shared/utils/feedCycle';

function instant(iso: string): Date {
  return new Date(iso);
}

test('São Paulo cycle switches exactly at 08:00 local and returns a UTC instant', () => {
  assert.equal(getCurrentCycleStart(instant('2026-04-15T10:59:59.999Z')).toISOString(), '2026-04-14T11:00:00.000Z');
  assert.equal(getCurrentCycleStart(instant('2026-04-15T11:00:00.000Z')).toISOString(), '2026-04-15T11:00:00.000Z');
  assert.equal(nextCycleStart(instant('2026-04-15T10:59:59.999Z')).toISOString(), '2026-04-15T11:00:00.000Z');

  assert.equal(wasFedThisCycle(instant('2026-04-14T11:00:00.000Z'), instant('2026-04-15T10:59:59.999Z')), true);
  assert.equal(wasFedThisCycle(instant('2026-04-14T10:59:59.999Z'), instant('2026-04-15T10:59:59.999Z')), false);
  assert.equal(wasRequestedThisCycle(instant('2026-04-15T11:00:00.000Z'), instant('2026-04-15T11:00:00.000Z')), true);
});

test('cycle boundary derives historical DST offsets from Intl tzdata rather than a fixed UTC hour', () => {
  // Brazil observed daylight saving time in Jan 2018 (São Paulo was UTC-2),
  // so 08:00 was 10:00Z. A fixed 11:00Z implementation would be incorrect.
  assert.equal(getCurrentCycleStart(instant('2018-01-15T09:59:59.999Z')).toISOString(), '2018-01-14T10:00:00.000Z');
  assert.equal(getCurrentCycleStart(instant('2018-01-15T10:00:00.000Z')).toISOString(), '2018-01-15T10:00:00.000Z');
  assert.equal(nextCycleStart(instant('2018-01-15T10:00:00.000Z')).toISOString(), '2018-01-16T10:00:00.000Z');

  const localTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: SAO_PAULO_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(getCurrentCycleStart(instant('2018-01-15T10:00:00.000Z')));
  assert.equal(localTime, '08:00');
});

test('cycle arithmetic follows São Paulo calendar dates across the 2018 DST transition', () => {
  // DST ended at local midnight on 18 February 2018: consecutive local 08:00
  // boundaries are 25 hours apart, not a blindly-added 24 hours.
  assert.equal(getCurrentCycleStart(instant('2018-02-17T10:00:00.000Z')).toISOString(), '2018-02-17T10:00:00.000Z');
  assert.equal(nextCycleStart(instant('2018-02-17T10:00:00.000Z')).toISOString(), '2018-02-18T11:00:00.000Z');
  assert.equal(getCurrentCycleStart(instant('2018-02-18T10:59:59.999Z')).toISOString(), '2018-02-17T10:00:00.000Z');
  assert.equal(getCurrentCycleStart(instant('2018-02-18T11:00:00.000Z')).toISOString(), '2018-02-18T11:00:00.000Z');
});
