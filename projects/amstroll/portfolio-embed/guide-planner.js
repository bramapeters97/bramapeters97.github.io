/* Static-first Amsterdam outing planner. Geography and provider data are supplied separately. */
(() => {
  'use strict';

  const root = typeof window === 'undefined' ? globalThis : window;
  const minute = 60000;
  const defaultBuffer = 5;
  const timezone = 'Europe/Amsterdam';
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const localClock = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hourCycle: 'h23', weekday: 'short', year: 'numeric',
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const timeLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
  });
  const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
  const ferryPlanner = 'https://www.gvb.nl/reisinformatie';
  const source = 'OpenStreetMap · Valhalla pedestrian routes';
  const keyFor = (from, to) => `${from}>${to}`;
  const routeIndex = new WeakMap();
  const numeric = value => Number.isFinite(value) && value >= 0;
  const clampMinutes = (value, fallback) => Number.isFinite(Number(value))
    ? Math.max(0, Math.min(720, Math.floor(Number(value)))) : fallback;
  const absolute = value => value == null || value === '' ? NaN : new Date(value).getTime();
  const iso = time => new Date(time).toISOString();
  const idOf = value => typeof value === 'string' ? value : value?.id;
  const nameOf = point => point.name || point.title || point.id;
  const strictAccess = prefs => ['wheelchair', 'step-free', 'yes', true].includes(prefs.accessibility ?? prefs.access);
  const isPhotograph = photo => Boolean(photo?.src && (photo.sourceUrl || photo.source) && photo.credit && photo.license);
  const photoId = photo => photo.sourceUrl || photo.source || photo.src;
  const allowedPhoto = (photo, excluded) => isPhotograph(photo) && !excluded.has(photoId(photo)) && !excluded.has(photo.src);
  const kindOf = place => place.category || place.kind || 'discovery';
  const gvb = { label: 'Check route with GVB', url: ferryPlanner };

  function dataFor(options) {
    return options?.data || root.AmstrollGuideData || { starts: [], places: [], routes: {} };
  }

  function metres(a, b) {
    const r = Math.PI / 180;
    const y = (a.lat - b.lat) * r;
    const x = (a.lng - b.lng) * r;
    const h = Math.sin(y / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(x / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  }

  function pointFrom(data, point) {
    const id = idOf(point);
    if (!id) return null;
    return data.starts?.find(start => typeof start === 'object' && start.id === id)
      || data.places?.find(place => place.id === id)
      || (typeof point === 'object' && Number.isFinite(point.lat) && Number.isFinite(point.lng) ? point : null)
      || root.AmstrollCatalog?.starts?.find(start => start.id === id)
      || null;
  }

  function daySelection(text) {
    if (!text) return days;
    return text.split(',').flatMap(part => {
      const [first, last] = part.split('-');
      if (!last) return [first];
      const count = (days.indexOf(last) - days.indexOf(first) + 7) % 7 + 1;
      return Array.from({ length: count }, (_, index) => days[(days.indexOf(first) + index) % 7]);
    });
  }

  const hoursCache = new Map();

  // Deliberately accept the weekly OSM subset used by the catalogue. A rule with
  // holidays, an appointment, or any other unsupported syntax remains unknown.
  function parseHours(text) {
    if (text === '24/7') return { allDay: true };
    if (typeof text !== 'string') return null;
    if (hoursCache.has(text)) return hoursCache.get(text);
    const weekday = '(?:Mo|Tu|We|Th|Fr|Sa|Su)';
    const dayList = `${weekday}(?:-${weekday})?(?:,${weekday}(?:-${weekday})?)*`;
    const interval = '(?:[0-2]\\d:[0-5]\\d-[0-2]\\d:[0-5]\\d)';
    const pattern = new RegExp(`^(?:(${dayList})\\s+)?(off|closed|${interval}(?:,${interval})*)$`);
    const table = Object.fromEntries(days.map(day => [day, []]));
    const assigned = new Set();
    const time = str => Number(str.slice(0, 2)) * 60 + Number(str.slice(3));
    for (const rule of text.trim().split(/;\s*/)) {
      const match = pattern.exec(rule.trim());
      if (!match) return null;
      const [, selectedDays, ranges] = match;
      const selected = [...new Set(daySelection(selectedDays))];
      if (selected.some(day => assigned.has(day)) && ranges !== 'off' && ranges !== 'closed') return null;
      for (const day of selected) assigned.add(day);
      if (ranges === 'off' || ranges === 'closed') {
        for (const day of selected) table[day] = [];
        continue;
      }
      for (const range of ranges.split(',')) {
        const [start, end] = range.split('-').map(time);
        if (start >= 1440 || end > 1440 || start === end) return null;
        for (const day of selected) {
          if (end > start) table[day].push([start, end]);
          else {
            table[day].push([start, 1440]);
            table[days[(days.indexOf(day) + 1) % 7]].push([0, end]);
          }
        }
      }
    }
    if (hoursCache.size >= 100) hoursCache.clear();
    hoursCache.set(text, table);
    return table;
  }

  function localParts(timestamp) {
    return Object.fromEntries(localClock.formatToParts(timestamp).map(({ type, value }) => [type, value]));
  }

  function holiday(parts) {
    const year = +parts.year;
    const date = `${parts.month}-${parts.day}`;
    if (['01-01', '04-27', '05-05', '12-25', '12-26'].includes(date) || (parts.weekday === 'Sat' && date === '04-26')) return true;
    // Gregorian Easter Sunday, used only to withhold a regular-hours claim.
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - c % 4) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = h + l - 7 * m + 114;
    const easter = Date.UTC(year, Math.floor(n / 31) - 1, n % 31 + 1);
    const day = Date.UTC(year, +parts.month - 1, +parts.day);
    return [-2, 0, 1, 39, 49, 50].includes((day - easter) / 86400000);
  }

  function openingState(place, arrival, departure) {
    if (place.access === 'no' || place.access === 'private') return 'closed';
    if (place.appointmentRequired || place.lastEntryUnknown) return 'unknown';
    const hours = place.openingHours || place.opening_hours;
    if (!hours && place.access === 'public') return 'public';
    const rules = parseHours(hours);
    const expiry = absolute(place.hoursValidUntil);
    if (!rules || (place.hoursValidUntil && (!Number.isFinite(expiry) || departure > expiry))) return 'unknown';
    if (rules.allDay) return 'open';
    const moments = [arrival];
    for (let value = Math.ceil((arrival + 1) / minute) * minute; value < departure; value += minute) moments.push(value);
    let unknown = false;
    for (const moment of moments) {
      const local = localParts(moment);
      if (holiday(local) && !place.hoursIncludeHolidays) { unknown = true; continue; }
      const wallMinute = +local.hour * 60 + +local.minute;
      if (!rules[local.weekday.slice(0, 2)]?.some(([start, end]) => start <= wallMinute && wallMinute < end)) return 'closed';
    }
    return unknown ? 'unknown' : 'open';
  }

  function walkingLeg(value, prefs, departure) {
    if (!value || !numeric(value.seconds) || !numeric(value.meters)) return null;
    const coordinates = value.coordinates || value.geometry;
    if (value.seconds > 0 && (!Array.isArray(coordinates) || coordinates.length < 2)) return null;
    if (strictAccess(prefs) && value.accessibility !== 'yes') return null;
    if (value.ferry) {
      if (!['ferry', 'walk-ferry', 'transit'].includes(prefs.transport)) return null;
      const schedule = value.schedule;
      if (!schedule?.sourceUrl || !Number.isFinite(absolute(schedule.validUntil))) return null;
      const walkBefore = numeric(value.walkBeforeSeconds) ? value.walkBeforeSeconds : null;
      const walkAfter = numeric(value.walkAfterSeconds) ? value.walkAfterSeconds : null;
      if (walkBefore === null || walkAfter === null) return null;
      const ready = departure + walkBefore * 1000;
      const options = (schedule.departures || []).map(trip => ({
        departure: absolute(trip.departure), arrival: absolute(trip.arrival),
      })).filter(trip => trip.departure >= ready && trip.arrival > trip.departure && trip.arrival <= absolute(schedule.validUntil));
      options.sort((a, b) => a.arrival - b.arrival);
      const sailing = options[0];
      if (!sailing) return null;
      const waitingSeconds = (sailing.departure - ready) / 1000;
      const totalSeconds = (sailing.arrival - departure) / 1000 + walkAfter;
      return {
        minutes: Math.ceil(totalSeconds / 60), waiting: Math.ceil(waitingSeconds / 60),
        walking: Math.ceil((walkBefore + walkAfter) / 60), cost: numeric(value.cost) ? value.cost : null,
        meters: value.meters, coordinates, ferry: true, source: schedule.sourceUrl,
      };
    }
    const minutes = Math.ceil(value.seconds / 60);
    return { minutes, waiting: 0, walking: minutes, cost: 0, meters: value.meters, coordinates, ferry: false, source: value.source || source };
  }

  function indexedRoutes(routes) {
    const cached = routeIndex.get(routes);
    if (cached) return cached;
    const outgoing = new Map();
    for (const [key, value] of Object.entries(routes)) {
      const [from, to] = key.split('>');
      if (!from || !to || from === to) continue;
      if (!outgoing.has(from)) outgoing.set(from, []);
      outgoing.get(from).push({ id: to, value });
    }
    routeIndex.set(routes, outgoing);
    return outgoing;
  }

  function routeBetween(data, from, to, prefs, now) {
    if (!from || !to) return null;
    if (from.id === to.id) return { minutes: 0, walking: 0, waiting: 0, cost: 0, meters: 0, coordinates: [], ferry: false, source };
    if (!['walk', 'ferry', 'walk-ferry', 'transit'].includes(prefs.transport)) return null;
    // Verified routes on the same network can be joined at their known anchors.
    // This fills sparse matrix coverage and also lets return find the shortest cached option.
    const outgoing = indexedRoutes(data.routes || {});
    const first = { id: from.id, minutes: 0, walking: 0, waiting: 0, cost: 0, meters: 0, coordinates: [], ferry: false, sources: [], keys: [] };
    const best = new Map([[from.id, first]]);
    const pending = new Set([from.id]);
    while (pending.size) {
      const current = [...pending].map(id => best.get(id)).sort((a, b) => a.minutes - b.minutes || a.id.localeCompare(b.id))[0];
      pending.delete(current.id);
      if (current.id === to.id) return { ...current, source: current.sources.join(' + ') || source };
      for (const edge of outgoing.get(current.id) || []) {
        if (edge.value.ferry && prefs.transport === 'walk') continue;
        const leg = walkingLeg(edge.value, prefs, now + current.minutes * minute);
        if (!leg) continue;
        const nextMinutes = current.minutes + leg.minutes;
        if (nextMinutes >= (best.get(edge.id)?.minutes ?? Infinity)) continue;
        best.set(edge.id, {
          id: edge.id, minutes: nextMinutes, walking: current.walking + leg.walking,
          waiting: current.waiting + leg.waiting, cost: current.cost === null || leg.cost === null ? null : current.cost + leg.cost,
          meters: current.meters + leg.meters, coordinates: [...current.coordinates, ...leg.coordinates],
          ferry: current.ferry || leg.ferry, sources: [...new Set([...current.sources, leg.source])],
          keys: [...current.keys, keyFor(current.id, edge.id)],
        });
        pending.add(edge.id);
      }
    }
    return null;
  }

  function settings(prefs, time) {
    const suppliedDeadline = absolute(prefs.deadlineAt ?? prefs.deadline);
    const minutes = Number.isFinite(suppliedDeadline)
      ? clampMinutes((suppliedDeadline - time) / minute, 0) : clampMinutes(prefs.minutes, 47);
    const rawBudget = prefs.budget;
    return {
      ...prefs, minutes, deadlineAt: Number.isFinite(suppliedDeadline) ? iso(suppliedDeadline) : null,
      start: prefs.start || 'central', endpoint: prefs.endpoint || 'none', mood: prefs.mood || 'any',
      transport: prefs.transport || 'walk', walking: clampMinutes(prefs.walking, 45),
      budget: rawBudget == null || rawBudget === 'any' || rawBudget === '' || !numeric(Number(rawBudget)) ? null : Number(rawBudget),
    };
  }

  function uniquePlaces(places, excluded) {
    const ids = new Set();
    const names = new Map();
    const result = [];
    for (const place of places || []) {
      if (!place.id || !Number.isFinite(place.lat) || !Number.isFinite(place.lng) || !allowedPhoto(place.photo, excluded)) continue;
      const identity = [place.id, place.osmId, place.wikidata, place.sourceId].filter(Boolean);
      if (identity.some(id => ids.has(id))) continue;
      const name = nameOf(place).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const matches = names.get(name) || [];
      if (matches.some(match => metres(match, place) < 75)) continue;
      for (const id of identity) ids.add(id);
      names.set(name, [...matches, place]);
      result.push(place);
    }
    return result;
  }

  function moodMatch(place, mood) {
    return (place.moods || []).includes(mood) || (mood === 'rain' && place.indoor);
  }

  function candidates(data, prefs, excluded, origin) {
    const places = uniquePlaces(data.places, excluded);
    const shortlist = places.map(place => ({ place, distance: origin ? metres(origin, place) : Infinity }));
    shortlist.sort((a, b) => Number(moodMatch(b.place, prefs.mood)) - Number(moodMatch(a.place, prefs.mood))
      || a.distance - b.distance || a.place.id.localeCompare(b.place.id));
    const near = shortlist.slice(0, 16).map(entry => entry.place);
    const known = new Map(places.map(place => [place.id, place]));
    const authored = (data.outings || []).filter(outing => outing.placeIds?.length > 0 && outing.placeIds.length <= 3
      && new Set(outing.placeIds).size === outing.placeIds.length && outing.placeIds.every(id => known.has(id)));
    const sequences = new Set(authored.map(outing => outing.placeIds.join('>')));
    const single = place => ({
      id: `guide-${place.id}`, title: place.outingTitle || nameOf(place), description: place.description,
      placeIds: [place.id], moods: place.moods || [], theme: kindOf(place),
    });
    const generated = near.filter(place => !sequences.has(place.id)).map(single);
    function addCluster(stops) {
      const ids = stops.map(stop => stop.id);
      const key = ids.join('>');
      if (sequences.has(key)) return;
      sequences.add(key);
      const [anchor] = stops;
      generated.push({
        id: `guide-${ids.join('-')}`, title: new Intl.ListFormat('en-GB').format(stops.map(nameOf)),
        description: anchor.description, placeIds: ids, theme: kindOf(anchor),
        moods: [...new Set(stops.flatMap(stop => stop.moods || []))],
      });
    }
    for (const place of near.slice(0, 8)) {
      if (prefs.minutes < 35 || place.access !== 'public') continue;
      const others = near.filter(other => other.id !== place.id && other.access === 'public'
        && (other.area === place.area || metres(place, other) < 900) && !sequences.has(`${place.id}>${other.id}`))
        .sort((a, b) => metres(place, a) - metres(place, b));
      if (!others.length) continue;
      const [next] = others;
      addCluster([place, next]);
      if (prefs.minutes >= 75) {
        const third = others.slice(1).filter(other => metres(next, other) < 650)
          .sort((a, b) => metres(next, a) - metres(next, b))[0];
        if (third) addCluster([place, next, third]);
      }
    }
    return [...authored.map(outing => ({ ...outing, editorial: true })), ...generated];
  }

  function buildPlan(outing, prefs, data, time, options = {}) {
    const originalStart = pointFrom(data, options.originalStart || prefs.start);
    const origin = pointFrom(data, options.origin || prefs.start);
    const places = outing.placeIds.map(id => data.places?.find(place => place.id === id));
    if (places.some(place => !place)) return null;
    const finish = pointFrom(data, options.finish || (prefs.endpoint === 'start' ? originalStart : prefs.endpoint === 'none' ? places.at(-1) : prefs.endpoint));
    if (!finish || !origin || !originalStart) return null;
    const buffer = defaultBuffer;
    const visited = options.visited || [];
    const primary = places[0] || data.places?.find(place => place.id === options.originalAnchor);
    if (!primary) return null;
    const deadline = prefs.deadlineAt ? absolute(prefs.deadlineAt) : time + prefs.minutes * minute;
    const spentWalking = options.spentWalking || 0;
    const spentCost = options.spentCost || 0;
    const issues = [];
    const stops = [];
    const legs = [];
    const keys = [];
    let cursor = time;
    let previous = origin;
    let totalCost = spentCost;
    let walking = spentWalking;
    let waiting = 0;
    let dwell = 0;
    let unknownCost = options.unknownCost || false;
    let missing = false;

    function travel(destination, end) {
      const leg = routeBetween(data, previous, destination, prefs, cursor);
      if (!leg) {
        missing = true;
        const crossIJ = previous.bank && destination.bank && [previous.bank, destination.bank].includes('north') && previous.bank !== destination.bank;
        issues.push(crossIJ
          ? { code: 'ferry', message: 'Crossing the IJ needs a checked sailing and enough time on both sides.' }
          : { code: 'route', message: strictAccess(prefs) ? 'A step-free route could not be checked.' : 'This connection has no supported walking route.' });
        return null;
      }
      keys.push(...(leg.keys || []));
      const arrival = cursor + leg.minutes * minute;
      const result = {
        ...leg, from: nameOf(previous), fromId: previous.id, to: nameOf(destination), toId: destination.id,
        endpoint: end, departureAt: iso(cursor), arrivalAt: iso(arrival),
      };
      legs.push(result);
      cursor = arrival;
      waiting += leg.waiting;
      walking += leg.walking;
      unknownCost ||= leg.cost === null;
      totalCost += leg.cost || 0;
      return result;
    }

    for (const place of places) {
      const leg = travel(place, false);
      const visit = clampMinutes(place.dwell ?? place.visitMinutes, 12);
      const arrival = cursor;
      const departure = arrival + visit * minute;
      const availability = missing ? 'unknown' : openingState(place, arrival, departure);
      if (place.access === 'private' || place.access === 'no' || availability === 'closed') {
        issues.push({ code: 'closed', message: `${nameOf(place)} would be closed during the visit.` });
      } else if (availability === 'unknown') {
        issues.push({ code: 'hours', message: `${nameOf(place)}’s access or hours need checking.` });
      }
      if (strictAccess(prefs) && place.accessibility !== 'yes') issues.push({ code: 'access', message: `${nameOf(place)}’s step-free access could not be checked.` });
      if (numeric(place.cost)) totalCost += place.cost;
      else unknownCost = true;
      walking += clampMinutes(place.activityWalkingMinutes, 0);
      dwell += visit;
      stops.push({
        ...place, name: nameOf(place), title: nameOf(place), dwell: visit, category: kindOf(place),
        arrivalAt: missing ? null : iso(arrival), departureAt: missing ? null : iso(departure),
        walk: leg?.walking ?? null, travel: leg, availability,
        observation: place.observation || place.story, thenAndNow: place.thenAndNow || place.thenNow,
      });
      cursor = departure;
      previous = place;
    }

    const lastLeg = finish.id !== previous.id ? travel(finish, true) : null;
    const timeToFinish = Math.ceil((cursor - time) / minute);
    const total = missing ? null : timeToFinish + buffer;
    const spare = total === null ? null : prefs.minutes - total;
    const extraTime = total !== null && (total > prefs.minutes || cursor + buffer * minute > deadline);
    const knownCost = Math.round(totalCost * 100) / 100;
    const cost = unknownCost ? null : knownCost;
    const costBlocked = prefs.budget !== null && (knownCost > prefs.budget || ((prefs.strictBudget || prefs.budget === 0) && unknownCost));
    if (costBlocked) issues.push({ code: 'budget', message: unknownCost ? 'A required cost is unknown.' : 'The required cost exceeds the spending limit.' });
    else if (unknownCost) issues.push({ code: 'cost', message: 'A required cost needs checking.' });
    if (walking > prefs.walking) issues.push({ code: 'walking', message: 'This would exceed the walking allowance.' });
    if (extraTime) issues.push({ code: 'time', message: `Allow ${total} minutes including the finish leg and buffer.` });
    if (prefs.transport === 'transit' && !legs.some(leg => leg.ferry)) issues.push({ code: 'transport', message: 'A public transport route is not available in this guide.' });
    const feasible = prefs.minutes > 0 && issues.length === 0;
    const status = feasible ? 'fits' : extraTime && issues.every(issue => issue.code === 'time') ? 'more-time' : 'check';
    const outMinutes = legs.filter(leg => !leg.endpoint).reduce((sum, leg) => sum + leg.minutes, 0);
    const endpointTravel = lastLeg?.minutes ?? (finish.id === previous.id ? 0 : null);
    const reason = feasible
      ? `${outMinutes} min out and between stops, ${dwell} min at the ${places.length === 1 ? 'stop' : 'stops'}, ${endpointTravel} min to finish, and ${Math.max(0, spare)} min spare after the buffer.`
      : issues[0]?.message || 'Choose an amount of time to plan this outing.';
    const routing = Object.fromEntries([...new Set(keys)].filter(key => data.liveKeys?.has(key)).map(key => [key, data.routes[key]]));
    return {
      ...outing, id: outing.id, description: outing.description || primary.description, guide: true, feasible, status,
      reason, issues, rankReasons: [reason], stops, legs, walking, waiting, dwell, total, spare, buffer,
      outMinutes, travelMinutes: missing ? null : outMinutes + endpointTravel, endpointTravel, cost, knownCost,
      costLabel: cost === null ? 'Required cost needs checking' : cost === 0 ? 'No purchase needed' : `${euro.format(cost)} required`,
      photo: primary.photo, area: primary.area || origin.area || 'Amsterdam', anchorId: primary.id,
      source, sourceUrl: primary.sourceUrl, observation: primary.observation || primary.story,
      thenAndNow: primary.thenAndNow || primary.thenNow, handoff: issues.some(issue => issue.code === 'ferry' || issue.code === 'transport') ? gvb : null,
      finishAt: missing ? null : iso(cursor), finish: missing ? 'Needs checking' : timeLabel.format(cursor),
      startedAt: iso(time), deadlineAt: iso(deadline), timezone, startId: originalStart.id, endId: finish.id,
      startPoint: originalStart, originPoint: origin, finishPoint: finish, endpoint: nameOf(finish), prefs,
      visited, spentWalking, spentCost, priorUnknownCost: options.unknownCost || false,
      routing: { ...(options.routing || {}), ...routing },
    };
  }

  function score(plan, prefs) {
    const matches = plan.moods?.includes(prefs.mood) || plan.stops.some(stop => moodMatch(stop, prefs.mood));
    const spare = plan.spare === null ? 0 : Math.max(0, plan.spare);
    return Number(matches && prefs.mood !== 'any') * 28 + Number(Boolean(plan.editorial)) * 12
      + Number(Boolean(plan.observation)) * 4 + Math.min(30, plan.dwell) * 0.55
      + Math.min(10, spare) * 0.5 - (plan.travelMinutes ?? 50) * 0.24;
  }

  function diversify(plans, prefs) {
    const pool = [...plans];
    const result = [];
    const anchors = new Map();
    const areas = new Map();
    const themes = new Map();
    const photographs = new Set();
    const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);
    while (pool.length) {
      const value = plan => score(plan, prefs) - (anchors.get(plan.anchorId) || 0) * 18
        - (themes.get(plan.theme) || 0) * 6 - (areas.get(plan.area) || 0) * 4;
      pool.sort((a, b) => value(b) - value(a) || a.id.localeCompare(b.id));
      const selected = pool.shift();
      const image = photoId(selected.photo);
      if (photographs.has(image)) continue;
      result.push(selected);
      photographs.add(image);
      increment(anchors, selected.anchorId);
      increment(areas, selected.area);
      increment(themes, selected.theme);
    }
    return result;
  }

  function emptyState(plans, prefs, origin) {
    if (prefs.minutes === 0) return {
      reason: prefs.deadlineAt ? 'This Amsterdam deadline has passed.' : 'You’re browsing ideas for later.',
      action: 'minutes', value: 30, label: 'Give me 30 minutes',
    };
    if (!origin) return { reason: 'Pick a mapped Amsterdam starting point to check a route.', action: null };
    if (prefs.transport !== 'walk' && prefs.transport !== 'walk-ferry' && prefs.transport !== 'ferry') return {
      reason: 'The guide has no checked trip for this travel mode.', action: 'transport', value: 'walk', label: 'Look for walks',
    };
    const limitedBy = code => plans.filter(plan => plan.issues.length && plan.issues.every(issue => issue.code === code));
    const timed = limitedBy('time');
    const minimum = Math.min(...timed.map(plan => plan.total));
    if (minimum <= 720) return { reason: `The shortest checked outing needs ${minimum} minutes.`, action: 'minutes', value: minimum, label: `Allow ${minimum} minutes` };
    const walking = Math.min(...limitedBy('walking').map(plan => plan.walking));
    if (walking <= 720) return { reason: 'The available walks exceed your walking allowance.', action: 'walking', value: walking, label: `Allow ${walking} minutes walking` };
    const cost = Math.min(...limitedBy('budget').filter(plan => plan.cost !== null).map(plan => plan.cost));
    if (Number.isFinite(cost)) return { reason: 'The available outings exceed your spending limit.', action: 'budget', value: cost, label: `Allow ${euro.format(cost)}` };
    if (strictAccess(prefs)) return { reason: 'No route with checked step-free access fits these settings.', action: null };
    if (plans.some(plan => plan.issues.some(issue => issue.code === 'route' || issue.code === 'ferry'))) return {
      reason: 'The guide has limited walking connections from this start to your finish.', action: null,
    };
    return { reason: 'No photographed outing could be confirmed with these settings.', action: null };
  }

  function suggest(input = {}, options = {}) {
    const now = absolute(options.now ?? Date.now());
    const prefs = settings(input, now);
    const data = dataFor(options);
    const excluded = new Set(options.excludedPhotos || []);
    const origin = pointFrom(data, prefs.start);
    const possibilities = candidates(data, prefs, excluded, origin);
    const planned = possibilities.map(outing => buildPlan(outing, prefs, data, now)).filter(Boolean);
    const fits = diversify(planned.filter(plan => plan.feasible), prefs);
    const used = new Set(fits.map(plan => photoId(plan.photo)));
    const noIdeas = new Set(['closed', 'budget', 'walking', 'access']);
    const ideas = diversify(planned.filter(plan => !plan.feasible && !used.has(photoId(plan.photo))
      && !plan.issues.some(issue => noIdeas.has(issue.code))), prefs);
    return { fits, ideas, empty: fits.length ? null : emptyState(planned, prefs, origin), source };
  }

  function decodePolyline(shape) {
    const geometry = [];
    let latitude = 0;
    let longitude = 0;
    let index = 0;
    const read = () => {
      let value = 0;
      let shift = 0;
      while (index < shape.length && shift <= 30) {
        const byte = shape.charCodeAt(index++) - 63;
        if (byte < 0 || byte > 63) throw Error('Invalid route geometry.');
        value |= (byte & 31) << shift;
        if (byte < 32) return value & 1 ? ~(value >> 1) : value >> 1;
        shift += 5;
      }
      throw Error('Incomplete route geometry.');
    };
    while (index < shape.length && geometry.length < 20000) {
      latitude += read();
      longitude += read();
      const point = [longitude / 1e6, latitude / 1e6];
      if (Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) throw Error('Route geometry is outside geographic bounds.');
      geometry.push(point);
    }
    return geometry;
  }

  async function liveLeg(endpoint, from, to, signal, fetcher) {
    const url = new URL(endpoint, root.location?.href);
    if (!['https:', 'http:'].includes(url.protocol)) throw Error('Invalid routing endpoint.');
    if (!url.pathname.endsWith('/route')) url.pathname = `${url.pathname.replace(/\/$/, '')}/route`;
    const payload = {
      locations: [from, to].map(point => ({ lat: point.lat, lon: point.lng, radius: 30 })),
      costing: 'pedestrian', costing_options: { pedestrian: { use_ferry: 0 } },
      units: 'kilometers', shape_format: 'polyline6',
    };
    url.searchParams.set('json', JSON.stringify(payload));
    const response = await fetcher(url.href, { signal, credentials: 'omit' });
    if (!response.ok) throw Error('Walking route unavailable.');
    const trip = (await response.json()).trip;
    const leg = trip?.legs?.[0];
    const seconds = trip?.summary?.time;
    const length = trip?.summary?.length;
    if (!numeric(seconds) || !numeric(length) || typeof leg?.shape !== 'string' || trip.legs.length !== 1) return null;
    if (trip.summary.has_ferry || leg.summary?.has_ferry || leg.maneuvers?.some(item => item.ferry || [28, 29].includes(item.type))) return null;
    const geometry = decodePolyline(leg.shape);
    if (geometry.length < 2) return null;
    const near = (point, coordinate) => metres(point, { lng: coordinate[0], lat: coordinate[1] }) < 65;
    if (!near(from, geometry[0]) || !near(to, geometry.at(-1))) return null;
    return { seconds, meters: Math.round(length * 1000), geometry, ferry: false, source };
  }

  const cachedLive = new Map();

  async function search(input = {}, options = {}) {
    const endpoint = options.endpoint ?? root.AMSTROLL_CONFIG?.valhallaEndpoint;
    const fetcher = options.fetch || root.fetch?.bind(root);
    const signal = options.signal;
    signal?.throwIfAborted();
    const first = suggest(input, options);
    if (!endpoint || !fetcher || input.transport && input.transport !== 'walk') return first;
    const data = dataFor(options);
    const now = absolute(options.now ?? Date.now());
    const prefs = settings(input, now);
    const origin = pointFrom(data, prefs.start);
    if (!origin || !prefs.minutes || strictAccess(prefs)) return first;
    const end = prefs.endpoint === 'start' ? origin : pointFrom(data, prefs.endpoint);
    const routes = { ...(data.routes || {}) };
    const liveKeys = new Set();
    const tasks = new Map();
    for (const outing of candidates(data, prefs, new Set(options.excludedPhotos || []), origin).slice(0, 12)) {
      const stops = outing.placeIds.map(id => pointFrom(data, id));
      const points = [origin, ...stops, ...(end ? [end] : [])];
      if (stops.some(point => metres(origin, point) > 3500)) continue;
      for (let i = 1; i < points.length; i++) {
        const from = points[i - 1];
        const to = points[i];
        if (from.id === to.id || routeBetween(data, from, to, prefs, now)) continue;
        const key = keyFor(from.id, to.id);
        tasks.set(key, { from, to });
      }
    }
    // Keep configured routing latency bounded and avoid overwhelming a shared instance.
    const jobs = [...tasks].slice(0, 12);
    for (let i = 0; i < jobs.length; i += 3) {
      signal?.throwIfAborted();
      await Promise.all(jobs.slice(i, i + 3).map(async ([key, { from, to }]) => {
        const coordinateKey = point => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
        const cacheKey = `${endpoint}:${coordinateKey(from)}>${coordinateKey(to)}`;
        const shareable = ![from.id, to.id].includes('my-location');
        const cached = shareable ? cachedLive.get(cacheKey) : null;
        try {
          let value = cached && now - cached.at <= 3600000 ? cached.value : null;
          if (!value) {
            const timeout = new AbortController();
            const cancel = () => timeout.abort(signal.reason);
            signal?.addEventListener('abort', cancel, { once: true });
            if (signal?.aborted) cancel();
            const timer = setTimeout(() => timeout.abort(), 5000);
            try {
              value = await liveLeg(endpoint, from, to, timeout.signal, fetcher);
            } finally {
              clearTimeout(timer);
              signal?.removeEventListener('abort', cancel);
            }
          }
          signal?.throwIfAborted();
          if (!value) return;
          if (shareable) {
            if (cachedLive.size >= 60) cachedLive.delete(cachedLive.keys().next().value);
            cachedLive.set(cacheKey, { value, at: now });
          }
          routes[key] = value;
          liveKeys.add(key);
        } catch (error) {
          if (signal?.aborted) throw signal.reason || error;
        }
      }));
    }
    signal?.throwIfAborted();
    return suggest(input, { ...options, now, data: { ...data, routes, liveKeys } });
  }

  function activeInputs(plan, options) {
    if (!plan?.guide) return null;
    const data = dataFor(options);
    const now = absolute(options.now ?? Date.now());
    const visited = [...new Set([...(plan.visited || []), ...(options.completed || [])])];
    const newlyVisited = visited.filter(id => !plan.visited?.includes(id));
    const steps = newlyVisited.map(id => plan.stops.find(stop => stop.id === id)).filter(Boolean);
    const skipped = new Set(options.skipped || []);
    const remaining = plan.placeIds.filter(id => !visited.includes(id) && !skipped.has(id));
    const origin = options.origin || visited.at(-1) || plan.originPoint || plan.startPoint || plan.startId;
    return {
      data: { ...data, routes: { ...data.routes, ...plan.routing } }, now, remaining,
      prefs: settings({ ...plan.prefs, deadlineAt: plan.deadlineAt }, now),
      context: {
        visited, origin, originalStart: plan.startPoint || plan.startId, finish: plan.finishPoint || plan.endId,
        originalAnchor: plan.anchorId, routing: plan.routing,
        spentWalking: (plan.spentWalking || 0) + steps.reduce((sum, stop) => sum + (stop.walk || 0) + (stop.activityWalkingMinutes || 0), 0),
        spentCost: (plan.spentCost || 0) + steps.reduce((sum, stop) => sum + (stop.cost || 0) + (stop.travel?.cost || 0), 0),
        unknownCost: plan.priorUnknownCost || steps.some(stop => !numeric(stop.cost) || stop.travel?.cost === null),
      },
    };
  }

  function begin(plan, options = {}) {
    if (!plan?.guide) return null;
    const data = dataFor(options);
    const now = absolute(options.now ?? Date.now());
    const prefs = settings(plan.prefs, now);
    return buildPlan({
      id: plan.id, title: plan.title, description: plan.description, placeIds: plan.placeIds,
      moods: plan.moods, theme: plan.theme, editorial: plan.editorial,
    }, prefs, { ...data, routes: { ...data.routes, ...plan.routing } }, now, {
      origin: plan.startPoint || plan.startId, finish: plan.finishPoint || plan.endId, routing: plan.routing,
    });
  }

  function replan(plan, options = {}) {
    const active = activeInputs(plan, options);
    if (!active) return null;
    return buildPlan({
      id: plan.id, title: plan.title, description: plan.description, placeIds: active.remaining,
      moods: plan.moods, theme: plan.theme, editorial: plan.editorial,
    }, active.prefs, active.data, active.now, active.context);
  }

  function swap(plan, stopId, options = {}) {
    const active = activeInputs(plan, options);
    if (!active?.remaining.includes(stopId)) return null;
    const excluded = new Set(options.excludedPhotos || []);
    const current = pointFrom(active.data, stopId);
    const replacements = uniquePlaces(active.data.places, excluded).filter(place => place.id !== stopId
      && !active.remaining.includes(place.id) && !active.context.visited.includes(place.id));
    const result = [];
    for (const replacement of replacements) {
      const placeIds = active.remaining.map(id => id === stopId ? replacement.id : id);
      const changed = buildPlan({
        id: plan.id, title: plan.title, description: plan.description, placeIds,
        moods: plan.moods, theme: plan.theme, editorial: plan.editorial,
      }, active.prefs, active.data, active.now, active.context);
      if (changed?.feasible) result.push({ plan: changed, from: current, to: replacement });
    }
    result.sort((a, b) => Number(kindOf(b.to) === kindOf(current)) - Number(kindOf(a.to) === kindOf(current))
      || score(b.plan, active.prefs) - score(a.plan, active.prefs) || a.to.id.localeCompare(b.to.id));
    return result[0] || null;
  }

  function returnRoute(plan, origin, options = {}) {
    const active = activeInputs(plan, { ...options, origin });
    if (!active) return null;
    const from = pointFrom(active.data, active.context.origin);
    const finish = pointFrom(active.data, active.context.finish);
    const leg = routeBetween(active.data, from, finish, active.prefs, active.now);
    if (!leg) {
      const crossesIJ = from?.bank && finish?.bank && from.bank !== finish.bank && [from.bank, finish.bank].includes('north');
      let handoff = gvb;
      if (from && finish && !crossesIJ && active.prefs.transport !== 'transit') {
        const url = new URL('https://www.openstreetmap.org/directions');
        url.searchParams.set('engine', active.prefs.transport === 'cycle' ? 'fossgis_valhalla_bicycle' : 'fossgis_valhalla_foot');
        url.searchParams.set('route', `${from.lat},${from.lng};${finish.lat},${finish.lng}`);
        handoff = { label: 'Open OpenStreetMap directions', url: url.href };
      }
      return {
        leg: null, minutes: null, arrivalAt: null, late: null, handoff,
        reason: 'No checked route is available from this point to your finish.',
      };
    }
    const arrival = active.now + leg.minutes * minute;
    return {
      leg: { ...leg, from: nameOf(from), fromId: from.id, to: nameOf(finish), toId: finish.id, endpoint: true },
      minutes: leg.minutes, arrivalAt: iso(arrival), finish: timeLabel.format(arrival), late: arrival > absolute(plan.deadlineAt),
    };
  }

  root.AmstrollGuide = { suggest, search, begin, replan, swap, returnRoute, openingState };
})();
