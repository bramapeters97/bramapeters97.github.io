import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const window = {};
const source = new URL('../projects/amstroll/portfolio-embed/guide-clock.js', import.meta.url);
vm.runInNewContext(readFileSync(source, 'utf8'), { window }, { filename: source.pathname });
const clock = window.AmstrollClock;
const instants = (date, time) => Array.from(clock.deadlineInstants(date, time), instant => new Date(instant).toISOString());

const bounds = { left: 10, top: 20, width: 100, height: 100 };
assert.equal(clock.minuteAt(60, 20, bounds), 0);
assert.equal(clock.minuteAt(110, 70, bounds), 15);
assert.equal(clock.minuteAt(60, 120, bounds), 30);
assert.equal(clock.minuteAt(10, 70, bounds), 45);
assert.equal(clock.withMinute(107, 0), 60);
assert.equal(clock.withMinute(59, 0), 0);
assert.equal(clock.dragMinutes(59, 59, 0), 60);
assert.equal(clock.dragMinutes(60, 0, 59), 59);
assert.equal(clock.dragMinutes(118, 58, 2), 122);
assert.equal(clock.dragMinutes(0, 0, 59), 0);
assert.equal(clock.dragMinutes(720, 0, 1), 720);

const now = new Date('2026-02-13T22:30:00Z');
const duration = clock.resolve({ minutes: 47 }, now);
assert.equal(duration.minutes, 47);
assert.equal(duration.endLabel, '00:17 tomorrow');
assert.equal(clock.resolve({ minutes: 0 }, now).minutes, 0);
assert.equal(clock.resolve({ minutes: 721 }, now).minutes, 720);
assert.equal(clock.resolve({ minutes: -1 }, now).minutes, 0);

assert.deepEqual(instants('2026-02-14', '00:17'), ['2026-02-13T23:17:00.000Z']);
assert.deepEqual(instants('2026-03-29', '02:30'), []);
assert.deepEqual(instants('2026-10-25', '02:30'), [
  '2026-10-25T00:30:00.000Z', '2026-10-25T01:30:00.000Z'
]);
assert.deepEqual(instants('2026-02-30', '22:30'), []);
assert.deepEqual(instants('2026-01-01', '24:00'), []);

const saved = JSON.parse(JSON.stringify({ minutes: 47, deadline: '2026-02-13T23:17:00.000Z' }));
const oneMinuteLater = clock.resolve(saved, new Date(+now + 60_000));
assert.equal(oneMinuteLater.deadline, saved.deadline);
assert.equal(oneMinuteLater.minutes, 46);
assert.equal(clock.resolve(saved, new Date(saved.deadline)).expired, true);
assert.equal(clock.resolve(saved, new Date(saved.deadline)).minutes, 0);
assert.match(clock.render({ minutes: 47 }, now), /aria-valuenow="47"/);
assert.match(clock.render(saved, now), /data-deadline="2026-02-13T23:17:00\.000Z"/);

console.log('PASS clock angles, hour carry, minute limits, exact time, fixed deadline, midnight and Amsterdam DST');
