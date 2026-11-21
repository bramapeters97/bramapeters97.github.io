import { existsSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "../server/store.js";
import {
  DEMO_STOCK_MEDIA,
  validateDemoStockManifest,
} from "../server/demo-media.js";
import {
  applyDemoMediaMigration,
  planDemoMediaMigration,
} from "../server/demo-media-migration.js";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const args = process.argv.slice(2),
  targets: string[] = [];
const apply = args.includes("--apply");
for (let n = 0; n < args.length; n++) {
  if (args[n] === "--apply") continue;
  if (args[n] !== "--database" || !args[n + 1])
    throw new Error(
      "Use --database with an existing checkout database; add --apply only after reviewing the approved manifest.",
    );
  const target = resolve(root, args[++n]!);
  if (!target.startsWith(root + sep) || !existsSync(target))
    throw new Error("Choose an existing database inside this checkout.");
  targets.push(target);
}
if (!targets.length)
  throw new Error(
    "An explicit --database path is required. No default database is modified.",
  );
validateDemoStockManifest(DEMO_STOCK_MEDIA, true);
for (const target of targets) {
  const store = new Store(resolve(root, ".local"), target, {
    readOnly: !apply,
  });
  try {
    const plan = apply
      ? applyDemoMediaMigration(store)
      : planDemoMediaMigration(store);
    console.log(
      JSON.stringify(
        {
          database: target,
          mode: apply ? "applied" : "read-only plan",
          datasetVersion: plan.datasetVersion,
          manifestFingerprint: plan.manifestFingerprint,
          assignments: plan.assignments.map((v) => ({
            tenantId: v.tenantId,
            videoId: v.videoId,
            mediaId: v.clip.id,
            duration: v.clip.duration,
            eligible: v.eligible,
            reason: v.reason,
          })),
        },
        null,
        2,
      ),
    );
    if (apply)
      console.log(
        "Integrity:",
        store.db.prepare("PRAGMA integrity_check").get(),
        "Foreign-key violations:",
        store.db.prepare("PRAGMA foreign_key_check").all().length,
        "Checkpoint:",
        store.db.prepare("PRAGMA wal_checkpoint(PASSIVE)").get(),
      );
  } finally {
    store.close();
  }
}
