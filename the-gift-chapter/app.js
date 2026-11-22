import {
  availability, confirmGift, DemoError, euros,
  initialize, parseAmount, read, reset, update, verifyAmount,
} from './model.js';
import * as view from './views.js';

const main = document.querySelector('main');
const status = document.querySelector('#status');
const dialog = document.querySelector('#reset-dialog');
const filters = { category: '', price: '', available: false };
const drafts = new Map();
const scrollPositions = new Map();
const navigationKey = 'the-gift-chapter-v1-navigation';
try {
  const saved = JSON.parse(sessionStorage.getItem(navigationKey));
  if (saved) {
    Object.assign(filters, saved.filters);
    for (const [route, top] of saved.scroll) scrollPositions.set(route, top);
  }
} catch {
  // Navigation preferences are optional. Wedding records use separate durable storage.
}
const sampleCover = './assets/wedding.webp';
const changes = 'BroadcastChannel' in window ? new BroadcastChannel('the-gift-chapter-v1') : null;
const current = () => location.hash.slice(1) || 'home';
const fieldValue = (form, name) => form.elements[name].value.trim();
const storageError = 'Wedding demo storage is unavailable. Check that this browser allows local storage, then try again.';
let state;
let displayedRoute = '';
let renderId = 0;
let photoUrl;
let working = false;
let lastReply = history.state?.giftChapterReply ?? '';
let noticeTimer;

history.scrollRestoration = 'manual';

function notify(message) {
  clearTimeout(noticeTimer);
  status.textContent = message;
  noticeTimer = setTimeout(() => { status.textContent = ''; }, 4500);
}

function clearProblem(scope = main) {
  const problem = scope.querySelector('.problem');
  if (problem) problem.hidden = true;
}

function showProblem(error, scope = main) {
  const message = error instanceof DemoError ? error.message : storageError;
  const problem = scope.querySelector('.problem');
  if (!problem?.isConnected) {
    notify(message);
    return;
  }
  problem.hidden = false;
  problem.textContent = message;
  problem.focus();
}

function getDraft(gift) {
  if (!drafts.has(gift.id)) {
    const { left } = availability(state, gift);
    drafts.set(gift.id, {
      id: crypto.randomUUID(), gift: gift.id, generation: state.generation, type: gift.type,
      title: gift.title, target: gift.target, sender: '', message: '', consent: false,
      rawAmount: gift.type === 'shared' ? euros(Math.min(1500, left)) : '15.00',
    });
  }
  return drafts.get(gift.id);
}

function saveDraft(form) {
  const draft = drafts.get(displayedRoute.split('/')[1]);
  if (!draft) return;
  if (form.elements.amount) draft.rawAmount = fieldValue(form, 'amount');
  draft.sender = fieldValue(form, 'sender');
  draft.message = fieldValue(form, 'message');
}

function previewPalette(theme) {
  document.body.dataset.theme = theme;
  const paper = getComputedStyle(document.body).getPropertyValue('--paper').trim();
  document.querySelector('meta[name="theme-color"]').content = paper;
}

function showRoute(route, focus) {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  const [page, id] = route.split('/');
  const profile = state.profile;
  photoUrl = page === 'home' && profile.photo ? URL.createObjectURL(profile.photo) : undefined;
  const cover = photoUrl ?? sampleCover;
  const gift = state.gifts.find(item => item.id === id && item.visibility !== 'hidden');
  const reply = state.rsvps.find(item => item.key === lastReply);
  let html;

  switch (page) {
    case 'home': html = view.home(state, cover); break;
    case 'gifts':
      if (filters.category && !view.registryCategories(state).includes(filters.category)) filters.category = '';
      html = view.registry(state, filters);
      break;
    case 'gift': html = gift ? view.giftDetail(state, gift, 'gifts') : view.missing(); break;
    case 'give': {
      const order = drafts.has(id) && state.orders.find(o => o.id === drafts.get(id).id);
      if (order) location.replace('#confirmed/' + order.id);
      html = gift ? view.checkout(state, gift, getDraft(gift), 'gifts') : view.missing();
      break;
    }
    case 'confirmed': {
      const order = state.orders.find(item => item.id === id);
      html = order ? view.receipt(order, 'gifts') : view.missing();
      break;
    }
    case 'rsvp': html = view.invitation(state, reply); break;
    case 'colours': html = view.colours(state); break;
    default: html = view.missing();
  }

  previewPalette(profile.theme);
  document.title = `${profile.names} · The Honeymoon Webshop`;
  main.innerHTML = html;
  main.dataset.route = route;
  displayedRoute = route;
  for (const link of document.querySelectorAll('.site-header nav a, .rsvp-link')) {
    if (link.hash === '#' + page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const replyForm = main.querySelector('#rsvp');
  if (replyForm) replyForm.elements.diet.disabled = reply?.reply === 'no';
  if (focus) main.focus({ preventScroll: true });
}

async function render({ restore = false, focus = false, initializeStorage = false } = {}) {
  const id = ++renderId;
  const route = current();
  try {
    const latest = await (initializeStorage ? initialize() : read());
    if (id !== renderId) return;
    state = latest;
    showRoute(route, focus);
    if (restore) window.scrollTo(0, scrollPositions.get(route) ?? 0);
  } catch {
    if (id !== renderId) return;
    main.innerHTML = `<section class="page narrow"><h1>Open the invitation</h1><p role="alert">${storageError}</p>
      <button class="button" type="button" data-retry>Try again</button></section>`;
  }
}

function saveNavigation() {
  try {
    const scroll = [...scrollPositions].filter(([route]) => ['gifts', 'home'].includes(route));
    sessionStorage.setItem(navigationKey, JSON.stringify({ filters, scroll }));
  } catch {
    // Keep the current tab’s state when session storage is disabled.
  }
}

function refreshResults() {
  saveNavigation();
  main.querySelectorAll('[data-filter]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.filter === filters.category));
  });
  main.querySelector('#gift-results').innerHTML = view.giftResults(state, filters);
}

async function action(control, operation, scope = main) {
  if (working) return;
  working = true;
  if (control instanceof HTMLButtonElement) control.disabled = true;
  clearProblem(scope);
  try {
    await operation();
  } catch (error) {
    showProblem(error, scope);
  } finally {
    working = false;
    if (control instanceof HTMLButtonElement) control.disabled = false;
  }
}

async function save(edit) {
  state = await update(edit);
  changes?.postMessage('changed');
}

async function saveReply(form) {
  const guest = fieldValue(form, 'guest');
  if (!guest) throw new DemoError('Enter a name for your reply.');
  const key = guest.toLocaleLowerCase('en-GB');
  const reply = fieldValue(form, 'reply');
  const diet = reply === 'yes' ? fieldValue(form, 'diet') : '';
  await save(latest => {
    latest.rsvps = latest.rsvps.filter(item => item.key !== key);
    latest.rsvps.push({ guest, key, reply, diet });
  });
  lastReply = key;
  if (current() === 'rsvp' && form.isConnected) {
    history.replaceState({ ...history.state, giftChapterReply: key }, '');
    showRoute(current(), false);
    main.querySelector('h2').setAttribute('tabindex', '-1');
    main.querySelector('h2').focus({ preventScroll: true });
  }
  notify('Your demo reply is saved.');
}

async function choosePalette(theme) {
  previewPalette(theme);
  clearProblem();
  try {
    await save(latest => { latest.profile.theme = theme; });
  } catch (error) {
    if (document.body.dataset.theme === theme) {
      previewPalette(state.profile.theme);
      const saved = [...main.querySelectorAll('[name="theme"]')]
        .find(input => input.value === state.profile.theme);
      if (saved) saved.checked = true;
    }
    showProblem(error);
  }
}

async function enterReview(form) {
  saveDraft(form);
  const draft = drafts.get(displayedRoute.split('/')[1]);
  if (!draft.sender) throw new DemoError('Enter your name for this gift.');
  const latest = await read();
  const gift = latest.gifts.find(item => item.id === draft.gift);
  if (gift && form.elements.amount?.name !== (['shared', 'cash'].includes(gift.type) ? 'amount' : undefined)) {
    throw new DemoError('The couple changed the giving option. Return to the gift details to reopen checkout.');
  }
  const amount = ['shared', 'cash'].includes(gift?.type) ? parseAmount(draft.rawAmount) : gift?.target;
  verifyAmount(latest, gift, amount);
  Object.assign(draft, { amount, type: gift.type, title: gift.title, target: gift.target, generation: latest.generation });
  if (!form.isConnected) return;
  main.querySelector('#review-details').innerHTML = view.reviewDetails(draft);
  form.hidden = true;
  main.querySelector('#review').hidden = false;
  main.querySelector('#review-heading').focus();
}

async function submitGift() {
  const failure = main.querySelector('#simulate-failure');
  if (failure.checked) {
    failure.checked = false;
    throw new DemoError('This attempt simulated a failure. Your gift is still unconfirmed. Try again when you’re ready.');
  }
  const id = displayedRoute.split('/')[1];
  const draft = drafts.get(id);
  if (!draft) return;
  state = await confirmGift(draft);
  changes?.postMessage('changed');
  drafts.delete(id);
  location.replace('#confirmed/' + draft.id);
}

main.addEventListener('input', event => {
  if (event.target.form?.id === 'checkout') saveDraft(event.target.form);
});

main.addEventListener('change', event => {
  const input = event.target;
  if (input.name === 'available-filter') filters.available = input.checked;
  if (input.name === 'price-filter') filters.price = input.value;
  if (['available-filter', 'price-filter'].includes(input.name)) refreshResults();
  if (input.name === 'theme' && input.checked) choosePalette(input.value);
  if (input.name === 'reply') {
    main.querySelector('#diet-field').hidden = input.value === 'no';
    input.form.elements.diet.disabled = input.value === 'no';
  }
});

main.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const operations = { rsvp: saveReply, checkout: enterReview };
  if (operations[form.id]) action(event.submitter, () => operations[form.id](form), form.id === 'checkout' ? main : form);
});

main.addEventListener('click', event => {
  const cancel = event.target.closest('[data-cancel]');
  if (cancel && !working && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    drafts.delete(displayedRoute.split('/')[1]);
  } else if (cancel && working) {
    event.preventDefault();
  }
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-filter')) {
    filters.category = button.dataset.filter;
    refreshResults();
  }
  if (button.hasAttribute('data-retry')) render({ focus: true, initializeStorage: true });
  if (button.hasAttribute('data-reset')) {
    dialog.returnValue = 'cancel';
    dialog.showModal();
  }
  if (button.hasAttribute('data-edit-checkout') && !working) {
    main.querySelector('#review').hidden = true;
    const form = main.querySelector('#checkout');
    form.hidden = false;
    (form.elements.amount ?? form.elements.sender).focus();
    clearProblem();
  }
  if (button.hasAttribute('data-confirm')) action(button, submitGift);
});

dialog.addEventListener('close', () => {
  if (dialog.returnValue !== 'reset') return;
  action(null, async () => {
    state = await reset();
    changes?.postMessage('changed');
    lastReply = '';
    history.replaceState({ ...history.state, giftChapterReply: '' }, '');
    drafts.clear();
    scrollPositions.clear();
    Object.assign(filters, { category: '', price: '', available: false });
    saveNavigation();
    await render({ focus: true, restore: true });
    notify('Sample wedding restored.');
  });
});

document.querySelector('.skip').addEventListener('click', event => {
  event.preventDefault();
  main.focus();
});

window.addEventListener('hashchange', () => {
  if (['gifts', 'home'].includes(displayedRoute)) {
    scrollPositions.set(displayedRoute, window.scrollY);
    saveNavigation();
  }
  render({ restore: true, focus: true, initializeStorage: !state });
});
changes?.addEventListener('message', () => {
  if (['home', 'gifts', 'gift', 'colours', 'confirmed'].includes(current().split('/')[0])) render();
});
render({ initializeStorage: true, restore: true });
