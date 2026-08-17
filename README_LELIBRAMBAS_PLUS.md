# Lelibrambas+

Lelibrambas+ is a private family-streaming prototype: a television-first viewer, a Windows Library Manager, a source-preserving legacy-video importer, a small native Expo TV shell, and production-shaped Cloudflare adapters. The repository contains only fictional catalogue data, synthetic artwork, and locally generated silent demo clips.

The implementation lives in [`projects/lelibrambas-plus/`](projects/lelibrambas-plus/). Start with its [project README](projects/lelibrambas-plus/README.md), then use the [Windows](projects/lelibrambas-plus/README_WINDOWS.md), [Android TV](projects/lelibrambas-plus/README_ANDROID_TV.md), [tvOS](projects/lelibrambas-plus/README_TVOS.md), and [video-import](projects/lelibrambas-plus/README_VIDEO_IMPORT.md) guides.

The synthetic standalone review artifact is [`lelibrambas-plus.html`](lelibrambas-plus.html); its deterministic captures are in [`assets/lelibrambas-plus/screenshots/`](assets/lelibrambas-plus/screenshots/).

## Publication status

This work is deliberately absent from the root portfolio navigation and `index.html`. The standalone case-study file and generated screenshots are local review artifacts, not a deployment instruction. No family media, source paths, credentials, cloud identifiers, or importer manifests belong in a public site.

An unlinked URL is not access control. If a future case study contains anything private, host it behind real authentication such as an identity-aware proxy; do not rely on obscurity or a static GitHub Pages URL. Publishing the synthetic case study, changing the portfolio index, provisioning cloud resources, and uploading private media are all separate, explicitly authorized actions.

## Local launch

From Windows PowerShell:

```powershell
Set-Location .\projects\lelibrambas-plus
corepack enable
corepack yarn setup
corepack yarn dev:tv-web
```

The high-fidelity React DOM preview runs at `http://127.0.0.1:5173`. In another terminal, run `corepack yarn dev:admin` for the local Library Manager or `corepack yarn desktop:dev` for the Electron shell. The native Android TV build has additional prerequisites documented in the project.

No Cloudflare resource is provisioned or deployed by these commands.
