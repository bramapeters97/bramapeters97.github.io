import type { Store, Data } from "./store.js";

const replacements: Record<string, string> = {
  "/artwork/lake.svg": "/artwork/lake.png",
  "/artwork/mountains.svg": "/artwork/mountains.png",
  "/artwork/garden.svg": "/artwork/garden.png",
  "/artwork/cinema.svg": "/artwork/cinema.png",
  "/artwork/coast.svg": "/artwork/coast.png",
  "/artwork/winter.svg": "/artwork/cinema.png",
};
const imageFields = new Set([
  "background",
  "poster",
  "backdrop",
  "artwork",
  "thumbnail",
  "cover",
  "avatar",
  "customIcon",
  "image",
  "url",
]);
/** Change only exact, previously bundled image placeholders in image fields.
 * Customer images, captions, timestamps and all other metadata are preserved. */
export function canonicalizeArtwork(value: unknown, key = ""): unknown {
  if (typeof value === "string")
    return imageFields.has(key) ? (replacements[value] ?? value) : value;
  if (Array.isArray(value))
    return value.map((v) => canonicalizeArtwork(v, key));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, canonicalizeArtwork(v, k)]),
    );
  return value;
}
export function migrateCanonicalArtwork(store: Store) {
  let tenants = 0,
    records = 0;
  for (const row of store.db
    .prepare("SELECT id,settings FROM tenants")
    .all() as Data[]) {
    const settings = JSON.stringify(
      canonicalizeArtwork(JSON.parse(row.settings)),
    );
    if (settings !== row.settings) {
      store.db
        .prepare("UPDATE tenants SET settings=? WHERE id=?")
        .run(settings, row.id);
      tenants++;
    }
  }
  for (const row of store.db
    .prepare("SELECT id,tenant_id,resource,data FROM records")
    .all() as Data[]) {
    const data = JSON.stringify(canonicalizeArtwork(JSON.parse(row.data)));
    if (data !== row.data) {
      store.db
        .prepare(
          "UPDATE records SET data=? WHERE tenant_id=? AND resource=? AND id=?",
        )
        .run(data, row.tenant_id, row.resource, row.id);
      records++;
    }
  }
  return { tenants, records };
}
