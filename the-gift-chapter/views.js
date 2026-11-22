import { availability, categories, giftTypes, images, money } from './model.js';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const date = value => new Date(value + 'T12:00:00').toLocaleDateString('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric',
});
const link = (hash, text, classes = '') => `<a href="#${hash}" class="button ${classes}">${text}</a>`;
const back = (hash, label) => `<a class="back" href="#${hash}">${label}</a>`;
const title = (first, second) => `<h1>${first} <i>${second}</i></h1>`;
const field = (name, label, value = '', type = 'text', attributes = '') =>
  `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${attributes}></label>`;
const area = (name, label, value = '', attributes = '') =>
  `<label>${label}<textarea name="${name}" ${attributes}>${esc(value)}</textarea></label>`;
const select = (name, label, options, selected) =>
  `<label>${label}<select name="${name}">${options.map(([value, text]) =>
    `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
const img = (image, className = '', lazy = true) =>
  `<img class="${className} photo-${image}" src="./assets/${image}.webp" alt="${images[image][1]}"${lazy ? ' loading="lazy"' : ''}>`;
const note = (message, sender) =>
  `<article class="note"><blockquote>${esc(message)}</blockquote><p class="signature">${esc(sender)}</p></article>`;
const price = gift => gift.type === 'cash' ? 'Your amount' : money(gift.target);
const submit = text => `<button class="button" type="submit">${text}</button>`;
export const palettes = [
  ['rose', 'Dusty rose'], ['sage', 'Eucalyptus'], ['lilac', 'Pale lilac'],
  ['champagne', 'Soft champagne'], ['blue', 'Morning mist'], ['apricot', 'Apricot silk'],
];
const error = '<p class="problem" role="alert" tabindex="-1" hidden></p>';

function card(state, gift) {
  const { available, left, status } = availability(state, gift);
  const kind = gift.type === 'shared' && left ? `${money(left)} left` : price(gift);
  return `<article class="card">
    <div class="art">${img(gift.image)}<span class="badge ${available ? gift.type : 'closed'}">${status}</span></div>
    <div class="card-body">
      <p class="eyebrow">${esc(gift.location || gift.category)}</p>
      <h3>${esc(gift.title)}</h3>
      <p>${esc(gift.story)}</p>
      <div class="card-bottom">
        <div><strong>${kind}</strong>${gift.type === 'shared' && left ? ` <small>of ${price(gift)}</small>` : ''}</div>
        ${available ? `<a class="card-link" href="#gift/${gift.id}" aria-label="View gift: ${esc(gift.title)}">View gift</a>` :
          `<button class="card-link" disabled>${status}</button>`}
      </div>
    </div>
  </article>`;
}

export function home(state, cover) {
  const p = state.profile;
  const featured = state.gifts.filter(g => g.visibility !== 'hidden').slice(0, 3);
  return `<section class="hero">
    <img src="${esc(cover)}" alt="" fetchpriority="high">
    <div class="hero-copy">
      <p class="eyebrow">A wedding invitation</p>
      <h1${p.names.length > 33 ? ' class="long-names"' : ''}>${esc(p.names).replace(' &amp; ', ' <i>&amp;</i> ')}</h1>
      <p class="hero-date"><span class="sample-date">Sample wedding details</span><time datetime="${esc(p.date)}">${date(p.date)}</time> <span aria-hidden="true">·</span> ${esc(p.venue)}</p>
      <p class="hero-message">${esc(p.welcome)}</p>
      ${link('gifts', 'Explore our gift registry', 'glass')}
    </div>
  </section>
  <section class="section featured" aria-labelledby="featured">
    <div class="section-head">
      <div><p class="eyebrow">Our Thailand honeymoon</p><h2 id="featured">Gifts <i>we’ll remember.</i></h2></div>
      <p>Celebrating with you is what matters to us. If you’d like to chip in, here are a few stops on our Thailand itinerary. All amounts shown are examples.</p>
    </div>
    ${featured.length ? `<div class="grid">${featured.map(g => card(state, g)).join('')}</div>` : '<p>We’re still making our wish list.</p>'}
    <div class="actions">${link('gifts', 'See the full registry', 'outline')}</div>
  </section>
  <section class="celebration">
    <div class="section celebration-inner">
      <div><p class="eyebrow">${date(p.date)}</p><h2>The wedding <i>day.</i></h2><h3>${esc(p.venue)}</h3><p>${esc(p.details)}</p>${link('rsvp', 'Respond to the invitation')}</div>
      <div class="schedule"><h3>On the day</h3><p>${esc(p.schedule)}</p></div>
    </div>
  </section>`;
}

export function giftResults(state, filters) {
  const visible = state.gifts.filter(gift => {
    if (gift.visibility === 'hidden') return false;
    if (filters.category && filters.category !== gift.category) return false;
    if (filters.available && !availability(state, gift).available) return false;
    return !filters.price || (gift.type !== 'cash' && gift.target <= Number(filters.price));
  });
  return `<p class="result-count" role="status">${visible.length} ${visible.length === 1 ? 'wish' : 'wishes'}</p>
    ${visible.length ? `<div class="grid">${visible.map(g => card(state, g)).join('')}</div>` :
      '<p class="empty">No wishes match. Choose another category or clear a filter.</p>'}`;
}

export function registryCategories(state) {
  return [...new Set([...categories, ...state.gifts.filter(gift => gift.visibility !== 'hidden').map(gift => gift.category)])];
}

export function registry(state, filters) {
  return `<section class="section page">
    <div class="section-head">
      <div><p class="eyebrow">Our Thailand honeymoon</p>${title('Gifts', 'we’ll remember.')}</div>
      <p>Pick a stay or activity you’d like to be part of. You can chip in any amount up to the remaining balance on a shared gift. These are sample prices, and giving is entirely optional.</p>
    </div>
    <div class="filters">
      <div class="categories" aria-label="Gift categories">${['', ...registryCategories(state)].map(category =>
        `<button class="chip" type="button" data-filter="${esc(category)}" aria-pressed="${filters.category === category}">${esc(category || 'All gifts')}</button>`).join('')}</div>
      <div class="filter-controls">
        ${select('price-filter', 'Gift price or target', [['', 'Any price'], ['5000', 'Up to €50'], ['10000', 'Up to €100'], ['20000', 'Up to €200']], filters.price)}
        <label class="check"><input name="available-filter" type="checkbox"${filters.available ? ' checked' : ''}> Available only</label>
      </div>
    </div>
    <div id="gift-results">${giftResults(state, filters)}</div>
  </section>`;
}

function fulfilment(gift) {
  if (gift.type === 'voucher') return 'Buy the voucher separately and bring it to the wedding. This demo records an in-person promise.';
  if (gift.type === 'cash') return 'Choose an amount for us to put toward the Thailand itinerary.';
  if (gift.category === 'Stays') return 'We’ll book the stay ourselves.';
  return gift.category === 'Home' ? 'We’ll buy the item ourselves.' : 'We’ll make the booking ourselves.';
}

export function giftDetail(state, gift, returnTo) {
  const { funded, left, status, available } = availability(state, gift);
  const action = { single: 'Give this gift', shared: 'Chip in to this gift', cash: 'Choose an amount', voucher: 'Promise this voucher' };
  return `<section class="page">${back(returnTo, 'Back to the registry')}
    <div class="gift-layout">
      ${img(gift.image, 'detail-photo', false)}
      <div>
        <p class="eyebrow">${esc(gift.location || gift.category)} · ${giftTypes[gift.type]}</p>
        <h1>${esc(gift.title)}</h1>
        <p class="lead">${esc(gift.story)}</p>
        <p class="rules">${fulfilment(gift)}</p>
        <p class="gift-value"><strong>${price(gift)}</strong> <span class="badge">${status}</span></p>
        ${gift.type === 'shared' ? `<div class="funding"><progress value="${funded}" max="${gift.target}" aria-label="Amount funded"></progress>
          <p>${money(funded)} funded · ${money(left)} remaining</p></div>` : ''}
        <div class="actions">${available ? link('give/' + gift.id, action[gift.type], 'glass') :
          `<button type="button" class="button" disabled>${status}</button>`}</div>
        <p class="subtle">Sample prices · ${gift.type === 'voucher' ? 'Promises are saved in this browser.' : 'No money is collected.'}</p>
      </div>
    </div>
  </section>`;
}

export function checkout(state, gift, draft, returnTo) {
  const { left, available, status } = availability(state, gift);
  const editable = ['shared', 'cash'].includes(gift.type);
  const voucher = gift.type === 'voucher';
  return `<section class="page checkout-page">
    ${back('gift/' + gift.id, 'Back to gift details')}
    <div class="checkout-layout">
      <aside class="gift-summary">
        ${img(gift.image, 'summary-photo', false)}
        <div><p class="eyebrow">${giftTypes[gift.type]}</p><h2>${esc(gift.title)}</h2>
        ${gift.location ? `<p class="summary-location">${esc(gift.location)}</p>` : ''}
        <p>${price(gift)}${gift.type === 'shared' ? ` · ${money(left)} remaining` : ''}</p>
        <p>${fulfilment(gift)}</p></div>
      </aside>
      <div class="paper">
        <p class="eyebrow">Sample prices · No money is collected</p>
        ${title('Your gift', '&amp; note.')}
        ${error}
        ${!available ? `<p class="rules">${status}. Go back to the registry to choose another gift.</p>` : ''}
        <form id="checkout">
          ${editable ? field('amount', 'Gift amount (€)', draft.rawAmount, 'text', 'inputmode="decimal" required') : ''}
          ${field('sender', 'Your name', draft.sender, 'text', 'autocomplete="name" required maxlength="80"')}
          ${area('message', 'Personal note (optional)', draft.message, 'maxlength="600"')}
          <p class="subtle">Your note stays with your demo gift in this browser.</p>
          <div class="actions"><button class="button glass" type="submit"${available ? '' : ' disabled'}>${voucher ? 'Review promise' : 'Review demo gift'}</button>
          <a href="#${returnTo}" data-cancel class="button outline">Cancel</a></div>
        </form>
        <section id="review" hidden aria-labelledby="review-heading">
          <h2 id="review-heading" tabindex="-1">Review your ${voucher ? 'promise' : 'gift'}</h2>
          <div id="review-details"></div>
          <label class="check"><input id="simulate-failure" type="checkbox"> Simulate a failure on this attempt</label>
          <div class="actions">
            <button class="button glass" type="button" data-confirm>${voucher ? 'Simulate voucher promise' : 'Simulate gift confirmation'}</button>
            ${voucher ? '' : '<button class="button apple-pay-demo" type="button" disabled aria-describedby="apple-pay-help">Apple Pay</button>'}
            <button class="button outline" type="button" data-edit-checkout>Back to edit</button>
            <a href="#${returnTo}" data-cancel class="button outline">Cancel</a>
          </div>
          ${voucher ? '' : '<p id="apple-pay-help" class="subtle apple-pay-help">Apple Pay is a disabled preview. All gifts are simulated.</p>'}
        </section>
      </div>
    </div>
  </section>`;
}

function visibility(order) {
  if (!order.message) return 'No note was included.';
  return 'Saved privately with this demo gift.';
}

export function reviewDetails(draft) {
  const voucher = draft.type === 'voucher';
  return `<dl class="summary">
    <div><dt>${voucher ? 'In-person voucher value' : 'Total demo contribution'}</dt><dd>${money(draft.amount, true)}</dd></div>
    <div><dt>Gift</dt><dd>${esc(draft.title)}</dd></div>
    <div><dt>From</dt><dd>${esc(draft.sender)}</dd></div>
    <div><dt>Note visibility</dt><dd>${visibility(draft)}</dd></div>
  </dl>${draft.message ? note(draft.message, draft.sender) : ''}`;
}

export function receipt(order, returnTo) {
  return `<section class="page narrow">
    <p class="eyebrow">Saved in this browser</p>
    ${title('With love,', esc(order.sender) + '.')}
    <p class="lead">${order.type === 'voucher' ? 'Your demo promise is saved. The voucher would be bought separately and brought to the wedding.' : 'Your demo contribution is confirmed.'}</p>
    ${reviewDetails(order)}
    <p class="subtle reference">Local reference <strong>${esc(order.id)}</strong></p>
    <div class="actions">${link(returnTo, 'Back to the registry')}</div>
  </section>`;
}

export function invitation(state, reply) {
  const p = state.profile;
  return `<section class="page narrow">
    <p class="eyebrow">${date(p.date)} · ${esc(p.venue)}</p>
    ${title('Your', 'invitation.')}
    <p class="lead">${esc(p.invite)}</p>
    <p class="preline">${esc(p.schedule)}</p>
    <form id="rsvp" class="paper">
      <h2>${reply ? 'Update your reply' : 'Will we see you there?'}</h2>
      ${error}
      ${field('guest', 'Guest or household name', reply?.guest, 'text', 'required maxlength="80" autocomplete="name"')}
      ${select('reply', 'Will you attend?', [['yes', 'Joyfully accepts'], ['no', 'Regretfully declines']], reply?.reply ?? 'yes')}
      <div id="diet-field"${reply?.reply === 'no' ? ' hidden' : ''}>${field('diet', 'Meal preferences (optional)', reply?.diet, 'text', 'maxlength="120"')}</div>
      ${submit(reply ? 'Update demo RSVP' : 'Save demo RSVP')}
    </form>
    <p class="subtle">Replies stay in this browser. To update an earlier household reply, use the same household name.</p>
  </section>`;
}

export function colours(state) {
  return `<section class="page narrow colours-page">
    ${title('Wedding', 'colours.')}
    <fieldset class="palette-picker" aria-describedby="palette-help">
      <legend>Choose a palette</legend>
      <p id="palette-help">Your choice updates the whole webshop and is saved in this browser.</p>
      <div class="palettes">${palettes.map(([id, name]) => `<label class="palette-option" data-palette="${id}">
        <input type="radio" name="theme" value="${id}"${id === state.profile.theme ? ' checked' : ''}>
        <span class="palette-card">
          <span class="palette-swatches" aria-hidden="true"><span></span><span></span><span></span></span>
          <span>${name}</span>
        </span>
      </label>`).join('')}</div>
    </fieldset>
    <div class="actions">
      ${link('home', 'Back to the wedding', 'outline')}
      <button class="button outline" type="button" data-reset>Reset to sample data</button>
    </div>
  </section>`;
}

export function missing() {
  return `<section class="page narrow">${title('This page', 'is unavailable.')}${link('gifts', 'Back to the registry')}</section>`;
}
