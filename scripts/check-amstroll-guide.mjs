import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sourceFile = new URL('../projects/amstroll/portfolio-embed/guide-planner.js', import.meta.url);
const context = vm.createContext({ setTimeout, clearTimeout, AbortController, URL });
vm.runInContext(fs.readFileSync(sourceFile, 'utf8'), context, { filename: sourceFile.pathname });
const guide = context.AmstrollGuide;
const now = Date.parse('2026-11-13T11:00:00Z'); // Friday noon in Amsterdam.
const photo = id => ({ src: `guide-media/${id}.webp`, sourceUrl: `https://example.test/${id}`, license: 'CC BY 4.0', credit: 'Fixture photographer', alt: id });
const start = { id: 'central', name: 'Centraal', lat: 52.379, lng: 4.9, bank: 'south' };
const stop = (id, patch = {}) => ({
  id, name: id, lat: 52.377, lng: 4.894, bank: 'south', area: 'Centrum',
  kind: 'water', visitMinutes: 20, access: 'public', cost: 0, photo: photo(id), ...patch,
});
const canal = stop('canal');
const park = stop('park', { kind: 'park', visitMinutes: 8, lng: 4.896 });
const library = stop('library', { access: 'venue', openingHours: 'Mo-Fr 09:00-12:20' });
const unknown = stop('unknown', { cost: null });
const north = stop('north', { bank: 'north' });
const untimed = stop('untimed', { access: 'venue' });
const unseen = stop('unseen', { photo: null });
const duplicate = stop('canal-duplicate', { name: 'canal' });
const route = (a, b, minutes, properties = {}) => ({
  seconds: minutes * 60, meters: minutes * 75, geometry: [[a.lng, a.lat], [b.lng, b.lat]], ...properties,
});
const twoWay = (a, b, minutes, properties = {}) => ({
  [`${a.id}>${b.id}`]: route(a, b, minutes, properties), [`${b.id}>${a.id}`]: route(b, a, minutes, properties),
});
const data = {
  starts: [start], places: [canal, park, library, unknown, north, untimed, unseen, duplicate],
  routes: {
    ...twoWay(start, canal, 11), ...twoWay(start, park, 7), ...twoWay(park, canal, 6),
    ...twoWay(start, library, 10), ...twoWay(start, unknown, 5), ...twoWay(start, north, 4, { ferry: true }),
    ...twoWay(start, untimed, 8), ...twoWay(start, unseen, 2), ...twoWay(start, duplicate, 5),
  },
};
const prefs = { start: 'central', endpoint: 'start', minutes: 47, budget: 0, strictBudget: true, walking: 45 };
const suggest = (changes, options) => guide.suggest({ ...prefs, ...changes }, { now, data, ...options });
const includes = (plans, id) => plans.some(plan => plan.placeIds.includes(id));

const exact = suggest();
const roundTrip = exact.fits.find(plan => plan.id === 'guide-canal');
assert.ok(roundTrip, 'The 47-minute trip should fit exactly');
assert.equal(roundTrip.total, 47);
assert.equal(roundTrip.walking, 22);
assert.equal(roundTrip.endpointTravel, 11);
assert.equal(roundTrip.buffer, 5);
assert.equal(roundTrip.spare, 0);
assert.equal(roundTrip.endId, 'central');
assert.equal(includes(suggest({ minutes: 46 }).fits, 'canal'), false);
assert.equal(includes(exact.fits, 'library'), false, 'Mid-visit closure must block the plan');
assert.equal(includes(exact.ideas, 'library'), false, 'A known closure should not be suggested');
assert.equal(includes(exact.fits, 'north'), false, 'A short ferry leg must not become a walk across the IJ');
assert.equal(exact.ideas.find(plan => plan.placeIds.includes('north')).handoff.url, 'https://www.gvb.nl/reisinformatie');
assert.equal(includes(exact.fits, 'unknown'), false);
assert.equal(includes(exact.ideas, 'unknown'), false, 'Strict €0 must exclude a required unknown cost');
assert.equal(includes(exact.fits, 'untimed'), false);
assert.equal(includes(exact.ideas, 'untimed'), true);
assert.equal(includes(exact.fits, 'unseen'), false);
assert.equal(includes(exact.fits, 'canal-duplicate'), false);
assert.deepEqual(exact.fits.map(plan => plan.id), suggest().fits.map(plan => plan.id));
assert.equal(new Set(exact.fits.map(plan => plan.photo.src)).size, exact.fits.length);
const next = suggest({}, { excludedPhotos: [canal.photo.src] });
assert.equal(includes(next.fits, 'canal'), false, 'Replan without a failed image');
assert.ok(includes(next.fits, 'park'));
assert.equal(suggest({ minutes: 0 }).fits.length, 0);
assert.equal(suggest({ minutes: 0 }).empty.action, 'minutes');
assert.equal(suggest({ minutes: 1 }).empty.value, 27);
assert.equal(suggest({ accessibility: 'step-free' }).fits.length, 0);
assert.equal(suggest({ transport: 'cycle' }).empty.action, 'transport');

const at = value => Date.parse(value);
const venue = openingHours => ({ access: 'venue', openingHours });
assert.equal(guide.openingState(venue('Fr 12:00-12:20'), at('2026-11-13T11:10Z'), at('2026-11-13T11:20Z')), 'open');
assert.equal(guide.openingState(venue('Fr 12:00-12:20'), at('2026-11-13T11:10Z'), at('2026-11-13T11:21Z')), 'closed');
assert.equal(guide.openingState(venue('Fr 22:00-02:00'), at('2026-11-13T22:50Z'), at('2026-11-14T00:50Z')), 'open');
assert.equal(guide.openingState(venue('Su 01:00-04:00'), at('2026-03-29T00:30Z'), at('2026-03-29T01:30Z')), 'open');
assert.equal(guide.openingState(venue('Mo-Su 09:00-17:00; PH off'), now, now + 1000), 'unknown');
assert.equal(guide.openingState(venue('Mo-Su 09:00-17:00'), at('2026-12-25T12:00Z'), at('2026-12-25T12:20Z')), 'unknown');
assert.equal(guide.openingState({ ...venue('24/7'), hoursValidUntil: '2026-01-01' }, now, now + 1000), 'unknown');

const deadline = '2026-11-13T11:47:00.000Z';
const started = guide.begin(roundTrip, { now: now + 1000, data });
assert.equal(started.deadlineAt, '2026-11-13T11:47:01.000Z');
assert.equal(started.feasible, true);
const fixed = suggest({ deadlineAt: deadline }).fits.find(plan => plan.id === 'guide-canal');
assert.equal(guide.begin(fixed, { now: now + 1000, data }).feasible, false);
const skipped = guide.replan(roundTrip, { skipped: ['canal'], now, data });
assert.equal(skipped.endId, 'central');
assert.equal(skipped.deadlineAt, deadline);
assert.equal(skipped.stops.length, 0);
const swapped = guide.swap(roundTrip, 'canal', { now, data });
assert.equal(swapped.to.id, 'park');
assert.equal(swapped.plan.endId, 'central');
assert.equal(swapped.plan.deadlineAt, deadline);
const follow = guide.replan(swapped.plan, { completed: ['park'], now: now + 30 * 60000, data });
assert.equal(follow.endId, 'central');
assert.equal(follow.deadlineAt, deadline);
assert.equal(follow.endpointTravel, 7);
assert.equal(follow.total, 12);
const home = guide.returnRoute(roundTrip, 'canal', { now, data });
assert.equal(home.minutes, 11);
assert.equal(home.leg.toId, 'central');
const onward = suggest({ endpoint: 'none' }).fits.find(plan => plan.id === 'guide-canal');
const onwardSwap = guide.swap(onward, 'canal', { now, data });
assert.equal(onwardSwap.plan.endId, 'canal');
assert.equal(onwardSwap.plan.endpointTravel, 6);
assert.equal(guide.returnRoute(roundTrip, 'north', { now, data }).handoff.url, 'https://www.gvb.nl/reisinformatie');

const sailing = (departure, arrival) => ({ departure, arrival });
const schedule = departures => ({ departures, validUntil: '2026-11-13T14:00:00Z', sourceUrl: 'https://example.test/sailings' });
const ferry = { ferry: true, walkBeforeSeconds: 120, walkAfterSeconds: 120, cost: 0 };
const ferries = {
  ...data, places: [north], routes: {
    'central>north': route(start, north, 4, { ...ferry, schedule: schedule([sailing('2026-11-13T11:05Z', '2026-11-13T11:10Z')]) }),
    'north>central': route(north, start, 4, { ...ferry, schedule: schedule([sailing('2026-11-13T11:35Z', '2026-11-13T11:40Z')]) }),
  },
};
const timed = suggest({ transport: 'walk-ferry' }, { data: ferries }).fits[0];
assert.equal(timed.total, 47);
assert.equal(timed.waiting, 4);
assert.equal(timed.walking, 8);
assert.equal(suggest({}, { data: ferries }).fits.length, 0);
assert.equal(suggest({ transport: 'walk-ferry', minutes: 46 }, { data: ferries }).fits.length, 0);

function encodePolyline(points) {
  let last = [0, 0];
  let result = '';
  for (const point of points) {
    const current = [point.lat, point.lng].map(value => Math.round(value * 1e6));
    current.forEach((value, index) => {
      const delta = value - last[index];
      let code = delta < 0 ? ~(delta << 1) : delta << 1;
      while (code >= 32) {
        result += String.fromCharCode((32 | (code & 31)) + 63);
        code >>>= 5;
      }
      result += String.fromCharCode(code + 63);
    });
    last = current;
  }
  return result;
}
const liveData = { ...data, places: [canal], routes: {} };
const options = { data: liveData, now, endpoint: 'https://router.example.test' };
const mock = async url => {
  const payload = JSON.parse(new URL(url).searchParams.get('json'));
  assert.equal(payload.costing, 'pedestrian');
  const shape = encodePolyline(payload.locations.map(point => ({ lat: point.lat, lng: point.lon })));
  return { ok: true, json: async () => ({ trip: { summary: { time: 660, length: 0.825 }, legs: [{ shape }] } }) };
};
const live = await guide.search(prefs, { ...options, fetch: mock });
assert.equal(live.fits[0].total, 47);
assert.equal(Object.keys(live.fits[0].routing).length, 2);
assert.equal(guide.returnRoute(live.fits[0], 'canal', { now, data: liveData }).minutes, 11);
const controller = new AbortController();
const racing = guide.search(prefs, { ...options, endpoint: 'https://slow.example.test', signal: controller.signal,
  fetch: async url => {
    controller.abort();
    return mock(url);
  },
});
await assert.rejects(racing, { name: 'AbortError' });
console.log('PASS guide time, cost, route, ferry, photo, hours, deadline and cancelled-request fixtures');
