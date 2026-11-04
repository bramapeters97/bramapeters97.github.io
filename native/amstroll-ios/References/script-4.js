/* AMSTROLL provider adapters. Browser-only, explicit requests, no persistent provider cache.
 * Open data is discovery, not proof of reachability. Google execution needs an owner-supplied key.
 * Official documentation and actual verification evidence: ../API-SETUP.md.
 */
(() => {
  'use strict';
  const config = () => window.AMSTROLL_CONFIG || {};
  const now = () => typeof config().clock === 'function' ? Number(config().clock()) : Date.now();
  const stamp = () => new Date(now()).toISOString();
  const error = (code, message) => Object.assign(new Error(message), {code});
  const abortError = () => new DOMException('The request was cancelled.', 'AbortError');
  const check = signal => { if (signal?.aborted) throw abortError(); };
  const finite = value => value !== null && value !== undefined && Number.isFinite(Number(value));
  const bounded = (value, min, max, fallback) => finite(value) ? Math.min(max, Math.max(min, Number(value))) : fallback;
  const text = value => String(value ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  const safeURL = value => { try { const url = new URL(String(value)); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null; } catch { return null; } };
  const attribution = (name, url, license = '') => ({name, url, license});
  const SOURCE = {
    osm: 'https://www.openstreetmap.org/copyright',
    overpass: 'https://overpass.private.coffee/api/interpreter',
    wiki: 'https://en.wikipedia.org/w/api.php',
    wikidata: 'https://www.wikidata.org/w/api.php',
    commons: 'https://commons.wikimedia.org/w/api.php',
    weather: 'https://api.met.no/weatherapi/locationforecast/2.0/compact',
    google: 'https://developers.google.com/maps/documentation/places/web-service/policies',
    gvb: 'https://www.gvb.nl/reisinformatie',
    ns: 'https://www.ns.nl/en/journeyplanner/',
    amsterdam: 'https://maps.amsterdam.nl/open_geodata/geojson_lnglat.php?KAARTLAAG=TRAMMETRO_PUNTEN_2026&THEMA=trammetro',
    amsterdamCatalogue: 'https://maps.amsterdam.nl/open_geodata/?k=649',
    amsterdamTerms: 'https://maps.amsterdam.nl/open_geodata/terms.php'
  };
  const LIMITS = {overpass: 3, wikipedia: 12, wikidata: 6, commons: 12, weather: 4, google: 40, photos: 20, amsterdam: 3};
  const spent = Object.fromEntries(Object.keys(LIMITS).map(k => [k, 0]));
  const pending = new Map(), cache = new Map(), googlePlaces = new Map();
  let sdkPromise = null, searchSerial = 0;

  function coords(value) {
    if (!value || !finite(value.lat) || !finite(value.lng) || Math.abs(+value.lat) > 90 || Math.abs(+value.lng) > 180) throw error('INPUT', 'Choose a valid starting point.');
    return {lat: +value.lat, lng: +value.lng};
  }
  // A documented product area, not a claim to reproduce the municipal boundary.
  // Optional NS excursions may finish outside this area; discovery starts remain in Amsterdam.
  const inAmsterdam = value => value.lat >= 52.28 && value.lat <= 52.43 && value.lng >= 4.73 && value.lng <= 5.10;
  function amsterdamStart(value) {
    const point = coords(value);
    if (!inAmsterdam(point)) throw error('AMSTERDAM_SCOPE', 'Choose an Amsterdam starting area. Haarlem and Zandvoort are optional excursions from Amsterdam, not other starting cities.');
    return point;
  }
  function distance(a, b) {
    const rad = n => n * Math.PI / 180, dLat = rad(b.lat - a.lat), dLon = rad(b.lng - a.lng);
    const q = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
  }
  function consume(provider) {
    const configuredLimit = config().sessionLimits?.[provider];
    const cap = Math.floor(bounded(configuredLimit, 1, LIMITS[provider], LIMITS[provider]));
    if (spent[provider] >= cap) throw error('SESSION_LIMIT', `The ${provider} request limit for this session has been reached. Explore the curated catalogue instead.`);
    spent[provider]++;
  }
  async function timed(work, signal, milliseconds = 15000) {
    check(signal);
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', onAbort); fn(value); };
      const onAbort = () => finish(reject, abortError());
      const timer = setTimeout(() => finish(reject, error('TIMEOUT', 'The provider took too long. Please retry explicitly or explore the curated catalogue.')), milliseconds);
      signal?.addEventListener('abort', onAbort, {once: true});
      Promise.resolve().then(work).then(value => finish(resolve, value), reason => finish(reject, reason));
    });
  }
  async function fetchJSON(provider, url, options = {}, signal, ttl = 0) {
    check(signal);
    const key = provider + ':' + url + ':' + (options.body || '');
    const old = cache.get(key);
    if (old && old.expires > now()) return old.result;
    if (pending.has(key)) { const existing = pending.get(key); return timed(() => existing, signal); }
    const task = (async () => {
      consume(provider);
      const own = new AbortController(), cancel = () => own.abort();
      signal?.addEventListener('abort', cancel, {once: true});
      const deadline = setTimeout(cancel, provider === 'overpass' ? 12000 : provider === 'amsterdam' ? 30000 : 15000);
      try {
        const response = await fetch(url, {...options, credentials: 'omit', mode: 'cors', signal: own.signal});
        if (!response.ok) throw error(response.status === 429 ? 'QUOTA' : 'HTTP_' + response.status, `${provider} returned HTTP ${response.status}. No sample data has been substituted.`);
        const data = await response.json();
        if (data?.error) throw error('PROVIDER', text(data.error.info || data.error.message || 'The provider rejected the request.'));
        const result = {data, retrievedAt: stamp(), expires: response.headers.get('expires'), lastModified: response.headers.get('last-modified')};
        if (ttl > 0) cache.set(key, {result, expires: now() + ttl});
        return result;
      } catch (e) {
        if (signal?.aborted) throw abortError();
        if (own.signal.aborted) throw error('TIMEOUT', 'The provider took too long. Retry is manual.');
        if (e.code) throw e;
        throw error('NETWORK', `Could not reach ${provider}. Check the connection or browser restrictions. No sample data has been substituted.`);
      } finally { clearTimeout(deadline); signal?.removeEventListener('abort', cancel); }
    })();
    pending.set(key, task);
    try { return await task; } finally { pending.delete(key); }
  }
  function wikiURL(endpoint, parameters) {
    const url = new URL(endpoint);
    Object.entries({format: 'json', formatversion: 2, origin: '*', ...parameters}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    return url.href;
  }
  const wikiHeaders = () => ({'Api-User-Agent': `AmstrollPrototype/1.0 (${location.origin}/)`});
  function provenance(provider, url, retrievedAt, kind = 'provider') { return {provider, sourceUrl: url, retrievedAt, kind}; }
  function dedupe(items) {
    const selected = [], ids = new Set();
    for (const item of items) {
      if (ids.has(item.id)) continue;
      const normalized = item.name.toLocaleLowerCase('en').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
      if (selected.some(old => (old._name === normalized && distance(old, item) < 70) || (item.wikipedia && old.wikipedia === item.wikipedia) || (item.wikidata && old.wikidata === item.wikidata))) continue;
      ids.add(item.id); selected.push({...item, _name: normalized});
    }
    return selected.map(({_name, ...item}) => item);
  }
  const categories = tags => tags.tourism === 'museum' ? 'museum' : tags.tourism === 'gallery' ? 'gallery' : tags.tourism === 'artwork' ? 'public art' : tags.tourism === 'viewpoint' ? 'viewpoint' : tags.leisure === 'park' ? 'park' : tags.leisure === 'garden' ? 'garden' : tags.shop === 'books' ? 'bookshop' : tags.shop === 'bakery' ? 'bakery' : tags.amenity === 'library' ? 'library' : tags.amenity === 'marketplace' ? 'market' : tags.amenity === 'restaurant' ? 'food' : tags.amenity === 'cafe' ? 'coffee' : 'place';
  function overpassQuery(start, radius) {
    const center = `${Math.round(start.lat * 100000) / 100000},${Math.round(start.lng * 100000) / 100000}`;
    return `[out:json][timeout:10][maxsize:2097152];nwr(around:${radius},${center})[name][~"^(tourism|leisure|amenity|shop)$"~"^(museum|gallery|viewpoint|attraction|artwork|park|garden|cafe|restaurant|library|marketplace|books|bakery)$"];out body center 140;`;
  }
  async function overpassDiscovery(prefs, signal) {
    const start = coords(prefs.start), radius = Math.round(bounded(prefs.radius, 250, 6000, 2500));
    const endpoint = safeURL(config().overpassEndpoint || SOURCE.overpass);
    if (!endpoint || new URL(endpoint).protocol !== 'https:') throw error('CONFIG', 'Overpass must use a configured HTTPS interpreter endpoint.');
    const query = overpassQuery(start, radius);
    const get = config().overpassMethod === 'GET', queryURL = new URL(endpoint); if (get) queryURL.searchParams.set('data', query);
    const response = await fetchJSON('overpass', get ? queryURL.href : endpoint, get ? {} : {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: 'data=' + encodeURIComponent(query)}, signal, 10 * 60000);
    if (response.data.remark) throw error('OVERPASS_PARTIAL', 'Overpass could not complete the bounded query. Partial data has not been labelled a complete discovery. Retry explicitly.');
    const candidates = dedupe((response.data.elements || []).slice(0, 140).map(element => {
      const tags = element.tags || {}, center = element.center || element;
      if (!tags.name || !finite(center.lat) || !finite(center.lon) || tags.access === 'private' || tags.access === 'no') return null;
      const position = {lat: +center.lat, lng: +center.lon};
      if (distance(start, position) > radius + 150 || !inAmsterdam(position)) return null;
      const category = categories(tags), freeTag = tags.fee === 'no' && ['park', 'garden', 'public art', 'viewpoint'].includes(category);
      const sourceUrl = `https://www.openstreetmap.org/${element.type}/${element.id}`, field = provenance('OpenStreetMap contributors', sourceUrl, response.retrievedAt, 'tagged');
      return {id: `osm-${element.type}-${element.id}`, title: tags.name, name: tags.name, ...position, description: text(tags['description:en'] || tags.description || `An OpenStreetMap-listed ${category}. Route, price and availability still need checking.`).slice(0, 400), category, photoKey: null, photo: null, rating: null, ratingCount: null, priceLabel: freeTag ? 'Tagged free entry · verify access' : 'Price unknown', cost: freeTag ? 0 : null, provider: 'OpenStreetMap', source: 'OpenStreetMap / Overpass', sourceUrl, updatedAt: response.retrievedAt, fieldSources: {name: field, coordinates: field, category: field, cost: freeTag ? field : provenance('Unavailable', sourceUrl, response.retrievedAt, 'unknown'), opening: field}, openingHours: tags.opening_hours || null, openingStatus: 'unknown', wikipedia: tags.wikipedia || null, commonsImage: /^File:/i.test(tags.wikimedia_commons || tags.image || '') ? (tags.wikimedia_commons || tags.image) : null, wikidata: /^Q\d+$/.test(tags.wikidata || '') ? tags.wikidata : null, status: 'check', feasible: false, isLive: true, routeVerified: false, attributions: [attribution('© OpenStreetMap contributors', SOURCE.osm, 'ODbL 1.0')], note: 'Coordinates and tags are open data, not a live availability or walking-route check.'};
    }).filter(Boolean));
    return {candidates, source: 'OpenStreetMap / Overpass', updatedAt: response.retrievedAt, note: `${candidates.length} distinct open-data places in the selected ${radius} m radius. No routes, prices or opening checks have been implied. ${candidates.length < 20 ? 'Coverage is below 20; supplement explicitly with curated ideas.' : ''}`, attributions: [attribution('© OpenStreetMap contributors', SOURCE.osm, 'ODbL 1.0')], verifiedFeatures: ['POI names', 'coordinates', 'OSM category tags'], radius, rawCount: Math.min(response.data.elements?.length || 0, 140)};
  }

  async function wikipediaDiscovery(prefs, signal) {
    const point=coords(prefs.start),radius=Math.round(bounded(prefs.radius,250,6000,2500));
    const url=wikiURL(SOURCE.wiki,{action:'query',list:'geosearch',gscoord:point.lat+'|'+point.lng,gsradius:radius,gslimit:100,gsnamespace:0,gsprop:'type|dim',gsmaxdim:5000});
    const response=await fetchJSON('wikipedia',url,{headers:wikiHeaders()},signal,10*60000);
    const candidates=dedupe((response.data.query?.geosearch||[]).slice(0,100).filter(p=>p.title&&finite(p.lat)&&finite(p.lon)&&inAmsterdam({lat:+p.lat,lng:+p.lon})&&!['city','country','state','adm1st','adm2nd','event'].includes(p.type)&&!(finite(p.dim)&&+p.dim>5000)&&!/(?:fire|bombing|massacre|disaster|attack|battle|siege|shooting|riot|collapse|earthquake)$/i.test(p.title)).map(p=>{
      const sourceUrl='https://en.wikipedia.org/wiki/'+encodeURIComponent(p.title.replaceAll(' ','_')),field=provenance('Wikipedia contributors',sourceUrl,response.retrievedAt);
      return {id:'wiki-en-'+p.pageid,title:p.title,name:p.title,lat:+p.lat,lng:+p.lon,description:'A geotagged Wikipedia place. Inspect its factual context; access, price and route have not been checked.',category:'cultural place',photoKey:null,photo:null,rating:null,ratingCount:null,priceLabel:'Price unknown',cost:null,provider:'Wikipedia',source:'Wikipedia nearby',sourceUrl,updatedAt:response.retrievedAt,fieldSources:{name:field,coordinates:field,cost:provenance('Unavailable',sourceUrl,response.retrievedAt,'unknown'),opening:provenance('Unavailable',sourceUrl,response.retrievedAt,'unknown')},wikipedia:'en:'+p.title,openingHours:null,openingStatus:'unknown',status:'check',feasible:false,isLive:true,routeVerified:false,attributions:[attribution('Wikipedia contributors',sourceUrl,'CC BY-SA 4.0')],note:'A live article coordinate is not a verified itinerary or venue availability check.'};
    }));
    return {candidates,source:'Wikipedia nearby',updatedAt:response.retrievedAt,rawCount:Math.min(response.data.query?.geosearch?.length||0,100),radius,attributions:[attribution('Wikipedia contributors','https://en.wikipedia.org/','CC BY-SA 4.0')],verifiedFeatures:['geotagged article identities','article coordinates']};
  }
  // Resolve photographs through explicit place/article identifiers only. No nearby
  // article or generic neighbourhood image is asserted to be the suggested venue.
  const openPhotoLimit = 50;
  const chunks = (values, size = 50) => Array.from({length: Math.ceil(values.length / size)}, (_, i) => values.slice(i * size, (i + 1) * size));
  const titleKey = value => String(value || '').replaceAll('_', ' ').trim().normalize('NFC');
  async function openPhotographs(candidates, signal) {
    const files = new Map(), warnings = [], articleGroups = new Map(), itemPlaces = new Map();
    const addFile = (place, filename, identity) => {
      if (typeof filename !== 'string' || !filename.trim() || filename.length > 250 || /\.svg$/i.test(filename)) return;
      const file = 'File:' + filename.replace(/^File:/i, '').trim();
      if (!files.has(place.id)) files.set(place.id, {file, identity});
    };
    for (const place of candidates) {
      if (place.commonsImage) addFile(place, place.commonsImage, 'explicit OpenStreetMap Wikimedia image tag');
      const article = typeof place.wikipedia === 'string' && place.wikipedia.match(/^([a-z]{2,3}):(.{1,180})$/);
      if (article) {
        if (!articleGroups.has(article[1])) articleGroups.set(article[1], new Map());
        const group = articleGroups.get(article[1]), key = titleKey(article[2]);
        if (!group.has(key)) group.set(key, []);
        group.get(key).push(place);
      }
      if (/^Q\d+$/.test(place.wikidata || '')) {
        if (!itemPlaces.has(place.wikidata)) itemPlaces.set(place.wikidata, []);
        itemPlaces.get(place.wikidata).push(place);
      }
    }
    // Each query resolves at most 50 linked pages/entities, with bounded session use.
    const articleTasks = [];
    for (const [language, places] of [...articleGroups].slice(0, 3)) {
      for (const titles of chunks([...places.keys()].slice(0, 150))) articleTasks.push(async () => {
        const endpoint = 'https://' + language + '.wikipedia.org/w/api.php';
        const url = wikiURL(endpoint, {action:'query',prop:'pageimages',piprop:'name',titles:titles.join('|'),redirects:1});
        const response = await fetchJSON('wikipedia', url, {headers:wikiHeaders()}, signal, 60 * 60000);
        const aliases = new Map([...(response.data.query?.normalized || []), ...(response.data.query?.redirects || [])].map(row => [titleKey(row.from), titleKey(row.to)]));
        const canonical = title => { let key = titleKey(title); const seen = new Set(); while (aliases.has(key) && !seen.has(key)) { seen.add(key); key = aliases.get(key); } return key; };
        const pages = new Map((response.data.query?.pages || []).filter(page => !page.missing).map(page => [titleKey(page.title), page]));
        for (const title of titles) {
          const page = pages.get(canonical(title));
          if (page?.pageimage) for (const place of places.get(title)) addFile(place, page.pageimage, 'image of the linked Wikipedia place article');
        }
      });
    }
    const entityTasks = chunks([...itemPlaces.keys()].slice(0, 150)).map(ids => async () => {
      const url = wikiURL(SOURCE.wikidata, {action:'wbgetentities',ids:ids.join('|'),props:'claims'});
      const response = await fetchJSON('wikidata', url, {headers:wikiHeaders()}, signal, 60 * 60000);
      for (const id of ids) {
        const filename = response.data.entities?.[id]?.claims?.P18?.find(claim => claim.rank !== 'deprecated' && typeof claim.mainsnak?.datavalue?.value === 'string')?.mainsnak.datavalue.value;
        if (filename) for (const place of itemPlaces.get(id)) addFile(place, filename, 'P18 image of the linked Wikidata place');
      }
    });
    // Wikipedia first provides a consistent source when a place has both identifiers.
    const resolveTasks = async tasks => {
      for (const pair of chunks(tasks, 2)) {
        const outcomes = await Promise.allSettled(pair.map(task => task())); check(signal);
        for (const result of outcomes) if (result.status === 'rejected') warnings.push(result.reason.message || 'Linked photo information could not load.');
      }
    };
    await resolveTasks(articleTasks);
    await resolveTasks(entityTasks);
    check(signal);
    const byFilename = new Map(), usedImages = new Set(), photographed = [];
    const filenames = [...new Set([...files.values()].map(entry => entry.file))].slice(0, 200);
    for (const batch of chunks(filenames)) {
      const url = wikiURL(SOURCE.commons, {action:'query',prop:'imageinfo',titles:batch.join('|'),iiprop:'url|extmetadata|mediatype',iiurlwidth:900,redirects:1});
      try {
        const response = await fetchJSON('commons', url, {headers:wikiHeaders()}, signal, 60 * 60000);
        const aliases = new Map([...(response.data.query?.normalized || []), ...(response.data.query?.redirects || [])].map(row => [titleKey(row.from),titleKey(row.to)]));
        for (const page of response.data.query?.pages || []) {
          const info = page.imageinfo?.[0], meta = info?.extmetadata, license = text(meta?.LicenseShortName?.value || ''), src = safeURL(info?.thumburl || info?.url);
          if (!src || !meta || (info.mediatype && info.mediatype !== 'BITMAP') || !/^(?:CC BY(?:-SA)? [1-4]\.[0-9]|CC0(?: 1\.0)?|Public domain)$/i.test(license)) continue;
          const canonicalName = titleKey(page.title);
          if (!safeURL(info.descriptionurl)) continue;
          const photo = {src,alt:text(meta.ObjectName?.value || page.title.replace(/^File:/,'')),credit:text(meta.Artist?.value || meta.Credit?.value || 'Wikimedia Commons contributor'),source:safeURL(info.descriptionurl),sourceUrl:safeURL(info.descriptionurl),license,licenseUrl:safeURL(meta.LicenseUrl?.value),provider:'Wikimedia Commons',retrievedAt:response.retrievedAt,fileName:canonicalName,identity:'linked place photograph',ephemeral:true};
          byFilename.set(canonicalName, photo);
          for (const [from] of aliases) { let to = from; const seen = new Set(); while (aliases.has(to) && !seen.has(to)) { seen.add(to); to = aliases.get(to); } if (to === canonicalName) byFilename.set(from, photo); }
        }
      } catch (e) { if (e.name === 'AbortError') throw e; warnings.push(e.message || 'Licensed photo metadata could not load.'); }
      check(signal);
      // Resolve only distinct licensed files; duplicated lead photos never become
      // misleading photographs of separate places in the browsing pool.
      photographed.length = 0; usedImages.clear();
      for (const place of candidates) {
        const link = files.get(place.id), photo = link && byFilename.get(titleKey(link.file));
        if (!photo || usedImages.has(photo.fileName)) continue;
        usedImages.add(photo.fileName);
        photographed.push({...place,photo:{...photo,identity:link.identity},attributions:[...(place.attributions || []),attribution(photo.credit,photo.sourceUrl,photo.license)],fieldSources:{...place.fieldSources,photo:provenance('Wikimedia Commons',photo.sourceUrl,photo.retrievedAt,'linked-place image')}});
        if (photographed.length >= openPhotoLimit) break;
      }
      if (photographed.length >= openPhotoLimit) break;
    }
    return {candidates:photographed,warnings:[...new Set(warnings)],photoCount:photographed.length,unpicturedCount:candidates.length-photographed.length};
  }
  async function openDiscovery(prefs,signal){
    const point=coords(prefs.start); const outcomes=await Promise.allSettled([overpassDiscovery(prefs,signal),wikipediaDiscovery(prefs,signal)]);check(signal);
    const good=outcomes.filter(r=>r.status==='fulfilled').map(r=>r.value),bad=outcomes.map((r,i)=>r.status==='rejected'?((i===0?'Overpass':'Wikipedia nearby')+': '+r.reason.message):null).filter(Boolean);
    if(!good.length)throw error('OPEN_DATA_UNAVAILABLE',bad.join(' '));
    const all=dedupe(good.flatMap(r=>r.candidates)).sort((a,b)=>distance(point,a)-distance(point,b));
    const images=await openPhotographs(all,signal);check(signal);
    if(!images.candidates.length)throw error('OPEN_PHOTOS_UNAVAILABLE','Nearby place data was found, but no distinct, licensed place photographs could be loaded. '+images.warnings.join(' ')+' Retry explicitly or choose the Amsterdam collection; no generic venue photos have been substituted.');
    const candidates=images.candidates,source=good.map(r=>r.source).join(' + '),updatedAt=good.map(r=>r.updatedAt).sort().at(-1),warnings=[...bad,...images.warnings];
    if(candidates.length<openPhotoLimit)warnings.push('Found '+candidates.length+' places with distinct linked photographs; the requested pool is '+openPhotoLimit+'. No invented places or duplicate photos have been added.');
    return {candidates,source,updatedAt,radius:good[0].radius,rawCount:good.reduce((n,r)=>n+r.rawCount,0),requestedCount:openPhotoLimit,photoCount:candidates.length,unpicturedCount:images.unpicturedCount,attributions:good.flatMap(r=>r.attributions),verifiedFeatures:[...good.flatMap(r=>r.verifiedFeatures),'distinct licensed photographs linked to each place'],providerWarnings:warnings,note:candidates.length+' distinct photographed open-data places. Route, access and price checks remain outstanding. '+(warnings.length?warnings.join(' '):'Both open-data sources and licensed place photographs responded.')};
  }

  const googleConfigured = () => typeof config().googleMapsBrowserKey === 'string' && config().googleMapsBrowserKey.length > 20 && !/YOUR_|EXAMPLE|REPLACE/i.test(config().googleMapsBrowserKey);
  async function googleSDK(signal) {
    check(signal);
    if (!googleConfigured()) throw error('GOOGLE_NOT_CONFIGURED', 'Google Places and Routes need the portfolio owner’s restricted browser key. Explore curated or open-data ideas instead.');
    if (window.google?.maps?.importLibrary) return window.google.maps;
    if (!sdkPromise) { consume('google'); sdkPromise = new Promise((resolve, reject) => {
      const callback = '__amstrollGoogleReady', script = document.createElement('script'), previousAuth = window.gm_authFailure;
      const cleanup = () => { delete window[callback]; if (window.gm_authFailure === authFailed) window.gm_authFailure = previousAuth; };
      const fail = reason => { cleanup(); script.remove(); sdkPromise = null; reject(reason); };
      const authFailed = () => { previousAuth?.(); fail(error('GOOGLE_AUTH', 'Google rejected the browser configuration. Check enabled services and referrer restrictions.')); };
      window.gm_authFailure = authFailed;
      window[callback] = () => { cleanup(); resolve(window.google.maps); };
      const url = new URL('https://maps.googleapis.com/maps/api/js');
      Object.entries({key: config().googleMapsBrowserKey, v: 'weekly', loading: 'async', language: 'en', region: 'NL', callback}).forEach(([key, value]) => url.searchParams.set(key, value));
      script.src = url.href; script.async = true;
      script.onerror = () => fail(error('GOOGLE_SDK', 'Google Maps could not load. The sample catalogue remains available.'));
      document.head.append(script);
    }); }
    const loading = sdkPromise; return timed(() => loading, signal, 18000);
  }
  function money(value) {
    if (!value || !finite(value.units)) return null;
    return {value: +value.units + (+value.nanos || 0) / 1e9, currency: value.currencyCode || null};
  }
  function googlePricing(place) {
    const from = money(place.priceRange?.startPrice), to = money(place.priceRange?.endPrice);
    if (from?.currency) {
      const format = value => new Intl.NumberFormat('en-IE', {style: 'currency', currency: from.currency, maximumFractionDigits: 2}).format(value);
      return {cost: null, priceLabel: to?.currency === from.currency ? `${format(from.value)}–${format(to.value)} provider range` : `${format(from.value)}+ provider range`, priceRange: {low: from.value, high: to?.currency === from.currency ? to.value : null, currency: from.currency}};
    }
    const labels = {FREE: 'Free · provider category', INEXPENSIVE: 'Inexpensive · exact cost unknown', MODERATE: 'Moderate · exact cost unknown', EXPENSIVE: 'Expensive · exact cost unknown', VERY_EXPENSIVE: 'Very expensive · exact cost unknown'};
    return {cost: place.priceLevel === 'FREE' ? 0 : null, priceLabel: labels[place.priceLevel] || 'Price unknown', priceRange: null};
  }
  function googlePhoto(place) {
    const photo = place.photos?.[0];
    if (!photo || spent.photos >= LIMITS.photos) return null;
    try {
      const src = safeURL(photo.getURI({maxWidth: 720, maxHeight: 480})); if (!src) return null;
      spent.photos++;
      return {src, alt: 'Provider photograph of ' + place.displayName, credit: (photo.authorAttributions || []).map(a => a.displayName).filter(Boolean).join(', ') || 'Google Maps photo contributor', authorAttributions: (photo.authorAttributions || []).map(a => ({name: a.displayName || '', uri: safeURL(a.uri), photoURI: safeURL(a.photoURI)})), source: safeURL(photo.googleMapsURI || place.googleMapsURI), sourceUrl: safeURL(photo.googleMapsURI || place.googleMapsURI), flagContentURI: safeURL(photo.flagContentURI), provider: 'Google Maps', license: 'Google Maps Platform terms', ephemeral: true};
    } catch { return null; }
  }
  async function googleDiscovery(prefs, signal) {
    const center = coords(prefs.start), maps = await googleSDK(signal), {Place, SearchNearbyRankPreference} = await maps.importLibrary('places');
    const types = {coffee: ['cafe', 'bakery'], culture: ['museum', 'art_gallery', 'book_store'], outdoors: ['park', 'tourist_attraction'], food: ['restaurant', 'bakery'], quiet: ['library', 'book_store', 'park'], unexpected: ['tourist_attraction', 'art_gallery'], any: ['cafe', 'park', 'museum', 'book_store', 'art_gallery', 'bakery', 'tourist_attraction']};
    const radius = Math.round(bounded(prefs.radius, 250, 6000, 2500));
    consume('google');
    const result = await timed(() => Place.searchNearby({fields: ['id', 'displayName', 'location', 'primaryType', 'rating', 'userRatingCount', 'priceLevel', 'priceRange', 'photos', 'currentOpeningHours', 'regularOpeningHours', 'utcOffsetMinutes', 'businessStatus', 'googleMapsURI', 'attributions'], locationRestriction: {center, radius}, includedPrimaryTypes: types[prefs.mood] || types.any, maxResultCount: 20, rankPreference: SearchNearbyRankPreference?.POPULARITY || 'POPULARITY'}), signal);
    const retrievedAt = stamp();
    const candidates = dedupe((result.places || []).slice(0, 20).map(place => {
      if (!place.location || !place.id || !place.displayName) return null;
      const lat = typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat, lng = typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng;
      if (!finite(lat) || !finite(lng) || !inAmsterdam({lat:+lat,lng:+lng})) return null;
      const sourceUrl = safeURL(place.googleMapsURI), field = provenance('Google Maps', sourceUrl, retrievedAt);
      const id = 'google-' + place.id; googlePlaces.set(id, place);
      const pricing = googlePricing(place);
      return {id, placeId: place.id, title: place.displayName, name: place.displayName, lat: +lat, lng: +lng, description: 'A Google Places suggestion. Inspect the walking route, opening schedule and price before starting.', category: (place.primaryType || 'place').replaceAll('_', ' '), photoKey: null, photo: googlePhoto(place), rating: finite(place.rating) ? +place.rating : null, ratingCount: finite(place.userRatingCount) ? +place.userRatingCount : null, ...pricing, provider: 'Google Maps', source: 'Google Maps Places', sourceUrl, updatedAt: retrievedAt, fieldSources: {name: field, coordinates: field, rating: finite(place.rating) ? field : provenance('Unavailable', sourceUrl, retrievedAt, 'unknown'), ratingCount: field, pricing: place.priceLevel || place.priceRange ? field : provenance('Unavailable', sourceUrl, retrievedAt, 'unknown'), opening: place.currentOpeningHours || place.regularOpeningHours ? field : provenance('Unavailable', sourceUrl, retrievedAt, 'unknown'), photo: field}, businessStatus: place.businessStatus || null, openingHours: place.currentOpeningHours?.weekdayDescriptions || place.regularOpeningHours?.weekdayDescriptions || null, openingStatus: 'unknown', status: 'check', feasible: false, isLive: true, routeVerified: false, attributions: [attribution('Google Maps', sourceUrl || SOURCE.google), ...(place.attributions || []).map(a => attribution(a.provider || 'Data provider', safeURL(a.providerURI) || SOURCE.google))], noMapAssociation: true, note: 'Provider content stays in this session. A source link is available; it is not paired with a custom map.'};
    }).filter(Boolean));
    return {candidates, source: 'Google Maps Places', updatedAt: retrievedAt, note: `${candidates.length} provider suggestions. ${candidates.length < 20 ? 'Coverage is below 20; supplement explicitly with curated ideas. ' : ''}Opening, route and total-cost checks remain visible.`, attributions: [attribution('Google Maps', SOURCE.google)], verifiedFeatures: ['Place identity', 'returned ratings and review counts', 'returned price information', 'returned photo metadata'], radius, rawCount: Math.min(result.places?.length || 0, 20)};
  }
  async function discover(prefs, signal) {
    check(signal);
    amsterdamStart(prefs.start);
    const serial = ++searchSerial;
    await timed(() => new Promise(resolve => setTimeout(resolve, 300)), signal);
    if (serial !== searchSerial) throw abortError();
    const result = prefs.mode === 'google' ? await googleDiscovery(prefs, signal) : prefs.mode === 'open' ? await openDiscovery(prefs, signal) : (() => { throw error('MODE', 'Choose Open data or Google. Curated discovery is handled locally.'); })();
    check(signal); if (serial !== searchSerial) throw abortError();
    return result;
  }

  async function commonsPhoto(filename, signal) {
    if (!filename || filename.length > 250) return null;
    const file = filename.startsWith('File:') ? filename : 'File:' + filename;
    const url = wikiURL(SOURCE.commons, {action: 'query', prop: 'imageinfo', titles: file, iiprop: 'url|extmetadata', iiurlwidth: 900});
    const response = await fetchJSON('commons', url, {headers: wikiHeaders()}, signal, 60 * 60000);
    const page = response.data.query?.pages?.[0], info = page?.imageinfo?.[0], meta = info?.extmetadata;
    if (!info || !meta) return null;
    const license = text(meta.LicenseShortName?.value || '');
    if (!/^(?:CC BY(?:-SA)? [1-4]\.[0-9]|CC0(?: 1\.0)?|Public domain)$/i.test(license)) return null;
    return {src: safeURL(info.thumburl || info.url), alt: text(meta.ObjectName?.value || file.replace(/^File:/, '')), credit: text(meta.Artist?.value || meta.Credit?.value || 'Wikimedia Commons contributor'), source: safeURL(info.descriptionurl), sourceUrl: safeURL(info.descriptionurl), license, licenseUrl: safeURL(meta.LicenseUrl?.value), provider: 'Wikimedia Commons', retrievedAt: response.retrievedAt, note: 'Licensed Wikimedia photograph; verify its relationship to the selected place before presenting it as exact-venue imagery.'};
  }
  async function enrich(place, signal) {
    check(signal);
    let title = null, language = 'en', wikidata = /^Q\d+$/.test(place.wikidata || '') ? place.wikidata : null, entity = null;
    if (typeof place.wikipedia === 'string' && /^[a-z]{2,3}:.{1,180}$/.test(place.wikipedia)) [language, ...title] = place.wikipedia.split(':');
    if (Array.isArray(title)) title = title.join(':');
    const attributions = [], context = {text: null, source: null, sourceUrl: null, updatedAt: stamp(), attributions, photo: null, identity: 'not-linked'};
    if (wikidata) {
      const url = wikiURL(SOURCE.wikidata, {action: 'wbgetentities', ids: wikidata, props: 'labels|descriptions|sitelinks|claims', languages: 'en|nl'});
      const response = await fetchJSON('wikidata', url, {headers: wikiHeaders()}, signal, 60 * 60000);
      entity = response.data.entities?.[wikidata];
      if (entity && !entity.missing) {
        const label = entity.labels?.en?.value || entity.labels?.nl?.value;
        context.text = entity.descriptions?.en?.value || entity.descriptions?.nl?.value || null;
        context.title = label || place.name; context.source = 'Wikidata'; context.sourceUrl = 'https://www.wikidata.org/wiki/' + wikidata; context.identity = 'linked Wikidata identifier'; context.updatedAt = response.retrievedAt;
        attributions.push(attribution('Wikidata contributors', context.sourceUrl, 'CC0 1.0'));
        const link = entity.sitelinks?.enwiki || entity.sitelinks?.nlwiki;
        if (!title && link) { title = link.title; language = entity.sitelinks?.enwiki ? 'en' : 'nl'; }
      }
    }
    if (!title && !wikidata) {
      // Nearby facts are intentionally labelled nearby, never asserted to identify a café.
      const position = coords(place), url = wikiURL(SOURCE.wiki, {action: 'query', list: 'geosearch', gscoord: position.lat + '|' + position.lng, gsradius: 150, gslimit: 1, gsnamespace: 0});
      const response = await fetchJSON('wikipedia', url, {headers: wikiHeaders()}, signal, 60 * 60000);
      const nearest = response.data.query?.geosearch?.[0];
      if (nearest) { title = nearest.title; language = 'en'; context.identity = 'nearby cultural context, not verified place identity'; context.distance = nearest.dist; }
    }
    if (title && /^[a-z]{2,3}$/.test(language)) {
      const endpoint = `https://${language}.wikipedia.org/w/api.php`, url = wikiURL(endpoint, {action: 'query', prop: 'extracts|info', exintro: 1, explaintext: 1, exchars: 650, inprop: 'url', titles: title, redirects: 1});
      const response = await fetchJSON('wikipedia', url, {headers: wikiHeaders()}, signal, 60 * 60000);
      const page = response.data.query?.pages?.find(p => !p.missing);
      if (page?.extract) {
        context.title = page.title; context.text = text(page.extract).slice(0, 650); context.source = 'Wikipedia'; context.sourceUrl = safeURL(page.fullurl) || `https://${language}.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`; context.updatedAt = response.retrievedAt;
        if (context.identity === 'not-linked') context.identity = 'linked Wikipedia article';
        attributions.push(attribution('Wikipedia contributors', context.sourceUrl, 'CC BY-SA 4.0'));
      }
    }
    const filename = entity?.claims?.P18?.find(c => c.rank !== 'deprecated' && c.mainsnak?.datavalue?.value)?.mainsnak.datavalue.value;
    if (filename && config().commonsPhotos !== false) {
      try { context.photo = await commonsPhoto(filename, signal); if (context.photo) attributions.push(attribution(context.photo.credit, context.photo.sourceUrl, context.photo.license)); }
      catch (e) { if (e.name === 'AbortError') throw e; context.photoNote = 'Licensed image metadata was unavailable; no substitute venue photo was invented.'; }
    }
    if (!context.text) context.note = 'No linked factual context was available. This is not a failure of the curated description.';
    return context;
  }

  async function weather(lat, lng, signal) {
    const point = coords({lat, lng}), rounded = {lat: Math.round(point.lat * 1000) / 1000, lng: Math.round(point.lng * 1000) / 1000};
    const configured = config().weatherEndpoint, url = new URL(configured ? String(configured) : SOURCE.weather, location.href);
    if (url.protocol !== 'https:' && url.origin !== location.origin) throw error('WEATHER_CONFIG', 'A weather endpoint must use HTTPS or the current development origin.');
    if (url.origin !== new URL(SOURCE.weather).origin && url.origin !== location.origin) throw error('WEATHER_CONFIG', 'Weather endpoints must be MET Norway or an owner-controlled same-origin bounded adapter.');
    url.searchParams.set('lat', rounded.lat); url.searchParams.set('lon', rounded.lng);
    const response = await fetchJSON('weather', url.href, {headers: {'Accept': 'application/json'}}, signal, 20 * 60000);
    const series = response.data.properties?.timeseries || [];
    const next = series.find(t => +new Date(t.time) >= now() - 3600000) || series[0];
    if (!next) throw error('WEATHER_DATA', 'The provider returned no usable forecast.');
    const details = next.data?.instant?.details || {}, period = next.data?.next_1_hours || next.data?.next_6_hours, symbol = period?.summary?.symbol_code || null;
    const amount = next.data?.next_1_hours?.details?.precipitation_amount;
    const updatedAt = response.data.properties?.meta?.updated_at || response.retrievedAt;
    const result = {temperature: finite(details.air_temperature) ? +details.air_temperature : null, precipitation: finite(amount) ? +amount : null, probability: null, summary: symbol ? symbol.replaceAll('_', ' ') : 'Forecast details available', symbol, time: next.time, updatedAt, retrievedAt: response.retrievedAt, source: 'MET Norway', sourceUrl: url.href, attribution: 'Data from MET Norway · CC BY 4.0', attributions: [attribution('MET Norway', 'https://docs.api.met.no/doc/License', 'CC BY 4.0')], forecast: true, location: rounded, note: 'Forecast guidance, not a guarantee. Precipitation is the next-hour amount, not a rain probability.'};
    // Respect a later provider expiry rather than repeatedly requesting an unchanged forecast.
    const expiry = +new Date(response.expires || 0), key = 'weather:' + url.href + ':';
    if (expiry > now() && cache.has(key)) cache.get(key).expires = Math.max(cache.get(key).expires, expiry);
    return result;
  }

  function openingAt(place, arrival, leave, point) {
    if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') return 'closed';
    const offset = place.utcOffsetMinutes, hours = place.currentOpeningHours || place.regularOpeningHours, periods = hours?.periods;
    if (!periods?.length) return 'unknown';
    const zone = point && point.lat >= 50.5 && point.lat <= 53.7 && point.lng >= 3.2 && point.lng <= 7.3 ? 'Europe/Amsterdam' : config().googleTimeZone || null;
    if (!zone && !finite(offset)) return 'unknown';
    const position = t => { if (zone) { const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(t).map(p=>[p.type,p.value]));return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday)*1440+(+parts.hour)*60+(+parts.minute); } const d = new Date(+t + Number(offset) * 60000); return d.getUTCDay() * 1440 + d.getUTCHours() * 60 + d.getUTCMinutes(); };
    const inside = t => periods.some(p => {
      if (!p.open || !finite(p.open.day)) return false;
      const from = p.open.day * 1440 + (p.open.hour || 0) * 60 + (p.open.minute || 0);
      if (!p.close) return from === 0;
      let to = p.close.day * 1440 + (p.close.hour || 0) * 60 + (p.close.minute || 0); if (to <= from) to += 10080;
      let value = position(t); if (value < from) value += 10080;
      return value >= from && value < to;
    });
    return inside(arrival) && inside(new Date(+leave - 1)) ? 'open' : 'closed';
  }
  async function calculateRoute(maps, from, to, mode, departure, signal) {
    const request = {origin: coords(from), destination: coords(to), travelMode: mode, fields: ['durationMillis', 'distanceMeters', 'legs', 'warnings']};
    if (mode === 'TRANSIT') request.departureTime = departure;
    const key = 'route:' + JSON.stringify(request);
    if (pending.has(key)) { const existing = pending.get(key); return timed(() => existing, signal); }
    const promise = (async () => {
      consume('google'); const {Route} = await maps.importLibrary('routes');
      const response = await timed(() => Route.computeRoutes(request), signal), result = response.routes?.[0];
      if (!result || !finite(result.durationMillis)) throw error('NO_ROUTE', 'No supported route was returned for this leg. The candidate is still unverified.');
      const minutes = Math.ceil(+result.durationMillis / 60000);
      if (mode === 'TRANSIT' && !(result.legs || []).some(l => (l.steps || []).some(s => s.transitDetails))) throw error('NO_TRANSIT', 'The provider did not establish a public-transport journey.');
      return {minutes, distance: finite(result.distanceMeters) ? +result.distanceMeters : null, mode, warnings: result.warnings || [], source: 'Google Maps Routes', updatedAt: stamp(), from: coords(from), to: coords(to), steps: (result.legs || []).flatMap(l => l.steps || []).map(step => ({mode: step.travelMode, instruction: text(step.instructions || ''), minutes: finite(step.staticDurationMillis) ? Math.ceil(step.staticDurationMillis / 60000) : null, service: step.transitDetails?.transitLine?.name || null, operator: step.transitDetails?.transitLine?.agencies?.map(a => a.name).join(', ') || null}))};
    })();
    pending.set(key, promise); try { return await promise; } finally { pending.delete(key); }
  }
  async function route(candidate, prefs, signal) {
    check(signal);
    const start = amsterdamStart(prefs.start), maps = await googleSDK(signal), endpoint = prefs.end ? coords(prefs.end) : null;
    const mode = {walk: 'WALKING', cycle: 'BICYCLING', transit: 'TRANSIT'}[prefs.transport] || 'WALKING';
    const inputStops = candidate.stops?.length ? candidate.stops.slice(0, 4) : [candidate];
    if (candidate.stops?.length > 4) throw error('TOO_MANY_STOPS', 'Live route inspection is limited to four stops. Choose a shorter shortlist.');
    const legs = [], stops = [], reasons = [], departure = new Date(now()); let cursor = +departure, previous = start, walking = 0, travel = 0, dwell = 0;
    for (const item of inputStops) {
      const point = coords(item), leg = await calculateRoute(maps, previous, point, mode, new Date(cursor), signal); legs.push(leg); travel += leg.minutes;
      walking += mode === 'WALKING' ? leg.minutes : leg.steps.filter(s => s.mode === 'WALKING').reduce((n, s) => n + (s.minutes || 0), 0);
      cursor += leg.minutes * 60000;
      const time = Math.round(bounded(item.dwell ?? prefs.dwell, 5, 180, /museum|gallery/i.test(item.category || '') ? 45 : /coffee|cafe|bakery|food/i.test(item.category || '') ? 20 : 25));
      const arrival = new Date(cursor), leave = new Date(cursor + time * 60000), google = googlePlaces.get(item.id);
      const opening = google ? openingAt(google, arrival, leave, point) : 'unknown';
      if (opening === 'closed') reasons.push(`${item.name || item.title} is scheduled closed for the planned visit.`);
      if (opening === 'unknown') reasons.push(`${item.name || item.title}: opening or access hours need checking.`);
      stops.push({...item, dwell: time, arriveAt: arrival.toISOString(), leaveAt: leave.toISOString(), openingStatus: opening});
      cursor += time * 60000; dwell += time; previous = point;
    }
    if (endpoint) { const finalLeg = await calculateRoute(maps, previous, endpoint, mode, new Date(cursor), signal); legs.push(finalLeg); travel += finalLeg.minutes;
      walking += mode === 'WALKING' ? finalLeg.minutes : finalLeg.steps.filter(s => s.mode === 'WALKING').reduce((n, s) => n + (s.minutes || 0), 0); cursor += finalLeg.minutes * 60000; }
    const buffer = mode === 'TRANSIT' ? 12 : 5, total = travel + dwell + buffer, available = bounded(prefs.minutes, 0, 720, 47), maxWalk = bounded(prefs.walking, 0, 720, 720), budget = prefs.budget === null || prefs.budget === undefined ? null : bounded(prefs.budget, 0, 5000, 0);
    const costsKnown = stops.every(s => finite(s.cost)), cost = costsKnown ? stops.reduce((n, s) => n + Number(s.cost), 0) : null;
    if (cost === null && (budget !== null || prefs.strictBudget)) reasons.push('A complete price is unavailable; the selected budget cannot be verified.');
    if (cost !== null && budget !== null && cost > budget) reasons.push('The known cost exceeds the selected budget.');
    if (walking > maxWalk) reasons.push('The walking allowance is exceeded.');
    if (mode !== 'WALKING') reasons.push(mode === 'TRANSIT' ? 'Public-transport fares and departure changes still need checking.' : 'Cycle hire or access costs are not supplied.');
    const moreTime = total > available;
    if (moreTime) reasons.unshift(`This plan needs at least ${total} minutes including the endpoint and safety buffer.`);
    const feasible = !moreTime && reasons.length === 0 && available > 0;
    return {candidate, legs, stops, walking, travel, dwell, total, minimumMinutes: total, buffer: available - travel - dwell, safetyBuffer: buffer, cost, priceLabel: cost === null ? 'Complete price unknown' : 'Known cost €' + cost, departure: departure.toISOString(), finish: new Date(cursor).toISOString(), endpoint: {...(endpoint || previous), name: prefs.end?.name || stops.at(-1)?.name || 'Last stop'}, routeVerified: true, openingVerified: stops.every(s => s.openingStatus === 'open'), feasible, status: feasible ? 'fits' : moreTime ? 'more-time' : 'check', reasons, source: 'Google Maps Routes', updatedAt: stamp(), fieldSources: {route: provenance('Google Maps Routes', 'https://developers.google.com/maps/documentation/javascript/routes', stamp()), dwell: provenance('Amstroll planning assumption', null, stamp(), 'estimated'), buffer: provenance('Amstroll safety allowance', null, stamp(), 'estimated')}, warnings: legs.flatMap(l => l.warnings), isLive: true, noMapAssociation: candidate.provider === 'Google Maps', note: 'Provider route duration includes an explicit endpoint when supplied; otherwise the plan finishes at its last stop. Dwell and the safety buffer are explicit planning assumptions.'};
  }
  function stationPlanner(from, to, type = 'vertrek', instant = null) {
    const params = new URLSearchParams({vertrek: from, vertrektype: 'treinstation', aankomst: to, aankomsttype: 'treinstation', type});
    if (instant) {
      const date = instant instanceof Date ? instant : typeof instant === 'number' || /(?:Z|[+-]\d{2}:\d{2})$/i.test(String(instant)) ? new Date(instant) : null;
      if (date && Number.isFinite(+date)) {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
        params.set('tijd', `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`);
      }
    }
    return SOURCE.ns + '#/?' + params.toString().replaceAll('+', '%20');
  }
  function navigationPoint(value) {
    if (value && typeof value === 'object') return finite(value.lat)&&finite(value.lng)?{...coords(value), name:value.name || value.title || 'Chosen place'}:null;
    const known = window.AmstrollCatalog?.starts?.find(s=>s.id===value);
    return known ? {...coords(known), name:known.name} : null;
  }
  function transportNavigation(plan, prefs = {}) {
    const start = navigationPoint(prefs.start || plan?.prefs?.start || plan?.start);
    if (!start) throw error('INPUT', 'Choose an Amsterdam starting point before opening transport navigation.');
    amsterdamStart(start);
    const first = plan.currentStop || plan.stops?.[0] || plan;
    const destination = navigationPoint(first), actions = [];
    const result = {scope:'Amsterdam', source:'Official operator handoffs', actions, verifiedTimetable:false, live:false, requiresCheck:['departure times','fares','disruptions'], note:'Open the operator to check your chosen journey. A navigation link is not a fetched timetable or fare quote.'};
    // EEA Places content links only to its supplied source; no map-associated custom handoff.
    if (plan.noMapAssociation || plan.provider === 'Google Maps') {
      if (safeURL(plan.sourceUrl)) actions.push({id:'google-source',operator:'Google Maps',label:'Open this place in Google Maps',url:safeURL(plan.sourceUrl),from:start.name,to:first.name||first.title,note:'Provider-supplied source link; review transport in the provider.',live:false});
      return result;
    }
    actions.push({id:'gvb-planner',operator:'GVB',label:'Plan with GVB',url:SOURCE.gvb,from:start.name,to:first.name||first.title||'Chosen stop',note:'Official GVB planner: enter your start and destination to check metro, tram, bus and ferry services.',live:false});
    const rail = plan.excursion || plan;
    const railDestination = plan.railDestination || rail.destination || (rail.destinationStation?.name ?? rail.destinationStation);
    const isNS = plan.operator === 'NS' || plan.transportProvider === 'NS' || rail.operator === 'NS';
    if (isNS) {
      const stations = {Haarlem:'Haarlem',Zandvoort:'Zandvoort aan Zee','Zandvoort aan Zee':'Zandvoort aan Zee'};
      const to = stations[railDestination], from = plan.railOrigin || rail.origin || 'Amsterdam Centraal';
      if (!to || !['Amsterdam Centraal','Amsterdam Sloterdijk','Amsterdam Zuid'].includes(from)) throw error('EXCURSION_SCOPE','The supported NS excursions run from Amsterdam to Haarlem or Zandvoort aan Zee.');
      actions.unshift({id:'ns-outbound',operator:'NS',label:`Check NS: ${from} → ${to}`,url:stationPlanner(from,to,'vertrek',prefs.departureAt||plan.departureAt),from,to,note:'Official NS planner with named stations prefilled. Check the chosen date, fare, connections and service changes.',live:false});
      actions.push({id:'ns-return',operator:'NS',label:`Check the return: ${to} → ${from}`,url:stationPlanner(to,from,prefs.returnAt?'aankomst':'vertrek',prefs.returnAt),from:to,to:from,note:'The return is a separate operator check. Allow time for the final walk or GVB connection in Amsterdam.',live:false});
    }
    const lineNames = new Set([...(plan.gvbLines || []),...(plan.legs || []).map(l=>l.service || l.line || '')].flatMap(value=>String(value).match(/(?:F[34]|\b(?:5|26|38|52)\b)/g)||[]));
    const lineIds = {F3:'901',F4:'906','5':'5','26':'26','38':'38','52':'52'};
    for (const line of [...lineNames].slice(0,3)) actions.push({id:'gvb-line-'+line,operator:'GVB',label:'GVB '+line+' route and stop information',url:'https://www.gvb.nl/reisinformatie/lijn/GVB/'+lineIds[line],from:start.name,to:first.name||first.title,note:'Official line reference, not a verified connection for this itinerary.',live:false});
    if (destination) {
      const url = new URL('https://www.google.com/maps/dir/');
      const mode = prefs.transport === 'cycle' ? 'bicycling' : prefs.transport === 'walk' ? 'walking' : 'transit';
      Object.entries({api:'1',origin:start.lat+','+start.lng,destination:destination.lat+','+destination.lng,travelmode:mode}).forEach(([key,value])=>url.searchParams.set(key,value));
      actions.push({id:'directions',operator:'Google Maps',label:mode==='transit'?'Open public-transport directions':mode==='bicycling'?'Open cycling directions':'Open walking directions',url:url.href,from:start.name,to:destination.name,note:'A separate navigation handoff using the selected coordinates; no live route is claimed inside this prototype.',live:false});
    }
    return result;
  }
  async function amsterdamTransit(start, signal) {
    const point = amsterdamStart(start);
    const response = await fetchJSON('amsterdam', SOURCE.amsterdam, {headers:{Accept:'application/json'}}, signal, 60*60000);
    if (response.data.type !== 'FeatureCollection' || !Array.isArray(response.data.features) || response.data.features.length > 500) throw error('AMSTERDAM_DATA','The Amsterdam stop dataset changed or returned an unsupported response. Open the official GVB planner instead.');
    const records = response.data.features.filter(f=>f.geometry?.type==='Point'&&Array.isArray(f.geometry.coordinates)&&finite(f.geometry.coordinates[0])&&finite(f.geometry.coordinates[1])).map((f,index)=>{
      const props=f.properties||{},lat=+f.geometry.coordinates[1],lng=+f.geometry.coordinates[0];
      const name=text(props.Naam||props.naam||props.Label||'Unnamed municipal boarding point');
      const modal=text(props.Modaliteit||props.modaliteit||''),modes=[];
      if(/tram/i.test(modal))modes.push('Tram');if(/metro/i.test(modal))modes.push('Metro');
      const raw=String(props.Lijn||props.Lijn_select||'').replace(/<br\s*\/?\s*>/gi,',').replace(/<\/(?:p|div|li)>/gi,',');
      const lines=[...new Set((text(raw).match(/\b\d{1,3}\b/g)||[]).map(line=>String(Number(line))))];
      return {id:String(f.id||props.Id||'amsterdam-stop-'+index),name,lat,lng,modes,lines,modeLabel:modal||'Not supplied',sourceMode:modal||'Not supplied',lineContext:modes.length>1?'combined-station':'source-row',distanceMeters:Math.round(distance(point,{lat,lng})),distanceKind:'straight-line',source:'Gemeente Amsterdam · Maps Amsterdam',sourceUrl:SOURCE.amsterdamCatalogue,updatedAt:response.retrievedAt,inventoryYear:2026,live:false,timetableVerified:false,fieldSources:{name:provenance('Gemeente Amsterdam',SOURCE.amsterdamCatalogue,response.retrievedAt),coordinates:provenance('Gemeente Amsterdam',SOURCE.amsterdamCatalogue,response.retrievedAt),lines:provenance('Gemeente Amsterdam',SOURCE.amsterdamCatalogue,response.retrievedAt)}};
    });
    // The official Centraal rows repeat the same station-wide lines for both
    // modalities, including in Lijn_select. Do not infer a per-mode split.
    const stationKey=stop=>JSON.stringify([stop.name.toLowerCase(),[...stop.lines].sort((a,b)=>Number(a)-Number(b))]);
    const stationModes=new Map();
    for(const stop of records){const key=stationKey(stop);if(!stationModes.has(key))stationModes.set(key,new Set());for(const mode of stop.modes)stationModes.get(key).add(mode);}
    for(const stop of records){const shared=stationModes.get(stationKey(stop));if(stop.lines.length&&stop.modes.length===1&&shared.size>1){stop.modes=[['Tram','Metro'].filter(mode=>shared.has(mode)).join(' / ')+' (combined station lines)'];stop.modeLabel=stop.modes[0];stop.lineContext='combined-station';}}
    const stops=records.sort((a,b)=>a.distanceMeters-b.distanceMeters).slice(0,12);
    return {stops,source:'Gemeente Amsterdam · Tramhaltes en metrostations 2026',sourceUrl:SOURCE.amsterdamCatalogue,updatedAt:response.retrievedAt,inventoryYear:2026,rawCount:response.data.features.length,attributions:[attribution('Gemeente Amsterdam · original dataset freely available',SOURCE.amsterdamCatalogue,'Maps Data reuse terms'),attribution('Maps Data reuse terms',SOURCE.amsterdamTerms)],note:'Municipal stop locations, not departures, disruptions, platform-accessibility guarantees or current service availability. Nearby platforms are grouped by the source; repeated cross-mode line lists are labelled as combined station lines, not mode-specific service. Distances are straight-line estimates, not walking routes.'};
  }
  function status() {
    return [
      {id: 'curated', name: 'Curated catalogue', configured: true, available: true, state: 'local', note: 'Authored places and estimates. No external request.'},
      {id: 'overpass', name: 'OpenStreetMap / Overpass', configured: true, available: spent.overpass < LIMITS.overpass, state: 'on-demand', note: 'Explicit light-use queries; open tags do not establish route feasibility.', sourceUrl: SOURCE.osm},
      {id: 'wikipedia', name: 'Wikipedia / Wikidata / Commons', configured: true, available: spent.wikipedia < LIMITS.wikipedia, state: 'on-demand', note: 'Linked factual context and distinct licensed place photographs; route and access remain unverified.'},
      {id: 'weather', name: 'MET Norway weather', configured: true, available: spent.weather < LIMITS.weather, state: 'opt-in', note: 'Forecast guidance on explicit action; no invented rain probability.'},
      {id: 'amsterdam', name: 'Amsterdam tram and metro stops', configured:true, available:spent.amsterdam<LIMITS.amsterdam, state:'on-demand',note:'Municipal 2026 stop inventory; no live timetable or GVB departure claim.',sourceUrl:SOURCE.amsterdamCatalogue},
      {id: 'operators', name: 'GVB and NS navigation', configured:true, available:true, state:'handoff',note:'Official journey-planner and route links. NS API access is not configured.'},
      {id: 'google', name: 'Google Places / Routes', configured: googleConfigured(), available: googleConfigured() && spent.google < LIMITS.google, state: googleConfigured() ? 'configured-unverified' : 'key-needed', note: googleConfigured() ? 'Configuration detected; external verification is a separate check.' : 'Owner configuration is missing. Visitors never enter a key.'}
    ];
  }
  window.AmstrollProviders = Object.freeze({status, discover, enrich, weather, route, transportNavigation, amsterdamTransit, usage: () => ({...spent}), cancel: () => {searchSerial++;}, limits: Object.freeze({...LIMITS})});
})();
