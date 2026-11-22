import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createApplication } from "../server/app.js";
import { Store, hashPassword } from "../server/store.js";
const digest = (v: string) => createHash("sha256").update(v).digest("hex");

test("browser device codes are expiring, account-scoped, single-use and revocable", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "mypremiereplus-devices-"));
  const app = createApplication({ directory, demo: true });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
  const cookies: Record<string, string> = {};
  const req = async (
    path: string,
    method = "GET",
    value?: unknown,
    user = "public",
  ) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(cookies[user] ? { cookie: cookies[user] } : {}),
        ...(value === undefined ? {} : { "content-type": "application/json" }),
      },
      body: value === undefined ? undefined : JSON.stringify(value),
    });
    const cookie = response.headers.get("set-cookie");
    if (cookie) cookies[user] = cookie.split(";")[0]!;
    return { status: response.status, data: await response.json(), cookie };
  };
  t.after(async () => {
    await new Promise<void>((r) => app.server.close(() => r()));
    app.store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  for (const [user, email] of [
    ["viewer", "viewer@example.test"],
    ["owner", "demo@example.test"],
    ["other", "other@example.test"],
  ])
    assert.equal(
      (
        await req(
          "/api/login",
          "POST",
          { email, password: "premiere-demo" },
          user,
        )
      ).status,
      200,
    );
  await t.test(
    "pending and expired television-browser requests cannot create a login",
    async () => {
      const s = await req("/api/device/start", "POST", {
        deviceName: "Living room",
      });
      assert.equal(s.status, 200);
      assert.equal(s.data.deviceCode.length, 64);
      assert.equal(s.data.userCode.length, 8);
      assert.equal(s.data.interval, 3);
      assert.equal(s.cookie, null);
      const pending = await req("/api/device/poll", "POST", {
        deviceCode: s.data.deviceCode,
      });
      assert.equal(pending.data.status, "pending");
      assert.equal(pending.cookie, null);
      assert.equal((await req("/api/session")).status, 401);
      assert.equal(
        (
          await req("/api/device/approve", "POST", {
            userCode: s.data.userCode,
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await req(
            "/api/device/approve",
            "POST",
            { userCode: "ZZZZZZZZ" },
            "viewer",
          )
        ).status,
        404,
      );
      app.store.db
        .prepare(
          "UPDATE device_codes SET expires_at=? WHERE device_code_hash=?",
        )
        .run(Date.now() - 1, digest(s.data.deviceCode));
      assert.equal(
        (
          await req("/api/device/poll", "POST", {
            deviceCode: s.data.deviceCode,
          })
        ).data.status,
        "expired",
      );
      assert.equal(
        (
          await req(
            "/api/device/approve",
            "POST",
            { userCode: s.data.userCode },
            "viewer",
          )
        ).status,
        404,
      );
    },
  );
  await t.test(
    "approval binds the current account and tenant; injected owner and archive IDs are ignored",
    async () => {
      const s = await req("/api/device/start", "POST", {
        deviceName: "Viewer television",
      });
      const approve = await req(
        "/api/device/approve",
        "POST",
        {
          userCode: s.data.userCode,
          accountId: "other-owner",
          tenantId: "other",
          role: "owner",
        },
        "viewer",
      );
      assert.equal(approve.status, 200);
      const joined = await req(
        "/api/device/poll",
        "POST",
        { deviceCode: s.data.deviceCode },
        "paired",
      );
      assert.equal(joined.data.status, "approved");
      assert.ok(joined.cookie);
      assert.match(joined.cookie!, /^mpp_session=/);
      const state = await req("/api/session", "GET", undefined, "paired");
      assert.equal(state.data.account.id, "demo-viewer");
      assert.equal(state.data.account.role, "viewer");
      assert.equal(state.data.tenant.id, "demo");
      assert.equal(
        (await req("/api/playback/other-video-1", "GET", undefined, "paired"))
          .status,
        404,
      );
      const reused = await req(
        "/api/device/poll",
        "POST",
        { deviceCode: s.data.deviceCode },
        "reuser",
      );
      assert.equal(reused.data.status, "consumed");
      assert.equal(reused.cookie, null);
      assert.equal(
        (
          await req(
            "/api/device/approve",
            "POST",
            { userCode: s.data.userCode },
            "owner",
          )
        ).status,
        409,
      );
      const devices = await req("/api/devices", "GET", undefined, "paired");
      assert.equal(devices.data.devices[0].name, "Viewer television");
      const deviceId = devices.data.devices[0].id;
      assert.equal(
        (await req("/api/devices/" + deviceId, "DELETE", undefined, "other"))
          .status,
        404,
      );
      assert.equal(
        (await req("/api/devices/" + deviceId, "DELETE", undefined, "viewer"))
          .status,
        200,
      );
      assert.equal(
        (await req("/api/session", "GET", undefined, "paired")).status,
        401,
      );
    },
  );
  await t.test(
    "a phone-issued code expires and can sign in exactly once as its issuing member",
    async () => {
      const c = await req(
        "/api/device/code",
        "POST",
        { deviceName: "Tablet" },
        "viewer",
      );
      assert.equal(c.status, 200);
      assert.equal(c.data.code.length, 8);
      const first = await req(
        "/api/device/redeem",
        "POST",
        { code: c.data.code, role: "owner", tenantId: "other" },
        "tablet",
      );
      assert.equal(first.status, 200);
      assert.equal(first.data.account.id, "demo-viewer");
      assert.equal(
        (
          await req(
            "/api/device/redeem",
            "POST",
            { code: c.data.code },
            "again",
          )
        ).status,
        404,
      );
      const expired = await req("/api/device/code", "POST", {}, "owner");
      app.store.db
        .prepare("UPDATE device_codes SET expires_at=? WHERE user_code_hash=?")
        .run(Date.now() - 1, digest(expired.data.code));
      assert.equal(
        (
          await req(
            "/api/device/redeem",
            "POST",
            { code: expired.data.code },
            "expired",
          )
        ).status,
        404,
      );
      const bootstrap = await req("/api/bootstrap", "GET", undefined, "owner");
      const text = JSON.stringify(bootstrap.data);
      assert.equal(text.includes(c.data.code), false);
      assert.equal(text.includes("device_code_hash"), false);
      const stored = JSON.stringify(
        app.store.db.prepare("SELECT * FROM device_codes").all(),
      );
      assert.equal(stored.includes(c.data.code), false);
    },
  );
  await t.test(
    "watchlists persist per account and profile and reject hidden or foreign source IDs",
    async () => {
      assert.equal(
        (
          await req(
            "/api/watchlist",
            "POST",
            {
              profileId: "demo-profile",
              videos: ["demo-video-1", "demo-video-2"],
            },
            "viewer",
          )
        ).status,
        200,
      );
      assert.deepEqual(
        (
          await req(
            "/api/watchlist?profileId=demo-profile",
            "GET",
            undefined,
            "viewer",
          )
        ).data.videos,
        ["demo-video-1", "demo-video-2"],
      );
      assert.equal(
        (
          await req(
            "/api/watchlist?profileId=demo-profile-2",
            "GET",
            undefined,
            "viewer",
          )
        ).data.videos.length,
        0,
      );
      assert.equal(
        (
          await req(
            "/api/watchlist",
            "POST",
            { profileId: "other-profile", videos: [] },
            "viewer",
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await req(
            "/api/watchlist",
            "POST",
            { profileId: "demo-profile", videos: ["other-video-1"] },
            "viewer",
          )
        ).status,
        404,
      );
      assert.equal(
        app.store.db
          .prepare(
            "SELECT COUNT(*) AS n FROM watchlist_items WHERE tenant_id=? AND watchlist_id=?",
          )
          .get("demo", "demo-viewer:demo-profile")!.n,
        2,
      );
    },
  );
});

test("physical domain tables replace the legacy record table without losing customer metadata", () => {
  const directory = mkdtempSync(join(tmpdir(), "mypremiereplus-schema-"));
  const databasePath = join(directory, "legacy.db");
  const old = new DatabaseSync(databasePath);
  const timestamp = "2026-01-01T00:00:00.000Z";
  old.exec(
    readFileSync(
      new URL("../migrations/0001_initial.sql", import.meta.url),
      "utf8",
    ),
  );
  old.prepare("INSERT INTO tenants VALUES(?,?,?)").run(
    "legacy",
    JSON.stringify({
      name: "Custom Cinema",
      background: "/artwork/custom.jpg",
      draft: { name: "Unpublished Custom Cinema" },
    }),
    timestamp,
  );
  old
    .prepare("INSERT INTO accounts VALUES(?,?,?,?,?)")
    .run(
      "legacy-owner",
      "legacy@example.test",
      "Legacy Owner",
      hashPassword("legacy-demo-password"),
      timestamp,
    );
  old
    .prepare("INSERT INTO memberships VALUES(?,?,?)")
    .run("legacy", "legacy-owner", "owner");
  const values: [string, any][] = [
    ["profiles", { id: "legacy-profile", name: "Custom Profile" }],
    ["collections", { id: "legacy-collection", title: "Custom Collection" }],
    [
      "videos",
      {
        id: "legacy-video",
        title: "Custom Film",
        duration: 4,
        status: "published",
        processingStatus: "ready",
        collectionIds: ["legacy-collection"],
        poster: "/artwork/custom.jpg",
        draft: { title: "An unpublished edit" },
      },
    ],
    [
      "moments",
      {
        id: "legacy-moment",
        videoId: "legacy-video",
        title: "Custom Moment",
        start: 1,
        end: 2,
      },
    ],
  ];
  for (const [resource, value] of values)
    old
      .prepare(
        "INSERT INTO records(id,tenant_id,resource,data,created_at,updated_at) VALUES(?,?,?,?,?,?)",
      )
      .run(
        value.id,
        "legacy",
        resource,
        JSON.stringify(value),
        timestamp,
        timestamp,
      );
  old.close();
  const store = new Store(directory, databasePath);
  try {
    for (const table of [
      "videos",
      "collections",
      "moments",
      "profiles",
      "stories",
      "transcripts",
      "chapters",
      "channels",
      "video_collections",
      "channel_collections",
      "programmes",
      "programme_items",
      "premieres",
      "contributions",
      "contribution_links",
      "uploads",
      "notifications",
      "exports",
      "billing",
      "invoices",
      "history",
      "queues",
      "settings",
      "watchlists",
      "provider_configs",
      "media_assets",
      "playback_licenses",
      "access_policies",
      "devices",
      "device_codes",
      "consents",
      "recovery_records",
    ])
      assert.equal(
        (
          store.db
            .prepare("SELECT type FROM sqlite_master WHERE name=?")
            .get(table) as any
        ).type,
        "table",
        table,
      );
    assert.equal(
      (
        store.db
          .prepare("SELECT type FROM sqlite_master WHERE name='records'")
          .get() as any
      ).type,
      "view",
    );
    assert.equal(
      store.db
        .prepare("SELECT 1 FROM sqlite_master WHERE name='legacy_records_v1'")
        .get(),
      undefined,
    );
    for (const [resource, value] of values) {
      const actual = store.get("legacy", resource, value.id)!;
      for (const [key, expected] of Object.entries(value))
        assert.deepEqual(actual[key], expected, `${resource}.${key}`);
      assert.equal(actual.updatedAt, undefined);
    }
    assert.equal(
      (
        store.db
          .prepare(
            "SELECT title,recording_year FROM videos WHERE tenant_id=? AND id=?",
          )
          .get("legacy", "legacy-video") as any
      ).title,
      "Custom Film",
    );
    assert.equal(
      (
        store.db
          .prepare("SELECT COUNT(*) AS n FROM video_collections")
          .get() as any
      ).n,
      1,
    );
    store.db
      .prepare(
        "UPDATE videos SET data=json_set(data,'$.title',?) WHERE tenant_id=? AND id=?",
      )
      .run("Direct SQL title", "legacy", "legacy-video");
    assert.equal(
      store.get("legacy", "videos", "legacy-video")!.title,
      "Direct SQL title",
    );
    store.db
      .prepare("DELETE FROM video_collections WHERE tenant_id=? AND video_id=?")
      .run("legacy", "legacy-video");
    assert.deepEqual(
      store.get("legacy", "videos", "legacy-video")!.collectionIds,
      [],
    );
    store.db
      .prepare("INSERT INTO video_collections VALUES(?,?,?)")
      .run("legacy", "legacy-video", "legacy-collection");
    assert.deepEqual(
      store.get("legacy", "videos", "legacy-video")!.collectionIds,
      ["legacy-collection"],
    );
    store.db
      .prepare(
        "UPDATE records SET deleted_at=? WHERE tenant_id=? AND resource=? AND id=?",
      )
      .run(timestamp, "legacy", "videos", "legacy-video");
    assert.equal(
      (
        store.db
          .prepare("SELECT record_id FROM recovery_records WHERE tenant_id=?")
          .get("legacy") as any
      ).record_id,
      "legacy-video",
    );
    store.db
      .prepare(
        "UPDATE records SET deleted_at=NULL WHERE tenant_id=? AND resource=? AND id=?",
      )
      .run("legacy", "videos", "legacy-video");
    assert.equal(
      store.db
        .prepare("SELECT id FROM recovery_records WHERE tenant_id=?")
        .get("legacy"),
      undefined,
    );
    store.db
      .prepare("INSERT INTO tenants VALUES(?,?,?)")
      .run("foreign", JSON.stringify({ name: "Foreign" }), timestamp);
    assert.throws(
      () =>
        store.db
          .prepare(
            "INSERT INTO moments(id,tenant_id,data,created_at,updated_at) VALUES(?,?,?,?,?)",
          )
          .run(
            "bad",
            "foreign",
            JSON.stringify({
              videoId: "legacy-video",
              title: "Wrong archive",
              start: 1,
              end: 2,
            }),
            timestamp,
            timestamp,
          ),
      /FOREIGN KEY/,
    );
    assert.equal(
      (store.db.prepare("PRAGMA integrity_check").get() as any).integrity_check,
      "ok",
    );
    assert.deepEqual(store.db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
