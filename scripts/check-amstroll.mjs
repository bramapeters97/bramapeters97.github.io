/* Offline regression checks: node scripts/check-amstroll.mjs
 * Add --dom-module /absolute/path/to/jsdom/lib/api.js for app interaction checks.
 * No requests reach an external service; fixtures test behavior, not live coverage.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
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

const moduleFlag = process.argv.indexOf('--dom-module');
if (moduleFlag < 0) {
  console.log('Supply --dom-module for default source, pagination and offline app interaction checks.');
  process.exit(0);
}
assert.ok(process.argv[moduleFlag + 1], '--dom-module needs an absolute jsdom module path');
const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require(path.resolve(process.argv[moduleFlag + 1]));
const windows = [];
const waitFor = async (condition, message) => {
  const deadline = Date.now() + 5000;
  while (!condition()) {
    assert.ok(Date.now() < deadline, message);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};
function appHarness(fixture) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  // CSS is outside this behavioral suite; no fonts, images or remote assets load.
  const markup = html.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '');
  const dom = new JSDOM(markup, { url: 'https://amstroll.test/prototype/',
    runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const w = dom.window;
  windows.push(w);
  w.fetch = fixture.fetch;
  w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  w.document.fonts = { ready: Promise.resolve() };
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  scripts.forEach(source => w.eval(source));
  return { w, doc: w.document, errors };
}
const cards = app => [...app.doc.querySelectorAll('.amstroll-card')];
try {
  const app = appHarness(fixtures());
  assert.equal(app.w.AmstrollApp.getUI().mode, 'open', 'Open places must be the default');
  await waitFor(() => cards(app).length === 5, 'The first five provider cards did not appear');
  const first = cards(app).map(card => card.dataset.planId);
  app.doc.querySelector('[data-action="more-places"]').click();
  const second = cards(app).map(card => card.dataset.planId);
  assert.equal(second.length, 5);
  assert.ok(second.every(id => !first.includes(id)), 'The next five repeat the first page');
  const image = app.doc.querySelector('img[data-place-photo]');
  const originalSource = image.src;
  image.dispatchEvent(new app.w.Event('error'));
  assert.equal(image.src, originalSource, 'A failed place photo must not become unrelated area imagery');
  assert.equal(image.hidden, true);
  assert.ok(image.parentElement.querySelector('.photo-unavailable'));
  assert.deepEqual(app.errors, []);

  const offline = appHarness(fixtures(8, { failPhotos: true }));
  await waitFor(() => offline.doc.querySelector('[data-action="use-curated"]'), 'Provider failure was not shown');
  assert.equal(cards(offline).length, 0, 'Offline failure silently substituted authored plans');
  offline.doc.querySelector('[data-action="use-curated"]').click();
  assert.equal(offline.w.AmstrollApp.getUI().mode, 'curated');
  assert.equal(cards(offline).length, 20, 'Explicit offline collection should keep twenty ideas available');
  assert.deepEqual(offline.errors, []);
  console.log('PASS app: Open places default, five-card pages without overlap, honest image errors and explicit twenty-idea offline collection');
} finally {
  windows.forEach(w => w.close());
}

