import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createApplication } from "../server/app.js";

test("persistent local archive workflows and server-side access control", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "mypremiereplus-api-"));
  const app = createApplication({ directory: dir });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const addr = app.server.address() as { port: number };
  const base = `http://127.0.0.1:${addr.port}`;
  const cookies: Record<string, string> = {};
  async function request(
    path: string,
    method = "GET",
    data?: unknown,
    user = "owner",
    extra: Record<string, string> = {},
  ) {
    const raw = Buffer.isBuffer(data);
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(cookies[user] ? { cookie: cookies[user] } : {}),
        ...(data !== undefined && !raw
          ? { "content-type": "application/json" }
          : {}),
        ...extra,
      },
      body:
        data === undefined
          ? undefined
          : raw
            ? (data as any)
            : JSON.stringify(data),
    });
    const cookie = response.headers.get("set-cookie");
    if (cookie) cookies[user] = cookie.split(";")[0]!;
    const result = await response.json();
    return { status: response.status, data: result };
  }
  t.after(async () => {
    await new Promise<void>((r) => app.server.close(() => r()));
    app.store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  for (const [user, email] of [
    ["owner", "demo@example.test"],
    ["other", "other@example.test"],
    ["viewer", "viewer@example.test"],
  ])
    assert.equal(
      (
        await request(
          "/api/login",
          "POST",
          { email, password: "premiere-demo" },
          user,
        )
      ).status,
      200,
    );
  await t.test(
    "three owner demo accounts have three separate profiles and isolated archives",
    async () => {
      assert.equal(
        (
          await request(
            "/api/login",
            "POST",
            { email: "third@example.test", password: "premiere-demo" },
            "third",
          )
        ).status,
        200,
      );
      const all = [];
      for (const user of ["owner", "other", "third"]) {
        const s = await request("/api/session", "GET", undefined, user);
        assert.equal(s.data.account.role, "owner");
        assert.equal(s.data.profiles.length, 3);
        all.push(s.data);
      }
      assert.equal(new Set(all.map((s) => s.tenant.id)).size, 3);
      assert.equal(
        new Set(all.flatMap((s) => s.profiles.map((p: any) => p.id))).size,
        9,
      );
      assert.equal(
        (await request("/api/videos/demo-video-1", "GET", undefined, "third"))
          .status,
        404,
      );
      assert.equal((await request("/api/videos/third-video-1")).status, 404);
      const original = app.store.get("demo", "videos", "demo-video-1")!;
      app.store.put("demo", "videos", { ...original, title: "Preserved edit" });
      app.store.seed();
      app.store.seed();
      assert.equal(
        app.store.get("demo", "videos", "demo-video-1")!.title,
        "Preserved edit",
      );
      assert.equal(app.store.list("third", "profiles").length, 3);
      app.store.put("demo", "videos", original);
    },
  );
  await t.test(
    "the optional original sample remains available and playback is gated",
    async () => {
      const b = await request("/api/bootstrap");
      assert.equal(b.data.videos.length, 8);
      assert.equal(
        b.data.videos.every((v: any) => v.duration === 4),
        true,
      );
      assert.equal(
        b.data.videos.some((v: any) => v.url || v.streamVideoId),
        false,
      );
      const p = await request("/api/playback/demo-video-1");
      assert.equal(p.status, 200);
      assert.match(
        p.data.url,
        /550d45ca5743a2f43fd0f6db8dfa2f98\/manifest\/video.m3u8/,
      );
      assert.equal((await request("/api/playback/other-video-1")).status, 404);
      assert.equal(
        (
          await request(
            "/api/playback/demo-video-8",
            "GET",
            undefined,
            "viewer",
          )
        ).status,
        404,
      );
    },
  );
  await t.test(
    "tenant IDs and role changes in request bodies cannot cross archives",
    async () => {
      const changed = await request("/api/videos/demo-video-1", "PATCH", {
        title: "Edited Lake",
        tenantId: "other",
        role: "owner",
      });
      assert.equal(changed.status, 200);
      assert.equal(
        (
          await request("/api/videos/other-video-1", "PATCH", {
            title: "Attack",
          })
        ).status,
        404,
      );
      const other = await request(
        "/api/videos/other-video-1",
        "GET",
        undefined,
        "other",
      );
      assert.equal(other.data.title, "Coastal: Summer by the Lake");
      assert.equal(
        (
          await request(
            "/api/videos/demo-video-1",
            "PATCH",
            { title: "Attack" },
            "viewer",
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await request("/api/videos/demo-video-1", "PATCH", {
            collectionIds: ["other-collection-1"],
          })
        ).status,
        400,
      );
    },
  );
  await t.test(
    "brand drafts persist independently from published viewer settings",
    async () => {
      assert.equal(
        (
          await request("/api/tenant", "PATCH", {
            name: "A New Cinema",
            accent: "#aaccdd",
          })
        ).status,
        200,
      );
      let s = await request("/api/session", "GET", undefined, "viewer");
      assert.notEqual(s.data.tenant.name, "A New Cinema");
      assert.equal(s.data.tenant.draft, undefined);
      await request("/api/tenant/publish", "POST", {});
      s = await request("/api/session", "GET", undefined, "viewer");
      assert.equal(s.data.tenant.name, "A New Cinema");
      assert.equal(s.data.tenant.accent, "#aaccdd");
    },
  );
  await t.test(
    "video draft preserves published metadata and applies only on publication",
    async () => {
      const d = await request("/api/videos/demo-video-4", "PATCH", {
        draft: {
          title: "A revised mountain film",
          description: "Unpublished edit",
        },
      });
      assert.equal(d.status, 200);
      assert.equal(d.data.title, "Across the Mountains");
      assert.equal(d.data.draft.title, "A revised mountain film");
      const viewer = await request(
        "/api/videos/demo-video-4",
        "GET",
        undefined,
        "viewer",
      );
      assert.equal(viewer.data.title, "Across the Mountains");
      assert.equal(viewer.data.draft, undefined);
      assert.equal(
        (
          await request(
            "/api/playback/demo-video-4",
            "GET",
            undefined,
            "viewer",
          )
        ).status,
        200,
      );
      assert.equal(
        (await request("/api/videos/demo-video-4/publish", "POST", {})).status,
        200,
      );
      assert.equal(
        (await request("/api/videos/demo-video-4", "GET", undefined, "viewer"))
          .data.title,
        "A revised mountain film",
      );
      await request("/api/videos/demo-video-4", "PATCH", {
        availability: "unavailable",
      });
      assert.equal((await request("/api/playback/demo-video-4")).status, 404);
      assert.equal(
        (await request("/api/videos/demo-video-4", "GET", undefined, "viewer"))
          .status,
        404,
      );
      await request("/api/videos/demo-video-4", "PATCH", {
        availability: "available",
      });
    },
  );
  let momentId = "";
  await t.test(
    "moments validate source boundaries and persist exact intervals",
    async () => {
      assert.equal(
        (
          await request("/api/moments", "POST", {
            videoId: "demo-video-1",
            title: "Invalid",
            start: 0,
            end: 0,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("/api/moments", "POST", {
            videoId: "demo-video-1",
            title: "Too long",
            start: 0,
            end: 5,
          })
        ).status,
        400,
      );
      const m = await request(
        "/api/moments",
        "POST",
        {
          videoId: "demo-video-1",
          title: "A saved second",
          start: 1,
          end: 2,
          familyTv: true,
        },
        "viewer",
      );
      assert.equal(m.status, 201);
      momentId = m.data.id;
      assert.equal((await request(`/api/moments/${momentId}`)).data.start, 1);
    },
  );
  await t.test(
    "all three Family TV modes persist queues and leave personal progress untouched",
    async () => {
      for (const mode of ["mix", "moments", "films"]) {
        const q = await request(
          "/api/channels/demo-channel/mix",
          "POST",
          { mode, minutes: 30 },
          "viewer",
        );
        assert.equal(q.status, 200);
        assert.ok(q.data.queue.length > 2);
        assert.ok(
          q.data.queue.every(
            (s: any) => s.start >= 0 && s.end <= 4 && s.end > s.start,
          ),
        );
        assert.ok(
          q.data.queue
            .slice(1)
            .every(
              (s: any, i: number) => s.videoId !== q.data.queue[i].videoId,
            ),
        );
        assert.equal(
          (
            await request(
              "/api/queues/" + q.data.id,
              "GET",
              undefined,
              "viewer",
            )
          ).status,
          200,
        );
        assert.equal((await request("/api/queues/" + q.data.id)).status, 404);
      }
      assert.deepEqual(
        (await request("/api/progress", "GET", undefined, "viewer")).data,
        [],
      );
      assert.equal(
        (
          await request(
            "/api/progress",
            "POST",
            { profileId: "demo-profile", videoId: "demo-video-1", position: 2 },
            "viewer",
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await request(
            "/api/progress",
            "POST",
            {
              profileId: "demo-profile",
              videoId: "demo-video-1",
              position: 2,
              familyTv: true,
            },
            "viewer",
          )
        ).status,
        400,
      );
    },
  );
  await t.test(
    "manual transcripts import, search, update and delete",
    async () => {
      const imported = await request("/api/transcripts/import", "POST", {
        videoId: "demo-video-1",
        vtt: "WEBVTT\n\n00:00:00.500 --> 00:00:02.000\nA manually supplied phrase.",
      });
      assert.equal(imported.status, 201);
      const search = await request(
        "/api/search?q=manually",
        "GET",
        undefined,
        "viewer",
      );
      assert.equal(search.data[0].type, "transcript");
      assert.equal(search.data[0].start, 0.5);
      const segment = imported.data.segments[0];
      assert.equal(
        (
          await request("/api/transcripts/" + segment.id, "PATCH", {
            text: "Corrected words",
          })
        ).status,
        200,
      );
      assert.equal(
        (await request("/api/transcripts/" + segment.id, "DELETE")).status,
        200,
      );
    },
  );
  await t.test(
    "commentary requires moderation and does not automatically approve viewers",
    async () => {
      const story = await request(
        "/api/stories",
        "POST",
        {
          videoId: "demo-video-1",
          text: "My memory",
          timestamp: 1,
          approved: true,
          status: "approved",
        },
        "viewer",
      );
      assert.equal(story.status, 201);
      assert.equal(story.data.approved, false);
      assert.equal(story.data.status, "pending");
      assert.equal(
        (
          await request("/api/stories/" + story.data.id, "PATCH", {
            status: "approved",
            approved: true,
          })
        ).status,
        200,
      );
    },
  );
  await t.test("scheduled release is enforced by server clock", async () => {
    const p = await request("/api/premieres", "POST", {
      title: "A future premiere",
      videoId: "demo-video-2",
      releaseAt: new Date(Date.now() + 3600000).toISOString(),
      timezone: "Europe/Amsterdam",
      published: true,
    });
    assert.equal(p.status, 201);
    assert.equal(
      (await request("/api/playback/demo-video-2", "GET", undefined, "viewer"))
        .status,
      404,
    );
    await request("/api/premieres/" + p.data.id, "PATCH", {
      releaseAt: new Date(Date.now() - 1000).toISOString(),
    });
    assert.equal(
      (await request("/api/playback/demo-video-2", "GET", undefined, "viewer"))
        .status,
      200,
    );
  });
  await t.test(
    "visibility covers metadata, search, playback, moments and gathering mode",
    async () => {
      await request("/api/videos/demo-video-1", "PATCH", {
        visibility: "selected",
        allowedAccounts: ["demo-owner"],
        gathering: false,
      });
      assert.equal(
        (await request("/api/videos/demo-video-1", "GET", undefined, "viewer"))
          .status,
        404,
      );
      assert.equal(
        (
          await request(
            "/api/playback/demo-video-1",
            "GET",
            undefined,
            "viewer",
          )
        ).status,
        404,
      );
      assert.equal(
        (await request("/api/moments/" + momentId, "GET", undefined, "viewer"))
          .status,
        404,
      );
      assert.equal(
        (
          await request(
            "/api/search?q=Edited%20Lake",
            "GET",
            undefined,
            "viewer",
          )
        ).data.length,
        0,
      );
      await request("/api/gathering", "POST", { enabled: true });
      assert.equal((await request("/api/videos/demo-video-1")).status, 404);
      await request("/api/gathering", "POST", { enabled: false });
      await request("/api/videos/demo-video-1", "PATCH", {
        visibility: "all",
        gathering: true,
      });
    },
  );
  await t.test(
    "actual private local upload, contribution link isolation and approval",
    async () => {
      const png = Buffer.from(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082",
        "hex",
      );
      const artwork = await request("/api/uploads", "POST", png, "owner", {
        "x-file-name": "test.png",
        "x-upload-purpose": "artwork",
      });
      assert.equal(artwork.status, 201);
      assert.equal(
        (
          await fetch(base + artwork.data.asset.url, {
            headers: { cookie: cookies.other! },
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await request(
            "/api/uploads",
            "POST",
            Buffer.from("<script>bad</script>"),
            "owner",
            { "x-file-name": "fake.mp4", "x-file-type": "video/mp4" },
          )
        ).status,
        400,
      );
      const link = await request("/api/contribution-links", "POST", {
        eventName: "Demo Event",
        maxUploads: 1,
        maxBytes: 1024,
      });
      assert.equal(link.status, 201);
      const guest = await request(
        "/api/guest/" + link.data.token,
        "GET",
        undefined,
        "guest",
      );
      assert.equal(guest.data.eventName, "Demo Event");
      assert.equal(guest.data.videos, undefined);
      assert.equal(
        (await request("/api/bootstrap", "GET", undefined, "guest")).status,
        401,
      );
      const mp4 = Buffer.concat([
        Buffer.from([0, 0, 0, 24]),
        Buffer.from("ftypisom"),
        Buffer.alloc(20),
      ]);
      const submitted = await request(
        "/api/guest/" + link.data.token,
        "POST",
        mp4,
        "guest",
        { "x-file-name": "memory.mp4", "x-title": "Guest memory" },
      );
      assert.equal(submitted.status, 201);
      assert.equal(
        (
          await request("/api/guest/" + link.data.token, "POST", mp4, "guest", {
            "x-file-name": "memory.mp4",
          })
        ).status,
        400,
      );
      const approved = await request(
        "/api/contributions/" + submitted.data.id,
        "PATCH",
        { status: "approved" },
      );
      assert.equal(approved.status, 200);
      assert.ok(approved.data.videoId);
      const v = await request("/api/videos/" + approved.data.videoId);
      assert.equal(v.data.status, "processing");
      assert.equal(
        (
          await request("/api/videos/" + v.data.id, "PATCH", {
            status: "published",
          })
        ).status,
        400,
      );
    },
  );
  await t.test(
    "recovery preserves relationships and metadata exports contain only current tenant",
    async () => {
      const deleted = await request("/api/videos/demo-video-3", "DELETE");
      assert.equal(deleted.status, 200);
      assert.equal((await request("/api/videos/demo-video-3")).status, 404);
      assert.ok(
        (await request("/api/recovery")).data.some(
          (r: any) => r.id === "demo-video-3",
        ),
      );
      await request("/api/recovery/demo-video-3/restore", "POST", {});
      assert.equal((await request("/api/videos/demo-video-3")).status, 200);
      assert.equal((await request("/api/moments/demo-moment-3")).status, 200);
      const exported = await request("/api/export", "POST", {});
      assert.equal(exported.status, 201);
      assert.equal(exported.data.data.archive.id, "demo");
      assert.equal(
        JSON.stringify(exported.data.data).includes("other-video-1"),
        false,
      );
      assert.equal(exported.data.data.originalFilesIncluded, false);
    },
  );
  await t.test(
    "new archive onboarding creates an independent owner and empty library",
    async () => {
      const created = await request(
        "/api/archives",
        "POST",
        {
          email: "new@example.test",
          password: "new-demo-password",
          ownerName: "New Owner",
          name: "New Cinema",
        },
        "new",
      );
      assert.equal(created.status, 201);
      const b = await request("/api/bootstrap", "GET", undefined, "new");
      assert.equal(b.data.tenant.name, "New Cinema");
      assert.equal(b.data.videos.length, 0);
      assert.equal(b.data.account.role, "owner");
      assert.equal(
        (await request("/api/videos/demo-video-1", "GET", undefined, "new"))
          .status,
        404,
      );
    },
  );
  await t.test(
    "draft channels preserve published configuration and require valid exclusions",
    async () => {
      const channel = await request("/api/channels/demo-channel", "PATCH", {
        draft: { name: "A draft channel", minSeconds: 1, maxSeconds: 3 },
      });
      assert.equal(channel.status, 200);
      assert.equal(
        (
          await request(
            "/api/channels/demo-channel",
            "GET",
            undefined,
            "viewer",
          )
        ).data.name,
        "The Family Channel",
      );
      await request("/api/channels/demo-channel/publish", "POST", {});
      assert.equal(
        (
          await request(
            "/api/channels/demo-channel",
            "GET",
            undefined,
            "viewer",
          )
        ).data.name,
        "A draft channel",
      );
      assert.equal(
        (
          await request("/api/channels/demo-channel", "PATCH", {
            excludedIntervals: [{ videoId: "other-video-1", start: 0, end: 1 }],
          })
        ).status,
        400,
      );
    },
  );
});
