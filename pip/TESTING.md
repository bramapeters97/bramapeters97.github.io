# Pip verification — 22 November 2026

GitHub Pages was inspected through the repository API: `legacy`, `main`, `/`, custom domain `bram-peters.com`. The implementation is buildless at `pip/index.html`, `pip/style.css`, and `pip/app.js`. No portfolio, navigation, domain, package, or publishing settings changed.

Run from the repository root:

```sh
python3 -m http.server 3001
```

Verified in Chromium at **http://127.0.0.1:3001/pip/**, including direct navigation and a native hard refresh. `/`, `/pip/`, `/pip/style.css`, and `/pip/app.js` returned HTTP 200. The root portfolio rendered normally. The public custom-domain `/pip/` URL is a deployment target, not a verified deployment.

## Checks completed

- Ran the supplied archive before editing at http://127.0.0.1:3000/pip/.
- Default cycling: 23 minutes until 08:23; OV: 3 minutes until 08:03; Home first: 90 minutes until Teams, with no hidden setup allowance.
- Home first at noon: 23 minutes before getting ready for cycling, 3 minutes for OV. Departures 12:30 / 12:10; arrival 13:20.
- 75 DOM regression checks cover all three plans, five times and three priorities, repeated selection, completion/reopening, old compatible state, malformed/blocked storage, and literal note text including markup and whitespace.
- Browser checks: 390×844 and 320×844 iframe viewports; 200% root text; native 200% browser zoom (251 CSS-pixel viewport); no horizontal document overflow in those checks. The iframe harness is local QA only and is not committed.
- Native sheet closing and Escape return focus to the opener. Reverse Tab wraps inside the note sheet. Notes save and reopen literally after refresh.
- At 15:00 the workshop is finished, rain and return-trip advice agree. At 21:00 no commute to an ended meeting or book-delivery prompt is suggested.
- CSS retains hover behind a precise-pointer media query, removes animations and transitions for reduced motion, and includes high-contrast/forced-color treatments. These preferences were inspected in source; they were not toggled in the managed browser.

Run the regression suite using a separately installed jsdom 26 (no runtime dependency or repository package changes):

```sh
node scripts/check-pip.mjs --dom-module /absolute/path/to/jsdom/lib/api.js
```

## Verification limits and existing failures

- A real iPhone onscreen keyboard and Safari were unavailable. The native browser's DevTools are disabled, so phone sizes were tested with ordinary iframe viewports. Physical touch, safe-area behavior and keyboard-induced visual-viewport resizing still need device verification.
- The Sites preview relay failed; the repository-root Python server and Cloud browser were used instead.
- `check:portfolio`: navigation and case-study validation passed after correcting the reference to `assets/img/UWV3.png`.
- `check:responsive`: the existing assertion expects an exact `mailto:bramapeters@outlook.com` link in unchanged `contact.html`.
- No participant usability session was conducted. Automated/operator checks are not user-study results.

## Five-minute participant check (not yet observed)

Open a fresh session at 08:00 with cycling and coffee selected. Give the phone to a participant without explaining the choices. Record success, action count, and the first mistaken inference for each question.

| Question | Design target / expected answer | Observed success | Actions | First mistaken inference |
| --- | --- | --- | --- | --- |
| Can you finish your coffee if you take the train? | Select Take OV: 3 minutes until shoes on at 08:03. | Not observed | — | — |
| What changes if you start at home? | Select Home first: Teams at 09:30 from home; travel at 12:30 for the workshop. | Not observed | — | — |
| Where will you find the thought you just saved? | My note; the save confirmation names this destination. | Not observed | — | — |

Targets remain one selection to reveal the relevant view and two decisions or fewer to determine the answer. Do not report these targets as measured usability.

## Guidance consulted

- [Apple motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Apple accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
