const DB_NAME = 'the-gift-chapter';
const STORE = 'demo';
const RECORD = 'wedding';
const VERSION = 1;
let connection;

export const categories = ['Honeymoon', 'Experiences', 'Home', 'Flexible gifts'];
export const giftTypes = {
  single: 'Single gift',
  shared: 'Shared gift',
  cash: 'Open amount',
  voucher: 'In-person promise',
};
export const images = {
  coast: ['Aegean coast', 'White steps between island houses overlooking the Aegean'],
  dinner: ['Dinner table', 'Candlelit dinner table set with plates and wine glasses'],
  pottery: ['Pottery wheel', 'Hands shaping a clay bowl on a pottery wheel'],
  kitchen: ['Sunday kitchen', 'A bright kitchen with pans hanging over a countertop'],
  hotel: ['Poolside hotel', 'A timber hotel looking out over a pool'],
  flowers: ['Wildflowers', 'Golden wildflowers against a blue sky'],
};

function sample() {
  return {
    version: VERSION,
    generation: crypto.randomUUID(),
    profile: {
      names: 'Mila & Noah',
      date: '2027-06-14',
      venue: 'The Willow House, Utrecht',
      welcome: 'We’re getting married! Come for the vows, stay for the dancing, and help us write the next chapter.',
      schedule: '15:30 · Garden opens\n16:00 · Ceremony under the willow\n18:00 · Dinner together\n20:00 · Music and dancing',
      details: 'The venue is a short taxi or cycle ride from Utrecht Centraal. The ceremony is outside, so bring a layer for the evening. Let us know about dietary needs when you RSVP.',
      invite: 'We’ve saved you a seat at our table. Let us know if you can join us for the day.',
      theme: 'rose',
      photo: null,
    },
    gifts: [
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
      ({ id, title, category, type, target, story, image, visibility: 'active' })),
    orders: [
      { id: 'sample-coast', gift: 'coast', title: 'A night by the Aegean', type: 'shared',
        amount: 12000, sender: 'Emma', message: 'For mornings with sea salt in your hair and nowhere to rush.',
        consent: true, approved: true, thanked: false },
      { id: 'sample-escape', gift: 'escape', title: 'A weekend hideaway', type: 'single',
        amount: 15000, sender: 'Lotte & Sam', message: 'Save us a dance. We’ll be the first ones on the floor.',
        consent: true, approved: true, thanked: true },
      { id: 'sample-home', gift: 'home', title: 'Our Sunday kitchen', type: 'shared',
        amount: 4000, sender: 'Jules', message: '', consent: false, approved: false, thanked: false },
    ],
    rsvps: [],
  };
}

export class DemoError extends Error {}

function database() {
  connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
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
        const state = request.result;
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
