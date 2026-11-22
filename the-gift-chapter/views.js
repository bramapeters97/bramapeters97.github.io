import { availability, categories, euros, giftTypes, images, money } from './model.js';

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
const options = items => items.map(item => [item, item]);
const img = (image, className = '', lazy = true) =>
  `<img class="${className} photo-${image}" src="./assets/${image}.webp" alt="${images[image][1]}"${lazy ? ' loading="lazy"' : ''}>`;
const note = (message, sender, gift) =>
  `<article class="note">${gift ? `<small>${esc(gift)}</small>` : ''}<blockquote>${esc(message)}</blockquote><p class="signature">${esc(sender)}</p></article>`;
const price = gift => gift.type === 'cash' ? 'Your amount' : money(gift.target);
const submit = text => `<button class="button" type="submit">${text}</button>`;
const error = '<p class="problem" role="alert" tabindex="-1" hidden></p>';

function card(state, gift) {
  const { available, left, status } = availability(state, gift);
  const kind = gift.type === 'shared' && left ? `${money(left)} left` : price(gift);
  return `<article class="card">
    <div class="art">${img(gift.image)}<span class="badge ${available ? gift.type : 'closed'}">${status}</span></div>
    <div class="card-body">
      <p class="eyebrow">${esc(gift.category)}</p>
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
    <img src="${esc(cover)}" alt="${p.photo ? 'Wedding cover chosen by the couple' : 'A couple holding a bouquet in warm evening sunlight'}" fetchpriority="high">
    <div class="hero-frame">
      <div class="hero-copy">
        <p class="eyebrow">Together with our favourite people</p>
        <h1${p.names.length > 33 ? ' class="long-names"' : ''}>${esc(p.names).replace(' &amp; ', ' <i>&amp;</i> ')}</h1>
        <p class="hero-date"><time datetime="${esc(p.date)}">${date(p.date)}</time> <span aria-hidden="true">·</span> ${esc(p.venue)}</p>
        <p class="hero-message">${esc(p.welcome)}</p>
        ${link('gifts', 'Explore our gift registry', 'gold')}
      </div>
    </div>
  </section>
  <section class="section featured" aria-labelledby="featured">
    <div class="section-head">
      <div><p class="eyebrow">Our wedding registry</p><h2 id="featured">Gifts <i>we’ll remember.</i></h2></div>
      <p>Having you there means the world to us. If you’d like to give us something, here are a few moments and little things we’d love to share.</p>
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

export function registry(state, filters) {
  return `<section class="section page">
    <div class="section-head">
      <div><p class="eyebrow">Our wedding registry</p>${title('Gifts', 'we’ll remember.')}</div>
      <p>Pick something that feels like us. You can send a private note or offer it for our printed keepsake.</p>
    </div>
    <div class="filters">
      <div class="categories" aria-label="Gift categories">${['', ...categories].map(category =>
        `<button class="chip" type="button" data-filter="${category}" aria-pressed="${filters.category === category}">${category || 'All gifts'}</button>`).join('')}</div>
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
  if (gift.type === 'cash') return 'Choose an amount for us to put toward whatever comes next.';
  if (gift.id === 'coast' || gift.id === 'escape') return 'We’ll book the stay ourselves.';
  return gift.category === 'Home' ? 'We’ll buy the item ourselves.' : 'We’ll make the booking ourselves.';
}

export function giftDetail(state, gift, returnTo) {
  const { funded, left, status, available } = availability(state, gift);
  const action = { single: 'Give this gift', shared: 'Contribute to this wish', cash: 'Choose an amount', voucher: 'Promise this voucher' };
  return `<section class="page">${back(returnTo, 'Back to the registry')}
    <div class="gift-layout">
      ${img(gift.image, 'detail-photo', false)}
      <div>
        <p class="eyebrow">${esc(gift.category)} · ${giftTypes[gift.type]}</p>
        <h1>${esc(gift.title)}</h1>
        <p class="lead">${esc(gift.story)}</p>
        <p class="rules">${fulfilment(gift)}</p>
        <p class="gift-value"><strong>${price(gift)}</strong> <span class="badge">${status}</span></p>
        ${gift.type === 'shared' ? `<div class="funding"><progress value="${funded}" max="${gift.target}" aria-label="Amount funded"></progress>
          <p>${money(funded)} funded · ${money(left)} remaining</p></div>` : ''}
        <div class="actions">${available ? link('give/' + gift.id, action[gift.type], 'gold') :
          `<button type="button" class="button" disabled>${status}</button>`}</div>
        <p class="subtle">Wedding demo · ${gift.type === 'voucher' ? 'Promises are saved in this browser.' : 'No money is collected.'}</p>
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
        <p>${price(gift)}${gift.type === 'shared' ? ` · ${money(left)} remaining` : ''}</p>
        <p>${fulfilment(gift)}</p></div>
      </aside>
      <div class="paper">
        <p class="eyebrow">Wedding demo · No money is collected</p>
        ${title('Your gift', '&amp; note.')}
        ${error}
        ${!available ? `<p class="rules">${status}. Go back to the registry to choose another gift.</p>` : ''}
        <form id="checkout">
          ${editable ? field('amount', 'Gift amount (€)', draft.rawAmount, 'text', 'inputmode="decimal" required') : ''}
          ${field('sender', 'Your name', draft.sender, 'text', 'autocomplete="name" required maxlength="80"')}
          ${area('message', 'Personal note (optional)', draft.message, 'maxlength="600"')}
          <label class="check"><input name="consent" type="checkbox"${draft.consent ? ' checked' : ''}> The couple may approve and display my note and name on their keepsake.</label>
          <div class="actions"><button class="button gold" type="submit"${available ? '' : ' disabled'}>${voucher ? 'Review promise' : 'Review demo gift'}</button>
          <a href="#${returnTo}" data-cancel class="button outline">Cancel</a></div>
        </form>
        <section id="review" hidden aria-labelledby="review-heading">
          <h2 id="review-heading" tabindex="-1">Review your ${voucher ? 'promise' : 'gift'}</h2>
          <div id="review-details"></div>
          <label class="check"><input id="simulate-failure" type="checkbox"> Simulate a failure on this attempt</label>
          <div class="actions">
            <button class="button gold" type="button" data-confirm>${voucher ? 'Simulate voucher promise' : 'Simulate gift confirmation'}</button>
            <button class="button outline" type="button" data-edit-checkout>Back to edit</button>
            <a href="#${returnTo}" data-cancel class="button outline">Cancel</a>
          </div>
        </section>
      </div>
    </div>
  </section>`;
}

function visibility(order) {
  if (!order.message) return 'No note was included.';
  if (!order.consent) return 'Private note for the couple.';
  return order.approved ? 'Approved for the keepsake.' : 'Offered to the couple for keepsake approval.';
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
    <div class="actions">${link(returnTo, 'Back to the registry')}${link('board', 'View love notes', 'outline')}</div>
  </section>`;
}

export function board(state) {
  const notes = state.orders.filter(order => order.consent && order.approved && order.message);
  return `<section class="page keepsake">
    <div class="keepsake-title">
      <p class="eyebrow">${esc(state.profile.names)} · ${date(state.profile.date)}</p>
      ${title('Little', 'love notes.')}
    </div>
    <div class="board-tools">
      <label>Paper size<select id="paper-size"><option>A4</option><option>Letter</option></select></label>
      <button class="button outline" type="button" data-print${notes.length ? '' : ' disabled'}>Print or save as PDF</button>
    </div>
    ${notes.length ? `<div class="grid board-grid">${notes.map(o => note(o.message, o.sender, o.title)).join('')}</div>` :
      '<p class="empty">Approved love notes will appear here.</p>'}
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

function weddingEditor(profile, cover, inviteUrl) {
  return `<div class="studio-columns">
    <form id="settings" class="paper">
      <h2>Wedding &amp; invitation</h2>
      ${error}
      ${field('names', 'Couple names', profile.names, 'text', 'required maxlength="90"')}
      <div class="two">${field('date', 'Wedding date', profile.date, 'date', 'required min="1900-01-01" max="9999-12-31"')}
      ${field('venue', 'Venue', profile.venue, 'text', 'required maxlength="120"')}</div>
      ${area('welcome', 'Personal welcome', profile.welcome, 'maxlength="450"')}
      ${area('invite', 'Invitation wording', profile.invite, 'maxlength="500"')}
      ${area('schedule', 'Schedule', profile.schedule, 'maxlength="1000"')}
      ${area('details', 'Practical details', profile.details, 'maxlength="1000"')}
      ${select('theme', 'Colour palette', [['rose', 'Dusty rose'], ['sage', 'Eucalyptus'], ['lilac', 'Pale lilac']], profile.theme)}
      ${submit('Save wedding details')}
    </form>
    <div>
      <section class="paper cover-editor">
        <h2>Cover photograph</h2>
        <img id="cover-preview" src="${esc(cover)}" alt="Wedding cover preview">
        <label>Upload cover photo (JPG, PNG or WebP, up to 2 MB)
          <input form="settings" name="photo" type="file" accept="image/jpeg,image/png,image/webp">
        </label>
        <button type="button" class="button outline" data-default-cover>Use sample photo</button>
        <p class="subtle">Save wedding details to keep the preview.</p>
      </section>
      <section class="paper invite-link">
        <h2>Invitation link</h2>
        <p>Visitors start with the sample wedding in their own browser. Edits, gifts and replies here stay in this browser.</p>
        ${field('invite-link', 'Share the sample invitation', inviteUrl, 'url', 'readonly id="invite-link"')}
        <button type="button" class="button outline" data-copy>Copy invitation link</button>
      </section>
    </div>
  </div>`;
}

function wishEditor(state, gift) {
  const history = gift && state.orders.some(order => order.gift === gift.id);
  return `<form id="wish" class="paper" data-id="${gift?.id ?? ''}">
    <h2>${gift ? 'Edit wish' : 'Add a wish'}</h2>
    ${error}
    ${field('title', 'Gift title', gift?.title, 'text', 'required maxlength="90"')}
    ${area('story', 'Why you chose it', gift?.story, 'required maxlength="420"')}
    <div class="two">
      ${select('type', 'Giving option', Object.entries(giftTypes), gift?.type ?? 'single')}
      ${field('price', 'Price or target (€)', gift?.target ? euros(gift.target) : '', 'text', 'inputmode="decimal" required')}
    </div>
    ${history ? '<p class="subtle">This wish has gift history. Its giving option and price are fixed. Earlier gifts keep their original title.</p>' : ''}
    ${select('category', 'Category', options(categories), gift?.category)}
    ${select('image', 'Gift photo', Object.entries(images).map(([value, [name]]) => [value, name]), gift?.image)}
    <div class="actions">${submit(gift ? 'Save wish' : 'Add wish')}${gift ? link('studio/wishes', 'Cancel editing', 'outline') : ''}</div>
  </form>`;
}

function wishes(state, gift) {
  return `<div class="studio-columns">
    ${wishEditor(state, gift)}
    <section class="paper"><h2>Registry order</h2>
      <ol class="wish-list">${state.gifts.map((wish, index) => `<li class="row">
        <h3>${esc(wish.title)}</h3><p>${esc(wish.category)} · ${wish.visibility === 'hidden' ? 'Hidden' : availability(state, wish).status}</p>
        <div class="row-actions">
          ${link('studio/wishes/' + wish.id, 'Edit', 'outline')}
          <button type="button" class="chip" data-move="-1" data-wish="${wish.id}" aria-label="Move ${esc(wish.title)} up"${index ? '' : ' disabled'}>Move up</button>
          <button type="button" class="chip" data-move="1" data-wish="${wish.id}" aria-label="Move ${esc(wish.title)} down"${index < state.gifts.length - 1 ? '' : ' disabled'}>Move down</button>
          <button type="button" class="chip" data-wish="${wish.id}" data-visibility="${wish.visibility === 'active' ? 'paused' : 'active'}">${wish.visibility === 'active' ? 'Pause' : 'Make active'}</button>
          <button type="button" class="chip" data-wish="${wish.id}" data-visibility="${wish.visibility === 'hidden' ? 'paused' : 'hidden'}">${wish.visibility === 'hidden' ? 'Show as paused' : 'Hide'}</button>
        </div></li>`).join('')}</ol>
    </section>
  </div>`;
}

function orderList(orders, empty) {
  if (!orders.length) return `<p>${empty}</p>`;
  return orders.map(o => `<article class="row">
    <h3>${esc(o.sender)}</h3>
    <p>${money(o.amount, true)} · ${esc(o.title)}</p>
    ${o.message ? `<blockquote>${esc(o.message)}</blockquote><p>${visibility(o)}</p>` : ''}
    <div class="row-actions">
      ${o.consent && o.message ? `<button class="chip" type="button" data-approve="${o.id}">${o.approved ? 'Remove from board' : 'Approve for board'}</button>` : ''}
      <button class="chip" type="button" data-thanks="${o.id}" aria-pressed="${o.thanked}">${o.thanked ? 'Thanked · Undo' : 'Mark thanked'}</button>
    </div>
  </article>`).join('');
}

function activity(state) {
  return `<div class="activity">
    <section class="paper"><h2>RSVP replies</h2>
      <p>${state.rsvps.filter(r => r.reply === 'yes').length} attending · ${state.rsvps.filter(r => r.reply === 'no').length} declined</p>
      ${state.rsvps.map(r => `<div class="row"><h3>${esc(r.guest)}</h3><p>${r.reply === 'yes' ? 'Attending' : 'Declined'}${r.diet ? ' · ' + esc(r.diet) : ''}</p></div>`).join('')}
    </section>
    <section class="paper"><h2>Confirmed demo contributions</h2>${orderList(state.orders.filter(o => o.type !== 'voucher'), 'No demo contributions yet.')}</section>
    <section class="paper"><h2>In-person voucher promises</h2>${orderList(state.orders.filter(o => o.type === 'voucher'), 'No in-person promises yet.')}</section>
  </div>`;
}

export function studio(state, tab, wish, cover, inviteUrl) {
  return `<section class="page studio">
    <p class="eyebrow">Role preview · Saved in this browser</p>
    ${title('The couple’s', 'studio.')}
    <p class="lead">Edit the sample wedding together. Anyone using this demo in this browser can open the studio.</p>
    <div class="studio-top">
      <nav aria-label="Studio sections">${[['wedding', 'Wedding'], ['wishes', 'Wishes'], ['activity', 'Guests & gifts']].map(([id, name]) =>
        `<a class="chip" href="#studio/${id}"${id === tab ? ' aria-current="page"' : ''}>${name}</a>`).join('')}</nav>
      ${link('home', 'Preview guest view', 'outline')}
    </div>
    ${tab === 'wishes' ? wishes(state, wish) : tab === 'activity' ? activity(state) : weddingEditor(state.profile, cover, inviteUrl)}
    <div class="reset-area"><button class="chip" type="button" data-reset>Reset to sample data</button></div>
  </section>`;
}

export function missing() {
  return `<section class="page narrow">${title('This page', 'is unavailable.')}${link('gifts', 'Back to the registry')}</section>`;
}
