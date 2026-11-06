import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createApplication } from "../server/app.js";

type Application = ReturnType<typeof createApplication>;
type Reply = { status: number; data: any; cookie: string };
type Requester = (
  path: string,
  value?: unknown,
  cookie?: string,
  method?: string,
) => Promise<Reply>;
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

async function fixture(
  run: (app: Application, request: Requester) => Promise<void>,
) {
  const directory = mkdtempSync(join(tmpdir(), "mypremiere-device-security-"));
  const app = createApplication({ directory, demo: true });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address();
  assert.ok(address && typeof address !== "string");
  const origin = "http://127.0.0.1:" + address.port;
  const request: Requester = async (
    path,
    value,
    cookie,
    method = value === undefined ? "GET" : "POST",
  ) => {
    const response = await fetch(origin + "/api/" + path, {
      method,
      headers: {
        ...(value === undefined ? {} : { "content-type": "application/json" }),
        ...(cookie ? { cookie } : {}),
      },
      body: value === undefined ? undefined : JSON.stringify(value),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
    };
  };
  try {
    await run(app, request);
  } finally {
    await new Promise<void>((done, reject) =>
      app.server.close((error) => (error ? reject(error) : done())),
    );
    app.store.close();
    const target = resolve(directory),
      temporaryRoot = resolve(tmpdir());
    assert.ok(
      target.startsWith(temporaryRoot + "\\") ||
        target.startsWith(temporaryRoot + "/"),
    );
    assert.ok(target.includes("mypremiere-device-security-"));
    rmSync(target, { recursive: true, force: true });
  }
}

async function login(request: Requester, email: string) {
  const response = await request("login", { email, password: "premiere-demo" });
  assert.equal(response.status, 200);
  assert.ok(response.cookie);
  return response.cookie;
}

test("device request throttles cannot create cookies or extend the original expiry", async () => {
  await fixture(async (app, request) => {
    const started = await request("device/start", {});
    const row = app.store.db
      .prepare("SELECT expires_at FROM device_codes WHERE device_code_hash=?")
      .get(digest(started.data.deviceCode))!;
    const first = await request("device/poll", {
      deviceCode: started.data.deviceCode,
    });
    const repeated = await request("device/poll", {
      deviceCode: started.data.deviceCode,
    });
    assert.equal(first.data.status, "pending");
    assert.equal(repeated.data.status, "slow_down");
    assert.equal(repeated.cookie, "");
    assert.equal(
      app.store.db
        .prepare("SELECT expires_at FROM device_codes WHERE device_code_hash=?")
        .get(digest(started.data.deviceCode))!.expires_at,
      row.expires_at,
    );
    for (let index = 1; index < 10; index++)
      assert.equal((await request("device/start", {})).status, 200);
    const limited = await request("device/start", {});
    assert.equal(limited.status, 429);
    assert.equal(limited.cookie, "");
    const viewer = await login(request, "viewer@example.test");
    for (let index = 0; index < 10; index++)
      assert.equal(
        (await request("device/approve", { userCode: "ZZZZZZZZ" }, viewer))
          .status,
        404,
      );
    assert.equal(
      (
        await request(
          "device/approve",
          { userCode: started.data.userCode },
          viewer,
        )
      ).status,
      429,
    );
    assert.equal(
      (await request("device/poll", { deviceCode: started.data.deviceCode }))
        .cookie,
      "",
    );
  });
});

test("paired sign-in uses the current role after approval rather than a stale privileged role", async () => {
  await fixture(async (_app, request) => {
    const owner = await login(request, "demo@example.test");
    assert.equal(
      (
        await request(
          "accounts/demo-viewer",
          { role: "editor" },
          owner,
          "PATCH",
        )
      ).status,
      200,
    );
    const editor = await login(request, "viewer@example.test");
    const started = await request("device/start", {});
    assert.equal(
      (
        await request(
          "device/approve",
          { userCode: started.data.userCode },
          editor,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          "accounts/demo-viewer",
          { role: "viewer" },
          owner,
          "PATCH",
        )
      ).status,
      200,
    );
    const paired = await request("device/poll", {
      deviceCode: started.data.deviceCode,
    });
    assert.equal(paired.status, 200);
    assert.equal(paired.data.account.role, "viewer");
    assert.ok(paired.cookie);
    const session = await request("session", undefined, paired.cookie);
    assert.equal(session.data.account.role, "viewer");
    assert.equal(
      (
        await request(
          "videos",
          { title: "A privileged write must fail" },
          paired.cookie,
        )
      ).status,
      403,
    );
    assert.equal(
      (await request("playback/other-video-1", undefined, paired.cookie))
        .status,
      404,
    );
  });
});

test("membership revocation between approval and consumption cannot create a device or session", async () => {
  await fixture(async (app, request) => {
    const viewer = await login(request, "viewer@example.test");
    const started = await request("device/start", {});
    assert.equal(
      (
        await request(
          "device/approve",
          { userCode: started.data.userCode },
          viewer,
        )
      ).status,
      200,
    );
    app.store.db
      .prepare("DELETE FROM memberships WHERE tenant_id=? AND account_id=?")
      .run("demo", "demo-viewer");
    const sessionsBefore = app.store.db
      .prepare("SELECT COUNT(*) AS n FROM sessions")
      .get()!.n;
    const joined = await request("device/poll", {
      deviceCode: started.data.deviceCode,
    });
    assert.ok([403, 404].includes(joined.status));
    assert.equal(joined.cookie, "");
    assert.equal(
      app.store.db
        .prepare("SELECT COUNT(*) AS n FROM devices WHERE account_id=?")
        .get("demo-viewer")!.n,
      0,
    );
    assert.equal(
      app.store.db.prepare("SELECT COUNT(*) AS n FROM sessions").get()!.n,
      sessionsBefore,
    );
    const code = app.store.db
      .prepare("SELECT status FROM device_codes WHERE device_code_hash=?")
      .get(digest(started.data.deviceCode));
    assert.ok(!code || code.status === "approved");
    assert.equal((await request("session", undefined, viewer)).status, 401);
  });
});

test("concurrent phone-code redemption creates one device and one authenticated browser", async () => {
  await fixture(async (app, request) => {
    const viewer = await login(request, "viewer@example.test");
    const issued = await request(
      "device/code",
      { deviceName: "A single paired tablet" },
      viewer,
    );
    const results = await Promise.all([
      request("device/redeem", { code: issued.data.code }),
      request("device/redeem", { code: issued.data.code }),
    ]);
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 404]);
    assert.equal(results.filter((result) => result.cookie).length, 1);
    assert.equal(
      app.store.db
        .prepare("SELECT COUNT(*) AS n FROM devices WHERE account_id=?")
        .get("demo-viewer")!.n,
      1,
    );
    const paired = results.find((result) => result.status === 200)!;
    const session = await request("session", undefined, paired.cookie);
    assert.equal(session.data.account.id, "demo-viewer");
    assert.equal(session.data.account.role, "viewer");
  });
});
