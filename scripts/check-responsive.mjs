/* Static routing checks: node scripts/check-responsive.mjs
 * CSS/DOM checks: append --dom-module /absolute/path/to/jsdom/lib/api.js
 * Runs without a browser or network. CSS cascade checks do not measure rendered overflow.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pages = fs.readdirSync(root).filter(file => file.endsWith('.html'));
const routes = [...pages, 'lelibrambas/index.html', 'projects/lelibrambas/index.html'];
const linkedinLinks = html => [...html.matchAll(/href=["'](https:\/\/(?:www\.)?linkedin\.com\/[^"']+)["']/g)].map(match => match[1]);

for (const file of routes) {
  const html = read(file);
  assert.match(html, /name="viewport"\s+content="width=device-width,\s*initial-scale=1(?:\.0)?/);
  assert.doesNotMatch(html, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1\b/);
  if (pages.includes(file)) {
    assert.match(html, /href="assets\/css\/responsive\.css"/);
    assert.ok(html.lastIndexOf('assets/css/responsive.css') > html.lastIndexOf('</style>'), `${file}: safeguards must follow inline styles`);
  }
  if (file !== 'contact.html') assert.doesNotMatch(html, /href=["']mailto:/i, `${file}: contact must use contact.html`);
  const original = execFileSync('git', ['show', `HEAD:${file}`], { cwd: root, encoding: 'utf8' });
  if (file === 'contact.html') {
    const homeProfiles = read('index.html').match(/<div class="header-socials"[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(homeProfiles, 'Homepage LinkedIn profile buttons are missing');
    assert.deepEqual(linkedinLinks(html), linkedinLinks(homeProfiles[1]), 'Contact LinkedIn buttons must match the homepage');
  } else {
    assert.deepEqual(linkedinLinks(html), linkedinLinks(original), `${file}: LinkedIn destinations changed`);
  }
}
assert.match(read('scripts/update-project-navigation.mjs'), /class="project-nav-contact" href="contact.html"/);
assert.match(read('assets/js/reveal.js'), /window.location.href = 'contact.html'/);
assert.match(read('contact.html'), /href="mailto:bramapeters@outlook.com"/);
console.log(`PASS ${routes.length} routes: zoomable viewport, shared responsive coverage, contact routing and unchanged LinkedIn destinations`);

const moduleFlag = process.argv.indexOf('--dom-module');
if (moduleFlag < 0) {
  console.log('Static checks passed. Supply --dom-module for the CSS cascade and interaction suite.');
  process.exit(0);
}
const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require(path.resolve(process.argv[moduleFlag + 1]));
const windows = [];
const ruleCache = new Map();
const widths = [320, 375, 430, 600, 768, 1024, 1440];
let configurations = 0;
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function matchesMedia(query, viewport) {
  return query.split(',').some(part => {
    if (/\bprint\b/.test(part)) return false;
    for (const [, bound, dimension, value] of part.matchAll(/\((min|max)-(width|height):\s*([\d.]+)px\)/g)) {
      if (bound === 'max' && viewport[dimension] > Number(value)) return false;
      if (bound === 'min' && viewport[dimension] < Number(value)) return false;
    }
    if (/orientation:\s*landscape/.test(part) && viewport.width <= viewport.height) return false;
    if (/orientation:\s*portrait/.test(part) && viewport.width > viewport.height) return false;
    if (/prefers-reduced-motion:\s*reduce/.test(part) && !viewport.reducedMotion) return false;
    if (/hover:\s*hover|pointer:\s*fine/.test(part) && viewport.coarse) return false;
    if (/hover:\s*none|pointer:\s*coarse/.test(part) && !viewport.coarse) return false;
    return true;
  });
}

function parsedRules(source) {
  if (ruleCache.has(source)) return ruleCache.get(source);
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const parser = new JSDOM('<style></style>', { virtualConsole });
  const style = parser.window.document.querySelector('style');
  style.textContent = source;
  assert.ok(style.sheet, 'Stylesheet failed to parse');
  assert.deepEqual(errors, []);
  const rules = Array.from(style.sheet.cssRules);
  ruleCache.set(source, rules);
  parser.window.close();
  return rules;
}

function flattenRules(rules, viewport) {
  return rules.map(rule => {
    if (rule.type === 3) return ''; // No external font imports or requests.
    if (rule.type === 4) return matchesMedia(rule.conditionText, viewport) ? flattenRules(Array.from(rule.cssRules), viewport) : '';
    if (rule.type === 12) return flattenRules(Array.from(rule.cssRules), viewport); // Modern @supports features.
    // jsdom applies the highest specificity of an entire comma-separated selector
    // list, even when that branch does not match. Equivalent separate rules avoid it.
    if (rule.type === 1) {
      const selectors = [];
      let start = 0, depth = 0, quote = '';
      for (let i = 0; i < rule.selectorText.length; i++) {
        const character = rule.selectorText[i];
        if (character === '\\') { i++; continue; }
        if (quote) { if (character === quote) quote = ''; continue; }
        if (character === '"' || character === "'") { quote = character; continue; }
        if (character === '(' || character === '[') depth++;
        if (character === ')' || character === ']') depth--;
        if (character === ',' && depth === 0) { selectors.push(rule.selectorText.slice(start, i)); start = i + 1; }
      }
      selectors.push(rule.selectorText.slice(start));
      return selectors.map(selector => `${selector} { ${rule.style.cssText} }`).join('\n');
    }
    return rule.cssText;
  }).join('\n');
}

function setup(file, width = 375, height = 812, reducedMotion = false) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(read(file), { url: `https://bram-peters.com/${file}`, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const w = dom.window;
  const doc = w.document;
  windows.push(w);
  const viewport = { width, height, coarse: width <= 900, reducedMotion };
  const styles = Array.from(doc.querySelectorAll('link[rel="stylesheet"], style')).map(element => {
    let source = '';
    if (element.tagName === 'STYLE') source = element.textContent;
    else {
      const href = element.getAttribute('href');
      if (!/^https?:|^\/\//.test(href)) {
        const clean = href.split('?')[0];
        const cssFile = clean.startsWith('/') ? clean.slice(1) : path.join(path.dirname(file), clean);
        source = read(cssFile);
      }
    }
    element.remove();
    return parsedRules(source);
  });
  const style = doc.createElement('style');
  doc.head.append(style);
  const media = [];
  w.matchMedia = query => {
    const listeners = new Set();
    const mq = {
      media: query, matches: matchesMedia(query, viewport),
      addEventListener: (_, callback) => listeners.add(callback),
      removeEventListener: (_, callback) => listeners.delete(callback),
      addListener: callback => listeners.add(callback),
      removeListener: callback => listeners.delete(callback), listeners
    };
    media.push(mq);
    return mq;
  };
  w.scrollTo = () => {};
  function resize(nextWidth, nextHeight = height) {
    Object.assign(viewport, { width: nextWidth, height: nextHeight, coarse: nextWidth <= 900 });
    Object.defineProperty(w, 'innerWidth', { value: nextWidth, configurable: true });
    Object.defineProperty(w, 'innerHeight', { value: nextHeight, configurable: true });
    style.textContent = styles.map(rules => flattenRules(rules, viewport)).join('\n');
    for (const mq of media) {
      const current = matchesMedia(mq.media, viewport);
      if (current !== mq.matches) {
        mq.matches = current;
        mq.listeners.forEach(listener => listener(mq));
      }
    }
    w.dispatchEvent(new w.Event('resize'));
  }
  resize(width, height);
  if (doc.querySelector('[data-project-navigation]')) w.eval(read('assets/js/project-navigation.js'));
  const computed = selector => {
    const element = typeof selector === 'string' ? doc.querySelector(selector) : selector;
    assert.ok(element, `${file}: missing ${selector}`);
    return w.getComputedStyle(element);
  };
  return { w, doc, computed, resize, errors };
}

const normalize = value => value.replace(/\s+/g, '');
const singleColumn = value => ['1fr', 'minmax(0,1fr)'].includes(normalize(value));
try {
  for (const file of pages) {
    const app = setup(file);
    const { w, doc, computed, resize } = app;
    // The shared cookie UI is injected exactly as on the live pages, without analytics.
    if (read(file).includes('assets/js/cookie-banner.js')) {
      w.eval(read('assets/js/cookie-banner.js'));
      doc.dispatchEvent(new w.Event('DOMContentLoaded'));
    }
    for (const width of widths) {
      resize(width, 900);
      configurations++;
      assert.equal(parseFloat(computed('.container').minWidth), 0, `${file} at ${width}: container shrinkability`);
      for (const element of doc.querySelectorAll('.page-two-columns > *, .profile-header > *, .flex-header > *')) {
        assert.equal(parseFloat(computed(element).minWidth), 0, `${file} at ${width}: child shrinkability`);
      }
      if (doc.querySelector('.project-nav')) {
        const toggle = doc.querySelector('.project-nav-toggle');
        assert.equal(computed(toggle).display, width <= 1279 ? 'inline-flex' : 'none');
        assert.ok(parseFloat(computed(toggle).minWidth) >= 44);
        assert.equal(doc.querySelector('.project-nav-panel').hidden, width <= 1279);
      }
      if (doc.querySelector('.page-two-columns') && width <= 1024) assert.ok(singleColumn(computed('.page-two-columns').gridTemplateColumns));
      if (doc.querySelector('.modal-close')) {
        assert.equal(doc.querySelector('.modal-close').tagName, 'BUTTON');
        assert.ok(parseFloat(computed('.modal-close').minHeight) >= 44);
      }
      if (doc.querySelector('.cookie-card')) {
        assert.equal(computed('.cookie-card').maxHeight, '70dvh');
        assert.equal(computed('.cookie-card').overflowY, 'auto');
        assert.ok(parseFloat(computed('.cookie-btn').minHeight) >= 44);
      }
      if (file === 'index.html') {
        const columns = normalize(computed('.portfolio-grid').gridTemplateColumns);
        assert.equal(columns, width <= 900 ? 'repeat(2,minmax(0,1fr))' : 'repeat(3,minmax(0,1fr))');
        if (width <= 480) assert.ok(singleColumn(computed('.skills-card-list').gridTemplateColumns));
        if (width <= 900) assert.ok(parseFloat(computed('.filter-btn').minHeight) >= 44);
      }
      if (file === 'index_arch.html' && width <= 900) {
        assert.equal(normalize(computed('.portfolio-grid').gridTemplateColumns), width <= 480 ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))');
        assert.ok(parseFloat(computed('.filter-btn').minHeight) >= 44);
        if (width <= 480) assert.ok(parseFloat(computed('.portfolio-grid .article-body p').fontSize) >= .9);
      }
      if (file === 'contact.html') {
        assert.equal(computed('.intake-layout').gridTemplateAreas, width <= 900 ? '"aside" "form"' : '"form aside"');
        if (width <= 360) assert.ok(singleColumn(computed('.intake-service-list').gridTemplateColumns));
      }
      if (file === 'resume.html' && width <= 1024) {
        assert.equal(computed('#downloadBtn').position, 'static');
        assert.ok(parseFloat(computed('#downloadBtn').minHeight) >= 44);
        assert.ok(singleColumn(computed('.flex-grid-header').gridTemplateColumns));
      }
      if (file === 'portfolio_test.html' && width <= 900) {
        assert.equal(computed('.nav ul').flexWrap, 'wrap');
        assert.equal(computed('.nav ul').width, '100%');
      }
    }
    assert.deepEqual(app.errors, [], file);
    w.close();
    console.log(`PASS ${file}: CSS cascade at ${widths.join('/')}px`);
  }

  const nav = setup('doulauxuicasestudy.html', 375);
  const toggle = nav.doc.querySelector('.project-nav-toggle');
  const panel = nav.doc.querySelector('.project-nav-panel');
  toggle.click();
  assert.equal(panel.hidden, false);
  assert.equal(nav.doc.querySelector('.project-nav-more').open, true);
  panel.querySelector('a').focus();
  panel.dispatchEvent(new nav.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(panel.hidden, true);
  assert.equal(nav.doc.activeElement, toggle);
  nav.resize(1440);
  assert.equal(panel.hidden, false);
  assert.equal(nav.doc.activeElement, nav.doc.querySelector('.project-nav-home'));
  panel.querySelector('a').focus();
  nav.resize(430);
  assert.equal(panel.hidden, true);
  assert.equal(nav.doc.activeElement, toggle);
  toggle.click();
  nav.doc.querySelector('main').dispatchEvent(new nav.w.MouseEvent('click', { bubbles: true }));
  assert.equal(panel.hidden, true);
  console.log('PASS shared navigation: touch/click, Escape, outside dismissal and focus after breakpoint changes');

  const home = setup('index.html', 375);
  home.w.eval(read('assets/js/reveal.js'));
  for (const script of home.doc.querySelectorAll('body script:not([src])')) home.w.eval(script.textContent);
  assert.equal(home.doc.querySelector('.skills-section').parentElement.id, 'mobile-skills-slot');
  home.doc.querySelector('[data-filter="Videography"]').click();
  for (const card of home.doc.querySelectorAll('.portfolio-grid .portfolio-card')) {
    assert.equal(!card.classList.contains('is-hidden'), card.hasAttribute('data-always-visible') || card.dataset.categories.split(',').includes('Videography'));
  }
  home.doc.querySelector('[data-filter="all"]').click();
  const skill = home.doc.querySelector('.skill-glass-card');
  skill.click();
  assert.equal(skill.getAttribute('aria-expanded'), 'true');
  skill.dispatchEvent(new home.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  assert.equal(skill.getAttribute('aria-expanded'), 'false');
  home.resize(1440);
  assert.equal(home.doc.querySelector('.skills-section').parentElement.id, 'desktop-skills-slot');
  home.resize(430);
  assert.equal(home.doc.querySelector('.skills-section').parentElement.id, 'mobile-skills-slot');
  assert.deepEqual(home.errors, []);
  console.log('PASS homepage: filters, expandable skills and mobile/desktop content placement');

  const demo = setup('projects/lelibrambas/index.html', 375);
  demo.w.eval(read('projects/lelibrambas/app.js'));
  assert.ok(demo.doc.querySelector('.hero'));
  for (const route of ['browse', 'search', 'timeline', 'saved', 'home']) {
    demo.doc.querySelector(`.bottom-nav [data-route="${route}"]`).click();
    await tick();
    await tick();
    assert.equal(demo.w.location.hash, `#${route}`);
    assert.equal(demo.doc.querySelector(`.bottom-nav [data-nav="${route}"]`).getAttribute('aria-current'), 'page');
  }
  for (const width of widths) {
    demo.resize(width);
    configurations++;
    assert.equal(parseFloat(demo.computed('body').minWidth), 0);
    assert.equal(demo.computed('.bottom-nav').display, width <= 720 ? 'grid' : 'none');
    if (width <= 720) {
      assert.equal(normalize(demo.computed('.bottom-nav').gridTemplateColumns), 'repeat(5,minmax(0,1fr))');
      assert.ok(Math.max(parseFloat(demo.computed('.mobile-profile').minHeight) || 0, parseFloat(demo.computed('.mobile-profile').height) || 0) >= 44);
    }
  }
  demo.resize(844, 390);
  assert.equal(demo.computed('.sidebar').overflowY, 'auto');
  assert.equal(demo.computed('.profile-dialog').overflowY, 'auto');
  assert.deepEqual(demo.errors, []);
  console.log('PASS streaming demo: five mobile routes, responsive navigation, short-screen scrolling and dialog constraints');
  console.log(`PASS ${configurations} CSS viewport configurations plus DOM interaction checks. Rendered overflow, touch gestures and device screenshots still require browser QA.`);
} finally {
  windows.forEach(window => window.close());
}
