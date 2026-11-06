import { writeFileSync } from "node:fs";
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const groups = [
  {
    id: "catalogue",
    x: 64,
    y: 465,
    title: "Catalogue & media",
    subtitle: "Films, collections and private file metadata",
    tables: [
      "videos",
      "collections",
      "video_collections",
      "assets",
      "media_assets",
    ],
    notes: [
      "video_collections links films to collections.",
      "Provider descriptors stay separate from local files.",
    ],
  },
  {
    id: "memories",
    x: 780,
    y: 465,
    title: "Memories & discovery",
    subtitle: "Context and excerpts reference the original film",
    tables: ["moments", "stories", "transcripts", "chapters"],
    notes: [
      "video_id points to a film in the same archive.",
      "Moments keep start / end boundaries, not copies.",
    ],
  },
  {
    id: "television",
    x: 1496,
    y: 465,
    title: "Family TV",
    subtitle: "Published channels, selection rules and saved mixes",
    tables: ["channels", "channel_collections", "queues"],
    notes: [
      "Queues belong to their authenticated account.",
      "TV viewing stays apart from personal progress.",
    ],
  },
  {
    id: "programmes",
    x: 64,
    y: 920,
    title: "Shared evenings",
    subtitle: "Hosts, ordered programmes and scheduled premieres",
    tables: [
      "programmes",
      "programme_items",
      "programme_profiles",
      "premieres",
    ],
    notes: [
      "Items link films or exact saved moments.",
      "Premiere availability uses the server clock.",
    ],
  },
  {
    id: "viewing",
    x: 780,
    y: 920,
    title: "Personal viewing",
    subtitle: "An account and viewing profile scope saved activity",
    tables: ["progress", "watchlists", "watchlist_items"],
    notes: [
      "Watchlists persist per account and profile.",
      "watchlist_items references permitted videos.",
    ],
  },
  {
    id: "billing",
    x: 1496,
    y: 920,
    title: "Plans & invoices",
    subtitle: "Owner-only fictional billing details",
    tables: ["billing", "invoices"],
    notes: [
      "Plan summaries are visible to archive members.",
      "Demo invoices only; no payment processor.",
    ],
  },
  {
    id: "operations",
    x: 64,
    y: 1375,
    title: "Archive operations",
    subtitle: "Uploads, approvals, portability and recovery",
    tables: [
      "contributions",
      "contribution_links",
      "uploads",
      "notifications",
      "recovery_records",
      "exports",
      "history",
      "settings",
      "tokens",
      "asset_ownership",
    ],
    notes: [],
  },
  {
    id: "cloud",
    x: 780,
    y: 1375,
    title: "Cloud boundaries",
    subtitle: "Explicit provider and protection configuration",
    tables: ["provider_configs", "playback_licenses", "access_policies"],
    notes: [
      "Demo rows say configured = false.",
      "No credentials or cloud provisioning are implied.",
    ],
  },
];
const core = [
  ["tenants", "archive identity"],
  ["accounts", "authenticated people"],
  ["memberships", "owner · editor · viewer"],
  ["profiles", "viewing choices"],
  ["sessions", "scoped browser cookies"],
  ["devices", "approved browsers"],
  ["device_codes", "one-time hashed codes"],
  ["consents", "explicit sharing choices"],
];
const parts = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="2200" height="1815" viewBox="0 0 2200 1815" role="img" aria-labelledby="title description">
<title id="title">MyPremierePlus physical database schema overview</title>
<desc id="description">Grouped overview of schema version 2: archive identity, catalogue and media, memories, Family TV, shared programmes, personal viewing, billing, archive operations and cloud provider boundaries. Labelled arrows highlight tenant, account, profile, film, moment and media links. The records compatibility view stores no duplicate data. Cloud demo providers remain unconfigured. Full foreign-key details are in SCHEMA.md.</desc>
<defs>
 <linearGradient id="canvas" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#081321"/><stop offset="1" stop-color="#030a13"/></linearGradient>
 <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#102033"/><stop offset="1" stop-color="#0a1726"/></linearGradient>
 <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#eed39a"/><stop offset="1" stop-color="#bb9250"/></linearGradient>
 <filter id="shadow" x="-12%" y="-12%" width="124%" height="136%"><feDropShadow dx="0" dy="8" stdDeviation="13" flood-color="#000" flood-opacity=".22"/></filter>
 <marker id="arrow-gold" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M1 1L8 5L1 9" fill="none" stroke="#d3b474" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>
 <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M1 1L8 5L1 9" fill="none" stroke="#7ba4bf" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>
 <style>
  text{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;fill:#f0f4fa}
  .mono{font-family:"Cascadia Code",Consolas,monospace}
  .muted{fill:#9eafc4}.gold{fill:#e3c48a}.blue{fill:#96bbd4}
  .link{fill:none;stroke:#c9aa6c;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;marker-end:url(#arrow-gold)}
  .reference{fill:none;stroke:#719bb8;stroke-width:2;stroke-dasharray:7 7;stroke-linecap:round;stroke-linejoin:round;marker-end:url(#arrow-blue)}
  .label{font-size:16px;fill:#d8bd87;paint-order:stroke;stroke:#071220;stroke-width:7;stroke-linejoin:round}
  .label-blue{font-size:16px;fill:#98bad1;paint-order:stroke;stroke:#071220;stroke-width:7;stroke-linejoin:round}
 </style>
</defs>
<rect width="2200" height="1815" fill="url(#canvas)"/>
<rect x="64" y="56" width="5" height="61" rx="2.5" fill="url(#gold)"/>
<text x="88" y="78" class="gold" font-size="15" font-weight="650" letter-spacing="3">MYPREMIEREPLUS</text>
<text x="86" y="121" font-size="39" font-weight="650" letter-spacing="-.7">A private archive, connected by design</text>
<rect x="1878" y="70" width="258" height="42" rx="21" fill="#17283a" stroke="#4a4434"/>
<circle cx="1903" cy="91" r="4" fill="#e4c17b"/>
<text x="1920" y="97" class="gold mono" font-size="16">PHYSICAL SCHEMA · V2</text>
<path d="M64 147H2136" stroke="#223246"/>

<!-- Primary links route through the spaces between grouped tables. -->
<path class="link" d="M207 370V412H384V465"/>
<path class="link" d="M207 370V424H1100V465"/>
<path class="link" d="M207 370V436H1816V465"/>
<text x="403" y="452" class="label mono">tenant_id</text>
<text x="1119" y="452" class="label mono">tenant_id</text>
<text x="1835" y="452" class="label mono">tenant_id</text>
<path class="reference" d="M973 370V394H1458V866H1100V920"/>
<text x="1176" y="853" class="label-blue mono">account_id + profile_id</text>
<path class="link" d="M2136 280H2176V1085H2136"/>
<text x="2192" y="765" transform="rotate(-90 2192 765)" class="label mono">tenant_id</text>
<path class="link" d="M64 280H24V1540H64"/>
<text x="17" y="1190" transform="rotate(-90 17 1190)" class="label mono">tenant_id</text>
<path class="link" d="M704 600H780"/>
<text x="742" y="588" text-anchor="middle" class="label mono" style="font-size:14px">video_id</text>
<path class="link" d="M384 795V920"/>
<text x="400" y="885" class="label mono">video_id</text>
<path class="reference" d="M780 720H760V852H600V920"/>
<text x="650" y="841" class="label-blue mono">moment_id</text>
<path class="link" d="M704 720H728V824H1816V795"/>
<text x="1570" y="810" text-anchor="middle" class="label mono">collection_id · eligible films</text>
<path class="reference" d="M780 1540H736V881H680V795"/>
<text x="724" y="1215" transform="rotate(-90 724 1215)" class="label-blue mono">media_asset_id</text>

<!-- Archive identity and account permissions are separate from viewing profiles. -->
<rect x="64" y="178" width="2072" height="192" rx="18" fill="url(#panel)" stroke="#48503f" filter="url(#shadow)"/>
<text x="88" y="216" class="gold" font-size="15" font-weight="650" letter-spacing="2.4">TENANT CORE &amp; IDENTITY</text>
<text x="88" y="247" class="muted" font-size="18">An authenticated membership selects the archive. A viewing profile never grants permissions.</text>`,
];

core.forEach(([name, note], index) => {
  const x = 88 + index * 255;
  parts.push(
    `<rect x="${x}" y="274" width="239" height="60" rx="9" fill="#11263a" stroke="#2c4259"/><rect x="${x}" y="284" width="3" height="40" rx="1.5" fill="#bba16d"/><text x="${x + 14}" y="299" class="mono" font-size="18">${escape(name)}</text><text x="${x + 14}" y="320" class="muted" font-size="12.5">${escape(note)}</text>`,
  );
});

groups.forEach((group, index) => {
  const { x, y, title, subtitle, tables, notes } = group;
  parts.push(
    `<g id="${group.id}"><rect x="${x}" y="${y}" width="640" height="330" rx="17" fill="url(#panel)" stroke="#263b50" filter="url(#shadow)"/><text x="${x + 24}" y="${y + 36}" font-size="25" font-weight="620">${escape(title)}</text><text x="${x + 24}" y="${y + 65}" class="muted" font-size="16">${escape(subtitle)}</text><text x="${x + 612}" y="${y + 35}" class="gold mono" text-anchor="end" font-size="13">${String(index + 1).padStart(2, "0")}</text>`,
  );
  tables.forEach((name, n) => {
    const px = x + 24 + (n % 2) * 304,
      py = y + 94 + Math.floor(n / 2) * 44;
    parts.push(
      `<rect x="${px}" y="${py}" width="288" height="36" rx="7" fill="#102337" stroke="#233d53"/><circle cx="${px + 13}" cy="${py + 18}" r="2.5" fill="#c9b078"/><text x="${px + 25}" y="${py + 24}" class="mono" font-size="17">${escape(name)}</text>`,
    );
  });
  notes.forEach((note, n) =>
    parts.push(
      `<text x="${x + 24}" y="${y + 281 + n * 24}" class="${group.id === "cloud" ? "gold" : "muted"}" font-size="16">${escape(note)}</text>`,
    ),
  );
  parts.push("</g>");
});

parts.push(`<g id="legend"><rect x="1496" y="1375" width="640" height="330" rx="17" fill="#0c1b2c" stroke="#5a503a"/><text x="1520" y="1411" font-size="25" font-weight="620">How to read this map</text>
<path d="M1521 1446H1564" class="link"/><text x="1580" y="1452" class="muted" font-size="16">Primary ownership and source links</text>
<path d="M1521 1480H1564" class="reference"/><text x="1580" y="1486" class="muted" font-size="16">Account, profile and provider references</text>
<text x="1520" y="1524" class="mono gold" font-size="18">records = compatibility VIEW</text>
<text x="1520" y="1554" class="muted" font-size="16">Named tables hold the data; no duplicate record store.</text>
<text x="1520" y="1585" class="muted" font-size="16">Generated columns expose readable typed metadata.</text>
<a href="SCHEMA.md"><text x="1520" y="1620" class="blue" font-size="17">Full foreign-key reference → SCHEMA.md</text></a>
<a href="schema.sql"><text x="1520" y="1651" class="blue" font-size="17">Complete fresh-database DDL → schema.sql</text></a>
<text x="1520" y="1683" class="muted mono" font-size="12.5">Bookkeeping: schema_migrations · demo_fixture · other_records</text></g>
<path d="M64 1746H2136" stroke="#233448"/>
<text x="64" y="1780" class="muted" font-size="16">Grouped overview · all private data remains scoped to its authenticated archive · detailed constraints and migration guidance in SCHEMA.md</text>
<text x="2136" y="1780" text-anchor="end" class="gold" font-size="15">LOCAL DEMO / CLOUD ADAPTERS REQUIRE CONFIGURATION</text>
</svg>`);
writeFileSync(
  new URL("../demo-data/schema-map.svg", import.meta.url),
  parts.join("\n") + "\n",
);
console.log(
  "Created demo-data/schema-map.svg (standalone SVG; no external fonts or images).",
);
