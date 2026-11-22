const DB_NAME = 'the-gift-chapter';
const STORE = 'demo';
const RECORD = 'wedding';
const DB_VERSION = 1;
const VERSION = 2;
let connection;

export const categories = ['Stays', 'Activities', 'Flexible gifts'];
export const giftTypes = {
  single: 'Single gift',
  shared: 'Shared gift',
  cash: 'Open amount',
  voucher: 'In-person promise',
};
export const images = {
  'thailand-railay': ['Railay Beach', 'A wooden long-tail boat on Railay’s shore beside limestone cliffs'],
  'thailand-bangkok': ['Bangkok dinner', 'Pad thai with prawns served on a blue plate in Bangkok'],
  'thailand-chiang-mai': ['Chiang Mai cooking class', 'Northern Thai starters arranged on a red-patterned tray'],
  'thailand-khao-sok': ['Khao Sok lake stay', 'A floating bungalow backed by forest on Cheow Lan Lake'],
  'thailand-river': ['Bangkok riverfront', 'Wat Arun silhouetted across the Chao Phraya River at sunset'],
  'thailand-transit': ['Chao Phraya river boats', 'A long-tail boat and covered ferries on the Chao Phraya River in Bangkok'],
  'thailand-trip': ['Thailand travels', 'The brick spires of Wat Chaiwatthanaram in Ayutthaya in late-afternoon light'],
  coast: ['Aegean coast', 'White steps between island houses overlooking the Aegean'],
  dinner: ['Dinner table', 'Candlelit dinner table set with plates and wine glasses'],
  pottery: ['Pottery wheel', 'Hands shaping a clay bowl on a pottery wheel'],
  kitchen: ['Sunday kitchen', 'A bright kitchen with pans hanging over a countertop'],
  hotel: ['Poolside hotel', 'A timber hotel looking out over a pool'],
  flowers: ['Wildflowers', 'Golden wildflowers against a blue sky'],
};

const sampleProfile = {
  names: 'Eline & Luca',
  date: '2027-06-14',
  venue: 'Sample wedding venue',
  welcome: 'We’re heading to Thailand for our honeymoon. If you’d like to give us something, you can pick an experience or chip in. Celebrating with you is more than enough.',
  schedule: '15:30 · Welcome\n16:00 · Ceremony\n18:00 · Dinner together\n20:00 · Music and dancing',
  details: 'This demo invitation uses an example date, venue and schedule. You can try replying and add meal preferences if you like.',
  invite: 'We’d love to celebrate with you. You can try replying to our sample invitation below.',
  theme: 'rose',
  photo: null,
};

// The sample uses 70% of each reference amount, with all prices in whole cents.
const demoPrice = cents => Math.round(cents * 7 / 10);
const sampleGifts = [
  ['coast', 'A night by Railay Beach', 'Railay, Krabi', 'Stays', 'shared', 18000,
    'We’d love to wake up near the limestone cliffs, swim before breakfast and spend the rest of the morning on the beach.', 'thailand-railay'],
  ['dinner', 'Dinner by the Chao Phraya', 'Bangkok', 'Activities', 'single', 8500,
    'We want to order a few dishes we’ve never tried and watch the last boats go past as we eat.', 'thailand-bangkok'],
  ['pottery', 'A Chiang Mai cooking class', 'Chiang Mai', 'Activities', 'shared', 9500,
    'We’d pick out herbs at the market, learn to make curry paste together and see who can handle the most chilli.', 'thailand-chiang-mai'],
  ['home', 'A floating stay in Khao Sok', 'Khao Sok, Surat Thani', 'Stays', 'shared', 16000,
    'We’d spend a night in a floating bungalow and take a kayak out while the lake is still quiet.', 'thailand-khao-sok'],
  ['escape', 'A riverside night in Bangkok', 'Bangkok', 'Stays', 'single', 15000,
    'For our first night in Thailand, we’d like somewhere by the water where we can put our bags down and watch the ferries.', 'thailand-river'],
  ['voucher', 'A Chao Phraya river pass', 'Bangkok', 'Activities', 'voucher', 2500,
    'We want to spend a day hopping on and off the river boats and see which markets we stumble across.', 'thailand-transit'],
  ['cash', 'A little extra for Thailand', 'Across Thailand', 'Flexible gifts', 'cash', 0,
    'For the mango sticky rice, the extra boat ride or a stop we haven’t thought of yet.', 'thailand-trip'],
].map(([id, title, location, category, type, referencePrice, story, image]) =>
  ({ id, title, location, category, type, target: demoPrice(referencePrice), story, image, visibility: 'active' }));

const sampleOrders = [
  { id: 'sample-thailand-coast', gift: 'coast', title: 'A night by Railay Beach', type: 'shared',
    amount: demoPrice(12000), sender: 'Emma',
    message: 'Eline, you pick the spot for the first swim. Luca, you find breakfast afterwards. Somewhere in between, tell each other your favourite bit of the wedding. Here’s to a lifetime of mornings worth remembering.',
    consent: true, approved: true, thanked: false },
  { id: 'sample-thailand-escape', gift: 'escape', title: 'A riverside night in Bangkok', type: 'single',
    amount: demoPrice(15000), sender: 'Lotte & Sam',
    message: 'When a ferry pulls up in Bangkok, get on and see where it goes. If you end up eating mango sticky rice on plastic stools at the last stop, even better. We’re so happy you two get to go through life together.',
    consent: true, approved: true, thanked: true },
  { id: 'sample-thailand-home', gift: 'home', title: 'A floating stay in Khao Sok', type: 'shared',
    amount: demoPrice(4000), sender: 'Jules', message: '', consent: false, approved: false, thanked: false },
];

function sample() {
  return {
    version: VERSION,
    generation: crypto.randomUUID(),
    profile: { ...sampleProfile },
    gifts: structuredClone(sampleGifts),
    orders: structuredClone(sampleOrders),
    rsvps: [],
  };
}

const legacyProfile = {
  names: 'Mila & Noah',
  venue: 'The Willow House, Utrecht',
  welcome: 'We’re getting married! Come for the vows, stay for the dancing, and help us write the next chapter.',
  schedule: '15:30 · Garden opens\n16:00 · Ceremony under the willow\n18:00 · Dinner together\n20:00 · Music and dancing',
  details: 'The venue is a short taxi or cycle ride from Utrecht Centraal. The ceremony is outside, so bring a layer for the evening. Let us know about dietary needs when you RSVP.',
  invite: 'We’ve saved you a seat at our table. Let us know if you can join us for the day.',
};
const legacyGifts = new Map([
  ['coast', 'A night by the Aegean', 'Honeymoon', 'shared', 18000,
    'We want one slow morning by the Aegean, with coffee on the balcony and no alarm set.', 'coast'],
  ['dinner', 'A candlelit dinner', 'Honeymoon', 'single', 8500,
    'We’ve bookmarked a little taverna for years. We want to order whatever the owner is eating.', 'dinner'],
  ['pottery', 'Clay on our sleeves', 'Experiences', 'single', 9500,
    'We want to make each other a breakfast bowl, even if one of them comes out lopsided.', 'pottery'],
  ['home', 'Our Sunday kitchen', 'Home', 'shared', 16000,
    'We’d love a Dutch oven for Sunday stews and friends who stay for seconds.', 'kitchen'],
  ['escape', 'A weekend hideaway', 'Honeymoon', 'single', 15000,
    'We’d put our phones away for two days and take turns picking the walking route.', 'hotel'],
  ['voucher', 'A bookshop gift card', 'Flexible gifts', 'voucher', 2500,
    'We can never leave Broese without a book. We’d each choose something for the honeymoon train.', 'flowers'],
  ['cash', 'An envelope for us', 'Flexible gifts', 'cash', 0,
    'We’re saving for the small surprises that come with making a home together.', 'flowers'],
].map(([id, title, category, type, target, story, image]) =>
  [id, { title, category, type, target, story, image }]));

function migrateVersionOne(state) {
  const profile = { ...state.profile };
  for (const [key, original] of Object.entries(legacyProfile)) {
    if (profile[key] === original) profile[key] = sampleProfile[key];
  }

  const gifts = [];
  const orders = [];
  for (const gift of state.gifts) {
    const replacement = sampleGifts.find(item => item.id === gift.id);
    const previousOrders = state.orders.filter(order => order.gift === gift.id);
    if (!replacement) {
      gifts.push(gift);
      orders.push(...previousOrders);
      continue;
    }

    const originalFields = legacyGifts.get(gift.id);
    const wasEdited = Object.entries(originalFields).some(([key, value]) => gift[key] !== value);
    const seedOrder = previousOrders.find(order => order.id === 'sample-' + gift.id);
    const hasGuestOrders = previousOrders.some(order => order.id !== seedOrder?.id);
    const preserveWish = wasEdited || hasGuestOrders;
    gifts.push({ ...replacement, visibility: preserveWish ? 'active' : gift.visibility });

    if (preserveWish) {
      // Keep historic amounts locked to their original wish so they cannot fund the new itinerary.
      const id = 'legacy-' + gift.id;
      gifts.push({ ...gift, id, visibility: wasEdited ? gift.visibility : 'hidden' });
      orders.push(...previousOrders.map(order => ({ ...order, gift: id })));
    }

    const replacementOrder = sampleOrders.find(order => order.gift === gift.id);
    if (replacementOrder) {
      orders.push(seedOrder && !preserveWish ? {
        ...replacementOrder,
        approved: seedOrder.approved,
        thanked: seedOrder.thanked,
      } : { ...replacementOrder });
    }
  }

  return { ...state, version: VERSION, profile, gifts, orders };
}

export class DemoError extends Error {}

function database() {
  connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onblocked = () => reject(new Error('Database upgrade blocked by another tab'));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        connection = undefined;
      };
      resolve(db);
    };
  }).catch(error => {
    connection = undefined;
    throw error;
  });
  return connection;
}

// All edits use the same store and read the latest record inside the write transaction.
async function transaction(mode, change) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const request = store.get(RECORD);
    let result;
    let error;

    request.onsuccess = () => {
      try {
        const stored = request.result;
        const state = stored?.version === 1 ? migrateVersionOne(stored) : stored;
        if (state && state.version !== VERSION) throw new Error('Unsupported demo version');
        result = change ? change(state) : state;
        if (mode === 'readwrite') store.put(result, RECORD);
      } catch (cause) {
        error = cause;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(error ?? tx.error ?? new Error('Demo storage transaction aborted'));
  });
}

export const initialize = () => transaction('readwrite', state => state ?? sample());
export const read = () => transaction('readonly');
export const update = edit => transaction('readwrite', state => {
  edit(state);
  return state;
});
export const reset = () => transaction('readwrite', sample);

const formatter = new Intl.NumberFormat('en-IE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2,
});
const fraction = cents => String(cents % 100).padStart(2, '0');
export const money = (cents, exact = false) => {
  const whole = formatter.format(Math.floor(cents / 100));
  if (!exact && cents % 100 === 0) return whole;
  return whole + '.' + fraction(cents);
};
export const euros = cents => Math.floor(cents / 100) + '.' + fraction(cents);

export function parseAmount(value) {
  const parts = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!parts) return NaN;
  const cents = Number(parts[1]) * 100 + Number((parts[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : NaN;
}

export function availability(state, gift) {
  const funded = state.orders.filter(order => order.gift === gift.id)
    .reduce((total, order) => total + order.amount, 0);
  const left = gift.type === 'cash' ? Infinity : Math.max(0, gift.target - funded);
  const available = gift.visibility === 'active' && left > 0;
  let status = 'Available';
  if (!left) status = gift.type === 'voucher' ? 'Promised' : 'Fully gifted';
  else if (gift.visibility !== 'active') status = 'Paused';
  else if (gift.type === 'shared') status = funded ? 'Partly funded' : 'Open to contribute';
  else if (gift.type === 'voucher') status = 'Available to promise';
  return { funded, left, available, status };
}

export function verifyAmount(state, gift, amount) {
  if (!gift || gift.visibility !== 'active') {
    throw new DemoError('This wish is unavailable. Choose another gift from the registry. Your draft is still here.');
  }
  const { left } = availability(state, gift);
  if (!left) {
    throw new DemoError('This gift was just fully claimed. Choose another gift from the registry. Your draft is still here.');
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new DemoError('Enter a positive amount in euros with up to two decimal places.');
  }
  if (amount > left) {
    throw new DemoError(`Only ${money(left)} remains. Edit your amount to continue. Your draft is still here.`);
  }
}

export function confirmGift(draft) {
  return update(state => {
    if (state.orders.some(order => order.id === draft.id)) return;
    if (state.generation !== draft.generation) {
      throw new DemoError('The demo was reset in another tab. Cancel this checkout and reopen the gift to continue.');
    }
    const gift = state.gifts.find(item => item.id === draft.gift);
    if (gift && (gift.type !== draft.type || gift.target !== draft.target || gift.title !== draft.title)) {
      throw new DemoError('The couple edited this wish. Go back to your gift details and review the updated wish.');
    }
    verifyAmount(state, gift, draft.amount);
    if (['single', 'voucher'].includes(gift.type) && draft.amount !== gift.target) {
      throw new DemoError('Review the updated gift value before submitting.');
    }
    state.orders.push({
      id: draft.id, gift: gift.id, title: gift.title, type: gift.type, amount: draft.amount,
      sender: draft.sender, message: draft.message, consent: draft.consent,
      approved: false, thanked: false,
    });
  });
}
