/* npm install --no-save --package-lock=false playwright (if unavailable)
 * CHROMIUM_PATH=/usr/bin/chromium node scripts/check-mypremiere-preview.cjs
 * Uses only localhost; tests desktop/mobile, motion, lifecycle and failure states.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };

(async () => {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    try {
      response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      response.end(fs.readFileSync(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true,
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const viewport of [{width:1440,height:900}, {width:390,height:844}, {width:844,height:390}]) {
      const context = await browser.newContext({viewport, isMobile:viewport.width < 900, hasTouch:viewport.width < 900});
      const page = await context.newPage();
      await page.route(/^https?:/, route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${origin}/index.html`);
      const consent = page.locator('#cookie-decline');
      if (await consent.isVisible()) await consent.click();
      await page.clock.install();
      const card = page.locator('#project-mypremiereplus');
      const trigger = card.getByRole('button');
      const dialog = page.locator('#mypremiereplus-preview');
      const image = dialog.locator('img');
      const close = dialog.getByRole('button', {name:'Close MyPremiere+ image preview'});
      assert.equal(await card.locator('a').count(), 0);

      async function coverage() {
        const box = await dialog.boundingBox();
        assert.deepEqual(box, {x:0, y:0, ...page.viewportSize()});
        const rect = await image.boundingBox();
        assert.ok(rect.x <= .1 && rect.y <= .1 && rect.x + rect.width >= box.width - .1 && rect.y + rect.height >= box.height - .1,
          `Uncovered viewport: ${JSON.stringify({box, rect})}`);
        const aspect = await image.evaluate(img => ({ natural:img.naturalWidth/img.naturalHeight, rendered:img.offsetWidth/img.offsetHeight }));
        assert.ok(Math.abs(aspect.natural - aspect.rendered) < .005, 'Image aspect ratio must be preserved');
        return rect;
      }
      async function opened() {
        await dialog.waitFor({state:'visible'});
        assert.equal(await page.getByRole('dialog', {name:'MyPremiere+ image preview'}).count(), 1);
        await dialog.locator('img').evaluate(img => img.decode());
        await page.clock.runFor(64);
        assert.equal(await dialog.evaluate(el => el.matches(':modal')), true);
        assert.equal(await close.evaluate(el => el === document.activeElement), true);
        const button = await close.boundingBox();
        assert.ok(button.width >= 44 && button.height >= 44);
      }
      async function verifyClosed(savedScroll) {
        await dialog.waitFor({state:'hidden'});
        await page.clock.runFor(32);
        assert.equal(await page.evaluate(() => document.body.style.position), '');
        assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
        assert.equal(await page.evaluate(() => window.scrollY), savedScroll);
        assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
        const before = await image.getAttribute('style');
        await page.clock.fastForward(40000);
        assert.equal(await image.getAttribute('style'), before, 'Closed preview must stop writing animation frames');
        assert.equal(page.url(), `${origin}/index.html`);
        assert.equal(context.pages().length, 1);
      }
      let initialX;
      for (const target of [card.locator('figure'), card.locator('h2'), trigger]) {
        await target.scrollIntoViewIfNeeded();
        const savedScroll = await page.evaluate(() => window.scrollY);
        const rect = await target.boundingBox();
        // Native stretched button intentionally overlays the title and photograph.
        await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await opened();
        const left = await coverage();
        if (initialX === undefined) initialX = left.x;
        else assert.ok(Math.abs(initialX - left.x) < 12, `Every opening must restart at the left (${initialX}, ${left.x}), allowing subtle pointer drift`);
        await page.clock.fastForward(11000);
        const middle = await coverage();
        assert.ok(middle.x < left.x - 10, 'Pan must reveal the right side of the photograph');
        await page.mouse.move(viewport.width - 1, viewport.height - 1);
        await page.clock.runFor(1000);
        await coverage();
        await page.clock.fastForward(30000);
        const right = await coverage();
        assert.ok(right.x < middle.x, 'Pan must finish on the right');
        const settled = await image.getAttribute('style');
        await page.clock.fastForward(30000);
        assert.equal(await image.getAttribute('style'), settled, 'Pan must settle without looping');
        await close.click();
        await verifyClosed(savedScroll);
      }

      await trigger.focus();
      let savedScroll = await page.evaluate(() => window.scrollY);
      await page.keyboard.press('Enter');
      await opened();
      await page.setViewportSize({width:viewport.height, height:viewport.width});
      await page.clock.runFor(64);
      await coverage();
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.clock.runFor(64);
      const staticStyle = await image.getAttribute('style');
      await page.mouse.move(50, 50);
      await page.clock.fastForward(40000);
      assert.equal(await image.getAttribute('style'), staticStyle, 'Reduced motion must stay static');
      await coverage();
      await page.keyboard.press('Escape');
      // Resizing can clamp the page scroll position; test normal restoration separately above.
      await dialog.waitFor({state:'hidden'});
      await page.clock.runFor(32);
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
      await page.keyboard.press('Space');
      await opened();
      await page.clock.fastForward(40000);
      await coverage();
      assert.equal(await dialog.getAttribute('data-moving'), null);
      await page.keyboard.press('Escape');
      await page.clock.runFor(32);

      // A transient image failure must be closable and retry on the next opening.
      let imageAttempts = 0;
      await page.route('**/retry-preview-test.png', route => {
        imageAttempts += 1;
        return imageAttempts === 1 ? route.abort() : route.fulfill({contentType:'image/png', body:fs.readFileSync(path.join(root, 'assets/img/mypremiereplus.png'))});
      });
      await trigger.click();
      await opened();
      await image.evaluate(img => {img.src = '/retry-preview-test.png';});
      await page.clock.runFor(64);
      await page.waitForFunction(() => document.querySelector('#mypremiereplus-preview [role="status"]').textContent.includes('could not load'));
      await close.click();
      await page.clock.runFor(32);
      assert.equal(await dialog.isVisible(), false);
      await trigger.click();
      await opened();
      await coverage();
      assert.equal(imageAttempts, 2, 'Reopening must retry a failed image request');
      await close.click();
      await page.clock.runFor(32);

      // Closing must remain immediate even while an image response is pending.
      let releaseImage;
      const waiting = new Promise(resolve => {releaseImage = resolve;});
      let requested;
      const requestStarted = new Promise(resolve => {requested = resolve;});
      await page.route('**/slow-preview-test.png', async route => {
        requested();
        await waiting;
        await route.fulfill({contentType:'image/png', body:fs.readFileSync(path.join(root, 'assets/img/mypremiereplus.png'))});
      });
      await image.evaluate(img => {img.src = '/slow-preview-test.png';});
      await requestStarted;
      await trigger.click();
      await close.click();
      assert.equal(await page.evaluate(() => document.body.style.position), '');
      releaseImage();
      await page.clock.runFor(64);
      assert.equal(await dialog.isVisible(), false);
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}×${viewport.height}: card targets, cover/pan/depth, settling, resize, reduced motion, close/Escape, focus/scroll, image retry and closing during loading`);
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
