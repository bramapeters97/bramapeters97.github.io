# LinkedIn showcase

Added directly after the complete `.experience-layout` and before `.portfolio-layout`, as a sibling in the existing `.container`. Styles are scoped to `.linkedin-showcase`. The existing page is unchanged outside this section and its stylesheet link.

## Files and updates

- `index.html`: generated semantic section, available without JavaScript.
- `assets/css/linkedin-showcase.css`: responsive layout and focus/hover styling.
- `assets/linkedin-showcase.json`: editable company and post data.
- `scripts/render-linkedin-showcase.py`: run `python3 scripts/render-linkedin-showcase.py` from the checkout to regenerate after updating data. No packages required.
- `assets/img/linkedin/`: optimized authentic cover, logo, introduction image and film poster; `sources.json` records original media URLs.
- `docs/screenshots/`: desktop/mobile visual checks and viewport measurements.

Optional attribution, collaborators and reactions only render when supplied. Reactions also require a verification date. Clear reactionCount or reactionCountVerifiedAt to omit the metric. Counts are dated static snapshots, not live statistics. The full stored excerpt remains in semantic HTML even when visually clamped.

## Sources verified on 15 November 2026

Company: https://www.linkedin.com/company/bram-peters-studio/

Verified Amsterdam, founding year 2026, services, tagline, logo and cover. The actual current cover/logo differ from the supplied mockup, so authentic current artwork takes precedence. All images are downloaded and optimized locally; no stock/generated substitutes, LinkedIn embeds, or runtime requests to LinkedIn.

Introduction: https://lnkd.in/p/erHYYsdx
Resolved to https://www.linkedin.com/posts/bram-peters-studio_digitalproductdesign-uxui-softwaredevelopment-activity-7521999222234157057-2EI-
Verified original opening text, company author, attached project collage and 26 reactions. No specific collaborators are credited in the selected excerpt.

Anniversary film: https://lnkd.in/p/eMcCdXwr
Resolved to https://www.linkedin.com/posts/bram-peters-studio_activity-7522349734121033729-833K
Verified original author Luca Orvini, featured through the Studio, Dutch opening text, J. Meijer B.V. and Orvini Investments B.V., script/filming/editing credit to Bram Peters, original video poster and 60 reactions. No publication dates inferred from relative timestamps.

## Validation

- Browser checks at 1440, 1024, 768, 390 and 320 CSS pixels: zero horizontal overflow, no descendants escaping the showcase, all four images loaded, exact left/right alignment with Portfolio, correct sibling placement.
- Two columns on desktop; one column at the site's existing 768px breakpoint.
- Desktop and mobile visually reviewed; screenshots saved.
- Existing Videography filter works, and All restores cards; showcase stays visible.
- All three LinkedIn destinations opened and verified in the public browser without signing in.
- Generator rerun produces identical HTML. Removing only the generated section and new stylesheet link reproduces the original index.html byte for byte.
- No package manifest, build command or existing automated tests are present; this is buildless HTML/CSS with a standard-library Python generator.

## Checkout limitations

The supplied checkout already lacks its referenced shared stylesheet, JavaScript files, favicons and existing portfolio images. Browser QA used a temporary local preview server that served these missing assets from the current public site through a `/tmp` cache; none were added or modified in this checkout. Some existing portfolio assets (including the UWV preview) remain unavailable from the public origin. This does not affect the four new showcase images, but a standalone copy of this incomplete checkout cannot reproduce the entire existing website without its original assets. Deploy the added files and modified index alongside the site's existing assets. No deployment performed.
