# Amstroll portfolio embed

Copy this folder into your GitHub Pages repository. The single index.html contains all essential code, fonts, licensed photography and authored Amsterdam data. No build step or API key is needed for the core demo. It opens directly in the fictional demo account inside a responsive iPhone mockup.

Example, from a portfolio page beside a folder named amstroll-demo:

```html
<iframe src="./amstroll-demo/index.html"
  title="Amstroll — interactive Amsterdam discovery prototype"
  loading="lazy"
  width="512" height="1052"
  style="display:block;width:100%;max-width:512px;height:auto;aspect-ratio:512/1052;border:0;margin:auto;background:transparent">
</iframe>
<a href="./amstroll-demo/index.html" target="_blank" rel="noopener">Open Amstroll prototype</a>
```

Use a repository-relative URL. The iframe's responsive 512:1052 aspect ratio includes the phone and a transparent gutter of 3.125% on each side, capped at 16px. The phone retains its original 409:868 proportions, uses 93.75% of the viewport width and grows naturally to a maximum of 480px; smaller hosts reflow its interface at the available width. No transform, zoom or viewport-height scaling is used. The app scrolls internally. The document canvas and presentation background are transparent; the interface's own gradients remain inside the phone. No parent scripts, resize messaging, account service or bundler is required. Keep a direct-link alternative. Current browser storage policies can partition or deny iframe persistence; the prototype reports this and continues in memory.

Optional municipal stop data, open-place discovery and weather require a network connection. GVB and NS buttons open official operator planners; they are not a live timetable. Google live verification remains pending owner credentials. No private key is included.

Manual Amsterdam area selection works without location permission. If you want optional geolocation inside the iframe, add allow="geolocation 'src'" and host over HTTPS with a compatible parent Permissions Policy. No other permissions are needed.

This file retains font licenses and photo attribution. The app’s photo credits provide original source links. This portfolio copy has a small presentation-only CSS adjustment for the larger proportional frame and transparent outer canvas. Preserve that adjustment when rebuilding from the parent source project with node build.mjs. Application and provider JavaScript are unchanged.


Current portfolio viewport: the host is at most 430px wide and its height is capped by the browser viewport (up to 900px). The phone is bounded to its original 409:868 proportions and never exceeds 409x868px. The internal .screen is the scrolling region; the outer presentation remains clipped and transparent. This replaces the earlier enlarged 512:1052 host sizing.
