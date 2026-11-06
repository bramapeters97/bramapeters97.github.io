import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApplication } from "../server/app.js";

test("subfolder deployment keeps routing, sessions and static assets inside its base", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "mypremiereplus-subpath-"));
  const frontendDirectory = join(directory, "web");
  mkdirSync(join(frontendDirectory, "assets"), { recursive: true });
  writeFileSync(
    join(frontendDirectory, "index.html"),
    "<!doctype html><title>MyPremierePlus test</title>",
  );
  writeFileSync(
    join(frontendDirectory, "assets", "app.js"),
    "window.subpathTest = true;",
  );
  const app = createApplication({
    directory,
    frontendDirectory,
    basePath: "/mypremiereplus/",
  });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address() as { port: number };
  const origin = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    await new Promise<void>((resolve) => app.server.close(() => resolve()));
    app.store.close();
    rmSync(directory, { recursive: true, force: true });
  });

  const redirect = await fetch(`${origin}/mypremiereplus?create=1`, {
    redirect: "manual",
  });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get("location"), "/mypremiereplus/?create=1");

  for (const path of [
    "/",
    "/api/session",
    "/mypremiereplus-other/api/session",
    "/mypremiereplus/../api/session",
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404, path);
  }
  for (const path of [
    "/mypremiereplus/",
    "/mypremiereplus/about",
    "/mypremiereplus/legal/privacy",
    "/mypremiereplus/admin/library",
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    assert.match(await response.text(), /MyPremierePlus test/);
  }
  const script = await fetch(`${origin}/mypremiereplus/assets/app.js`);
  assert.equal(script.status, 200);
  assert.match(script.headers.get("content-type") ?? "", /text\/javascript/);
  assert.equal(await script.text(), "window.subpathTest = true;");
  const head = await fetch(`${origin}/mypremiereplus/about`, {
    method: "HEAD",
  });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");

  const unauthenticated = await fetch(`${origin}/mypremiereplus/api/session`);
  assert.equal(unauthenticated.status, 401);
  const login = await fetch(`${origin}/mypremiereplus/api/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      email: "demo@example.test",
      password: "premiere-demo",
    }),
  });
  assert.equal(login.status, 200);
  const sessionCookie = login.headers.get("set-cookie") ?? "";
  assert.match(sessionCookie, /Path=\/mypremiereplus\/;/);
  assert.match(sessionCookie, /HttpOnly/);
  assert.match(sessionCookie, /SameSite=Strict/);
  const cookie = sessionCookie.split(";")[0];
  const session = await fetch(`${origin}/mypremiereplus/api/session`, {
    headers: { cookie },
  });
  assert.equal(session.status, 200);
  assert.equal((await session.json()).account.email, "demo@example.test");

  const device = await fetch(`${origin}/mypremiereplus/api/device/start`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ deviceName: "Subfolder TV" }),
  });
  assert.equal(device.status, 200);
  assert.equal(
    (await device.json()).verificationUrl,
    "/mypremiereplus/activate",
  );

  const crossSite = await fetch(`${origin}/mypremiereplus/api/logout`, {
    method: "POST",
    headers: { cookie, origin: "https://other.example" },
  });
  assert.equal(crossSite.status, 403);
  const logout = await fetch(`${origin}/mypremiereplus/api/logout`, {
    method: "POST",
    headers: { cookie, origin },
  });
  assert.equal(logout.status, 200);
  assert.match(
    logout.headers.get("set-cookie") ?? "",
    /Path=\/mypremiereplus\/; Max-Age=0/,
  );
  const expired = await fetch(`${origin}/mypremiereplus/api/session`, {
    headers: { cookie },
  });
  assert.equal(expired.status, 401);
});

test("invalid deployment base paths fail before opening storage", () => {
  for (const basePath of [
    "mypremiereplus",
    "//mypremiereplus",
    "/a//b",
    "/a/../b",
    "/a?b",
    "/a#b",
    "/a%2fb",
    "/a; Path=/",
  ]) {
    assert.throws(() => createApplication({ basePath }), /basePath/);
  }
});
