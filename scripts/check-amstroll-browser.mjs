/* Usage: node scripts/check-amstroll-browser.mjs [http://127.0.0.1:8765] */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.AMSTROLL_PLAYWRIGHT || 'playwright');
const base = (process.argv[2] || 'http://127.0.0.1:8765').replace(/\/$/, '');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.AMSTROLL_CHROME ? { executablePath: process.env.AMSTROLL_CHROME } : {}),
});
const viewport = { width: 390, height: 844 };
const rootPath = '/projects/amstroll/portfolio-embed/index.html';
const clock = '[data-clock-dial]';
const collection = '#collection .amstroll-card:visible';
const action = (root, id) => root.locator(`[data-action="${id}"]`).first();
const visible = async (locator, message) => {
  await locator.waitFor({ state: 'visible', timeout: 7000 });
  assert.ok(await locator.isVisible(), message);
};
const openPlanner = async root => {
  await action(root, 'planner').click();
  await visible(root.locator(clock));
};
const dialValue = async (root, value) => {
  const control = root.locator(clock);
  await visible(control);
  assert.equal(await control.getAttribute('aria-valuenow'), String(value));
};
const decodedPhotos = async page => {
  const cards = page.locator(collection);
  const count = await cards.count();
  for (let index = 0; index < count; index++) {
    const image = cards.nth(index).locator('img').first();
    await image.scrollIntoViewIfNeeded();
    assert.equal(await image.evaluate(async item => {
      try { await item.decode(); } catch { return false; }
      return item.naturalWidth > 0 && item.alt.length > 0;
    }), true);
  }
};

try {
  const context = await browser.newContext({ viewport, isMobile: true, deviceScaleFactor: 2, hasTouch: true, timezoneId: 'America/New_York' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.addInitScript(() => {
    window.AMSTROLL_NOW = '2026-11-13T11:00:00Z';
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition = (_, reject) => reject({ code: 1 });
  });
  // Permit only localhost. This covers the packaged guide when remote providers,
  // including any optional base map or context lookup, are unavailable.
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin
    ? route.continue() : route.abort('internetdisconnected'));
  await page.goto(base + rootPath, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.getByRole('button', { name: 'Plan a stroll', exact: true }).count(), 1);
  assert.equal(await page.locator(clock).count(), 0, 'Planning options stay in the planner');
  await openPlanner(page);
  await dialValue(page, 47);
  await page.locator(clock).scrollIntoViewIfNeeded();
  const face = await page.locator(clock).boundingBox();
  await page.touchscreen.tap(face.x + face.width * .87, face.y + face.height * .5);
  await dialValue(page, 15);
  const media = await context.newCDPSession(page);
  await media.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
  assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches), true);
  assert.equal(await page.locator('.guide-clock__reflection').evaluate(element => getComputedStyle(element).display), 'none');
  await media.send('Emulation.setEmulatedMedia', { features: [] });
  await page.locator(clock).focus();
  await page.keyboard.press('Home');
  await dialValue(page, 0);
  await page.keyboard.press('End');
  await dialValue(page, 720);
  await page.keyboard.press('Home');
  await page.locator('[data-clock-action="exact"]').click();
  await page.locator('[data-clock-exact] input[name="hours"]').fill('0');
  await page.locator('[data-clock-exact] input[name="minutes"]').fill('59');
  await page.getByRole('button', { name: 'Apply duration' }).click();
  await dialValue(page, 59);
  await page.locator(clock).scrollIntoViewIfNeeded();
  const dial = await page.locator(clock).boundingBox();
  const centre = { x: dial.x + dial.width / 2, y: dial.y + dial.height / 2 };
  const tick = index => ({
    x: centre.x + Math.sin(index * Math.PI / 30) * dial.width * 0.37,
    y: centre.y - Math.cos(index * Math.PI / 30) * dial.height * 0.37,
  });
  await page.mouse.move(tick(59).x, tick(59).y);
  await page.mouse.down();
  await page.mouse.move(tick(0).x, tick(0).y, { steps: 4 });
  await page.mouse.up();
  await dialValue(page, 60);
  await page.locator(clock).focus();
  await page.keyboard.press('ArrowLeft');
  await dialValue(page, 59);
  await page.locator('[data-clock-action="exact"]').click();
  await page.locator('[data-clock-exact] input[name="hours"]').fill('0');
  await page.locator('[data-clock-exact] input[name="minutes"]').fill('47');
  await page.getByRole('button', { name: 'Apply duration' }).click();
  await dialValue(page, 47);
  await page.locator('[data-clock-action="deadline-mode"]').click();
  const deadline = page.locator('[data-clock-deadline]');
  await deadline.locator('input[name="date"]').fill('2026-11-13');
  await deadline.locator('input[name="time"]').fill('12:47');
  await deadline.getByRole('button', { name: 'Save deadline' }).click();
  assert.equal(await page.locator('.guide-clock').getAttribute('data-deadline'), '2026-11-13T11:47:00.000Z');
  assert.equal(await page.evaluate(() => window.AmstrollApp.getState().prefs.deadline), null, 'Editing a draft does not commit it');
  await action(page, 'planner-apply').click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPlanner(page);
  assert.equal(await page.locator('.guide-clock').getAttribute('data-deadline'), '2026-11-13T11:47:00.000Z');
  await page.locator('[data-clock-action="duration-mode"]').click();
  await page.locator('[data-action="planner-step"][data-step="route"]').click();
  await page.locator('[data-action="planner-step"][data-step="start"]').click();
  await action(page, 'geolocation').click();
  await page.waitForFunction(() => /denied/i.test(document.querySelector('#location-error')?.textContent || ''));
  assert.ok((await page.locator('[data-action="choose-location"]').count()) > 1, 'Manual location choices must survive denied GPS');
  await page.getByRole('button', { name: /Amsterdam Centraal/ }).last().click();
  while (await action(page, 'planner-apply').count() === 0) {
    const back = page.locator('dialog [data-action="planner-back"]');
    if (!await back.count()) throw Error('Unable to return to the current draft.');
    await back.first().click();
  }
  await action(page, 'planner-apply').click();
  await visible(page.locator(collection).first(), 'The packaged guide should show results with public services blocked');
  const cards = page.locator('#feed-items .amstroll-card');
  const beforeAppend = await cards.evaluateAll(items => items.map(item => item.dataset.planId));
  assert.ok(beforeAppend.length > 0 && beforeAppend.length <= 3);
  assert.equal(await page.locator('#feed-sentinel').count(), 1);
  await page.evaluate(() => {
    window.feedBeforeAppend = document.querySelector('#feed-items .amstroll-card');
    document.querySelector('#screen').scrollTop = document.querySelector('#screen').scrollHeight;
  });
  await page.waitForFunction(count => document.querySelectorAll('#feed-items .amstroll-card').length > count, beforeAppend.length);
  const appended = await cards.evaluateAll(items => items.map(item => item.dataset.planId));
  assert.deepEqual(appended.slice(0, beforeAppend.length), beforeAppend, 'Scroll keeps existing cards in ranked order');
  assert.equal(new Set(appended).size, appended.length);
  assert.equal(await cards.first().evaluate(item => item === window.feedBeforeAppend), true, 'Append preserves the original DOM');
  const added = cards.nth(beforeAppend.length);
  await action(added, 'detail').click();
  await visible(action(page, 'back'));
  await action(page, 'back').click();
  assert.deepEqual(await cards.evaluateAll(items => items.map(item => item.dataset.planId)), appended);
  assert.equal(await page.evaluate(() => document.activeElement?.closest('.amstroll-card')?.dataset.planId), appended[beforeAppend.length]);
  const initialHero = cards.first().locator('img');
  const initialSrc = await initialHero.getAttribute('src');
  await initialHero.evaluate(image => image.dispatchEvent(new Event('error')));
  await page.waitForFunction(src => {
    const image = document.querySelector('#feed-items .amstroll-card img');
    return image && image.getAttribute('src') !== src;
  }, initialSrc);
  await decodedPhotos(page);
  const first = page.locator(collection).first();
  await action(first, 'detail').click();
  await visible(action(page, 'start'));
  await action(page, 'start').click();
  const outingMenu = page.locator('.guide-active-menu > summary');
  await visible(outingMenu);
  await outingMenu.click();
  await visible(action(page, 'head-back'));
  const lock = await page.evaluate(() => {
    const plan = window.AmstrollApp.getState().active.plan;
    return { deadline: plan.deadlineAt, finish: plan.endId };
  });
  await action(page, 'head-back').click();
  await visible(page.getByRole('dialog', { name: 'Head back now' }));
  assert.ok(await page.locator('#guide-return-result').textContent());
  await action(page, 'close-sheet').click();
  if (!await action(page, 'swap-stop').isVisible()) await outingMenu.click();
  await action(page, 'swap-stop').click();
  await visible(action(page, 'confirm-swap'), 'The test outing should have a feasible replacement');
  const stopsBefore = await page.evaluate(() => window.AmstrollApp.getState().active.plan.placeIds);
  await action(page, 'confirm-swap').click();
  assert.notDeepEqual(await page.evaluate(() => window.AmstrollApp.getState().active.plan.placeIds), stopsBefore);
  assert.deepEqual(await page.evaluate(() => {
    const plan = window.AmstrollApp.getState().active.plan;
    return { deadline: plan.deadlineAt, finish: plan.endId };
  }), lock);
  if (!await action(page, 'skip-stop').isVisible()) await outingMenu.click();
  await action(page, 'skip-stop').click();
  assert.deepEqual(await page.evaluate(() => {
    const plan = window.AmstrollApp.getState().active.plan;
    return { deadline: plan.deadlineAt, finish: plan.endId };
  }), lock);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);

  const narrow = await context.newPage();
  await narrow.setViewportSize({ width: 320, height: 568 });
  await narrow.goto(base + '/amstroll.html', { waitUntil: 'domcontentloaded' });
  const cookie = narrow.locator('#cookie-decline');
  if (await cookie.isVisible()) await cookie.click();
  const iframe = narrow.locator('#amstroll-prototype-view iframe');
  await iframe.scrollIntoViewIfNeeded();
  const frame = narrow.frameLocator('#amstroll-prototype-view iframe');
  await openPlanner(frame);
  await frame.locator(clock).focus();
  await narrow.keyboard.press('ArrowRight');
  const before = await frame.locator(clock).getAttribute('aria-valuenow');
  const full = narrow.locator('.case-prototype-toggle');
  await full.click();
  assert.equal(await full.getAttribute('aria-expanded'), 'true');
  assert.equal(await frame.locator(clock).getAttribute('aria-valuenow'), before, 'Fullscreen should preserve the iframe and its state');
  await full.click();
  assert.equal(await full.getAttribute('aria-expanded'), 'false');
  assert.equal(await frame.locator(clock).getAttribute('aria-valuenow'), before);
  assert.equal(await frame.locator('html').evaluate(node => node.scrollWidth > node.clientWidth + 1), false);
  assert.equal(await frame.locator('.guide-clock').evaluate(node => node.scrollWidth > node.clientWidth + 1), false);
  await action(frame, 'planner-apply').press('Enter');
  const iframeCards = frame.locator('#feed-items .amstroll-card');
  await visible(iframeCards.first());
  const iframeInitial = await iframeCards.evaluateAll(items => items.map(item => item.dataset.planId));
  assert.ok(iframeInitial.length > 0 && iframeInitial.length <= 3);
  await frame.locator('#screen').evaluate(screen => screen.scrollTo({ top: screen.scrollHeight, behavior: 'instant' }));
  const iframeAppended = iframeCards.nth(iframeInitial.length);
  await visible(iframeAppended);
  const iframeOrder = await iframeCards.evaluateAll(items => items.map(item => item.dataset.planId));
  assert.deepEqual(iframeOrder.slice(0, iframeInitial.length), iframeInitial);
  assert.equal(new Set(iframeOrder).size, iframeOrder.length);
  const iframeCardId = await iframeAppended.getAttribute('data-plan-id');
  await action(iframeAppended, 'detail').press('Enter');
  await visible(action(frame, 'back'));
  await action(frame, 'back').press('Enter');
  assert.deepEqual(await iframeCards.evaluateAll(items => items.map(item => item.dataset.planId)), iframeOrder);
  assert.equal(await frame.locator('html').evaluate(node => node.ownerDocument.activeElement?.closest('.amstroll-card')?.dataset.planId), iframeCardId);
  await narrow.close();
  const changed = await context.newPage();
  await changed.goto(base + rootPath, { waitUntil: 'domcontentloaded' });
  await openPlanner(changed);
  await changed.locator(clock).press('Home');
  await action(changed, 'planner-apply').click();
  await visible(changed.getByRole('heading', { name: 'Save an idea for later' }));
  assert.equal(await changed.locator('#collection [data-action="start"]').count(), 0);
  await changed.getByRole('button', { name: 'Edit plan', exact: true }).click();
  await changed.locator(clock).press('End');
  await action(changed, 'planner-apply').click();
  await visible(changed.getByRole('heading', { name: 'Your next stroll' }));
  for (let i = 0; i < 8 && !await changed.locator('.guide-feed-terminal').isVisible(); i++) {
    const visibleCount = await changed.locator('#feed-items .amstroll-card').count();
    await changed.evaluate(() => {
      const screen = document.querySelector('#screen');
      screen.scrollTo({ top: screen.scrollHeight, behavior: 'instant' });
    });
    await changed.waitForFunction(count => {
      const terminal = document.querySelector('.guide-feed-terminal');
      return terminal && (!terminal.hidden || document.querySelectorAll('#feed-items .amstroll-card').length > count);
    }, visibleCount);
  }
  await visible(changed.locator('.guide-feed-terminal'));
  await changed.close();
  const library = await context.newPage();
  await library.goto(base + rootPath, { waitUntil: 'domcontentloaded' });
  await openPlanner(library);
  await action(library, 'planner-apply').click();
  if (!await action(library, 'use-curated').isVisible()) await action(library, 'sources').click();
  await visible(action(library, 'use-curated'));
  await action(library, 'use-curated').click();
  await visible(library.getByRole('heading', { name: 'Amsterdam collection', exact: true }));
  assert.ok(await library.locator(collection).count());
  const offline = await browser.newContext({ viewport });
  const cached = await offline.newPage();
  await cached.goto(base + rootPath, { waitUntil: 'domcontentloaded' });
  await cached.waitForFunction(async () => {
    const photo = await caches.match(new URL('guide-photos/modern.jpg', location.href).href);
    return navigator.serviceWorker.controller && !!photo;
  });
  await offline.setOffline(true);
  await cached.reload({ waitUntil: 'domcontentloaded' });
  await openPlanner(cached);
  await dialValue(cached, 47);
  await action(cached, 'planner-apply').click();
  await visible(cached.locator(collection).first(), 'The guide should start with the network fully disconnected after a first visit');
  await decodedPhotos(cached);
  await offline.close();
  assert.deepEqual(errors, []);
  console.log('PASS append-only feed, restored focus and results, changed plan and end of feed, standalone, touch, keyboard and drag clock, reduced transparency, saved duration and deadline, denied GPS, broken photo recovery, active return, swap and skip, offline reload, and 320px iframe');
} finally {
  await browser.close();
}
