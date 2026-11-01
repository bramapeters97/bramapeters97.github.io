import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../server/store.js";
import {
  canonicalizeArtwork,
  migrateCanonicalArtwork,
} from "../server/artwork.js";
test("canonical artwork migration preserves custom images, drafts and unrelated metadata", () => {
  const directory = mkdtempSync(join(tmpdir(), "mypremiereplus-artwork-"));
  const store = new Store(directory);
  try {
    store.seed();
    const video = store.get("demo", "videos", "demo-video-1")!;
    store.put("demo", "videos", {
      ...video,
      title: "An existing custom title",
      poster: "/artwork/lake.svg",
      backdrop: "/api/assets/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      description: "/artwork/lake.svg",
      draft: {
        title: "An unpublished custom title",
        poster: "/artwork/winter.svg",
        backdrop: "https://example.test/custom.jpg",
      },
    });
    const tenant = store.tenant("demo");
    store.saveTenant("demo", {
      ...tenant,
      background: "/artwork/coast.svg",
      draft: { ...tenant.draft, background: "/artwork/mountains.svg" },
    });
    const before = store.get("demo", "videos", video.id)!;
    migrateCanonicalArtwork(store);
    const after = store.get("demo", "videos", video.id)!;
    assert.equal(after.poster, "/artwork/lake.png");
    assert.equal(after.backdrop, before.backdrop);
    assert.equal(after.title, before.title);
    assert.equal(after.description, before.description);
    assert.equal(after.updatedAt, before.updatedAt);
    assert.equal(after.draft.title, before.draft.title);
    assert.equal(after.draft.poster, "/artwork/cinema.png");
    assert.equal(after.draft.backdrop, before.draft.backdrop);
    assert.equal(store.tenant("demo").background, "/artwork/coast.png");
    assert.equal(
      store.tenant("demo").draft.background,
      "/artwork/mountains.png",
    );
    assert.deepEqual(migrateCanonicalArtwork(store), {
      tenants: 0,
      records: 0,
    });
    assert.deepEqual(
      canonicalizeArtwork({
        poster: "/artwork/custom.svg",
        text: "/artwork/lake.svg",
      }),
      { poster: "/artwork/custom.svg", text: "/artwork/lake.svg" },
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
