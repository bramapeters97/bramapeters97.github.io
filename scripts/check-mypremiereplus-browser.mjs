// Usage: node scripts/check-mypremiereplus-browser.mjs <playwright/index.mjs> [--capture]
// Uses an existing Playwright installation and installed Edge; installs nothing.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const { chromium } = process.argv[2] && process.argv[2] !== "--capture" ? await import(pathToFileURL(path.resolve(process.argv[2]))) : await import("playwright");
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const base = "http://127.0.0.1:5184";
const capture = process.argv.includes("--capture");
const qa = path.join(os.tmpdir(), "mypremiereplus-qa");
await fs.mkdir(qa, { recursive: true });
const expectCount = async (locator, count) => assert.equal(await locator.count(), count);
const wait = async (page, predicate) => page.waitForFunction(predicate, null, { timeout: 12000 });
const results = [];
try {
  for (const platform of ["ios", "ipad", "tvos"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const page = await context.newPage();
    const errors = [], external = [], api = [], failed = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => { const url = new URL(request.url()); if (url.origin !== base) external.push(request.url()); if (/\/api(?:\/|$)/.test(url.pathname)) api.push(request.url()); });
    page.on("response", (response) => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
    assert.equal((await page.goto(`${base}/apps/mypremiereplus/${platform}/`)).status(), 200);
    await page.locator(".film-card").first().waitFor();
    assert.equal((await page.reload()).status(), 200);
    await page.locator(".film-card").first().waitFor();
    const tv = platform === "tvos";
    const nav = (tab) => tv ? page.locator(`.tv-nav [data-view="${tab}"]`) : page.locator(`.nav-item[data-tab="${tab}"]`);
    const cards = () => page.locator(tv ? "#film-results .film-card" : "#results .film-card");
    const detail = (id) => page.locator(`[data-action="${tv ? "detail" : "details"}"][data-id="${id}"]`).first();
    await expectCount(page.getByRole("button", { name: /sign.?in|create account|upload|add video|billing|pair device/i }), 0);
    await nav("library").click();
    await expectCount(cards(), 6);
    await page.locator(tv ? '[data-category="Summer"]' : '[data-filter="Summer"]').click();
    await expectCount(cards(), 2);
    await nav("search").click();
    const search = page.locator("#film-search");
    await search.fill("Summer by");
    await expectCount(cards(), 1);
    assert.equal(await search.evaluate((el) => el === document.activeElement), true);
    await search.fill("no-such-fictional-film");
    await expectCount(cards(), 0);
    await search.fill("Summer by");
    await detail("lake").click();
    await page.locator('[data-action="save"]').click();
    await nav("saved").click();
    await expectCount(cards(), 1);
    await detail("lake").click();
    await detail("coast").click();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    assert.match(await page.locator(tv ? ".detail-copy h2" : "#detail-heading").innerText(), /Summer by the Lake/);
    await wait(page, () => document.activeElement !== document.body);
    await page.keyboard.press("Escape");
    await expectCount(cards(), 1);
    await wait(page, () => document.activeElement !== document.body);
    await page.reload();
    await page.locator(".film-card").first().waitFor();
    await nav("saved").click();
    await expectCount(cards(), 1);
    await detail("lake").click();
    await page.locator('[data-action="play"]').first().click();
    await wait(page, () => document.querySelector("dialog video")?.currentTime > 0.25);
    const media = page.locator("dialog video");
    const duration = await media.evaluate((video) => video.duration);
    assert.ok(duration >= 7.8 && duration <= 8.5, `Unexpected sample duration ${duration}`);
    await media.focus();
    await page.keyboard.press("Space");
    assert.equal(await media.evaluate((video) => video.paused), true);
    await page.keyboard.press("Space");
    await wait(page, () => document.querySelector("dialog video")?.paused === false);
    await page.keyboard.press("Escape");
    await expectCount(page.locator("dialog[open]"), 0);
    await wait(page, () => document.activeElement !== document.body);
    // Exercise a real failed media request, followed by the visible retry path.
    await page.route("**/sunday-cinema.mp4", (route) => route.abort("failed"));
    await page.locator('[data-action="play"]').first().click();
    await page.locator(".mpp-player-retry").waitFor({ state: "visible" });
    await page.unroute("**/sunday-cinema.mp4");
    await page.locator(".mpp-player-retry").click();
    await wait(page, () => document.querySelector("dialog video")?.currentTime > 0.25);
    await page.keyboard.press("Escape");
    if (tv) {
      await nav("home").click();
      await wait(page, () => document.activeElement.dataset.focus === "home-play");
      const first = await page.evaluate(() => document.activeElement.dataset.focus);
      await page.keyboard.press("ArrowRight");
      assert.notEqual(await page.evaluate(() => document.activeElement.dataset.focus), first);
      await page.keyboard.press("Enter");
      await page.locator(".detail-copy").waitFor();
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".hero").count(), 1);
      await nav("search").click();
      await search.fill("Summer by");
      await page.keyboard.press("ArrowDown");
      assert.notEqual(await page.evaluate(() => document.activeElement.id), "film-search");
    }
    await page.locator(tv ? "#reset-demo" : ".reset-demo").click();
    await nav("saved").click();
    await expectCount(cards(), 0);
    const sizes = tv ? [[1920,1080],[1280,900],[390,844],[320,740]] : platform === "ipad" ? [[1180,820],[820,1180],[768,1024],[390,844]] : [[1440,1100],[430,932],[393,852],[375,812],[320,740]];
    await nav("home").click();
    for (const [width,height] of sizes) {
      await page.setViewportSize({width,height});
      await page.waitForTimeout(60);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      assert.equal(overflow,false,`${platform} horizontal overflow at ${width}`);
    }
    assert.deepEqual(errors, [], `${platform} browser application errors`);
    assert.deepEqual(external, [], `${platform} external dependency`);
    assert.deepEqual(api, [], `${platform} API dependency`);
    assert.deepEqual(failed, [], `${platform} HTTP errors`);
    await page.setViewportSize({width:1440,height:1100});
    await page.reload();
    await page.locator(".film-card").first().waitFor();
    const surface = page.locator(tv ? ".tv-screen" : ".app");
    if (capture) await surface.screenshot({path:path.join(root,`assets/mypremiereplus/screenshots/${platform}.png`)});
    await page.screenshot({path:path.join(qa,`${platform}-desktop.png`),fullPage:true});
    if (!tv) {
      await page.setViewportSize(platform === "ipad" ? {width:820,height:1180} : {width:393,height:852});
      await page.screenshot({path:path.join(qa,`${platform}-portrait.png`),fullPage:true});
    }
    results.push(`${platform}: nested routes, refresh, 6 films, category/search/empty, nested Back/focus, saved persistence/reset, real sample playback/pause/retry, responsive widths${tv ? ", directional keyboard/Enter/Back" : ""}`);
    await context.close();
  }
  for (const route of ["/mypremiereplus/", "/mypremiereplus.html"]) {
    const page = await browser.newPage();
    const errors=[]; page.on("pageerror",error=>errors.push(error.message));
    assert.equal((await page.goto(base+route)).status(),200);
    for (const [width,height] of [[1440,1080],[1024,900],[768,1024],[390,844],[320,740]]) {
      await page.setViewportSize({width,height});
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false,`${route} overflow at ${width}`);
      const missing = await page.locator("img").evaluateAll((images)=>images.filter(img=>img.complete && img.naturalWidth===0).map(img=>img.src));
      assert.deepEqual(missing,[],`${route} missing images`);
    }
    for (const platform of ["ios","ipad","tvos"]) assert.ok(await page.locator(`a[href$="apps/mypremiereplus/${platform}/"]`).count()>=1);
    if (route.endsWith(".html")) {
      const toggle=page.locator(".project-nav-toggle");
      await toggle.click(); assert.equal(await toggle.getAttribute("aria-expanded"),"true");
      await page.keyboard.press("Escape"); assert.equal(await toggle.getAttribute("aria-expanded"),"false");
      assert.equal(await toggle.evaluate(el=>el===document.activeElement),true);
      await expectCount(page.locator('.project-nav a[href*="mypremiereplus"]'),0);
    }
    assert.deepEqual(errors,[],`${route} application errors`);
    await page.screenshot({path:path.join(qa,route.endsWith(".html")?"article-mobile.png":"launcher-mobile.png"),fullPage:true});
    await page.setViewportSize({width:1440,height:1080});
    await page.screenshot({path:path.join(qa,route.endsWith(".html")?"article-desktop.png":"launcher-desktop.png"),fullPage:true});
    await page.close();
  }
  const response = await fetch(`${base}/mypremiereplus`,{redirect:"manual"});
  assert.equal(response.status,301);assert.equal(response.headers.get("location"),"/mypremiereplus/");
  for(const route of ["/apps/mypremiereplus/server/app.ts","/apps/mypremiereplus/.env","/assets/../.git/config"]) assert.equal((await fetch(base+route)).status,404);
  for(const result of results) console.log(`PASS ${result}`);
  console.log("PASS launcher/article: links, images, 320–1440px overflow checks, navbar toggle/Escape, no new navbar entry; local directory redirect and preview exclusions.");
  console.log(`Review captures: ${qa}`);
} finally { await browser.close(); }
