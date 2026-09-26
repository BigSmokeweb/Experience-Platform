import assert from 'node:assert';
import { getOperatingStatus, isDayClosed, timeStringToMinutes } from '../operating-hours';

console.log('--- RUNNING OPERATING HOURS TEST SUITE ---');

// 1. timeStringToMinutes tests
assert.strictEqual(timeStringToMinutes('00:00'), 0);
assert.strictEqual(timeStringToMinutes('10:30'), 630);
assert.strictEqual(timeStringToMinutes('23:59'), 1439);
assert.strictEqual(timeStringToMinutes('invalid'), null);
assert.strictEqual(timeStringToMinutes(undefined), null);
console.log('✓ timeStringToMinutes tests passed');

// 2. isDayClosed tests
// 2026-09-22 is Tuesday, 2026-09-23 is Wednesday, 2026-09-24 is Thursday, 2026-09-27 is Sunday, 2026-09-28 is Monday
const tuesday = new Date('2026-09-22T14:00:00');
const wednesday = new Date('2026-09-23T14:00:00');
const thursday = new Date('2026-09-24T14:00:00');
const sunday = new Date('2026-09-27T10:00:00');
const monday = new Date('2026-09-28T10:00:00');

assert.strictEqual(isDayClosed('None', tuesday), false);
assert.strictEqual(isDayClosed('Tuesday, Thursday', tuesday), true);
assert.strictEqual(isDayClosed('Tuesday, Thursday', wednesday), false);
assert.strictEqual(isDayClosed('Tuesday, Thursday', thursday), true);
assert.strictEqual(isDayClosed('Monday-Saturday', sunday), false);
assert.strictEqual(isDayClosed('Monday-Saturday', monday), true);

// Monsoon safety (June-September)
const july = new Date('2026-07-15T12:00:00');
const december = new Date('2026-12-15T12:00:00');
assert.strictEqual(isDayClosed('Fully closed June-September (monsoon safety)', july), true);
assert.strictEqual(isDayClosed('Fully closed June-September (monsoon safety)', december), false);
console.log('✓ isDayClosed tests passed');

// 3. Standard Daytime Operating Hours (10:00 - 22:00)
const daytimeSpot = {
  openingTime: '10:00',
  closingTime: '22:00',
  operatingHours: '10:00 - 22:00',
  closedDays: 'Monday',
};

// Tuesday 09:30 (before open)
assert.strictEqual(getOperatingStatus(daytimeSpot, new Date('2026-09-22T09:30:00')).isOpen, false);
// Tuesday 10:00 (exact open)
assert.strictEqual(getOperatingStatus(daytimeSpot, new Date('2026-09-22T10:00:00')).isOpen, true);
// Tuesday 15:00 (middle of day)
assert.strictEqual(getOperatingStatus(daytimeSpot, new Date('2026-09-22T15:00:00')).isOpen, true);
// Tuesday 21:59 (just before close)
assert.strictEqual(getOperatingStatus(daytimeSpot, new Date('2026-09-22T21:59:00')).isOpen, true);
// Tuesday 22:00 (exact close)
assert.strictEqual(getOperatingStatus(daytimeSpot, new Date('2026-09-22T22:00:00')).isOpen, false);
// Monday 15:00 (closed day)
assert.strictEqual(getOperatingStatus(daytimeSpot, new Date('2026-09-28T15:00:00')).isOpen, false);
console.log('✓ Standard daytime tests passed');

// 4. Midnight Closing (15:00 - 00:00)
const midnightSpot = {
  openingTime: '15:00',
  closingTime: '00:00',
  operatingHours: '15:00 - 00:00',
  closedDays: 'None',
};

// 14:30 (before open)
assert.strictEqual(getOperatingStatus(midnightSpot, new Date('2026-09-22T14:30:00')).isOpen, false);
// 15:00 (open)
assert.strictEqual(getOperatingStatus(midnightSpot, new Date('2026-09-22T15:00:00')).isOpen, true);
// 23:30 (open)
assert.strictEqual(getOperatingStatus(midnightSpot, new Date('2026-09-22T23:30:00')).isOpen, true);
// 00:05 next morning (closed)
assert.strictEqual(getOperatingStatus(midnightSpot, new Date('2026-09-23T00:05:00')).isOpen, false);
console.log('✓ Midnight closing tests passed');

// 5. Overnight Schedule (18:00 - 01:00) e.g. THE STREET KATTA
const overnightSpot = {
  openingTime: '18:00',
  closingTime: '01:00',
  operatingHours: '18:00 - 01:00',
  closedDays: 'Monday',
};

// Tuesday 17:00 (before open) -> Closed
assert.strictEqual(getOperatingStatus(overnightSpot, new Date('2026-09-22T17:00:00')).isOpen, false);
// Tuesday 20:00 (evening open) -> Open
assert.strictEqual(getOperatingStatus(overnightSpot, new Date('2026-09-22T20:00:00')).isOpen, true);
// Tuesday 23:55 (late night open) -> Open
assert.strictEqual(getOperatingStatus(overnightSpot, new Date('2026-09-22T23:55:00')).isOpen, true);
// Wednesday 00:30 (continuation of Tuesday night) -> Open
assert.strictEqual(getOperatingStatus(overnightSpot, new Date('2026-09-23T00:30:00')).isOpen, true);
// Wednesday 01:00 (exact close) -> Closed
assert.strictEqual(getOperatingStatus(overnightSpot, new Date('2026-09-23T01:00:00')).isOpen, false);
// Monday 20:00 (Monday closed day) -> Closed
assert.strictEqual(getOperatingStatus(overnightSpot, new Date('2026-09-28T20:00:00')).isOpen, false);
// Tuesday 00:30 (spillover from Monday night, but Monday was closed) -> Closed
assert.strictEqual(getOperatingStatus(overnightSpot, new Date('2026-09-29T00:30:00')).isOpen, false);
console.log('✓ Overnight schedule tests passed');

// 6. 24-Hour Spot
const roundTheClockSpot = {
  openingTime: '00:00',
  closingTime: '23:59',
  operatingHours: 'Open 24 hours',
  closedDays: 'Sunday',
};

// Saturday 14:00 -> Open
assert.strictEqual(getOperatingStatus(roundTheClockSpot, new Date('2026-09-26T14:00:00')).isOpen, true);
// Sunday 14:00 -> Closed (Sunday closed day)
assert.strictEqual(getOperatingStatus(roundTheClockSpot, new Date('2026-09-27T14:00:00')).isOpen, false);
console.log('✓ 24-hour spot tests passed');

console.log('ALL TESTS PASSED SUCCESSFULLY! 🎉');
