# Amstroll web guide

Serve the portfolio checkout with a static server, for example `python3 -m http.server 8765 --bind 127.0.0.1`. Open `http://127.0.0.1:8765/projects/amstroll/portfolio-embed/index.html` for the standalone guide or `http://127.0.0.1:8765/amstroll.html` for the portfolio embed. The embed retains the portfolio’s mobile fullscreen control and the same browsing state when expanded.

## Explore and plan

Explore starts with a full-width Amsterdam photograph. Open Plan a stroll to set a duration or deadline, change the route endpoints or refine your preferences. Changes stay in the draft until you choose Show suggestions. Scroll through the ranked feed to reveal more outings, or use Load more. The list and card position are restored when you go back from detail.

## Planning and coverage

The default guide checks photographed walks using an OpenStreetMap pedestrian network generated with Valhalla. Named Amsterdam starting points with bundled routes work on static hosting. Times include every routed leg, time at stops and a five-minute reserve. A fixed deadline uses Europe/Amsterdam, including daylight-saving transitions. A duration starts counting down when the outing starts. Skip and swap preserve the outing’s original destination and deadline.

Use the Sources button to open the original offline Amsterdam collection. Its authored estimates and journal remain available alongside the guide. Preferences and saved outings use localStorage. Journal photos use IndexedDB. Location is optional. The portfolio iframe does not delegate geolocation.

A configured `window.AMSTROLL_CONFIG.valhallaEndpoint` may extend walking coverage. Set the base URL of a CORS-enabled Valhalla deployment before the app script runs. Use an instance you control or have permission to use. The default guide makes no request to a public routing demo or public Overpass. An unmapped origin, unknown access or cost, or an unsupported travel mode may produce an idea to check. Ferry suggestions without a usable sailing and onward or return connection link to GVB. NS links open the official operator planner.

OpenStreetMap contributors provide the map and routing data under the [ODbL](https://www.openstreetmap.org/copyright). Valhalla provides the graph routing engine. “Show street map” loads MapLibre and the [OpenFreeMap basemap](https://openfreemap.org/). The bundled route drawing and stop order work without the basemap. The service worker caches the guide and local images after a successful visit. Use HTTPS or localhost for offline reload support.

Photos are credited on cards and in the Photo and map credits sheet. The data manifest records subject, original source, author, licence and modifications. The Then & now pair shows the same canal in different years. Existing collection image credits are in `assets/amstroll/photo-credits.md`.

## Checks

Run `npm run check:amstroll` or `node scripts/check-amstroll.mjs` from the checkout root. For a Chromium interaction check, serve the site locally and run `node scripts/check-amstroll-browser.mjs` with Playwright available. The browser script accepts a base URL as its first argument and honours `AMSTROLL_PLAYWRIGHT` and `AMSTROLL_CHROME` for existing local installations.

## Refreshing the bundled guide

The initial pack has 34 directed walking legs for Amsterdam Centraal, Westermarkt, De Pijp metro station, Museumplein and Westerpark. It covers eight photographed places, including an IJ waterfront idea for a schedule check. The catalogue, photo rights manifest and route pairs are in `scripts/amstroll/catalogue.json`. The initial legs were exported in a bounded Valhalla data import on 13 November 2026.

For a refresh, run `node scripts/build-amstroll-guide.mjs http://127.0.0.1:8002` against your own Valhalla instance or an endpoint whose operator permits the import. Build a local Valhalla graph with an Amsterdam [OpenStreetMap extract](https://download.geofabrik.de/europe/netherlands.html). The importer checks for ferry segments, preserves direction-specific routes, and only replaces the dataset after all requests succeed. Run the guide checks after refreshing the data.

OBA Oosterdok uses the library’s published regular hours. Holiday, malformed and expired hours are displayed as needing a check. Step-free results require documented step-free legs and stops. The initial walking pack does not make that claim. Check the route and the venue before heading out.
