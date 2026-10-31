/* Run: node scripts/check-contact.mjs
 * Optional DOM regression suite (jsdom is a test-only dependency, not shipped):
 * node scripts/check-contact.mjs --dom-module /absolute/path/to/jsdom/lib/api.js
 * The DOM suite uses local fixtures, intercepts mailto navigation and mocks clipboard.
 * It never sends email, loads external resources or launches a browser.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('contact.html');
const css = read('assets/css/contact.css');
const script = read('assets/js/contact.js');
const homepage = read('index.html');
const countryScript = read('assets/js/country-codes.js');
const expectedPrices = ['From €875', 'From €1,575', 'From €315', 'From €525'];
const decode = value => value.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&trade;/g, '™').trim();
const fallback = vm.runInNewContext(`(${script.match(/const fallbackProjects = (\[[\s\S]*?\n  \]);/)[1]})`);
let checks = 0;
function passed(name) { checks++; console.log(`PASS ${name}`); }

new vm.Script(script);
assert.deepEqual([...html.matchAll(/data-price="([^"]+)"/g)].map(match => match[1]), expectedPrices);
assert.deepEqual([...html.matchAll(/<strong>(From €[^<]+)<\/strong>/g)].map(match => match[1]), expectedPrices);
assert.doesNotMatch(html, /discount|hourly|per hour|€\d+\s*\/\s*h|<del\b|<s>/i);
passed('Exact starting prices, with no hourly rates or discounts');

const cards = [...homepage.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<article\b[^>]*data-project="([^"]+)"[^>]*>[\s\S]*?<\/article>/g)]
  .filter(([markup, id]) => id !== 'next-project' && !/href=""|Coming Soon|portfolio-card--disabled|aria-disabled="true"|\bhidden\b/.test(markup));
assert.equal(fallback.length, cards.length);
for (const [markup, id] of cards) {
  const item = fallback.find(project => project.id === id);
  assert.ok(item, `Missing reference: ${id}`);
  assert.equal(item.title, decode(markup.match(/<h2[^>]*>(.*?)<\/h2>/s)[1]));
  assert.equal(item.image, markup.match(/<img[^>]*src="([^"]+)"/)[1]);
  assert.equal(item.category, markup.match(/data-categories="([^,"]+)/)[1]);
  assert.ok(fs.existsSync(path.join(root, item.image)), `Missing thumbnail: ${item.image}`);
}
passed(`${cards.length} real published portfolio references and thumbnail files; fallback matches index.html`);
assert.doesNotMatch(script, /localStorage|sessionStorage|sendBeacon|gtag\(|dataLayer|XMLHttpRequest/);
assert.equal((script.match(/\bfetch\(/g) || []).length, 1);
assert.match(script, /fetch\('index\.html'/);
assert.match(html, /window\['ga-disable-G-VVZK9H0J0T'\] = true/);
assert.ok(html.indexOf("window['ga-disable-") < html.indexOf('https://www.googletagmanager.com'));
assert.match(html, /assets\/js\/cookie-banner\.js/);
assert.match(html, /assets\/js\/country-codes\.js/);
assert.doesNotMatch(html, /maxlength=/);
passed('Privacy boundaries, shared consent/country scripts and unbounded descriptions');

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'IDs must be unique');
for (const [, id] of html.matchAll(/\bfor="([^"]+)"/g)) assert.ok(ids.includes(id), `Missing label target ${id}`);
for (const [, idrefs] of html.matchAll(/aria-(?:describedby|labelledby|controls)="([^"]+)"/g)) {
  for (const id of idrefs.split(' ')) assert.ok(ids.includes(id), `Missing ARIA target ${id}`);
}
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /focus-visible/);
passed('Unique IDs, label/ARIA references, focus styling and reduced motion');

const moduleFlag = process.argv.indexOf('--dom-module');
if (moduleFlag === -1) {
  console.log(`${checks} static checks passed. Supply --dom-module to run the DOM regression suite. Browser rendering is a separate check.`);
  process.exit(0);
}
const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require(path.resolve(process.argv[moduleFlag + 1]));
const windows = [];
const tick = () => new Promise(resolve => setImmediate(resolve));
async function setup({ index = homepage, offline = false, clipboard = true } = {}) {
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(html, { url: 'https://bram-peters.com/contact.html', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console });
  const w = dom.window;
  windows.push(w);
  w.__mailAttempts = [];
  w.__clipboardWrites = [];
  w.__fetches = [];
  w.fetch = async url => {
    w.__fetches.push(url);
    if (offline) throw new Error('Fixture: offline');
    return { ok: true, text: async () => index };
  };
  Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { writeText: async text => {
    if (!clipboard) throw new Error('Fixture: permission denied');
    w.__clipboardWrites.push(text);
  } } });
  for (const inline of w.document.querySelectorAll('head script:not([src])')) w.eval(inline.textContent);
  w.eval(countryScript);
  // Replace only the external-protocol side effect; test the original encoding and submit handler.
  assert.equal(script.split('window.location.href = preparedEmail.mailto;').length, 2);
  w.eval(script.replace('window.location.href = preparedEmail.mailto;', 'window.__mailAttempts.push(preparedEmail.mailto);'));
  await tick();
  assert.deepEqual(errors, []);
  const doc = w.document;
  const get = id => doc.getElementById(id);
  const fill = (id, value) => {
    get(id).value = value;
    get(id).dispatchEvent(new w.Event('input', { bubbles: true }));
    get(id).dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  const radio = (name, value) => {
    const control = Array.from(doc.querySelectorAll(`input[name="${name}"]`)).find(input => input.value === value);
    assert.ok(control, `Radio option missing: ${name}=${value}`);
    control.click();
  };
  const submit = () => get('contactForm').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  const key = value => get('similarProject').dispatchEvent(new w.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
  return { w, doc, get, fill, radio, submit, key };
}

try {
  const app = await setup();
  const { w, doc, get, fill, radio, submit, key } = app;
  assert.equal(doc.querySelector('[name="enquiryMode"]:checked').value, 'project');
  assert.equal(get('prepareRequest').disabled, false);
  for (let i = 1; i < 5; i++) {
    fill('productType', get('productType').options[i].value);
    assert.ok(get('productPrice').textContent.startsWith(expectedPrices[i - 1]));
    assert.equal(doc.querySelectorAll('.intake-service.is-selected').length, 1);
    assert.equal(doc.querySelector('.intake-service.is-selected').dataset.service, get('productType').options[i].dataset.service);
  }
  passed('All four product choices update the price and matching overview highlight');

  fill('productType', '');
  submit();
  assert.equal(doc.querySelectorAll('.intake-field-error:not([hidden])').length, 6);
  assert.equal(get('formErrors').hidden, false);
  assert.equal(doc.activeElement.id, 'productType');
  assert.equal(w.__mailAttempts.length, 0);
  fill('fullName', '   ');
  fill('emailAddress', 'invalid-email');
  assert.equal(get('fullName').getAttribute('aria-invalid'), 'true');
  assert.match(get('emailAddressError').textContent, /valid email/);
  fill('fullName', 'Test Zoë & Co');
  fill('emailAddress', 'qa@example.com');
  fill('productType', 'Web Design & Development');
  fill('projectDescription', 'A café website & booking form.\nSecond line: 50% + “more” = <better> 🎬');
  radio('brandGuidelines', 'Not sure yet');
  radio('clientType', 'Business');
  assert.equal(get('formErrors').hidden, true);
  passed('Six required project fields, whitespace/email errors, inline recovery and focus');

  assert.equal(get('portfolioOptions').children.length, 12);
  assert.ok(!get('portfolioOptions').textContent.includes('Coming Soon'));
  assert.ok(!get('portfolioOptions').textContent.includes('My Next Project'));
  get('similarProject').focus();
  key('ArrowDown');
  assert.equal(get('similarProject').getAttribute('aria-expanded'), 'true');
  assert.equal(get('similarProject').getAttribute('aria-activedescendant'), 'portfolio-option-1');
  key('Enter');
  assert.equal(get('similarProjectValue').value, 'UWV Monitor Arbeid & Gezondheid');
  key('ArrowDown');
  key('Escape');
  assert.equal(get('similarProjectValue').value, 'UWV Monitor Arbeid & Gezondheid');
  key('End');
  key('Enter');
  assert.equal(get('similarProjectValue').value, 'J. Meijer B.V. 40 Jaar');
  key('l');
  key('Enter');
  assert.equal(get('similarProjectValue').value, 'Lost In Translation™');
  key(' ');
  key('Tab');
  assert.equal(get('portfolioOptions').hidden, true);
  get('similarProject').click();
  get('portfolioOptions').children[3].click();
  assert.match(get('similarProjectValue').value, /LELIBRAMBAS/);
  key('Home');
  key('Enter');
  assert.equal(get('similarProjectValue').value, '');
  assert.equal(doc.activeElement.id, 'similarProject');
  passed('Portfolio combobox arrows, Enter, Escape, Home/End, type-ahead, Tab, pointer and clear');

  assert.equal(get('countryCode').selectedOptions[0].textContent, '🇳🇱 Netherlands (+31)');
  assert.equal(get('addressCountry').value, '');
  assert.equal(get('addressCountry').options.length, w.COUNTRY_CALLING_CODES.length + 1);
  fill('addressCountry', 'Sweden');
  assert.equal(get('countryCode').value, '+46');
  fill('countryCode', '+44');
  fill('addressCountry', 'Germany');
  assert.equal(get('countryCode').value, '+44');
  fill('addressCountry', '');
  passed('Shared country data, flags, blank optional address, synchronization and manual-prefix preservation');

  submit();
  assert.equal(w.__mailAttempts.length, 1);
  const first = new URL(w.__mailAttempts[0]);
  assert.equal(first.pathname, 'bramapeters@outlook.com');
  assert.equal(first.searchParams.get('subject'), 'Bram Peters Studio — Project Request — Web Design & Development');
  const body = first.searchParams.get('body');
  for (const text of ['PROJECT', 'CLIENT', 'PROJECT REQUIREMENTS', 'From €875', 'Test Zoë & Co', 'Business', 'Not sure yet', '50% + “more” = <better> 🎬']) assert.ok(body.includes(text), text);
  assert.ok(body.includes('form.\r\nSecond line:'));
  for (const optional of ['Phone:', 'ADDRESS', 'Project title:', 'Similar to:', 'Additional information:']) assert.ok(!body.includes(optional), optional);
  assert.equal(get('emailResult').hidden, false);
  assert.equal(get('resultTitle').textContent, 'Almost there!');
  assert.doesNotMatch(get('emailResult').textContent, /successfully sent|request sent/i);
  get('openEmailAgain').click();
  assert.equal(w.__mailAttempts.length, 2);
  get('copyRequest').click();
  await tick();
  // Textareas normalize CRLF to LF; the email and clipboard retain mail-friendly CRLF.
  assert.equal(w.__clipboardWrites[0].replace(/\r\n/g, '\n'), get('requestPreview').value);
  assert.match(get('copyStatus').textContent, /Copied/);
  passed('Structured mailto recipient/subject/body, optional omission, Unicode/CRLF and retry/copy');

  fill('projectTitle', 'A title & some context');
  assert.equal(get('emailResult').hidden, true);
  assert.equal(get('requestPreview').value, '');
  fill('street', 'Example Street');
  fill('streetNumber', '12A');
  fill('postalCode', '1234 AB');
  fill('addressCountry', 'Netherlands');
  fill('phoneNumber', '+31 6 1234 5678');
  get('similarProject').click();
  get('portfolioOptions').children[2].click();
  fill('additionalInformation', 'Line one.\nLine two: https://example.com/?a=1&b=2');
  submit();
  const fullDraft = get('requestPreview').value;
  for (const text of ['A title & some context', 'Street:\nExample Street', 'Number:\n12A', 'Postal code:\n1234 AB', 'Country:\nNetherlands', 'Phone:\n+31 6 1234 5678', 'Similar to:\nLost In Translation™', 'Additional information:']) assert.ok(fullDraft.includes(text), text);
  passed('All optional project fields and international phone retained; editing invalidates stale draft');

  const retainedDescription = get('projectDescription').value;
  radio('enquiryMode', 'general');
  assert.equal(get('productType').matches(':disabled'), true);
  assert.equal(get('generalMessage').matches(':disabled'), false);
  assert.equal(get('projectDescription').value, retainedDescription);
  assert.equal(get('submitLabel').textContent, 'Prepare my enquiry');
  fill('generalMessage', 'Hello!\nLet’s collaborate.');
  for (const topic of ['Networking', 'Vacancy', 'Collaboration', 'General enquiry', 'Other matters', 'Assignment', 'Project Proposal', 'Just saying hi!']) {
    fill('generalTopic', topic);
    submit();
    const url = new URL(w.__mailAttempts.at(-1));
    assert.equal(url.searchParams.get('subject'), `Bram Peters Studio — General Enquiry — ${topic}`);
    assert.ok(url.searchParams.get('body').includes('Let’s collaborate.'));
    assert.ok(!url.searchParams.get('body').includes('Example Street'));
    assert.ok(!url.searchParams.get('body').includes('Brand guidelines:'));
  }
  radio('enquiryMode', 'project');
  assert.equal(get('projectDescription').value, retainedDescription);
  assert.equal(doc.querySelector('[name="brandGuidelines"]:checked').value, 'Not sure yet');
  assert.equal(doc.querySelector('[name="clientType"]:checked').value, 'Business');
  radio('clientType', 'Private');
  radio('brandGuidelines', 'Yes');
  radio('brandGuidelines', 'No');
  passed('All general topics, project validation disabled in general mode, radio switching and draft retention');

  const longText = 'Long brief café & + % 🎬\n'.repeat(600);
  fill('projectDescription', longText);
  const attemptsBefore = w.__mailAttempts.length;
  submit();
  assert.equal(w.__mailAttempts.length, attemptsBefore);
  assert.equal(get('longRequestWarning').hidden, false);
  assert.ok(get('requestPreview').value.includes(longText.trim()));
  get('openEmailAgain').click();
  assert.equal(new URL(w.__mailAttempts.at(-1)).searchParams.get('body').match(/Long brief café/g).length, 600);
  get('copyRequest').click();
  await tick();
  assert.ok(w.__clipboardWrites.at(-1).replace(/\r\n/g, '\n').includes(longText.trim()));
  passed('Long requests are never truncated; warning, opt-in mailto retry and full clipboard draft');

  const denied = await setup({ clipboard: false, offline: true });
  denied.radio('enquiryMode', 'general');
  denied.fill('fullName', 'Clipboard test');
  denied.fill('emailAddress', 'clipboard@example.com');
  denied.fill('generalMessage', 'All details intact 🎬');
  denied.submit();
  denied.get('copyRequest').click();
  await tick();
  assert.equal(denied.get('manualCopy').open, true);
  assert.equal(denied.get('requestPreview').selectionEnd, denied.get('requestPreview').value.length);
  assert.match(denied.get('copyStatus').textContent, /unavailable/);
  assert.equal(denied.get('portfolioOptions').children.length, 12);
  passed('Denied clipboard permission selects complete manual fallback; offline portfolio snapshot works');

  const maliciousIndex = homepage.replace('data-project="doula"', 'hidden data-project="doula"')
    .replace('data-project="vinobo"', 'aria-disabled="true" data-project="vinobo"')
    .replace('data-project="spotify"', 'style="display:none" data-project="spotify"')
    .replace(/(<article[^>]*data-project="raspberries"[\s\S]*?<\/article>)/, '<!-- $1 -->');
  const filtered = await setup({ index: maliciousIndex });
  assert.equal(filtered.get('portfolioOptions').children.length, 8);
  passed('Live homepage parsing excludes hidden, disabled, commented and placeholder projects');

  w.eval(read('assets/js/cookie-banner.js'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  get('cookie-accept').click();
  assert.equal(w['ga-disable-G-VVZK9H0J0T'], true);
  assert.equal(w.localStorage.length, 0);
  assert.equal(w.sessionStorage.length, 1);
  assert.equal(w.sessionStorage.getItem('ga_consent_choice_v1'), 'accept');
  assert.doesNotMatch(JSON.stringify(w.dataLayer), /qa@example|Test Zoë|Long brief|Example Street/);
  assert.deepEqual(Array.from(w.__fetches), ['index.html']);
  passed('Consent banner preserved; no PII in dataLayer or storage; only homepage fetch');

  const style = doc.createElement('style');
  style.textContent = css;
  doc.head.append(style);
  assert.ok(style.sheet);
  function matchesMedia(condition, width) {
    if (/prefers-reduced-motion/.test(condition)) return false;
    const max = condition.match(/max-width:\s*(\d+)px/);
    const min = condition.match(/min-width:\s*(\d+)px/);
    return (!max || width <= Number(max[1])) && (!min || width >= Number(min[1]));
  }
  function propertyFor(selector, property, width, rules = style.sheet.cssRules) {
    let value = '';
    for (const rule of rules) {
      if (rule.selectorText) {
        // Ignore commas nested inside :is(), :has() and :not().
        let depth = 0;
        const selectors = rule.selectorText.split('').map(character => {
          if (character === '(') depth++;
          if (character === ')') depth--;
          return character === ',' && depth === 0 ? '\n' : character;
        }).join('').split('\n');
        assert.ok(selectors.every(part => /^\s*(?:body)?\.studio-contact\b/.test(part)), `Unscoped CSS: ${rule.selectorText}`);
        if (rule.selectorText === selector && rule.style.getPropertyValue(property)) value = rule.style.getPropertyValue(property);
      } else if (rule.cssRules && matchesMedia(rule.conditionText || '', width)) {
        value = propertyFor(selector, property, width, rule.cssRules) || value;
      }
    }
    return value;
  }
  for (const width of [375, 430, 768, 1024, 1440]) {
    const areas = propertyFor('.studio-contact .intake-layout', 'grid-template-areas', width);
    assert.equal(areas, width <= 900 ? '"aside" "form"' : '"form aside"');
    const fields = propertyFor('.studio-contact .intake-field-pair', 'grid-template-columns', width);
    assert.equal(fields, width <= 600 ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))');
  }
  passed('Scoped responsive CSS rules at 375, 430, 768, 1024 and 1440px (not rendered layout)');
  console.log(`${checks} checks passed. Browser layout, touch and real mail-client/clipboard integration still require manual QA.`);
} finally {
  windows.forEach(window => window.close());
}
