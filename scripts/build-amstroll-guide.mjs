/* Rebuild the static pedestrian network against an authorised Valhalla instance.
 * node scripts/build-amstroll-guide.mjs http://127.0.0.1:8002
 */
import fs from 'node:fs/promises';

const catalogue = JSON.parse(await fs.readFile(new URL('./amstroll/catalogue.json', import.meta.url)));
const { routePairs, ...data } = catalogue;
const base = process.argv[2];
if (!base) throw Error('Provide a Valhalla base URL for an instance you control or have permission to use.');
const endpoint = new URL(base.replace(/\/?$/, '/'));
if (!['http:', 'https:'].includes(endpoint.protocol)) throw Error('Use an HTTP or HTTPS Valhalla base URL.');
const routeUrl = new URL('route', endpoint);
const locations = new Map([...data.starts, ...data.places].map(({ id, lat, lng }) => [id, { lat, lon: lng }]));

function decode(shape) {
  const coordinates = [];
  let cursor = 0, lat = 0, lon = 0;
  function delta() {
    let value = 0, shift = 0, byte;
    do {
      if (cursor >= shape.length || shift > 30) throw Error('Invalid Valhalla polyline.');
      byte = shape.charCodeAt(cursor++) - 63;
      value |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
    return value & 1 ? ~(value >> 1) : value >> 1;
  }
  while (cursor < shape.length) {
    lat += delta();
    lon += delta();
    coordinates.push([lon / 1e6, lat / 1e6].map(value => Number(value.toFixed(6))));
  }
  return coordinates;
}

const routes = {};
const client = 'bram-peters.com-amstroll-data-import';
for (const [a, b] of routePairs) {
  for (const [from, to] of [[a, b], [b, a]]) {
    if (!locations.has(from) || !locations.has(to)) throw Error('Unknown route endpoint.');
    routeUrl.searchParams.set('json', JSON.stringify({
      locations: [locations.get(from), locations.get(to)],
      costing: 'pedestrian',
      costing_options: { pedestrian: { use_ferry: 0 } },
      units: 'kilometers',
    }));
    const response = await fetch(routeUrl, { headers: { 'X-Client-Id': client }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error(`Valhalla returned ${response.status} for ${from} → ${to}.`);
    const { trip } = await response.json();
    const leg = trip?.legs?.[0], summary = trip?.summary;
    const ferry = summary?.has_ferry || leg?.summary?.has_ferry ||
      leg?.maneuvers?.some(item => item.ferry || [28, 29].includes(item.type));
    if (ferry || !leg?.shape || !Number.isFinite(summary?.time) || !Number.isFinite(summary?.length)) {
      throw Error(`Valhalla did not provide a pedestrian route for ${from} → ${to}.`);
    }
    routes[`${from}>${to}`] = {
      seconds: Number(summary.time.toFixed(2)),
      meters: Math.round(summary.length * 1000),
      geometry: decode(leg.shape),
      ferry: false,
    };
    await new Promise(resolve => setTimeout(resolve, 1250));
  }
}

const target = new URL('../projects/amstroll/portfolio-embed/guide-data.js', import.meta.url);
data.source.retrievedAt = new Date().toISOString().slice(0, 10);
const sorted = Object.fromEntries(Object.entries(routes).sort(([a], [b]) => a.localeCompare(b)));
await fs.writeFile(target, '/* Generated Amstroll guide data. See README.md for sources and rebuild instructions. */\n' +
  'window.AmstrollGuideData = ' + JSON.stringify({ ...data, routes: sorted }) + ';\n');
console.log(`Wrote ${Object.keys(routes).length} directed walking legs.`);
