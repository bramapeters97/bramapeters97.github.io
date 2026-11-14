/* Offline regression checks: node scripts/check-amstroll.mjs
 * Run check-amstroll-browser.mjs separately against a local preview.
 * No requests reach an external service; fixtures test behavior, not live coverage.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const file = 'projects/amstroll/portfolio-embed/index.html';
const html = fs.readFileSync(path.join(root, file), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
  .filter(match => !/\bsrc\s*=|\btype\s*=\s*["'](?:application\/ld\+json|application\/json)/i.test(match[1]))
  .map(match => match[2]);
assert.ok(scripts.length, 'Standalone prototype has no inline scripts');
scripts.forEach((source, i) => new vm.Script(source, { filename: `${file}:script-${i}` }));
const providerScript = scripts.find(source => /window\.AmstrollProviders\s*=/.test(source));
assert.ok(providerScript, 'Standalone provider adapter is missing');
const start = { lat: 52.378, lng: 4.899 };

// Provider responses deliberately include a duplicate place, a duplicate photo,
// an unlicensed photo and an unpictured cafe. None should become invented cards.
function fixtures(count = 80, { failPhotos = false, abortPhotos = false } = {}) {
  const controller = new AbortController();
  const requests = [];
  const places = Array.from({ length: count }, (_, i) => ({
    pageid: i + 1, title: `Test place ${i + 1}`, lat: start.lat + (i + 1) * .00001,
    lon: start.lng, type: 'landmark'
  }));
  const fetch = async (url, options = {}) => {
    const u = new URL(url), q = u.searchParams;
    const titles = q.get('titles')?.split('|') || [];
    assert.ok(titles.length <= 50, 'Metadata requests must remain batched');
    requests.push({ host: u.hostname, prop: q.get('prop') });
    let data;
    if (u.hostname.includes('overpass')) data = { elements: [
      { type: 'node', id: 1, lat: places[0].lat, lon: start.lng,
        tags: { name: 'Alternative name for the first place', tourism: 'museum', wikipedia: 'en:Test place 1' } },
      { type: 'node', id: 2, lat: start.lat + .0002, lon: start.lng,
        tags: { name: 'Unpictured test cafe', amenity: 'cafe' } }
    ] };
    else if (q.get('list') === 'geosearch') data = { query: { geosearch: places } };
    else if (q.get('prop') === 'pageimages') data = { query: { pages: titles.map(title => ({
      title, pageimage: `Test place ${title.endsWith(' 2') ? '1' : title.split(' ').at(-1)}.jpg`
    })) } };
    else if (q.get('prop') === 'imageinfo') {
      if (abortPhotos) {
        queueMicrotask(() => controller.abort());
        return new Promise((resolve, reject) => options.signal.addEventListener('abort',
          () => reject(new DOMException('Cancelled fixture', 'AbortError')), { once: true }));
      }
      if (failPhotos) throw new Error('Photo service unavailable');
      data = { query: { pages: titles.map(title => ({ title, imageinfo: [{
        thumburl: `https://upload.wikimedia.org/${encodeURIComponent(title)}.png`,
        descriptionurl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
        mediatype: 'BITMAP', extmetadata: {
          LicenseShortName: { value: title === 'File:Test place 3.jpg' ? 'Fair use' : 'CC BY-SA 4.0' },
          LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' },
          Artist: { value: '<a>Fixture photographer</a>' }, ObjectName: { value: title }
        }
      }] })) } };
    } else throw new Error(`Unexpected fixture request: ${url}`);
    return { ok: true, headers: { get: () => null }, json: async () => data };
  };
  return { controller, requests, fetch };
}

function providerHarness(fixture) {
  const context = vm.createContext({ URL, DOMException, AbortController, setTimeout, clearTimeout,
    location: { origin: 'https://amstroll.test' }, window: { AMSTROLL_CONFIG: {} }, fetch: fixture.fetch });
  vm.runInContext(providerScript, context);
  return context.window.AmstrollProviders;
}
const discover = (provider, signal) => provider.discover({ mode: 'open', start }, signal);
const fullFixture = fixtures(), full = await discover(providerHarness(fullFixture));
assert.equal(full.candidates.length, 50);
assert.equal(new Set(full.candidates.map(place => place.photo.fileName)).size, 50);
assert.equal(full.candidates.filter(place => place.wikipedia === 'en:Test place 1').length, 1);
assert.ok(full.candidates.every(place => place.photo.src && place.photo.sourceUrl
  && place.photo.credit === 'Fixture photographer' && place.photo.license === 'CC BY-SA 4.0'));
assert.ok(full.candidates.every(place => place.photo.fileName !== 'File:Test place 3.jpg'));
assert.ok(full.candidates.every(place => place.name !== 'Unpictured test cafe'));
assert.ok(fullFixture.requests.length <= 6, 'Discovery should batch photo metadata instead of requesting each card');

const partial = await discover(providerHarness(fixtures(8)));
assert.equal(partial.candidates.length, 6);
assert.ok(partial.providerWarnings.some(warning => warning.includes('Found 6 places')));
await assert.rejects(discover(providerHarness(fixtures(8, { failPhotos: true }))),
  error => error.code === 'OPEN_PHOTOS_UNAVAILABLE');
const cancelled = fixtures(8, { abortPhotos: true });
await assert.rejects(discover(providerHarness(cancelled), cancelled.controller.signal),
  error => error.name === 'AbortError');
console.log(`PASS ${scripts.length} inline scripts; distinct licensed place images, batched requests, partial coverage, failure and cancellation`);

await import('./check-amstroll-clock.mjs');
await import('./check-amstroll-guide.mjs');
assert.ok(!/https?:\/\/(?:maps\.googleapis\.com|www\.google\.com\/maps)/.test(html), 'Amstroll must have no Google Maps integration');
assert.match(html, /guide-offline\.js/);
for (const [, asset] of html.matchAll(/<script src="(guide-[^"]+\.js)"/g)) {
  new vm.Script(fs.readFileSync(path.join(root, path.dirname(file), asset), 'utf8'), { filename: asset });
}
console.log('PASS linked guide scripts and static shell');

const guideFolder = path.join(root, path.dirname(file));
const guideContext = vm.createContext({ window: {}, AbortController, URL, setTimeout, clearTimeout });
for (const asset of ['guide-data.js', 'guide-planner.js']) {
  vm.runInContext(fs.readFileSync(path.join(guideFolder, asset), 'utf8'), guideContext);
}
const { AmstrollGuideData: catalogue, AmstrollGuide: guide } = guideContext.window;
const seed = JSON.parse(fs.readFileSync(path.join(root, 'scripts/amstroll/catalogue.json'), 'utf8'));
const points = new Map([...catalogue.starts, ...catalogue.places].map(point => [point.id, point]));
const photos = catalogue.places.flatMap(place => [place.photo, place.thenAndNow?.then, place.thenAndNow?.now].filter(Boolean));
for (const photo of photos) {
  assert.ok(photo.src.startsWith('guide-photos/') && photo.subject && photo.alt && photo.credit && photo.modifications);
  assert.equal(new URL(photo.sourceUrl).hostname, 'commons.wikimedia.org');
  assert.match(photo.license, /^CC/);
  assert.ok(fs.statSync(path.join(guideFolder, photo.src)).size > 1000);
}
assert.equal(Object.keys(catalogue.routes).length, seed.routePairs.length * 2);
for (const [key, route] of Object.entries(catalogue.routes)) {
  const [from, to] = key.split('>').map(id => points.get(id));
  assert.ok(from && to && route.seconds > 0 && route.meters > 0 && !route.ferry && route.geometry.length > 2, key);
  const distance = (point, [lng, lat]) => Math.hypot((point.lat - lat) * 111000, (point.lng - lng) * 68000);
  assert.ok(distance(from, route.geometry[0]) < 80 && distance(to, route.geometry.at(-1)) < 80, key);
}
const day = new Date('2026-11-13T11:00:00Z');
const bundled = guide.suggest({ start: 'central', endpoint: 'start', minutes: 47, budget: 0, walking: 45 }, { now: day });
assert.ok(bundled.fits.length >= 3);
assert.ok(bundled.fits.some(plan => plan.thenAndNow));
assert.equal(new Set(bundled.fits.map(plan => plan.photo.src)).size, bundled.fits.length);
assert.ok(bundled.fits.every(plan => plan.endId === 'central' && plan.total <= 47 && plan.cost === 0));
assert.ok(bundled.ideas.some(plan => plan.handoff?.url.includes('gvb.nl')));
console.log(`PASS packaged guide with ${catalogue.places.length} photographed places and ${Object.keys(catalogue.routes).length} routed legs`);
