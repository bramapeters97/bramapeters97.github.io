import {
  availability, categories, confirmGift, DemoError, euros, giftTypes, images,
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
const invitationsUrl = new URL('#rsvp', location.href);
const changes = 'BroadcastChannel' in window ? new BroadcastChannel('the-gift-chapter-v1') : null;
const profileFields = ['names', 'date', 'venue', 'welcome', 'invite', 'schedule', 'details', 'theme'];
const current = () => location.hash.slice(1) || 'home';
const fieldValue = (form, name) => form.elements[name].value.trim();
const storageError = 'Wedding demo storage is unavailable. Check that this browser allows local storage, then try again.';
let state;
let displayedRoute = '';
let renderId = 0;
let photoUrl;
let photoSelection;
let photoPending = false;
let photoVersion = 0;
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
  if (!problem) {
    notify(message);
    return;
  }
  problem.hidden = false;
  problem.textContent = message;
  problem.focus();
}

function discardPhoto() {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = undefined;
  photoSelection = undefined;
  photoPending = false;
  photoVersion++;
}

function getDraft(gift) {
  if (!drafts.has(gift.id)) {
    const { left } = availability(state, gift);
    drafts.set(gift.id, {
      id: crypto.randomUUID(), gift: gift.id, generation: state.generation, type: gift.type,
      title: gift.title, target: gift.target, sender: '', message: '', consent: false,
      rawAmount: gift.type === 'shared' ? euros(Math.min(3000, left)) : '25.00',
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
  draft.consent = form.elements.consent.checked;
}

function showRoute(route, focus) {
  discardPhoto();
  const [page, id, sub] = route.split('/');
  const profile = state.profile;
  if (profile.photo) photoUrl = URL.createObjectURL(profile.photo);
  const cover = photoUrl ?? sampleCover;
  const gift = state.gifts.find(item => item.id === id && item.visibility !== 'hidden');
  const reply = state.rsvps.find(item => item.key === lastReply);
  const studioTabs = ['wedding', 'wishes', 'activity'];
  let html;

  switch (page) {
    case 'home': html = view.home(state, cover); break;
    case 'gifts': html = view.registry(state, filters); break;
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
    case 'board': html = view.board(state); break;
    case 'rsvp': html = view.invitation(state, reply); break;
    case 'studio': html = view.studio(state, studioTabs.includes(id) ? id : 'wedding',
      state.gifts.find(item => item.id === sub), cover, invitationsUrl.href); break;
    default: html = view.missing();
  }

  document.body.dataset.theme = profile.theme;
  document.title = `${profile.names} · The Gift Chapter`;
  main.innerHTML = html;
  displayedRoute = route;
  for (const link of document.querySelectorAll('.site-header nav a, .rsvp-link')) {
    if (link.hash === '#' + page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  const replyForm = main.querySelector('#rsvp');
  if (replyForm) replyForm.elements.diet.disabled = reply?.reply === 'no';
  const wishForm = main.querySelector('#wish');
  if (wishForm) syncWishFields(wishForm);
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

function saveReply(form) {
  const guest = fieldValue(form, 'guest');
  if (!guest) throw new DemoError('Enter a name for your reply.');
  const key = guest.toLocaleLowerCase('en-GB');
  const reply = fieldValue(form, 'reply');
  const diet = reply === 'yes' ? fieldValue(form, 'diet') : '';
  return save(latest => {
    latest.rsvps = latest.rsvps.filter(item => item.key !== key);
    latest.rsvps.push({ guest, key, reply, diet });
  }).then(() => {
    lastReply = key;
    history.replaceState({ ...history.state, giftChapterReply: key }, '');
    showRoute(current(), false);
    main.querySelector('h2').setAttribute('tabindex', '-1');
    main.querySelector('h2').focus({ preventScroll: true });
    notify('Your demo reply is saved.');
  });
}

function syncWishFields(form) {
  const hasHistory = state.orders.some(order => order.gift === form.dataset.id);
  form.elements.type.disabled = hasHistory;
  form.elements.price.closest('label').hidden = form.elements.type.value === 'cash';
  form.elements.price.disabled = hasHistory || form.elements.type.value === 'cash';
}

async function saveWish(form) {
  const wish = Object.fromEntries(['title', 'story', 'type', 'category', 'image']
    .map(name => [name, fieldValue(form, name)]));
  if (!wish.title || !wish.story) throw new DemoError('Add a gift title and a short description.');
  if (!Object.hasOwn(giftTypes, wish.type) || !categories.includes(wish.category) || !Object.hasOwn(images, wish.image)) {
    throw new DemoError('Choose a giving option, category and photo from the lists.');
  }
  wish.target = wish.type === 'cash' ? 0 : parseAmount(fieldValue(form, 'price'));
  const id = form.dataset.id;
  await save(latest => {
    const existing = latest.gifts.find(item => item.id === id);
    if (id && !existing) throw new DemoError('This wish is no longer in the demo. Reopen the wish list.');
    if (existing && latest.orders.some(order => order.gift === id) &&
        (wish.type !== existing.type || wish.target !== existing.target)) {
      throw new DemoError('This wish has gift history. Reopen it to keep the existing giving option and price.');
    }
    if (!Number.isSafeInteger(wish.target)) throw new DemoError('Enter a positive price with up to two decimal places.');
    if (existing) Object.assign(existing, wish);
    else latest.gifts.push({ ...wish, id: crypto.randomUUID(), visibility: 'active' });
  });
  if (id) location.hash = 'studio/wishes';
  else showRoute(current(), true);
  notify(id ? 'Wish updated.' : 'Wish added to the registry.');
}

async function previewPhoto(input) {
  const version = ++photoVersion;
  const preview = main.querySelector('#cover-preview');
  const file = input.files[0];
  clearProblem(input.form);
  if (!file) {
    photoPending = false;
    return;
  }
  photoPending = true;
  let candidate;
  try {
    if (file.size > 2_000_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new DemoError('Choose a JPG, PNG or WebP photograph up to 2 MB.');
    }
    const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const valid = {
      'image/jpeg': signature[0] === 255 && signature[1] === 216 && signature[2] === 255,
      'image/png': [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => signature[i] === byte),
      'image/webp': String.fromCharCode(...signature.subarray(0, 4)) === 'RIFF' &&
        String.fromCharCode(...signature.subarray(8, 12)) === 'WEBP',
    };
    if (!valid[file.type]) throw new DemoError('This file does not match its image type. Choose another photograph.');
    candidate = URL.createObjectURL(file);
    const image = new Image();
    image.src = candidate;
    await image.decode();
    if (version !== photoVersion) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoSelection = file;
    photoUrl = candidate;
    candidate = undefined;
    preview.src = photoUrl;
    notify('Photo preview ready. Save wedding details to keep it.');
  } catch (error) {
    if (version !== photoVersion) return;
    input.value = '';
    showProblem(error instanceof DemoError ? error : new DemoError('This photo could not be opened. Choose another file.'), input.form);
  } finally {
    if (candidate) URL.revokeObjectURL(candidate);
    if (version === photoVersion) photoPending = false;
  }
}

async function saveWedding(form) {
  if (photoPending) throw new DemoError('Wait for the cover preview, then save your wedding details.');
  const edits = Object.fromEntries(profileFields.map(name => [name, fieldValue(form, name)]));
  if (!edits.names || !edits.venue) throw new DemoError('Enter your names and venue.');
  if (photoSelection !== undefined) edits.photo = photoSelection;
  await save(latest => Object.assign(latest.profile, edits));
  showRoute(current(), false);
  main.querySelector('#settings button[type="submit"]').focus({ preventScroll: true });
  notify('Wedding details saved.');
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

async function handleStudioButton(button) {
  if (button.dataset.wish) {
    const { wish, move, visibility } = button.dataset;
    await save(latest => {
      const index = latest.gifts.findIndex(item => item.id === wish);
      if (index < 0) throw new DemoError('This wish is no longer in the demo.');
      if (visibility) latest.gifts[index].visibility = visibility;
      else {
        const destination = index + Number(move);
        if (destination < 0 || destination >= latest.gifts.length) return;
        [latest.gifts[index], latest.gifts[destination]] = [latest.gifts[destination], latest.gifts[index]];
      }
    });
    showRoute(current(), false);
    const matching = [...main.querySelectorAll('[data-wish]')].find(b =>
      b.dataset.wish === wish && !b.disabled &&
      (move ? b.dataset.move === move : b.hasAttribute('data-visibility')));
    matching?.focus({ preventScroll: true });
    notify('Registry updated.');
  } else {
    const id = button.dataset.approve ?? button.dataset.thanks;
    const property = button.dataset.approve ? 'approved' : 'thanked';
    await save(latest => {
      const order = latest.orders.find(item => item.id === id);
      if (!order) throw new DemoError('This gift is no longer in the demo.');
      if (property === 'approved' && (!order.consent || !order.message)) return;
      order[property] = !order[property];
    });
    showRoute(current(), false);
    [...main.querySelectorAll('[data-approve], [data-thanks]')].find(b =>
      (property === 'approved' ? b.dataset.approve : b.dataset.thanks) === id)?.focus({ preventScroll: true });
    notify('Gift record updated.');
  }
}

main.addEventListener('input', event => {
  if (event.target.form?.id === 'checkout') saveDraft(event.target.form);
});

main.addEventListener('change', event => {
  const input = event.target;
  if (input.name === 'available-filter') filters.available = input.checked;
  if (input.name === 'price-filter') filters.price = input.value;
  if (['available-filter', 'price-filter'].includes(input.name)) refreshResults();
  if (input.name === 'photo') previewPhoto(input);
  if (input.name === 'type' && input.form?.id === 'wish') syncWishFields(input.form);
  if (input.name === 'reply') {
    main.querySelector('#diet-field').hidden = input.value === 'no';
    input.form.elements.diet.disabled = input.value === 'no';
  }
});

main.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const operations = { settings: saveWedding, wish: saveWish, rsvp: saveReply, checkout: enterReview };
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
  if (button.hasAttribute('data-print')) {
    document.body.dataset.paper = main.querySelector('#paper-size').value;
    window.print();
  }
  if (button.hasAttribute('data-reset')) {
    dialog.returnValue = 'cancel';
    dialog.showModal();
  }
  if (button.hasAttribute('data-default-cover')) {
    discardPhoto();
    photoSelection = null;
    main.querySelector('[name="photo"]').value = '';
    main.querySelector('#cover-preview').src = sampleCover;
    clearProblem(main.querySelector('#settings'));
  }
  if (button.hasAttribute('data-copy')) {
    const input = main.querySelector('#invite-link');
    navigator.clipboard?.writeText(input.value).then(() => notify('Invitation link copied.'),
      () => { input.select(); notify('Link selected. Copy it with your browser.'); });
    if (!navigator.clipboard) input.select();
  }
  if (button.hasAttribute('data-edit-checkout') && !working) {
    main.querySelector('#review').hidden = true;
    const form = main.querySelector('#checkout');
    form.hidden = false;
    (form.elements.amount ?? form.elements.sender).focus();
    clearProblem();
  }
  if (button.hasAttribute('data-confirm')) action(button, submitGift);
  if (button.dataset.wish || button.dataset.approve || button.dataset.thanks) {
    action(button, () => handleStudioButton(button));
  }
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
  if (['home', 'gifts', 'gift', 'board', 'confirmed'].includes(current().split('/')[0])) render();
});
render({ initializeStorage: true, restore: true });
