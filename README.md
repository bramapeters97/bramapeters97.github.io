# bramapeters97.github.io
Bram Peters

| My personal portfolio website at https://www.bram-peters.com |

## Cloudflare Pages

The site has no runtime dependencies. Configure the Pages project with:

- **Build command:** `npm run build`
- **Build output directory:** `.`

The build command reconstructs the binary LELIBRAMBAS+ favicon and home-screen
icons from their text-only source in `scripts/generate-lelibrambas-icons.mjs`.
This keeps binary files out of Git while still placing every referenced icon in
`projects/lelibrambas/` before Cloudflare publishes the site. Run `npm run build`
before serving the repository locally as well.

## Portfolio maintenance

The nine portfolio case studies share navigation generated from
`scripts/update-project-navigation.mjs`. After changing its project list, run
`npm run update:project-navigation`, then `npm run check:portfolio`.

Regenerate the three-page résumé with `python3 scripts/generate-resume.py`
(requires ReportLab and Pillow). It reads the homepage's current roles, dates,
education, certificates, languages, skills and project images; concise print
descriptions live in the generator. The homepage Resume button opens the result
at `assets/pdf/bapeters_cv.pdf`.
