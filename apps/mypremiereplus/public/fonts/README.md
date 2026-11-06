# Bundled font choices

The ten `*-latin.woff2` files are genuine variable Latin font subsets, served locally by MyPremierePlus. Switching an archive's font does not contact a font service from the viewer's browser.

`sources.json` records each original download URL, file size and SHA-256 hash. Each `license-*.txt` preserves both the license accompanying the distributed subset and its upstream Google Fonts OFL license.

The Google Fonts CSS endpoint refused TLS connections in this development environment. The bundled files were therefore downloaded from the Fontsource font-files archive, which distributes these Google Fonts subsets. Their upstream licenses were retrieved from the official `google/fonts` repository. No font conversion or extension renaming was performed.

To retrieve the same families from that reachable archive:

```powershell
node scripts/fetch-fonts.mjs --fontsource
```

Without the flag, the helper uses the official Google Fonts CSS and static-font service. No download command runs as part of normal application startup.
