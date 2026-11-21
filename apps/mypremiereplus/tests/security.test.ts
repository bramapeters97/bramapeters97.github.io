import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";
import { createApplication } from "../server/app.js";

type Application = ReturnType<typeof createApplication>;
type Client = { cookie: string; accountId: string };

async function environment(
  run: (app: Application, request: Requester, login: Login) => Promise<void>,
) {
  const directory = mkdtempSync(join(tmpdir(), "mypremiere-security-"));
  const app = createApplication({ directory, demo: true });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const request: Requester = async (
    path,
    client,
    method = "GET",
    value,
    extra = {},
  ) => {
    const headers = new Headers(extra);
    if (client) headers.set("cookie", client.cookie);
    if (value !== undefined && !(value instanceof Uint8Array))
      headers.set("content-type", "application/json");
    const result = await fetch(`${origin}/api/${path}`, {
      method,
      headers,
      body:
        value === undefined
          ? undefined
          : value instanceof Uint8Array
            ? value
            : JSON.stringify(value),
    });
    const text = await result.text();
    return {
      status: result.status,
      headers: result.headers,
      data:
        text && result.headers.get("content-type")?.includes("application/json")
          ? JSON.parse(text)
          : null,
      text,
    };
  };
  const login: Login = async (email) => {
    const response = await request("login", undefined, "POST", {
      email,
      password: "premiere-demo",
    });
    assert.equal(response.status, 200, response.text);
    return {
      cookie: response.headers.get("set-cookie")!.split(";")[0]!,
      accountId: response.data.account.id,
    };
  };
  try {
    await run(app, request, login);
  } finally {
    await new Promise<void>((done, reject) =>
      app.server.close((error) => (error ? reject(error) : done())),
    );
    app.store.close();
    const resolved = resolve(directory);
    assert.ok(
      resolved.startsWith(resolve(tmpdir()) + "\\") ||
        resolved.startsWith(resolve(tmpdir()) + "/"),
    );
    assert.ok(resolved.includes("mypremiere-security-"));
    rmSync(resolved, { recursive: true, force: true });
  }
}

type Result = { status: number; headers: Headers; data: any; text: string };
type Requester = (
  path: string,
  client?: Client,
  method?: string,
  value?: unknown,
  headers?: HeadersInit,
) => Promise<Result>;
type Login = (email: string) => Promise<Client>;

test("private endpoints require an authenticated session and reject cross-site mutations", async () => {
  await environment(async (_app, request, login) => {
    for (const path of [
      "bootstrap",
      "videos",
      "moments",
      "playback/demo-video-1",
      "assets/" + "a".repeat(32),
    ]) {
      assert.equal((await request(path)).status, 401, path);
    }
    const owner = await login("demo@example.test");
    const response = await request(
      "tenant",
      owner,
      "PATCH",
      { name: "Cross-site mutation" },
      { origin: "https://outside.example" },
    );
    assert.equal(response.status, 403);
  });
});

test("object IDs, foreign references and body tenant IDs cannot cross archive boundaries", async () => {
  await environment(async (app, request, login) => {
    const owner = await login("demo@example.test");
    const other = await login("other@example.test");
    const original = app.store.get("other", "videos", "other-video-1")!;
    for (const method of ["GET", "PATCH", "DELETE"]) {
      const result = await request(
        "videos/other-video-1",
        owner,
        method,
        method === "GET"
          ? undefined
          : { title: "Unauthorised change", tenantId: "other" },
      );
      assert.equal(result.status, 404, `${method} foreign video`);
    }
    assert.equal((await request("playback/other-video-1", owner)).status, 404);
    assert.equal(
      (
        await request("videos/demo-video-1", owner, "PATCH", {
          collectionIds: ["other-collection-1"],
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("moments", owner, "POST", {
          title: "Foreign source",
          videoId: "other-video-1",
          start: 1,
          end: 5,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("channels", owner, "POST", {
          name: "Foreign channel",
          collectionIds: ["other-collection-1"],
        })
      ).status,
      400,
    );
    const created = await request("collections", owner, "POST", {
      title: "Local collection",
      tenantId: "other",
      tenant_id: "other",
      id: "other-collection-1",
    });
    assert.equal(created.status, 201, created.text);
    assert.ok(app.store.get("demo", "collections", created.data.id));
    assert.equal(
      (await request(`collections/${created.data.id}`, other)).status,
      404,
    );
    assert.equal(
      app.store.get("other", "videos", "other-video-1")!.title,
      original.title,
    );
  });
});

test("restricted source videos hide their moments, stories, transcripts, chapters and search matches", async () => {
  await environment(async (app, request, login) => {
    const viewer = await login("viewer@example.test");
    const video = app.store.get("demo", "videos", "demo-video-1")!;
    app.store.put("demo", "videos", {
      ...video,
      title: "PRIVATE-REFERENCE",
      visibility: "admin",
    });
    for (const resource of ["moments", "stories", "transcripts", "chapters"]) {
      const item = app.store.put("demo", resource, {
        title: "PRIVATE-REFERENCE",
        text: "PRIVATE-REFERENCE",
        videoId: video.id,
        start: 1,
        end: 5,
        approved: true,
        visibility: "all",
      });
      assert.equal(
        (await request(`${resource}/${item.id}`, viewer)).status,
        404,
        resource,
      );
      assert.equal(
        (await request(resource, viewer)).text.includes("PRIVATE-REFERENCE"),
        false,
        resource,
      );
    }
    assert.equal((await request(`videos/${video.id}`, viewer)).status, 404);
    assert.equal((await request(`playback/${video.id}`, viewer)).status, 404);
    assert.equal(
      (await request("search?q=PRIVATE-REFERENCE", viewer)).text.includes(
        "PRIVATE-REFERENCE",
      ),
      false,
    );
    assert.equal(
      (await request("bootstrap", viewer)).text.includes("PRIVATE-REFERENCE"),
      false,
    );
  });
});

test("shared programmes and persisted queues do not expose inaccessible video references", async () => {
  await environment(async (app, request, login) => {
    const viewer = await login("viewer@example.test");
    const video = app.store.get("demo", "videos", "demo-video-1")!;
    app.store.put("demo", "videos", { ...video, visibility: "admin" });
    const item = {
      videoId: video.id,
      title: "PRIVATE-PROGRAMME-ITEM",
      start: 1,
      end: 5,
    };
    app.store.put("demo", "programmes", {
      title: "Evening programme",
      hostId: "demo-owner",
      queue: [item],
      suggestions: [item],
      status: "draft",
    });
    app.store.put("demo", "queues", {
      channelId: "demo-channel",
      accountId: "demo-owner",
      queue: [item],
      history: [item],
    });
    for (const path of ["programmes", "queues", "bootstrap"]) {
      assert.equal(
        (await request(path, viewer)).text.includes("PRIVATE-PROGRAMME-ITEM"),
        false,
        path,
      );
    }
  });
});

test("a programme suggestion must be visible to the suggesting account", async () => {
  await environment(async (app, request, login) => {
    const viewer = await login("viewer@example.test");
    const video = app.store.get("demo", "videos", "demo-video-1")!;
    app.store.put("demo", "videos", { ...video, visibility: "admin" });
    const programme = app.store.put("demo", "programmes", {
      title: "Evening programme",
      hostId: "demo-owner",
      queue: [],
      suggestions: [],
    });
    const result = await request(
      `programmes/${programme.id}`,
      viewer,
      "PATCH",
      { suggestion: { videoId: video.id, title: "Private suggestion" } },
    );
    assert.ok([400, 403, 404].includes(result.status), result.text);
  });
});

test("saved playback queues recheck source permissions after access is revoked", async () => {
  await environment(async (app, request, login) => {
    const viewer = await login("viewer@example.test");
    const video = app.store.get("demo", "videos", "demo-video-1")!;
    const queue = app.store.put("demo", "queues", {
      channelId: "demo-channel",
      accountId: viewer.accountId,
      queue: [
        {
          videoId: video.id,
          title: "REVOKED-QUEUE-METADATA",
          start: 1,
          end: 5,
        },
      ],
      history: [{ videoId: video.id, title: "REVOKED-QUEUE-METADATA" }],
    });
    app.store.put("demo", "videos", { ...video, visibility: "admin" });
    for (const path of [`queues/${queue.id}`, "queues", "bootstrap"]) {
      assert.equal(
        (await request(path, viewer)).text.includes("REVOKED-QUEUE-METADATA"),
        false,
        path,
      );
    }
  });
});

test("shared queues respect a saved moment audience independently of its source film", async () => {
  await environment(async (app, request, login) => {
    const viewer = await login("viewer@example.test");
    const moment = app.store.get("demo", "moments", "demo-moment-1")!;
    app.store.put("demo", "moments", {
      ...moment,
      visibility: "admin",
      title: "PRIVATE-MOMENT-CONTEXT",
    });
    const item = {
      momentId: moment.id,
      videoId: moment.videoId,
      title: "PRIVATE-MOMENT-CONTEXT",
      start: moment.start,
      end: moment.end,
    };
    app.store.put("demo", "programmes", {
      title: "Evening programme",
      hostId: "demo-owner",
      queue: [item],
      suggestions: [item],
    });
    app.store.put("demo", "queues", {
      channelId: "demo-channel",
      accountId: viewer.accountId,
      queue: [item],
      history: [item],
    });
    for (const path of ["programmes", "queues", "bootstrap"]) {
      assert.equal(
        (await request(path, viewer)).text.includes("PRIVATE-MOMENT-CONTEXT"),
        false,
        path,
      );
    }
  });
});

test("viewing profiles and injected roles cannot grant management rights", async () => {
  await environment(async (app, request, login) => {
    const viewer = await login("viewer@example.test");
    for (const [path, method, body] of [
      [
        "tenant",
        "PATCH",
        { name: "Escalation", role: "owner", accountId: "demo-owner" },
      ],
      ["profiles/demo-profile", "PATCH", { name: "Escalation", role: "owner" }],
      ["videos/demo-video-1", "PATCH", { title: "Escalation", role: "owner" }],
      ["accounts/demo-viewer", "PATCH", { role: "owner" }],
      ["invitations", "POST", { email: "new@example.test", role: "owner" }],
    ] as const) {
      assert.equal(
        (await request(path, viewer, method, body)).status,
        403,
        path,
      );
    }
    const membership = app.store.db
      .prepare(
        "SELECT role FROM memberships WHERE tenant_id=? AND account_id=?",
      )
      .get("demo", "demo-viewer") as { role: string };
    assert.equal(membership.role, "viewer");
    const session = await request("session", viewer);
    assert.equal(session.data.account.role, "viewer");
  });
});

test("viewer sign-in never serialises unpublished archive settings", async () => {
  await environment(async (app, request) => {
    const tenant = app.store.tenant("demo");
    app.store.saveTenant("demo", {
      ...tenant,
      draft: { ...tenant.draft, name: "UNPUBLISHED-IDENTITY" },
    });
    const result = await request("login", undefined, "POST", {
      email: "viewer@example.test",
      password: "premiere-demo",
    });
    assert.equal(result.status, 200);
    assert.equal(result.text.includes("UNPUBLISHED-IDENTITY"), false);
    assert.equal(Object.hasOwn(result.data.tenant, "draft"), false);
  });
});

test("asset access inherits archive and source-video visibility", async () => {
  await environment(async (app, request, login) => {
    const owner = await login("demo@example.test");
    const viewer = await login("viewer@example.test");
    const other = await login("other@example.test");
    const created = app.store.get("demo", "videos", "demo-video-1")!;
    const fileId = "f".repeat(32);
    // An inaccessible asset is rejected before file existence is checked.
    app.store.db
      .prepare("INSERT INTO assets VALUES(?,?,?,?,?,?,?,?)")
      .run(
        fileId,
        "demo",
        "private.png",
        "image/png",
        100,
        join(app.store.directory, "assets", fileId),
        "artwork",
        new Date().toISOString(),
      );
    app.store.put("demo", "videos", {
      ...created,
      visibility: "admin",
      poster: `/api/assets/${fileId}`,
    });
    assert.equal((await request(`assets/${fileId}`, viewer)).status, 404);
    assert.equal((await request(`assets/${fileId}`, other)).status, 404);
    const foreign = await request("videos/other-video-1", other, "PATCH", {
      poster: `/api/assets/${fileId}`,
    });
    assert.ok([400, 404].includes(foreign.status), foreign.text);
    const metadata = await request("videos/demo-video-1", owner, "PATCH", {
      assetId: "e".repeat(32),
    });
    assert.ok([200, 400, 404].includes(metadata.status), metadata.text);
    assert.notEqual(
      app.store.get("demo", "videos", "demo-video-1")!.assetId,
      "e".repeat(32),
      "metadata editing must never reassign a protected source asset",
    );
  });
});

test("guest contribution links expose upload policy only, expire and cannot browse an archive", async () => {
  await environment(async (app, request, login) => {
    const owner = await login("demo@example.test");
    const viewer = await login("viewer@example.test");
    const link = await request("contribution-links", owner, "POST", {
      eventName: "Event contributions",
      collectionId: "demo-collection-1",
      maxUploads: 1,
      maxBytes: 1024,
    });
    assert.equal(link.status, 201, link.text);
    assert.ok(link.data.token);
    const guest = await request(`guest/${link.data.token}`);
    assert.equal(guest.status, 200);
    for (const privateKey of [
      "tenant_id",
      "tenantId",
      "collectionId",
      "tokenHash",
      "hash",
      "contributions",
      "videos",
      "accounts",
    ]) {
      assert.equal(Object.hasOwn(guest.data, privateKey), false, privateKey);
    }
    const bootstrap = await request("bootstrap", viewer);
    assert.deepEqual(bootstrap.data.links, []);
    assert.deepEqual(bootstrap.data.contributions, []);
    assert.equal(bootstrap.text.includes(link.data.token), false);
    assert.equal(
      (
        await request("videos", {
          cookie: `mpp_session=${link.data.token}`,
          accountId: "",
        })
      ).status,
      401,
    );
    app.store.db
      .prepare("UPDATE tokens SET expires_at=? WHERE hash=?")
      .run(Date.now() - 1000, link.data.tokenHash);
    assert.equal((await request(`guest/${link.data.token}`)).status, 404);
  });
});

test("server time gates premiere playback and Gathering Mode constrains related resources", async () => {
  await environment(async (app, request, login) => {
    const viewer = await login("viewer@example.test");
    const video = app.store.get("demo", "videos", "demo-video-1")!;
    const premiere = app.store.put("demo", "premieres", {
      title: "Future screening",
      videoId: video.id,
      releaseAt: new Date(Date.now() + 86400000).toISOString(),
      published: true,
      visibility: "all",
      gathering: true,
    });
    assert.equal(
      (await request(`playback/${video.id}?now=9999999999999`, viewer)).status,
      404,
    );
    app.store.put("demo", "premieres", {
      ...premiere,
      releaseAt: new Date(Date.now() - 1000).toISOString(),
    });
    assert.equal((await request(`playback/${video.id}`, viewer)).status, 200);
    app.store.put("demo", "videos", {
      ...video,
      gathering: false,
      title: "GATHERING-PRIVATE",
    });
    assert.equal(
      (await request("gathering", viewer, "POST", { enabled: true })).status,
      200,
    );
    assert.equal((await request(`videos/${video.id}`, viewer)).status, 404);
    assert.equal((await request(`playback/${video.id}`, viewer)).status, 404);
    assert.equal(
      (await request("search?q=GATHERING-PRIVATE", viewer)).text.includes(
        "GATHERING-PRIVATE",
      ),
      false,
    );
    const queue = await request("channels/demo-channel/mix", viewer, "POST", {
      mode: "mix",
      minutes: 30,
    });
    assert.equal(queue.status, 200, queue.text);
    assert.equal(
      queue.data.queue.some((item: any) => item.videoId === video.id),
      false,
    );
  });
});

test("voice contributions allow viewer-owned staging without granting general upload or private file access", async () => {
  await environment(async (app, request, login) => {
    const viewer = await login("viewer@example.test");
    const owner = await login("demo@example.test");
    const original = app.store.db
      .prepare("SELECT password_hash FROM accounts WHERE id=?")
      .get("demo-viewer") as { password_hash: string };
    app.store.db
      .prepare("INSERT INTO accounts VALUES(?,?,?,?,?)")
      .run(
        "second-viewer",
        "second@example.test",
        "Second viewer",
        original.password_hash,
        new Date().toISOString(),
      );
    app.store.db
      .prepare("INSERT INTO memberships VALUES(?,?,?)")
      .run("demo", "second-viewer", "viewer");
    const second = await login("second@example.test");
    const wav = Buffer.alloc(46);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(38, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8000, 24);
    wav.writeUInt32LE(16000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(2, 40);
    const upload = await request("uploads", viewer, "POST", wav, {
      "x-upload-purpose": "voice",
      "x-file-name": "memory.wav",
      "content-type": "audio/wav",
    });
    assert.equal(upload.status, 201, upload.text);
    assert.equal(
      (await request(`assets/${upload.data.asset.id}`, second)).status,
      404,
      "unsubmitted recording remains private to its uploader",
    );
    assert.equal(
      (
        await request("uploads", viewer, "POST", wav, {
          "x-upload-purpose": "video",
          "x-file-name": "pretend.mp4",
        })
      ).status,
      403,
    );
    const story = await request("stories", viewer, "POST", {
      videoId: "demo-video-1",
      text: "A voice memory",
      timestamp: 0,
      audioAssetId: upload.data.asset.id,
      approved: true,
    });
    assert.equal(story.status, 201, story.text);
    assert.equal(story.data.approved, false);
    assert.equal(
      (await request(`assets/${upload.data.asset.id}`, second)).status,
      404,
      "pending recording requires moderation",
    );
    assert.equal(
      (
        await request(`stories/${story.data.id}`, owner, "PATCH", {
          status: "approved",
          approved: true,
        })
      ).status,
      200,
    );
    const playable = await request(`assets/${upload.data.asset.id}`, second);
    assert.equal(
      playable.status,
      200,
      "approved voice is available with the visible source film",
    );
  });
});

test("published memory discovery preferences reach viewers while administrative settings stay private", async () => {
  await environment(async (_app, request, login) => {
    const owner = await login("demo@example.test");
    const viewer = await login("viewer@example.test");
    const saved = await request("settings/archive", owner, "PATCH", {
      memoryDiscovery: {
        enabled: false,
        collectionIds: [],
        excludedVideoIds: ["demo-video-1"],
        sensitiveOccasions: [],
      },
    });
    assert.equal(saved.status, 200, saved.text);
    const bootstrap = await request("bootstrap", viewer);
    assert.equal(
      (bootstrap.data.memoryDiscovery ?? bootstrap.data.tenant.memoryDiscovery)
        ?.enabled,
      false,
    );
    assert.deepEqual(bootstrap.data.settings, []);
  });
});
