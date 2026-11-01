import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "../server/store.js";
import {
  canonicalizeArtwork,
  migrateCanonicalArtwork,
} from "../server/artwork.js";
const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const args = process.argv.slice(2);
const safePath = (relative: string) => {
  const path = resolve(root, relative);
  if (!path.startsWith(root + sep))
    throw new Error(
      "Artwork migration targets must remain inside this checkout.",
    );
  if (!existsSync(path))
    throw new Error(
      `The specified migration target does not exist: ${relative}`,
    );
  return path;
};
for (let n = 0; n < args.length; n++) {
  const flag = args[n];
  const target = args[++n];
  if (!target)
    throw new Error("Provide an existing path after --database or --snapshot.");
  if (flag === "--database") {
    const path = safePath(target);
    const store = new Store(resolve(root, ".local"), path);
    try {
      const changed = migrateCanonicalArtwork(store);
      const checkpoint = store.db
        .prepare("PRAGMA wal_checkpoint(PASSIVE)")
        .get();
      console.log(
        `${target}: ${changed.tenants} archive identities, ${changed.records} metadata records updated.`,
        checkpoint,
      );
    } finally {
      store.close();
    }
  } else if (flag === "--snapshot") {
    const path = safePath(target);
    const previous = JSON.parse(readFileSync(path, "utf8"));
    writeFileSync(
      path,
      JSON.stringify(canonicalizeArtwork(previous), null, 2) + "\n",
    );
    console.log(
      `${target}: existing image paths updated; no runtime database snapshot imported.`,
    );
  } else throw new Error("Supported options are --database and --snapshot.");
}
