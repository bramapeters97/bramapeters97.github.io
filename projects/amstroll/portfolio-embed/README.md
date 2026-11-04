# Amstroll portfolio embed

The self-contained `index.html` bundles the interface, fonts, authored Amsterdam catalogue and offline collection photography. It opens directly in the fictional demo account. No backend or API key is required.

## Discovery and sources

Open places is selected by default and requests nearby OpenStreetMap/Wikipedia places plus licensed photographs linked through Wikipedia, Wikidata or an explicit Commons image tag. The pool targets 50 distinct places, each with a different source photograph. Five shuffled results appear at a time; **More of these** replaces them with the next five. After the pool has been browsed, it reshuffles. A smaller pool is reported honestly when the sources cannot supply 50 photographed places. Missing or failed images never become generic venue photographs.

Author, original Commons file and licence remain available from each card's photo credit. Open results remain candidates: routes, prices, access and availability are unverified. No reviews, fares or departure data are invented. Provider errors and partial-source failures stay visible. Requests use bounded batches, session caching and cancellation. No private credentials are included.

Open places needs a network connection. Visitors can explicitly choose **Amsterdam collection** for the bundled offline sample plans, including the progress and journal journey. It is never silently substituted for a failed provider. Weather and the municipal stop inventory also need a connection. GVB/NS links open official planners, not live departure feeds. Google Places/Routes need owner configuration and remain unverified in this prototype.

## Embedding

Use the repository-relative URL and keep a standalone link:

```html
<iframe src="projects/amstroll/portfolio-embed/index.html"
  title="Amstroll — interactive Amsterdam discovery prototype"
  loading="lazy" width="430" height="868"
  style="display:block;width:100%;max-width:430px;height:min(900px,calc(100svh - 110px));border:0;background:transparent">
</iframe>
<a href="projects/amstroll/portfolio-embed/index.html" target="_blank" rel="noopener">Open prototype</a>
```

The phone keeps its 409:868 proportions, fits the available width and height, and never exceeds 409×868px. Content scrolls inside `.screen`; the outer canvas is transparent and clipped. The portfolio adds a mobile-only fullscreen/minimize control without replacing the iframe or losing its current state. Desktop presentation stays inline.

Manual Amsterdam area selection works without location permission. The portfolio does not delegate geolocation. Browser storage policies can partition or deny saved data; the demo reports this and continues in memory. Notes use localStorage and optional journal photos use IndexedDB.

## Maintenance

This copy includes local application, provider and viewport changes beyond the supplied export. Replacing it with a fresh source export would overwrite them. Preserve these changes, font licences and source attributions when rebuilding. The case-study screenshots are frozen captures of the authored collection, so their states differ from current live discovery results.
