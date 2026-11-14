(() => {
  'use strict';

  let interactive;
  let loading;
  let revision = 0;
  let mapId = 0;
  const attribution = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>';

  function geometry(legs) {
    return (legs || []).map(leg => leg.coordinates).filter(line => line?.length > 1);
  }

  function markup(legs, stops) {
    const lines = geometry(legs);
    if (!lines.length) return '';
    const points = lines.flat();
    const longitudes = points.map(p => p[0]);
    const latitudes = points.map(p => p[1]);
    const west = Math.min(...longitudes), east = Math.max(...longitudes);
    const south = Math.min(...latitudes), north = Math.max(...latitudes);
    const scaleX = Math.cos((south + north) / 2 * Math.PI / 180);
    const scale = Math.min(276 / Math.max((east - west) * scaleX, .0001), 112 / Math.max(north - south, .0001));
    const project = ([lng, lat]) => [
      (160 + (lng - (west + east) / 2) * scaleX * scale).toFixed(1),
      (77.5 - (lat - (south + north) / 2) * scale).toFixed(1)
    ];
    const paths = lines.map(line => '<polyline class="guide-map-line" points="' + line.map(p => project(p).join(',')).join(' ') + '"/>');
    const markers = (stops || []).flatMap((stop, index) => {
      if (!Number.isFinite(stop.lng) || !Number.isFinite(stop.lat)) return [];
      const [x, y] = project([stop.lng, stop.lat]);
      return '<circle class="guide-map-number" cx="' + x + '" cy="' + y + '" r="9"/><text class="guide-map-number-text" x="' + x + '" y="' + y + '">' + (index + 1) + '</text>';
    });
    const grid = 'guide-map-grid-' + ++mapId;
    return '<figure class="guide-map"><div class="guide-map-frame"><svg viewBox="0 0 320 155" role="img" aria-label="Route shape and numbered stops"><defs><pattern id="' + grid + '" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0V18" fill="none" stroke="#d6dccb" stroke-width="1"/></pattern></defs><rect width="320" height="155" fill="url(#' + grid + ')"/>' +
      paths.join('') + markers.join('') + '</svg><div class="guide-map-live" hidden aria-label="Interactive street map"></div></div><figcaption><span>Valhalla · ' + attribution +
      '</span><button type="button" class="quiet" data-map-open>Show street map</button><span data-map-status role="status"></span></figcaption></figure>';
  }

  function library() {
    if (window.maplibregl) return Promise.resolve(window.maplibregl);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const base = 'https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl';
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = base + '.css';
      const script = document.createElement('script');
      script.src = base + '.js';
      const fail = message => { css.remove(); script.remove(); reject(Error(message)); };
      const timeout = setTimeout(() => fail('Map library timed out'), 10000);
      script.onload = () => { clearTimeout(timeout); resolve(window.maplibregl); };
      script.onerror = () => { clearTimeout(timeout); fail('Map library unavailable'); };
      document.head.append(css, script);
    }).catch(error => { loading = null; throw error; });
    return loading;
  }

  function clear() {
    revision++;
    interactive?.remove();
    interactive = null;
  }

  function bind(root, legs, stops) {
    const button = root.querySelector('[data-map-open]');
    if (!button) return;
    const frame = root.querySelector('.guide-map-live');
    const notice = root.querySelector('[data-map-status]');
    const lines = geometry(legs);
    button.addEventListener('click', async () => {
      const pending = ++revision;
      button.disabled = true;
      notice.textContent = 'Loading street map…';
      let timer;
      try {
        const maplibre = await library();
        if (pending !== revision || !frame.isConnected) return;
        frame.hidden = false;
        const bounds = new maplibre.LngLatBounds();
        for (const point of lines.flat()) bounds.extend(point);
        interactive = new maplibre.Map({
          container: frame, style: 'https://tiles.openfreemap.org/styles/positron',
          bounds, fitBoundsOptions: { padding: 26, maxZoom: 17, duration: 0 },
          cooperativeGestures: true, dragRotate: false,
        });
        const map = interactive;
        const unavailable = () => {
          if (pending !== revision) return;
          clearTimeout(timer);
          clear();
          frame.hidden = true;
          notice.textContent = 'Street map unavailable. The route shape is still shown.';
          button.disabled = false;
        };
        timer = setTimeout(unavailable, 10000);
        map.once('load', () => {
          clearTimeout(timer);
          if (pending !== revision) return;
          map.addSource('amstroll-route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: lines } } });
          map.addLayer({ id: 'amstroll-route', source: 'amstroll-route', type: 'line', paint: { 'line-color': '#255644', 'line-width': 4 } });
          (stops || []).forEach((stop, index) => {
            if (!Number.isFinite(stop.lng) || !Number.isFinite(stop.lat)) return;
            const marker = document.createElement('span');
            marker.className = 'guide-stop-number';
            marker.style.width = '23px';
            marker.textContent = index + 1;
            new maplibre.Marker({ element: marker }).setLngLat([stop.lng, stop.lat]).addTo(map);
          });
          notice.textContent = '';
          button.hidden = true;
        });
      } catch {
        if (pending !== revision) return;
        clearTimeout(timer);
        clear();
        frame.hidden = true;
        notice.textContent = 'Street map unavailable. The route shape is still shown.';
        button.disabled = false;
      }
    });
  }

  window.AmstrollGuideMap = { markup, bind, clear };
})();
