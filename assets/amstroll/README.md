# Amstroll portfolio assets

The logo, wordmark, source screenshots, photographs and font licences come from the supplied Amstroll project. `assets/img/am1.png` through `am6.png` contain the actual HTML-prototype capture pixels inside their original iPhone frames, with only the surrounding background removed. They cover planning, suggestions, detail, progress, memory creation and the journal. `assets/img/amstroll.png` is the user's supplied 2200×900 montage, copied unchanged for the header and portfolio thumbnail. These are web-prototype views with a fictional demo account and authored sample plans, not native iOS app screenshots or verified transport itineraries.

## Reproduce the transparent media

Run from the repository root on Windows, using native System.Drawing and no installed dependencies:

```powershell
pwsh -NoProfile -File scripts/generate-amstroll-media.ps1
```

The frozen input captures in `assets/amstroll/screenshots/`, in order, are `explore-393.png`, `twenty-idea-collection.png`, `amstroll-detail.png`, `amstroll-in-progress.png`, `memory-completion.png` and `journal-memory.png`. The script clips the existing rounded phone perimeter without redrawing the interface. The 393px capture uses a 378x802 crop at (7,25), uniformly resized to 410px wide; the other five use unscaled 410x870 crops at (345,65). Each output is a true transparent 460x930 PNG, with its visible phone extent at (25,30), measuring 410x870 pixels after rasterization. The five unscaled captures retain their original interface pixels exactly; the planning capture is uniformly resampled.

The generator checks the six cutouts' dimensions, transparent corner alpha, opaque centre alpha, phone bounds and unchanged source pixel samples. It also validates the supplied cover's 2200×900 dimensions and confirms its SHA-256 is unchanged after regenerating the cutouts. It never creates, resizes or overwrites `amstroll.png`.

Image-generation previews were rejected because they changed interface text. None are used in the six cutouts; they retain the genuine captures. The cover is the attachment specifically selected by the user.

The self-contained `projects/amstroll/portfolio-embed/index.html` includes local viewport, application and provider refinements. Open places is the default: up to 50 real places with distinct licensed source photographs, shown in shuffled batches of five. The bundled Amsterdam collection remains explicitly available offline. The phone keeps its 409:868 proportions inside a host capped by the viewport height; content scrolls internally. The mobile-only fullscreen toggle preserves the same iframe and its state. The case-study page does not delegate geolocation.

Photo authors, original sources, licences and derivative details are in `photo-credits.md`. Font notices and complete SIL OFL texts are in `FONT-LICENSES.md` and `fonts/`. The identity uses the original bridge-like A, rather than any earlier project mark.

When updating the demo, preserve the local application, provider and viewport changes documented in `projects/amstroll/portfolio-embed/README.md`. Refresh the screenshots and this page's factual implementation descriptions together. Keep Google verification marked pending until owner configuration is supplied and tested.
