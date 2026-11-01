import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createApplication } from "../server/app.js";

test("invitations, ownership transfer, host decisions and contribution quotas", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "mypremiereplus-lifecycle-"));
  const app = createApplication({ directory });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const cookies: Record<string, string> = {};
  const req = async (
    path: string,
    method = "GET",
    data?: unknown,
    user = "owner",
    headers: Record<string, string> = {},
  ) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(cookies[user] ? { cookie: cookies[user] } : {}),
        ...(data && !Buffer.isBuffer(data)
          ? { "content-type": "application/json" }
          : {}),
        ...headers,
      },
      body:
        data === undefined
          ? undefined
          : Buffer.isBuffer(data)
            ? (data as any)
            : JSON.stringify(data),
    });
    const cookie = response.headers.get("set-cookie");
    if (cookie) cookies[user] = cookie.split(";")[0]!;
    return { status: response.status, data: await response.json() };
  };
  t.after(async () => {
    await new Promise<void>((r) => app.server.close(() => r()));
    app.store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  await req("/api/login", "POST", {
    email: "demo@example.test",
    password: "premiere-demo",
  });
  await req(
    "/api/login",
    "POST",
    { email: "viewer@example.test", password: "premiere-demo" },
    "viewer",
  );
  await t.test(
    "invitation creates only intended role, is single-use and does not send email",
    async () => {
      const invite = await req("/api/invitations", "POST", {
        email: "invited@example.test",
        role: "editor",
      });
      assert.equal(invite.status, 201);
      assert.match(invite.data.message, /No email/);
      assert.ok(invite.data.token);
      const accept = await req(
        "/api/accept-invitation",
        "POST",
        {
          token: invite.data.token,
          password: "invited-demo-password",
          name: "Invited Person",
        },
        "invited",
      );
      assert.equal(accept.status, 200);
      assert.equal(
        (await req("/api/session", "GET", undefined, "invited")).data.account
          .role,
        "editor",
      );
      assert.equal(
        (
          await req(
            "/api/accept-invitation",
            "POST",
            { token: invite.data.token, password: "invited-demo-password" },
            "reuse",
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await req("/api/invitations", "POST", {
            email: "bad@example.test",
            role: "owner",
          })
        ).status,
        400,
      );
    },
  );
  await t.test(
    "only host controls programme and viewer suggestions remain pending",
    async () => {
      const p = await req("/api/programmes", "POST", {
        title: "A family evening",
        queue: [{ videoId: "demo-video-1" }],
        status: "draft",
      });
      assert.equal(p.status, 201);
      assert.equal(
        (
          await req(
            "/api/programmes/" + p.data.id,
            "PATCH",
            { queue: [] },
            "viewer",
          )
        ).status,
        403,
      );
      const suggest = await req(
        "/api/programmes/" + p.data.id,
        "PATCH",
        {
          suggestion: {
            videoId: "demo-video-2",
            title: "My choice",
            status: "approved",
          },
        },
        "viewer",
      );
      assert.equal(suggest.status, 200);
      assert.equal(suggest.data.suggestions[0].status, "pending");
      assert.equal(
        (
          await req(
            "/api/programmes/" + p.data.id,
            "DELETE",
            undefined,
            "viewer",
          )
        ).status,
        403,
      );
      const approved = await req("/api/programmes/" + p.data.id, "PATCH", {
        queue: [...p.data.queue, { videoId: "demo-video-2" }],
        suggestions: [],
        status: "active",
      });
      assert.equal(approved.status, 200);
      assert.equal(approved.data.queue.length, 2);
    },
  );
  await t.test(
    "contribution final quota is reserved atomically and can be disabled",
    async () => {
      const link = await req("/api/contribution-links", "POST", {
        eventName: "Concurrent test",
        maxUploads: 1,
        maxBytes: 1000,
      });
      const mp4 = Buffer.concat([
        Buffer.from([0, 0, 0, 24]),
        Buffer.from("ftypisom"),
        Buffer.alloc(20),
      ]);
      const results = await Promise.all([
        req("/api/guest/" + link.data.token, "POST", mp4, "guest1", {
          "x-file-name": "one.mp4",
        }),
        req("/api/guest/" + link.data.token, "POST", mp4, "guest2", {
          "x-file-name": "two.mp4",
        }),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [201, 400]);
      const disable = await req("/api/links/" + link.data.id, "PATCH", {
        enabled: false,
      });
      assert.equal(disable.status, 200);
      assert.equal(
        (await req("/api/guest/" + link.data.token, "GET", undefined, "guest"))
          .status,
        404,
      );
    },
  );
  await t.test(
    "viewers can attach private voice recordings without obtaining general upload permission",
    async () => {
      const wav = Buffer.concat([
        Buffer.from("RIFF"),
        Buffer.from([16, 0, 0, 0]),
        Buffer.from("WAVE"),
        Buffer.alloc(24),
      ]);
      const uploaded = await req("/api/uploads", "POST", wav, "viewer", {
        "x-file-name": "voice.wav",
        "x-upload-purpose": "voice",
      });
      assert.equal(uploaded.status, 201);
      assert.equal(uploaded.data.video, undefined);
      assert.equal(
        (
          await fetch(base + uploaded.data.asset.url, {
            headers: { cookie: cookies.viewer! },
          })
        ).status,
        200,
      );
      const newMember = await req("/api/invitations", "POST", {
        email: "second-viewer@example.test",
        role: "viewer",
      });
      await req(
        "/api/accept-invitation",
        "POST",
        { token: newMember.data.token, password: "second-viewer-password" },
        "second",
      );
      assert.equal(
        (
          await fetch(base + uploaded.data.asset.url, {
            headers: { cookie: cookies.second! },
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await req(
            "/api/stories",
            "POST",
            {
              videoId: "demo-video-1",
              text: "Trying to borrow a pending recording",
              audioAssetId: uploaded.data.asset.id,
            },
            "second",
          )
        ).status,
        404,
      );
      const story = await req(
        "/api/stories",
        "POST",
        {
          videoId: "demo-video-1",
          text: "A spoken memory",
          audioAssetId: uploaded.data.asset.id,
          timestamp: 1,
        },
        "viewer",
      );
      assert.equal(story.status, 201);
      assert.equal(story.data.creatorName, "Demo Viewer");
      assert.equal(story.data.audio, uploaded.data.asset.url);
      assert.equal(
        (
          await fetch(base + uploaded.data.asset.url, {
            headers: { cookie: cookies.second! },
          })
        ).status,
        404,
      );
      await req("/api/stories/" + story.data.id, "PATCH", {
        status: "approved",
        approved: true,
      });
      assert.equal(
        (
          await fetch(base + uploaded.data.asset.url, {
            headers: { cookie: cookies.second! },
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await req("/api/uploads", "POST", wav, "viewer", {
            "x-file-name": "voice.wav",
            "x-upload-purpose": "artwork",
          })
        ).status,
        403,
      );
    },
  );
  await t.test(
    "ownership transfer requires password and acceptance by the intended member",
    async () => {
      assert.equal(
        (
          await req("/api/ownership", "POST", {
            accountId: "demo-viewer",
            password: "wrong",
          })
        ).status,
        400,
      );
      const transfer = await req("/api/ownership", "POST", {
        accountId: "demo-viewer",
        password: "premiere-demo",
      });
      assert.equal(transfer.status, 201);
      assert.equal(
        (
          await req(
            "/api/ownership/accept",
            "POST",
            { token: transfer.data.token },
            "invited",
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await req(
            "/api/ownership/accept",
            "POST",
            { token: transfer.data.token },
            "viewer",
          )
        ).status,
        200,
      );
      assert.equal(
        (await req("/api/session", "GET", undefined, "viewer")).data.account
          .role,
        "owner",
      );
      assert.equal((await req("/api/session")).status, 401);
      await req("/api/login", "POST", {
        email: "demo@example.test",
        password: "premiere-demo",
      });
      assert.equal((await req("/api/session")).data.account.role, "editor");
      assert.equal((await req("/api/export", "POST", {})).status, 403);
    },
  );
});
