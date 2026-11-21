import { DatabaseSync } from "node:sqlite";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Store, type Data } from "../server/store.js";
import {
  populateFictionalDataset,
  populatePristineProfileWatchlists,
} from "../server/fixture.js";
import { DEMO_STOCK_MEDIA } from "../server/demo-media.js";
import { applyDemoMediaMigration } from "../server/demo-media-migration.js";

/** Explicitly regenerate distributable fiction. Never read or clone the live DB. */
const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const runtime = resolve(root, ".local");
mkdirSync(runtime, { recursive: true });
const temporary = mkdtempSync(resolve(runtime, "seed-build-"));
const temporaryDatabase = resolve(temporary, "seed.db");
const output = resolve(root, "demo-data");
mkdirSync(output, { recursive: true });
const target = resolve(output, "seed.db");
const assertSafeTemporary = () => {
  if (
    !temporary.startsWith(runtime + sep) ||
    !basename(temporary).startsWith("seed-build-")
  )
    throw new Error("Unexpected seed build directory.");
};
try {
  const store = new Store(temporary, temporaryDatabase);
  let snapshot: Data;
  try {
    store.seed();
    populateFictionalDataset(store);
    populatePristineProfileWatchlists(store);
    if (DEMO_STOCK_MEDIA.length) applyDemoMediaMigration(store);
    for (const table of [
      "sessions",
      "tokens",
      "device_codes",
      "devices",
      "history",
      "progress",
      "queues",
      "assets",
      "asset_ownership",
      "uploads",
      "contributions",
      "contribution_links",
      "exports",
      "notifications",
      "recovery_records",
      "other_records",
    ]) {
      const count = store.db
        .prepare(`SELECT COUNT(*) AS n FROM ${table}`)
        .get() as Data;
      if (count.n !== 0)
        throw new Error(
          `The fresh fictional seed unexpectedly contains runtime ${table}.`,
        );
    }
    const accounts = store.db
      .prepare(
        "SELECT id,email,name,created_at AS createdAt FROM accounts ORDER BY id",
      )
      .all() as Data[];
    if (
      accounts.length !== 4 ||
      accounts.some(
        (account) => !String(account.email).endsWith("@example.test"),
      )
    )
      throw new Error(
        "The seed must contain only the four known fictional accounts.",
      );
    const memberships = store.db
      .prepare(
        "SELECT tenant_id AS tenantId,account_id AS accountId,role FROM memberships ORDER BY tenant_id,account_id",
      )
      .all();
    const kinds = [
      "profiles",
      "videos",
      "collections",
      "moments",
      "stories",
      "transcripts",
      "chapters",
      "channels",
      "programmes",
      "premieres",
      "settings",
      "billing",
      "invoices",
      "watchlists",
      "providerConfigs",
      "mediaAssets",
      "playbackLicenses",
      "accessPolicies",
      "consents",
    ];
    const archives = (
      store.db.prepare("SELECT id FROM tenants ORDER BY id").all() as Data[]
    ).map((row) => ({
      tenant: store.tenant(row.id),
      ...Object.fromEntries(
        kinds.map((resource) => [resource, store.list(row.id, resource)]),
      ),
    }));
    snapshot = {
      notice:
        "Sanitised readable metadata from the pristine fictional seed.db, not a snapshot of the editable working database. Demo media comes from the approved source registry; the original supplied clip remains an optional fallback. Synthetic captions are not sample dialogue. Password hashes, sessions, pairing codes, tokens, private files and runtime history are excluded.",
      schemaVersion: 2,
      accounts,
      memberships,
      archives,
    };
    const integrity = store.db.prepare("PRAGMA integrity_check").get() as Data;
    if (
      integrity.integrity_check !== "ok" ||
      store.db.prepare("PRAGMA foreign_key_check").all().length
    )
      throw new Error("Fresh seed integrity validation failed.");
    store.db.exec(
      "PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;",
    );
  } finally {
    store.close();
  }
  const check = new DatabaseSync(temporaryDatabase, { readOnly: true });
  try {
    if (
      (check.prepare("PRAGMA integrity_check").get() as Data)
        .integrity_check !== "ok"
    )
      throw new Error("Standalone seed file failed integrity validation.");
  } finally {
    check.close();
  }
  const temporarySnapshot = resolve(temporary, "datasets.json");
  writeFileSync(temporarySnapshot, JSON.stringify(snapshot!, null, 2) + "\n");
  const temporarySchema = resolve(temporary, "schema.sql");
  writeFileSync(
    temporarySchema,
    ["0001_initial.sql", "0002_domain_tables.sql"]
      .map((name) => readFileSync(resolve(root, "migrations", name), "utf8"))
      .join("\n\n"),
  );
  // Same-volume rename atomically replaces only the explicitly named seed artifact.
  // The editable working database is never opened, removed, replaced or imported.
  renameSync(temporaryDatabase, target);
  renameSync(temporarySnapshot, resolve(output, "datasets.json"));
  renameSync(temporarySchema, resolve(output, "schema.sql"));
  console.log("Created pristine demo-data/seed.db from fresh fictional data.");
  console.log(
    "Three archives, four accounts, nine profiles; no sessions, tokens, pairing codes, activity, uploads or private files.",
  );
  console.log(
    "Refreshed sanitised seed metadata and schema. The editable working database was not opened or changed.",
  );
} finally {
  assertSafeTemporary();
  if (existsSync(temporary))
    rmSync(temporary, { recursive: true, force: true });
}
