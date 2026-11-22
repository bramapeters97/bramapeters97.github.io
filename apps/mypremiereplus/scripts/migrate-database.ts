import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Store, type Data } from "../server/store.js";

// Explicit, additive upgrade. Stop the API and preserve its database/journals first.
const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const args = process.argv.slice(2);
const targets: string[] = [];
const safe = (path: string) => {
  const target = resolve(root, path);
  if (!target.startsWith(root + sep) || !existsSync(target))
    throw new Error("Use an existing database inside this checkout.");
  return target;
};
for (let n = 0; n < args.length; n++) {
  const flag = args[n],
    value = args[++n];
  if (!value) throw new Error("Supply --database with an existing path.");
  if (flag === "--database") targets.push(safe(value));
  else if (flag === "--snapshot")
    throw new Error(
      "Readable seed metadata is generated with build-seed.ts, never exported from a working database.",
    );
  else throw new Error("Unknown migration option.");
}
if (!targets.length) throw new Error("Specify at least one --database path.");
for (const target of targets) {
  const old = new DatabaseSync(target, { readOnly: true });
  let before: Data[] = [];
  try {
    before = old
      .prepare(
        "SELECT id,tenant_id,resource,data,deleted_at,created_at,updated_at FROM records",
      )
      .all() as Data[];
  } finally {
    old.close();
  }
  const store = new Store(resolve(root, ".local"), target);
  try {
    for (const row of before) {
      const actual = store.db
        .prepare(
          "SELECT id,tenant_id,resource,data,deleted_at,created_at,updated_at FROM records WHERE tenant_id=? AND resource=? AND id=?",
        )
        .get(row.tenant_id, row.resource, row.id) as Data | undefined;
      if (!actual || Object.keys(row).some((key) => actual[key] !== row[key]))
        throw new Error(
          "An existing record did not survive the migration exactly. Inspect the preserved backup before proceeding.",
        );
    }
    store.seed();
    const integrity = store.db.prepare("PRAGMA integrity_check").get() as Data;
    const violations = store.db.prepare("PRAGMA foreign_key_check").all();
    if (integrity.integrity_check !== "ok" || violations.length)
      throw new Error(
        "The upgraded database did not pass integrity and foreign-key checks.",
      );
    console.log(
      `${target}: schema 2; ${before.length} existing records preserved; ${store.db.prepare("SELECT COUNT(*) AS n FROM records").get()!.n} total domain records; integrity and foreign keys OK.`,
    );
    console.log(
      "Checkpoint:",
      store.db.prepare("PRAGMA wal_checkpoint(PASSIVE)").get(),
    );
  } finally {
    store.close();
  }
}
