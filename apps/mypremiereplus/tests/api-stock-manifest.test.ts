import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createApplication } from "../server/app.js";
import {
  populateFictionalDataset,
  populatePristineProfileWatchlists,
} from "../server/fixture.js";
import {
  DEMO_STOCK_MEDIA,
  stockClipsForTenant,
  validateDemoStockManifest,
} from "../server/demo-media.js";
import { applyDemoMediaMigration } from "../server/demo-media-migration.js";

const awaitingApproval = DEMO_STOCK_MEDIA.length !== 10;

test(
  "operational manifest contains ten distinct approved public media sources with recorded verification",
  { skip: awaitingApproval },
  () => {
    assert.equal(validateDemoStockManifest(DEMO_STOCK_MEDIA, true).length, 10);
    assert.equal(
      new Set(DEMO_STOCK_MEDIA.map((v) => `${v.sourceProvider}:${v.sourceId}`))
        .size,
      10,
    );
    assert.equal(new Set(DEMO_STOCK_MEDIA.map((v) => v.url)).size, 10);
    for (const clip of DEMO_STOCK_MEDIA) {
      assert.ok(clip.duration >= 3.5);
      assert.ok(clip.bytes === null || clip.bytes > 0);
      assert.equal(clip.license.externalPlaybackAllowed, true);
      assert.equal(clip.verification.noRecognizablePeople, true);
      assert.ok([200, 206].includes(clip.verification.httpStatus));
      assert.equal(new URL(clip.url).protocol, "https:");
      assert.equal(new URL(clip.url).username, "");
      assert.ok(new URL(clip.license.url).hostname.length > 0);
    }
  },
);

test(
  "operational source URLs, authors and durations match the recorded official research",
  { skip: awaitingApproval },
  () => {
    const pexels = JSON.parse(
      readFileSync(
        new URL("../docs/demo-media-research-a.json", import.meta.url),
        "utf8",
      ),
    );
    const mixkit = JSON.parse(
      readFileSync(
        new URL("../docs/demo-media-research-b.json", import.meta.url),
        "utf8",
      ),
    );
    const sources = [
      ...pexels.items.map((v: any) => ({
        url: v.url,
        page: v.sourcePage,
        title: v.sourceTitle,
        author: v.creator,
        duration: v.durationSeconds,
        bytes: v.bytes,
        license: v.licensePage,
        cors: "anonymous",
        method: "container-metadata",
      })),
      ...mixkit.candidates.map((v: any) => ({
        url: v.url,
        page: v.sourceUrl,
        title: v.title,
        author: v.author,
        duration: v.durationSeconds,
        bytes: v.bytes,
        license: mixkit.license.url,
        cors: "unknown",
        method: "browser-metadata",
      })),
    ];
    assert.equal(sources.length, 10);
    for (const clip of DEMO_STOCK_MEDIA) {
      const source = sources.find((v) => v.url === clip.url);
      assert.ok(source, `No recorded official evidence for ${clip.id}`);
      assert.deepEqual(
        {
          page: clip.sourcePage,
          title: clip.title,
          author: clip.author,
          duration: clip.duration,
          bytes: clip.bytes,
          license: clip.license.url,
          cors: clip.verification.cors,
          method: clip.verification.durationSource,
        },
        {
          page: source.page,
          title: source.title,
          author: source.author,
          duration: source.duration,
          bytes: source.bytes,
          license: source.license,
          cors: source.cors,
          method: source.method,
        },
      );
    }
  },
);

test(
  "approved registry drives three disjoint archive libraries while profiles share a library and isolate preferences",
  { skip: awaitingApproval },
  async (t) => {
    const directory = mkdtempSync(join(tmpdir(), "mypremiereplus-real-stock-"));
    const app = createApplication({ directory, demo: true });
    populateFictionalDataset(app.store);
    populatePristineProfileWatchlists(app.store);
    const result = applyDemoMediaMigration(app.store);
    assert.equal(result.assignments.filter((v) => v.eligible).length, 24);
    const seededVideos = ["demo", "other", "third"].flatMap((tenant) =>
      app.store.list(tenant, "videos"),
    );
    assert.equal(seededVideos.length, 24);
    assert.equal(new Set(seededVideos.map((v) => v.url)).size, 10);
    app.server.listen(0, "127.0.0.1");
    await once(app.server, "listening");
    const base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
    t.after(async () => {
      await new Promise<void>((resolve) => app.server.close(() => resolve()));
      app.store.close();
      rmSync(directory, { recursive: true, force: true });
    });
    const archiveSets: Set<string>[] = [];
    for (const [tenant, email] of [
      ["demo", "demo@example.test"],
      ["other", "other@example.test"],
      ["third", "third@example.test"],
    ]) {
      const login = await fetch(base + "/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: "premiere-demo" }),
      });
      assert.equal(login.status, 200);
      const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
      const get = async (path: string) => {
        const response = await fetch(base + path, { headers: { cookie } });
        return { status: response.status, data: await response.json() };
      };
      const bootstrap = await get("/api/bootstrap");
      assert.equal(bootstrap.data.profiles.length, 3);
      assert.equal(bootstrap.data.videos.length, 8);
      const allowed = new Set(
        stockClipsForTenant(tenant!, DEMO_STOCK_MEDIA).map((c) => c.id),
      );
      archiveSets.push(
        new Set(bootstrap.data.videos.map((v: any) => v.demoMediaId)),
      );
      for (const video of bootstrap.data.videos) {
        assert.ok(allowed.has(video.demoMediaId));
        const clip = DEMO_STOCK_MEDIA.find((c) => c.id === video.demoMediaId)!;
        assert.equal(video.duration, clip.duration);
        // The seeded future premiere remains protected even for its owner.
        const playback = await get(`/api/playback/${video.id}`);
        if (video.id === `${tenant}-video-6`)
          assert.equal(playback.status, 404);
        else {
          assert.equal(playback.status, 200);
          assert.equal(playback.data.provider, "demo-stock");
          assert.equal(playback.data.url, clip.url);
        }
      }
      const profiles = bootstrap.data.profiles;
      for (const profile of profiles) {
        assert.equal(profile.id.startsWith(`${tenant}-profile`), true);
        assert.equal(
          (
            app.store.db
              .prepare("SELECT tenant_id FROM profiles WHERE id=?")
              .get(profile.id) as any
          ).tenant_id,
          tenant,
        );
      }
      const lists = await Promise.all(
        profiles.map((p: any) => get(`/api/watchlist?profileId=${p.id}`)),
      );
      assert.equal(
        new Set(lists.map((v) => JSON.stringify(v.data.videos))).size,
        3,
      );
      // Selecting a cosmetic profile cannot change the account's authorised library.
      for (const profile of profiles)
        assert.equal(
          (await get(`/api/videos?profileId=${profile.id}`)).data.length,
          8,
        );
      for (const resource of ["moments", "chapters", "transcripts"])
        for (const interval of bootstrap.data[resource]) {
          const film = bootstrap.data.videos.find(
            (v: any) => v.id === interval.videoId,
          );
          assert.ok(
            interval.start >= 0 &&
              interval.end > interval.start &&
              interval.end <= film.duration,
          );
        }
      const foreignTenant = ["demo", "other", "third"].find(
        (id) => id !== tenant,
      )!;
      assert.equal(
        (await get(`/api/videos/${foreignTenant}-video-1`)).status,
        404,
      );
      assert.equal(
        (await get(`/api/playback/${foreignTenant}-video-1`)).status,
        404,
      );
      const changed = await fetch(base + "/api/watchlist", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          profileId: profiles[0].id,
          videos: [`${tenant}-video-1`],
        }),
      });
      assert.equal(changed.status, 200);
      assert.deepEqual(
        (await get(`/api/watchlist?profileId=${profiles[0].id}`)).data.videos,
        [`${tenant}-video-1`],
      );
      for (let n = 1; n < profiles.length; n++)
        assert.deepEqual(
          (await get(`/api/watchlist?profileId=${profiles[n].id}`)).data.videos,
          lists[n]!.data.videos,
        );
      const credits = await get("/api/demo/media");
      assert.equal(credits.data.originalFallbackUsed, false);
      assert.deepEqual(
        new Set(credits.data.media.map((c: any) => c.id)),
        allowed,
      );
    }
    for (let i = 0; i < archiveSets.length; i++)
      for (let j = i + 1; j < archiveSets.length; j++)
        assert.equal(
          [...archiveSets[i]!].some((id) => archiveSets[j]!.has(id)),
          false,
        );
    assert.deepEqual(
      app.store.db.prepare("PRAGMA foreign_key_check").all(),
      [],
    );
  },
);
