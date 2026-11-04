# Amstroll font licensing and use

Amstroll bundles **Plus Jakarta Sans** for headings and prominent time values, and **DM Sans** for body copy and controls. Both are supplied under the **SIL Open Font License 1.1**. Their original copyright notices and complete license texts are included alongside the font files. The files are unmodified variable TrueType fonts downloaded from the official Google Fonts repository; they are not fetched from a font service when the app runs.

| Family | Bundled file | CSS family | Available normal weights | Source |
| --- | --- | --- | --- | --- |
| Plus Jakarta Sans | [fonts/PlusJakartaSans-variable.ttf](fonts/PlusJakartaSans-variable.ttf) | `Plus Jakarta Sans` | 200–800 | [Official Google Fonts directory](https://github.com/google/fonts/tree/main/ofl/plusjakartasans) |
| DM Sans | [fonts/DMSans-variable.ttf](fonts/DMSans-variable.ttf) | `DM Sans` | 100–1000 | [Official Google Fonts directory](https://github.com/google/fonts/tree/main/ofl/dmsans) |

Plus Jakarta Sans copyright: **2020 The Plus Jakarta Sans Project Authors**, with the upstream project at [tokotype/PlusJakartaSans](https://github.com/tokotype/PlusJakartaSans). See [the complete bundled OFL](fonts/PlusJakartaSans-OFL.txt).

DM Sans copyright: **2014 The DM Sans Project Authors**, with the upstream project at [googlefonts/dm-fonts](https://github.com/googlefonts/dm-fonts). See [the complete bundled OFL](fonts/DMSans-OFL.txt).

The OFL permits font use, embedding and redistribution with software, subject to its terms. Preserve the copyright notices and licenses when redistributing this prototype. The fonts must not be sold by themselves; derivative fonts must observe any reserved-name and license requirements. Amstroll does not claim ownership of these typefaces.

`fonts.css` contains the same original font bytes as data URIs. The self-contained HTML includes that CSS through `AmstrollAssets.fontsCss`, so the essential interface works offline. `font-display: swap` supplies a readable fallback while the embedded fonts are decoded. Suggested stacks:

```css
--font-heading: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-body: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Headings use 600–700; body text and controls use 400–600. The DM Sans variable font also includes its optical-size axis. These bundled files provide normal style. Use normal interface text rather than relying on an unbundled italic font.

The Amstroll wordmark is original rounded vector lettering, drawn as SVG paths. The mark is an original soft A, shaped like a small bridge, with a gentle detour in its crossbar. It suggests Amsterdam at walking pace without a skyline, stock map symbol or clock. It has no external font dependency. The logo, wordmark, fallback illustration and gradient app-icon artwork were created for this prototype by Bram Peters Studio. The app icon is an opaque square 1024 × 1024 PNG; rounded masking belongs to its presentation.

Official source files downloaded on 3 November 2026:

- [Plus Jakarta Sans variable font](https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf)
- [Plus Jakarta Sans OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/OFL.txt)
- [DM Sans variable font](https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf)
- [DM Sans OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt)

Photographs have their own licenses and attributions in [photo-credits.md](photo-credits.md) and [photo-credits.md](photo-credits.md).
