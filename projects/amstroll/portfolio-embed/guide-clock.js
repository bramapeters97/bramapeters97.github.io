(() => {
  'use strict';

  const MAX_MINUTES = 720;
  const MINUTE = 60_000;
  const TIME_ZONE = 'Europe/Amsterdam';
  const partsFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, day: 'numeric', month: 'short'
  });
  const presets = [[15, '15 min'], [30, '30 min'], [60, '1 hour'], [120, '2 hours']];

  function clampMinutes(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.min(MAX_MINUTES, Math.round(numeric))) : 0;
  }

  function localFields(instant) {
    const parts = Object.fromEntries(partsFormatter.formatToParts(instant)
      .filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return { date: [parts.year, parts.month, parts.day].join('-'), time: parts.hour + ':' + parts.minute };
  }

  function deadlineInstants(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return [];
    const nominal = Date.parse(date + 'T' + time + ':00Z');
    if (!Number.isFinite(nominal) || new Date(nominal).toISOString().slice(0, 16) !== date + 'T' + time) return [];

    // Sampling both sides of the local date captures both offsets on a clock-change day.
    const offsets = new Set();
    for (const hours of [-24, 0, 24]) {
      const sample = nominal + hours * 60 * MINUTE;
      const local = localFields(sample);
      offsets.add(Date.parse(local.date + 'T' + local.time + ':00Z') - sample);
    }
    return [...offsets].map(offset => nominal - offset).filter(instant => {
      const local = localFields(instant);
      return local.date === date && local.time === time;
    }).sort((a, b) => a - b);
  }

  function resolve(prefs = {}, now = new Date()) {
    const anchor = +new Date(now);
    const parsed = typeof prefs.deadline === 'string' ? Date.parse(prefs.deadline) : NaN;
    const fixed = Number.isFinite(parsed);
    const minutes = fixed ? clampMinutes(Math.floor((parsed - anchor) / MINUTE)) : clampMinutes(prefs.minutes);
    const end = fixed ? parsed : anchor + minutes * MINUTE;
    const local = localFields(end);
    const today = localFields(anchor).date;
    const tomorrow = new Date(Date.parse(today + 'T00:00:00Z') + 24 * 60 * MINUTE).toISOString().slice(0, 10);
    const endLabel = local.time + (local.date === today ? '' : local.date === tomorrow ? ' tomorrow' : ' · ' + dateFormatter.format(end));
    return { minutes, deadline: fixed ? new Date(parsed).toISOString() : null, endLabel, expired: fixed && parsed <= anchor };
  }

  function minuteAt(x, y, bounds) {
    const dx = x - (bounds.left + bounds.width / 2);
    const dy = y - (bounds.top + bounds.height / 2);
    return (Math.round(Math.atan2(dx, -dy) * 60 / (2 * Math.PI)) + 60) % 60;
  }

  function withMinute(value, minute) {
    return clampMinutes(Math.floor(value / 60) * 60 + minute);
  }

  function dragMinutes(value, from, to) {
    const change = ((to - from + 90) % 60) - 30;
    return clampMinutes(value + change);
  }

  function durationText(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return remainder + (remainder === 1 ? ' minute' : ' minutes');
    return hours + (hours === 1 ? ' hour' : ' hours')
      + (remainder ? ' ' + remainder + (remainder === 1 ? ' minute' : ' minutes') : '');
  }

  function dialText(minutes) {
    const hours = Math.floor(minutes / 60);
    return hours ? hours + 'h ' + String(minutes % 60).padStart(2, '0') : String(minutes);
  }

  function endText(time) {
    if (time.expired) return 'Your deadline has passed';
    if (!time.minutes && !time.deadline) return 'Browse ideas for later';
    return (time.deadline ? 'Back by ' : 'Until about ') + time.endLabel;
  }

  const ticks = Array.from({ length: 60 }, (_, minute) => {
    const major = minute % 5 === 0;
    return '<line x1="100" y1="12" x2="100" y2="' + (major ? 23 : 17)
      + '" transform="rotate(' + minute * 6 + ' 100 100)" class="' + (major ? 'major' : 'minor') + '"/>';
  }).join('');

  function render(prefs, now) {
    const current = resolve(prefs, now);
    const { minutes, deadline } = current;
    return '<section class="guide-clock" aria-labelledby="guide-clock-label" data-minutes="' + minutes
      + '" data-deadline="' + (deadline || '') + '">' +
      '<header class="guide-clock__header"><h2 id="guide-clock-label">How much time?</h2>' +
      '<div class="guide-clock__mode" aria-label="Time mode">' +
      '<button type="button" data-clock-action="duration-mode" aria-pressed="' + !deadline + '">Duration</button>' +
      '<button type="button" data-clock-action="deadline-mode" aria-pressed="' + !!deadline + '" aria-expanded="false" aria-controls="guide-deadline-form">Back by</button></div></header>' +
      '<div class="guide-clock__instrument">' +
      '<div class="guide-clock__dial" data-clock-dial role="slider" tabindex="' + (deadline ? -1 : 0) +
      '" aria-label="Time available" aria-describedby="guide-clock-help" aria-valuemin="0" aria-valuemax="720" aria-valuenow="' + minutes +
      '" aria-valuetext="' + durationText(minutes) + '" aria-disabled="' + !!deadline + '">' +
      '<svg class="guide-clock__face" viewBox="0 0 200 200" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="clock-bezel" x1="0" x2="1" y1="0" y2="1" gradientUnits="objectBoundingBox">' +
      '<stop offset="0" stop-color="#7b8d98"/><stop offset=".18" stop-color="#eef5f9"/><stop offset=".33" stop-color="#fff"/>' +
      '<stop offset=".62" stop-color="#9aaab5"/><stop offset=".78" stop-color="#eff5f8"/><stop offset="1" stop-color="#657985"/></linearGradient>' +
      '<linearGradient id="clock-face" x1=".15" x2=".85" y1="0" y2="1" gradientUnits="objectBoundingBox">' +
      '<stop offset="0" stop-color="#f8fcff"/><stop offset=".45" stop-color="#e4edf2"/><stop offset=".68" stop-color="#f8fbfd"/><stop offset="1" stop-color="#c7d5de"/></linearGradient>' +
      '<linearGradient id="clock-reflection" x2=".3" y2="1" gradientUnits="objectBoundingBox">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".92"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="clock-hub" x2=".2" y2="1" gradientUnits="objectBoundingBox">' +
      '<stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dce7ed"/></linearGradient></defs>' +
      '<circle cx="100" cy="100" r="98" class="guide-clock__rim"/>' +
      '<circle cx="100" cy="100" r="92.5" class="guide-clock__glass"/>' +
      '<path class="guide-clock__reflection" d="M16 72a89 89 0 0 1 165-16C132 41 61 51 16 72Z"/>' +
      '<path class="guide-clock__edge-light" d="M36 40a88 88 0 0 1 122-5"/>' + ticks +
      '<text x="100" y="40">00</text><text x="164" y="104">15</text><text x="100" y="166">30</text><text x="36" y="104">45</text>' +
      '<g data-clock-hand transform="rotate(' + (minutes % 60) * 6 + ' 100 100)">' +
      '<path d="M100 56V14" class="guide-clock__hand"/><circle cx="100" cy="13" r="5.5" class="guide-clock__tip"/></g>' +
      '<circle cx="100" cy="100" r="45" class="guide-clock__hub"/>' +
      '<circle cx="100" cy="100" r="79" class="guide-clock__hit" data-clock-hit/>' +
      '</svg><div class="guide-clock__readout" aria-hidden="true"><span data-clock-value data-hours="' + (minutes >= 60) + '">' + dialText(minutes) +
      '</span><span data-clock-unit>' + (minutes < 60 ? 'MINUTES' : 'HRS / MIN') + '</span></div></div>' +
      '<div class="guide-clock__hours" role="group" aria-label="Adjust hours">' +
      '<button type="button" data-clock-action="add-hour" aria-label="Add one hour">+</button>' +
      '<span aria-hidden="true">Hour</span><button type="button" data-clock-action="remove-hour" aria-label="Subtract one hour">−</button></div>' +
      '</div><p class="sr-only" id="guide-clock-help">Use arrow keys for minutes, Page Up or Page Down for hours, or enter an exact time below.</p>' +
      '<div class="guide-clock__status"><button type="button" data-clock-action="subtract" aria-label="Subtract five minutes">−5</button>' +
      '<span data-clock-end>' + endText(current) + '</span><button type="button" data-clock-action="add" aria-label="Add five minutes">+5</button></div>' +
      '<details class="guide-clock__exact"><summary data-clock-action="exact">Presets and exact time</summary>' +
      '<div class="guide-clock__presets" role="group" aria-label="Time presets">' +
      presets.map(([value, label]) => '<button type="button" data-clock-action="preset" data-clock-preset="' + value +
        '" aria-pressed="' + (!deadline && minutes === value) + '">' + label + '</button>').join('') + '</div>' +
      '<form data-clock-exact><div class="guide-clock__fields"><label>Hours<input name="hours" type="number" min="0" max="12" inputmode="numeric" required value="' +
      Math.floor(minutes / 60) + '"></label><label>Minutes<input name="minutes" type="number" min="0" max="59" inputmode="numeric" required value="' +
      minutes % 60 + '"></label></div><p class="guide-clock__error" data-clock-exact-error role="alert" hidden></p>' +
      '<button class="guide-clock__apply" type="submit">Apply duration</button></form></details>' +
      '<form id="guide-deadline-form" class="guide-clock__deadline" data-clock-deadline hidden>' +
      '<div class="guide-clock__fields"><label>Amsterdam date<input name="date" type="date" required></label>' +
      '<label>Local time<input name="time" type="time" required></label></div>' +
      '<label data-clock-occurrence hidden>Which time?<select name="occurrence"><option value="0">First occurrence</option><option value="1">Second occurrence</option></select></label>' +
      '<p class="guide-clock__error" data-clock-deadline-error role="alert" hidden></p>' +
      '<button class="guide-clock__apply" type="submit">Save deadline</button></form>' +
      '<p class="sr-only" data-clock-announce role="status"></p></section>';
  }

  function bind(element, { onChange = () => {}, now = () => new Date() } = {}) {
    if (!element) return () => {};
    const $ = selector => element.querySelector(selector);
    const $$ = selector => [...element.querySelectorAll(selector)];
    const dial = $('[data-clock-dial]');
    const hit = $('[data-clock-hit]');
    const exactForm = $('[data-clock-exact]');
    const exactDetails = exactForm.closest('details');
    const deadlineForm = $('[data-clock-deadline]');
    const durationButton = $('[data-clock-action="duration-mode"]');
    const deadlineButton = $('[data-clock-action="deadline-mode"]');
    const occurrence = $('[data-clock-occurrence]');
    const dateInput = deadlineForm.elements.namedItem('date');
    const timeInput = deadlineForm.elements.namedItem('time');
    const occurrenceInput = deadlineForm.elements.namedItem('occurrence');
    const controller = new AbortController();
    const listen = (target, type, handler) => target.addEventListener(type, handler, { signal: controller.signal });
    let prefs = { minutes: Number(element.dataset.minutes), deadline: element.dataset.deadline || null };
    let pointer = null;

    function updateReadout(current) {
      $('[data-clock-hand]').setAttribute('transform', 'rotate(' + (current.minutes % 60) * 6 + ' 100 100)');
      const value = $('[data-clock-value]');
      value.textContent = dialText(current.minutes);
      value.dataset.hours = String(current.minutes >= 60);
      $('[data-clock-unit]').textContent = current.minutes < 60 ? 'MINUTES' : 'HRS / MIN';
      $('[data-clock-end]').textContent = endText(current);
    }

    function update(current) {
      const fixed = !!current.deadline;
      element.dataset.minutes = current.minutes;
      element.dataset.deadline = current.deadline || '';
      updateReadout(current);
      element.classList.toggle('is-fixed', fixed);
      dial.setAttribute('aria-valuenow', current.minutes);
      dial.setAttribute('aria-valuetext', durationText(current.minutes));
      dial.setAttribute('aria-disabled', fixed);
      dial.tabIndex = fixed ? -1 : 0;
      durationButton.setAttribute('aria-pressed', !fixed);
      deadlineButton.setAttribute('aria-pressed', fixed);
      for (const button of $$('[data-clock-preset]')) {
        button.setAttribute('aria-pressed', !fixed && current.minutes === Number(button.dataset.clockPreset));
      }
      for (const action of ['add-hour', 'remove-hour', 'add', 'subtract', 'preset']) {
        for (const button of $$('[data-clock-action="' + action + '"]')) {
          const atLimit = (action === 'add-hour' || action === 'add') && current.minutes === MAX_MINUTES
            || (action === 'remove-hour' || action === 'subtract') && current.minutes === 0;
          button.setAttribute('aria-disabled', fixed || atLimit);
        }
      }
      exactDetails.hidden = fixed;
      if (!exactDetails.open) {
        exactForm.elements.namedItem('hours').value = Math.floor(current.minutes / 60);
        exactForm.elements.namedItem('minutes').value = current.minutes % 60;
      }
    }

    function commit(minutes, deadline = null) {
      const old = prefs;
      prefs = { minutes: clampMinutes(minutes), deadline };
      const current = resolve(prefs, now());
      update(current);
      $('[data-clock-announce]').textContent = durationText(current.minutes) + '. ' + endText(current) + '.';
      if (old.minutes !== prefs.minutes || old.deadline !== prefs.deadline) onChange({ ...prefs });
    }

    function error(selector, message = '') {
      const output = $(selector);
      output.textContent = message;
      output.hidden = !message;
    }

    function deadlinePanel(show) {
      deadlineForm.hidden = !show;
      deadlineButton.setAttribute('aria-expanded', show);
      error('[data-clock-deadline-error]');
      if (!show) return;
      const anchor = +new Date(now());
      const end = prefs.deadline ? Date.parse(prefs.deadline)
        : Math.floor((anchor + Math.max(2, prefs.minutes) * MINUTE) / MINUTE) * MINUTE;
      const local = localFields(end);
      dateInput.value = local.date;
      timeInput.value = local.time;
      refreshOccurrence();
      const choices = deadlineInstants(local.date, local.time);
      occurrenceInput.value = String(Math.max(0, choices.indexOf(end)));
    }

    function refreshOccurrence() {
      const choices = deadlineInstants(dateInput.value, timeInput.value);
      occurrence.hidden = choices.length < 2;
      if (occurrence.hidden) return;
      const nominal = Date.parse(dateInput.value + 'T' + timeInput.value + ':00Z');
      choices.forEach((instant, index) => {
        const offset = (nominal - instant) / (60 * MINUTE);
        occurrenceInput.options[index].textContent = (index === 0 ? 'First occurrence' : 'Second occurrence')
          + ' (UTC+' + offset + ')';
      });
    }

    listen(element, 'click', event => {
      const control = event.target.closest('button[data-clock-action]');
      if (!control || control.getAttribute('aria-disabled') === 'true') return;
      const action = control.dataset.clockAction;
      if (action === 'deadline-mode') {
        deadlinePanel(deadlineForm.hidden);
        if (!deadlineForm.hidden) dateInput.focus();
        return;
      }
      if (action === 'duration-mode') {
        deadlinePanel(false);
        if (prefs.deadline) commit(resolve(prefs, now()).minutes);
        return;
      }
      const delta = { 'add-hour': 60, 'remove-hour': -60, add: 5, subtract: -5 }[action];
      if (action === 'preset') {
        commit(Number(control.dataset.clockPreset));
        exactForm.elements.namedItem('hours').value = Math.floor(prefs.minutes / 60);
        exactForm.elements.namedItem('minutes').value = prefs.minutes % 60;
        error('[data-clock-exact-error]');
      }
      else if (delta) commit(prefs.minutes + delta);
    });

    listen(exactDetails, 'toggle', () => {
      if (exactDetails.open) {
        error('[data-clock-exact-error]');
        return;
      }
      exactForm.elements.namedItem('hours').value = Math.floor(prefs.minutes / 60);
      exactForm.elements.namedItem('minutes').value = prefs.minutes % 60;
    });

    listen(exactForm, 'submit', event => {
      event.preventDefault();
      const hours = exactForm.elements.namedItem('hours').valueAsNumber;
      const minutes = exactForm.elements.namedItem('minutes').valueAsNumber;
      const total = hours * 60 + minutes;
      if (!Number.isInteger(hours) || !Number.isInteger(minutes)
          || hours < 0 || minutes < 0 || minutes > 59 || total > MAX_MINUTES) {
        error('[data-clock-exact-error]', 'Choose a duration from 0 minutes to 12 hours.');
        return;
      }
      exactDetails.open = false;
      exactDetails.querySelector('summary').focus();
      commit(total);
    });

    listen(deadlineForm, 'input', () => {
      refreshOccurrence();
      error('[data-clock-deadline-error]');
    });

    listen(deadlineForm, 'submit', event => {
      event.preventDefault();
      const choices = deadlineInstants(dateInput.value, timeInput.value);
      const chosen = choices[occurrence.hidden ? 0 : Number(occurrenceInput.value)];
      if (!Number.isFinite(chosen)) {
        error('[data-clock-deadline-error]', 'That local time does not occur in Amsterdam. Choose a different time.');
        return;
      }
      const remaining = (chosen - +new Date(now())) / MINUTE;
      if (remaining < 1 || remaining > MAX_MINUTES) {
        error('[data-clock-deadline-error]', 'Choose a deadline from one minute to 12 hours ahead.');
        return;
      }
      deadlinePanel(false);
      deadlineButton.focus();
      commit(Math.floor(remaining), new Date(chosen).toISOString());
    });

    listen(dial, 'keydown', event => {
      if (prefs.deadline || event.altKey || event.ctrlKey || event.metaKey) return;
      const delta = {
        ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 60, PageDown: -60
      }[event.key];
      if (!delta && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      commit(event.key === 'Home' ? 0 : event.key === 'End' ? MAX_MINUTES : prefs.minutes + delta);
    });

    listen(hit, 'pointerdown', event => {
      if (prefs.deadline || pointer || !event.isPrimary || event.button !== 0) return;
      const bounds = dial.getBoundingClientRect();
      const minute = minuteAt(event.clientX, event.clientY, bounds);
      pointer = { id: event.pointerId, bounds, minute, x: event.clientX, y: event.clientY,
        value: withMinute(prefs.minutes, minute), dragging: false };
      hit.setPointerCapture?.(event.pointerId);
    });

    function move(event) {
      if (pointer?.id !== event.pointerId) return;
      if (!pointer.dragging && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 4) return;
      const minute = minuteAt(event.clientX, event.clientY, pointer.bounds);
      pointer.dragging = true;
      element.classList.add('is-dragging');
      pointer.value = dragMinutes(pointer.value, pointer.minute, minute);
      pointer.minute = minute;
      updateReadout(resolve({ minutes: pointer.value }, now()));
    }

    listen(hit, 'pointermove', move);
    listen(hit, 'pointerup', event => {
      if (pointer?.id !== event.pointerId) return;
      move(event);
      const value = pointer.value;
      pointer = null;
      element.classList.remove('is-dragging');
      if (event.pointerType === 'mouse') dial.focus({ preventScroll: true });
      commit(value);
    });

    function cancel(event) {
      if (pointer?.id !== event.pointerId) return;
      pointer = null;
      element.classList.remove('is-dragging');
      updateReadout(resolve(prefs, now()));
    }

    listen(hit, 'pointercancel', cancel);
    listen(hit, 'lostpointercapture', cancel);
    update(resolve(prefs, now()));
    const timer = setInterval(() => {
      if (!pointer && element.isConnected) update(resolve(prefs, now()));
    }, 30_000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }

  window.AmstrollClock = Object.freeze({
    render, bind, resolve, deadlineInstants, localFields, minuteAt, withMinute, dragMinutes
  });
})();
