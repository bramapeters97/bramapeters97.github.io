# MyPremierePlus at /mypremiereplus

Imported from `bramapeters97/MyPremierePlus`, branch
`codex/mypremiereplus-web`, commit
`2fda3627e7c8ccf090f058202e5d44e78033c095`. The upstream `main` branch
contains only a README. This copy includes the complete React viewer, management
portal, Node API, SQLite schema, fictional fixtures, artwork, and fonts.

This integration builds the browser app for `/mypremiereplus/` and mounts its API
at `/mypremiereplus/api/`. The portfolio stays at `/`. Both must share the same
origin for session cookies and request-origin validation.

## Run locally

Use Node.js 24. From this directory:

```sh
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:8787/mypremiereplus/`. For development, `npm run dev`
serves the browser app at `http://127.0.0.1:5173/mypremiereplus/`.
Demo accounts and passwords are listed in the upstream [README](README.md).
`npm test` validates the imported app and subpath integration.

## Hosting the full application

The existing portfolio deploys automatically through GitHub Pages. That service
cannot execute this application's Node.js API, write SQLite data, or store
uploads. A static frontend copy alone cannot provide the full application.
No production hosting destination or domain-routing access was supplied with
this integration, so preparing these files does not launch the public URL.

A deployment for an ordinary Docker-capable server is supplied at the repository
root. It serves the existing portfolio and this application together:

```sh
docker compose up --build -d
```

Before using the public URL, point `bram-peters.com` and `www.bram-peters.com`
to that server and allow inbound ports 80 and 443. Caddy obtains HTTPS
certificates. Its proxy preserves the incoming Host and forwards the complete
`/mypremiereplus` path to Node. The app's port is internal to the Compose network.

The `mypremiereplus-data` volume holds the database and uploads. The container
copies the fictional seed only when its database is missing, preserving data
across rebuilds and restarts. Back up this volume. `docker compose down` retains
it; `docker compose down --volumes` deletes it.

If the portfolio remains on GitHub Pages, a same-origin edge reverse proxy must
route `/mypremiereplus` and `/mypremiereplus/*` to a separate persistent Node
service. DNS alone cannot route individual paths. The external proxy must preserve
the public Host header; an API on another origin is not a drop-in replacement.

The application currently implements demo identity, pairing, billing and optional
provider previews. The supplied Compose file runs that existing demo explicitly;
it is not a completed commercial identity/payment service. Set `DEMO_MODE=false`
to disable demo authentication, but sign-in and registration will then require
the upstream production identity work described in [PRODUCTION.md](docs/PRODUCTION.md).
Use fictional data for this demonstration.

The original scope notes in upstream documentation describe the earlier local-only
implementation. This integration adds deployment preparation and subpath support;
it does not claim those unimplemented provider integrations are complete.
