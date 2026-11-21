import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { Store } from "../server/store.js";
import { createApplication } from "../server/app.js";
import { populateFictionalDataset } from "../server/fixture.js";
import { DEMO_STREAM_URL } from "../server/demo.js";
import {
  DEMO_MEDIA_DATASET_VERSION,
  LEGACY_DEMO_VIDEO_DESCRIPTION,
  LEGACY_DEMO_MOMENT_DESCRIPTION,
  resolveDemoMedia,
  stockClipsForTenant,
  validateDemoStockManifest,
  type DemoStockClip,
} from "../server/demo-media.js";
import {
  applyDemoMediaMigration,
  planDemoMediaMigration,
} from "../server/demo-media-migration.js";

// Fictional unit-test evidence only. No example.org media is fetched or claimed licensed.
const clips: DemoStockClip[] = Array.from({ length: 10 }, (_, n) => ({
  id: `stock${String(n + 1).padStart(2, "0")}`,
  title: `Fictional test landscape ${n + 1}`,
  author: "Test fixture author",
  sourceProvider: "Test fixtures",
  sourceId: String(n + 1),
  sourcePage: `https://example.org/source/${n + 1}`,
  url: `https://example.org/media/clip-${n + 1}.mp4`,
  kind: "mp4",
  duration: 8 + n,
  bytes: 1000 + n,
  license: {
    name: "Fictional verification fixture",
    url: "https://example.org/test-license",
    attribution: "Test only",
    externalPlaybackAllowed: true,
  },
  verification: {
    verifiedAt: "2026-11-01T00:00:00.000Z",
    durationSource: "container-metadata",
    httpStatus: 200,
    contentType: "video/mp4",
    cors: "anonymous",
    noRecognizablePeople: true,
  },
  approved: true,
}));

test("ten distinct approvals are required and different encodings of one source cannot fill the manifest", () => {
  assert.equal(validateDemoStockManifest(clips, true).length, 10);
  assert.throws(
    () => validateDemoStockManifest(clips.slice(0, 9), true),
    /Ten/,
  );
  assert.throws(
    () =>
      validateDemoStockManifest(
        clips.map((v, n) =>
          n === 1 ? { ...v, sourceId: clips[0]!.sourceId } : v,
        ),
        true,
      ),
    /encodings/,
  );
  assert.throws(
    () =>
      validateDemoStockManifest(
        clips.map((v, n) => (n === 1 ? { ...v, url: clips[0]!.url } : v)),
        true,
      ),
    /encodings/,
  );
  assert.throws(
    () =>
      validateDemoStockManifest(
        clips.map((v, n) => (n === 0 ? ({ ...v, approved: false } as any) : v)),
        true,
      ),
    /approval/,
  );
  assert.throws(
    () =>
      validateDemoStockManifest(
        clips.map((v, n) =>
          n === 0
            ? ({
                ...v,
                verification: {
                  ...v.verification,
                  noRecognizablePeople: false,
                },
              } as any)
            : v,
        ),
        true,
      ),
    /people/,
  );
  assert.throws(
    () =>
      validateDemoStockManifest(
        clips.map((v, n) =>
          n === 0
            ? { ...v, url: "https://user:secret@example.org/clip.mp4" }
            : v,
        ),
        true,
      ),
    /credentials/,
  );
  assert.throws(
    () =>
      validateDemoStockManifest(
        clips.map((v, n) =>
          n === 0
            ? { ...v, url: "https://example.org/clip.mp4?api_key=private" }
            : v,
        ),
        true,
      ),
    /credentials/,
  );
  assert.throws(
    () =>
      validateDemoStockManifest(
        clips.map((v, n) =>
          n === 0
            ? {
                ...v,
                verification: { ...v.verification, contentType: "text/html" },
              }
            : v,
        ),
        true,
      ),
    /content type/,
  );
  assert.deepEqual(
    stockClipsForTenant("demo", clips).map((c) => c.id),
    ["stock01", "stock02", "stock03", "stock04"],
  );
  assert.deepEqual(
    stockClipsForTenant("other", clips).map((c) => c.id),
    ["stock05", "stock06", "stock07"],
  );
  assert.deepEqual(
    stockClipsForTenant("third", clips).map((c) => c.id),
    ["stock08", "stock09", "stock10"],
  );
  assert.equal(
    resolveDemoMedia({ demo: true, url: DEMO_STREAM_URL }, clips)?.id,
    "original-fallback",
  );
  assert.equal(
    resolveDemoMedia(
      { demo: true, url: "https://example.org/not-in-manifest.mp4" },
      clips,
    ),
    undefined,
  );
});

test("migration partitions footage per archive, keeps clip references valid and records an idempotent dataset version", () => {
  const directory = mkdtempSync(
    join(tmpdir(), "mypremiereplus-stock-migration-"),
  );
  const store = new Store(directory);
  store.seed();
  populateFictionalDataset(store);
  try {
    const plan = planDemoMediaMigration(store, clips);
    assert.equal(plan.assignments.filter((v) => v.eligible).length, 24);
    const original = store.get("demo", "videos", "demo-video-1")!;
    const moment = store.get("demo", "moments", "demo-moment-1")!;
    const applied = applyDemoMediaMigration(store, clips);
    assert.equal(applied.assignments.filter((v) => v.eligible).length, 24);
    for (const tenant of ["demo", "other", "third"]) {
      const allowed = new Set(
        stockClipsForTenant(tenant, clips).map((c) => c.id),
      );
      for (const video of store.list(tenant, "videos")) {
        assert.ok(allowed.has(video.demoMediaId));
        assert.equal(
          video.duration,
          clips.find((c) => c.id === video.demoMediaId)!.duration,
        );
        assert.equal(video.year, Number(video.recordedDate));
      }
      assert.equal(
        store.get(
          tenant,
          "settings",
          `demo-media-${DEMO_MEDIA_DATASET_VERSION}`,
        )!.applied.length,
        8,
      );
    }
    const updated = store.get("demo", "videos", "demo-video-1")!;
    assert.equal(updated.updatedAt, original.updatedAt);
    assert.equal(updated.status, original.status);
    assert.equal(updated.title, original.title);
    assert.equal(store.get("demo", "moments", moment.id)!.start, moment.start);
    assert.equal(store.get("demo", "moments", moment.id)!.end, moment.end);
    assert.equal(
      applyDemoMediaMigration(store, clips).assignments.filter(
        (v) => v.eligible,
      ).length,
      0,
    );
    assert.deepEqual(store.db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("edited, uploaded, custom and interval-incompatible records are preserved", () => {
  const directory = mkdtempSync(
    join(tmpdir(), "mypremiereplus-stock-preserve-"),
  );
  const store = new Store(directory);
  store.seed();
  populateFictionalDataset(store);
  try {
    const edited = store.get("demo", "videos", "demo-video-1")!;
    store.put("demo", "videos", {
      ...edited,
      title: "A customer-edited title",
      description: LEGACY_DEMO_VIDEO_DESCRIPTION,
    });
    const custom = store.get("demo", "videos", "demo-video-2")!;
    store.put("demo", "videos", {
      ...custom,
      url: "https://example.org/custom.mp4",
      description: "A custom description.",
    });
    const uploaded = store.get("demo", "videos", "demo-video-3")!;
    store.put("demo", "videos", {
      ...uploaded,
      source: "local",
      assetId: "unrelated-local-file",
    });
    const publishing = store.get("demo", "videos", "demo-video-4")!;
    store.put("demo", "videos", { ...publishing, status: "draft" });
    store.put("demo", "moments", {
      id: "custom-long-moment",
      videoId: "demo-video-5",
      title: "Existing interval",
      start: 3,
      end: 4,
    });
    store.put("demo", "moments", {
      id: "custom-template-description",
      videoId: "demo-video-6",
      title: "A customer moment",
      description: LEGACY_DEMO_MOMENT_DESCRIPTION,
      start: 1,
      end: 3,
    });
    const preservedIds = [
      "demo-video-1",
      "demo-video-2",
      "demo-video-3",
      "demo-video-4",
      "demo-video-5",
    ];
    const before = preservedIds.map((id) =>
      store.db.prepare("SELECT * FROM videos WHERE id=?").get(id),
    );
    const customMomentBefore = store.db
      .prepare("SELECT * FROM moments WHERE id=?")
      .get("custom-template-description");
    const shorter = clips.map((clip, n) =>
      n === 0 ? { ...clip, duration: 3.5 } : clip,
    );
    const result = applyDemoMediaMigration(store, shorter);
    for (const id of [
      "demo-video-1",
      "demo-video-2",
      "demo-video-3",
      "demo-video-4",
      "demo-video-5",
    ])
      assert.equal(
        result.assignments.find((v) => v.videoId === id)!.eligible,
        false,
        id,
      );
    assert.deepEqual(
      preservedIds.map((id) =>
        store.db.prepare("SELECT * FROM videos WHERE id=?").get(id),
      ),
      before,
    );
    assert.deepEqual(
      store.db
        .prepare("SELECT * FROM moments WHERE id=?")
        .get("custom-template-description"),
      customMomentBefore,
    );
    assert.equal(
      store.get("demo", "videos", "demo-video-1")!.title,
      "A customer-edited title",
    );
    assert.equal(
      store.get("demo", "videos", "demo-video-1")!.url,
      DEMO_STREAM_URL,
    );
    assert.equal(
      store.get("demo", "videos", "demo-video-2")!.url,
      "https://example.org/custom.mp4",
    );
    assert.equal(
      store.get("demo", "videos", "demo-video-2")!.description,
      "A custom description.",
    );
    assert.equal(store.get("demo", "videos", "demo-video-4")!.status, "draft");
    assert.equal(store.get("demo", "moments", "custom-long-moment")!.end, 4);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("direct SQL edits to a known seeded moment remain byte-exact without timestamp or history updates", () => {
  const directory = mkdtempSync(join(tmpdir(), "mypremiereplus-stock-direct-edit-"));
  const store = new Store(directory);
  store.seed();
  populateFictionalDataset(store);
  try {
    const original = store.db.prepare("SELECT * FROM moments WHERE id=?").get("demo-moment-1")!;
    store.db.prepare(
      "UPDATE moments SET data=json_set(data,'$.title',?,'$.start',?,'$.end',?,'$.description',?) WHERE id=?",
    ).run("A manually edited memory", 0.25, 1.25, LEGACY_DEMO_MOMENT_DESCRIPTION, "demo-moment-1");
    const edited = store.db.prepare("SELECT * FROM moments WHERE id=?").get("demo-moment-1")!;
    assert.equal(edited.updated_at, original.updated_at);
    assert.equal(JSON.parse(String(edited.data)).updatedAt, JSON.parse(String(original.data)).updatedAt);
    assert.equal(store.list("demo", "history").length, 0);
    const result = applyDemoMediaMigration(store, clips);
    assert.equal(result.assignments.find(v => v.videoId === "demo-video-1")!.eligible, true);
    assert.deepEqual(store.db.prepare("SELECT * FROM moments WHERE id=?").get("demo-moment-1"), edited);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("stock playback is allowlisted, tenant-authorised and never returns the original Cloudflare thumbnail", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "mypremiereplus-stock-api-"));
  const app = createApplication({
    directory,
    demo: true,
    demoMediaManifest: clips,
  });
  applyDemoMediaMigration(app.store, clips);
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
  const login = await fetch(base + "/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "demo@example.test",
      password: "premiere-demo",
    }),
  });
  const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
  const request = async (path: string) => {
    const response = await fetch(base + path, { headers: { cookie } });
    return { status: response.status, data: await response.json() };
  };
  t.after(async () => {
    await new Promise<void>((r) => app.server.close(() => r()));
    app.store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const playback = await request("/api/playback/demo-video-1");
  assert.equal(playback.status, 200);
  assert.equal(playback.data.url, clips[0]!.url);
  assert.equal(playback.data.provider, "demo-stock");
  assert.equal(playback.data.duration, clips[0]!.duration);
  assert.equal(playback.data.cors, "anonymous");
  assert.equal((await request("/api/playback/other-video-1")).status, 404);
  const frame = await request("/api/thumbnail/demo-video-1?time=5");
  assert.equal(frame.status, 200);
  assert.equal(frame.data.unavailable, true);
  assert.equal(frame.data.browserCaptureAllowed, true);
  assert.equal(frame.data.url.includes("cloudflarestream"), false);
  const credits = await request("/api/demo/media");
  assert.deepEqual(
    credits.data.media.map((c: any) => c.id),
    ["stock01", "stock02", "stock03", "stock04"],
  );
  assert.equal(credits.data.originalFallbackUsed, false);
  const video = app.store.get("demo", "videos", "demo-video-1")!;
  app.store.put("demo", "videos", {
    ...video,
    url: "https://example.org/unapproved.mp4",
  });
  assert.equal((await request("/api/playback/demo-video-1")).status, 404);
});
