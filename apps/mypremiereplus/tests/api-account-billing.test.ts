import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createApplication } from "../server/app.js";

test("account editing, owner-only demo billing and published appearance choices", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "mypremiereplus-account-"));
  const app = createApplication({ directory });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const base = `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
  const cookies: Record<string, string> = {};
  const request = async (
    path: string,
    method = "GET",
    data?: unknown,
    user = "owner",
  ) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(cookies[user] ? { cookie: cookies[user] } : {}),
        ...(data === undefined ? {} : { "content-type": "application/json" }),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
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
  for (const [user, email] of [
    ["owner", "demo@example.test"],
    ["viewer", "viewer@example.test"],
    ["other", "other@example.test"],
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
    "an account edits only its own name and email without changing roles or another user",
    async () => {
      const state = await request("/api/account", "GET", undefined, "viewer");
      assert.equal(state.status, 200);
      assert.equal(state.data.profiles.length, 3);
      assert.equal(state.data.plan.price, 14.99);
      assert.equal(state.data.account.role, "viewer");
      assert.equal(JSON.stringify(state.data).includes("password_hash"), false);
      const changed = await request(
        "/api/account",
        "PATCH",
        {
          id: "demo-owner",
          name: "Fictional Viewer",
          email: "updated-viewer@example.test",
          role: "owner",
          password_hash: "attack",
        },
        "viewer",
      );
      assert.equal(changed.status, 200);
      assert.equal(changed.data.account.id, "demo-viewer");
      assert.equal(changed.data.account.role, "viewer");
      assert.equal(changed.data.account.email, "updated-viewer@example.test");
      assert.equal(
        (await request("/api/account")).data.account.name,
        "Demo Owner",
      );
      assert.equal(
        (
          await request(
            "/api/account",
            "PATCH",
            { email: "demo@example.test" },
            "viewer",
          )
        ).status,
        409,
      );
      assert.equal(
        (await request("/api/account", "PATCH", { email: "bad" }, "viewer"))
          .status,
        400,
      );
      assert.equal(
        (await request("/api/account", "PATCH", { name: "x" }, "viewer"))
          .status,
        400,
      );
    },
  );
  await t.test(
    "every member sees the demo plan; only the owner sees and edits billing details",
    async () => {
      const viewer = await request("/api/billing", "GET", undefined, "viewer");
      assert.equal(viewer.status, 200);
      assert.equal(viewer.data.plan.demo, true);
      assert.equal(viewer.data.plan.name, "Family Cinema");
      assert.equal(viewer.data.canManage, false);
      assert.equal(viewer.data.address, undefined);
      assert.equal(viewer.data.paymentMethod, undefined);
      assert.equal(viewer.data.invoices, undefined);
      assert.equal(
        (
          await request(
            "/api/billing",
            "PATCH",
            { billingName: "Attack" },
            "viewer",
          )
        ).status,
        403,
      );
      const owner = await request("/api/billing");
      assert.equal(owner.data.canManage, true);
      assert.equal(owner.data.paymentMethod.last4, "4242");
      assert.equal(owner.data.invoices.length, 3);
      assert.equal(owner.data.plan.status, "demo-active");
      const updated = await request("/api/billing", "PATCH", {
        billingName: "Example Cinema",
        address: {
          line1: "2 Fictional Street",
          city: "Imaginary Town",
          postalCode: "0000 BB",
          country: "nl",
        },
        vat: "DEMO-REFERENCE",
        cadence: "annual",
        paymentMethod: { last4: "9999" },
        status: "paid",
      });
      assert.equal(updated.status, 200);
      assert.equal(updated.data.plan.amount, 179.88);
      assert.equal(updated.data.paymentMethod.last4, "4242");
      assert.equal(updated.data.plan.status, "demo-active");
      assert.equal(updated.data.address.country, "NL");
      assert.equal(
        (await request("/api/billing", "GET", undefined, "other")).data
          .billingName,
        "Other Owner",
      );
      assert.equal(
        (await request("/api/billing", "PATCH", { cadence: "invalid" })).status,
        400,
      );
      assert.equal(
        (
          await request("/api/billing", "PATCH", {
            address: { country: "anything" },
          })
        ).status,
        400,
      );
      const bootstrap = await request(
        "/api/bootstrap",
        "GET",
        undefined,
        "viewer",
      );
      assert.equal(bootstrap.data.billing, undefined);
      assert.equal(bootstrap.data.invoices, undefined);
      assert.equal(
        JSON.stringify(bootstrap.data.tenant).includes("Fictional Street"),
        false,
      );
    },
  );
  await t.test(
    "fictional invoices are owner-only and tenant-scoped downloads",
    async () => {
      const billing = await request("/api/billing");
      const invoice = billing.data.invoices[0];
      const exported = await request("/api/billing/invoices/" + invoice.id);
      assert.equal(exported.status, 200);
      assert.equal(exported.data.demo, true);
      assert.equal(exported.data.total, 14.99);
      assert.match(exported.data.notice, /not evidence of a payment/);
      assert.equal(
        (
          await request(
            "/api/billing/invoices/" + invoice.id,
            "GET",
            undefined,
            "viewer",
          )
        ).status,
        403,
      );
      assert.equal(
        (await request("/api/billing/invoices/other-invoice-2026-11")).status,
        404,
      );
    },
  );
  await t.test(
    "ten supported palettes and fonts remain drafts until publication",
    async () => {
      assert.equal(
        (
          await request("/api/tenant", "PATCH", {
            palette: "ocean",
            font: "lora",
          })
        ).status,
        200,
      );
      let state = await request("/api/session", "GET", undefined, "viewer");
      assert.equal(state.data.tenant.palette, "midnight");
      assert.equal(state.data.tenant.font, "inter");
      assert.equal(
        (await request("/api/tenant", "PATCH", { palette: "javascript:bad" }))
          .status,
        400,
      );
      assert.equal(
        (await request("/api/tenant", "PATCH", { font: "url(https://bad)" }))
          .status,
        400,
      );
      assert.equal(
        (await request("/api/tenant/publish", "POST", {})).status,
        200,
      );
      state = await request("/api/session", "GET", undefined, "viewer");
      assert.equal(state.data.tenant.palette, "ocean");
      assert.equal(state.data.tenant.font, "lora");
      assert.equal(
        (await request("/api/session", "GET", undefined, "other")).data.tenant
          .palette,
        "midnight",
      );
    },
  );
  await t.test(
    "three published channels per archive produce genuinely filtered catalogues",
    async () => {
      const channels = await request(
        "/api/channels",
        "GET",
        undefined,
        "viewer",
      );
      assert.equal(channels.data.length, 3);
      const summer = await request(
        "/api/channels/demo-channel-summers/mix",
        "POST",
        { mode: "films", minutes: 30 },
        "viewer",
      );
      const celebration = await request(
        "/api/channels/demo-channel-celebrations/mix",
        "POST",
        { mode: "films", minutes: 30 },
        "viewer",
      );
      assert.equal(summer.status, 200);
      assert.equal(celebration.status, 200);
      assert.ok(
        summer.data.queue.length > 0 && celebration.data.queue.length > 0,
      );
      const summers = new Set(summer.data.queue.map((v: any) => v.videoId));
      const celebrations = new Set(
        celebration.data.queue.map((v: any) => v.videoId),
      );
      assert.equal(
        [...summers].some((v) => celebrations.has(v)),
        false,
      );
      assert.ok(
        [...summers].every((v) =>
          app.store
            .get("demo", "videos", v as string)!
            .collectionIds.includes("demo-collection-1"),
        ),
      );
      assert.ok(
        [...celebrations].every((v) =>
          app.store
            .get("demo", "videos", v as string)!
            .collectionIds.includes("demo-collection-2"),
        ),
      );
    },
  );
});
