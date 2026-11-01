import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { request as httpRequest } from "node:http";
import { createApplication } from "../server/app.js";
import { hashPassword } from "../server/store.js";
import { DEMO_STREAM_URL } from "../server/demo.js";

type Application = ReturnType<typeof createApplication>;
type Reply = { status: number; data: any; text: string; cookie: string };
type Requester = (
  path: string,
  options?: {
    method?: string;
    cookie?: string;
    body?: unknown;
    headers?: HeadersInit;
  },
) => Promise<Reply>;

async function fixture(
  demo: boolean,
  run: (
    app: Application,
    request: Requester,
    databasePath: string,
  ) => Promise<void>,
  exposeDemoAccounts = true,
) {
  const directory = mkdtempSync(join(tmpdir(), "mypremiere-dataset-security-"));
  const databasePath = join(directory, "dataset.sqlite");
  const app = createApplication({
    directory,
    databasePath,
    demo,
    exposeDemoAccounts,
  });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address();
  assert.ok(address && typeof address !== "string");
  const origin = "http://127.0.0.1:" + address.port;
  const request: Requester = async (path, options = {}) => {
    const headers = new Headers(options.headers);
    if (options.cookie) headers.set("cookie", options.cookie);
    if (options.body !== undefined)
      headers.set("content-type", "application/json");
    const response = await fetch(origin + "/api/" + path, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    return {
      status: response.status,
      data: text ? JSON.parse(text) : null,
      text,
      cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
    };
  };
  try {
    await run(app, request, databasePath);
  } finally {
    await new Promise<void>((done, reject) =>
      app.server.close((error) => (error ? reject(error) : done())),
    );
    app.store.close();
    const target = resolve(directory);
    assert.ok(
      target.startsWith(resolve(tmpdir()) + "\\") ||
        target.startsWith(resolve(tmpdir()) + "/"),
    );
    assert.ok(target.includes("mypremiere-dataset-security-"));
    rmSync(target, { recursive: true, force: true });
  }
}

test("demo sign-in directory is local-only, disabled outside demo mode, and excludes credentials", async () => {
  await fixture(false, async (_app, request) => {
    const response = await request("demo/accounts");
    assert.ok([403, 404].includes(response.status), response.text);
    assert.equal(response.text.includes("demo@example.test"), false);
  });
  await fixture(
    true,
    async (_app, request) => {
      assert.ok([403, 404].includes((await request("demo/accounts")).status));
    },
    false,
  );
  await fixture(true, async (app, request) => {
    const response = await request("demo/accounts");
    assert.equal(response.status, 200, response.text);
    for (const email of [
      "demo@example.test",
      "other@example.test",
      "third@example.test",
    ])
      assert.ok(response.text.includes(email));
    for (const account of app.store.db
      .prepare("SELECT password_hash FROM accounts")
      .all() as { password_hash: string }[])
      assert.equal(response.text.includes(account.password_hash), false);
    assert.equal(
      /password_hash|passwordHash|token_hash|tokenHash|private_key|signingPrivate|\.sqlite|\.db\b/i.test(
        response.text,
      ),
      false,
    );
    const address = app.server.address();
    assert.ok(address && typeof address !== "string");
    // Node's fetch may normalise Host; send this DNS-rebinding case through HTTP directly.
    const outside = await new Promise<{ status: number; text: string }>(
      (done, reject) => {
        const outgoing = httpRequest(
          "http://127.0.0.1:" + address.port + "/api/demo/accounts",
          { headers: { host: "outside.example" } },
          (response) => {
            let text = "";
            response.setEncoding("utf8");
            response.on("data", (chunk) => {
              text += chunk;
            });
            response.on("end", () =>
              done({ status: response.statusCode ?? 0, text }),
            );
          },
        );
        outgoing.on("error", reject);
        outgoing.end();
      },
    );
    assert.ok([403, 404].includes(outside.status), outside.text);
  });
});

test("SQL-inserted accounts and linked archive records appear immediately without restarting the server", async () => {
  await fixture(true, async (_app, request, databasePath) => {
    assert.equal(
      (await request("demo/accounts")).text.includes(
        "dataset-added@example.test",
      ),
      false,
    );
    const database = new DatabaseSync(databasePath);
    try {
      const timestamp = new Date().toISOString();
      const hash = hashPassword("dataset-demo-password");
      const identity = {
        name: "Inserted Cinema",
        slogan: "Rows become memories.",
        icon: "clapperboard",
        accent: "#e9bd67",
        theme: "classic",
        background: "/artwork/lake.svg",
        intro: false,
        homepage: ["featured", "collections"],
        demo: true,
      };
      database.exec("PRAGMA foreign_keys=ON; BEGIN");
      database
        .prepare("INSERT INTO tenants VALUES(?,?,?)")
        .run(
          "dataset-added",
          JSON.stringify({ ...identity, draft: identity }),
          timestamp,
        );
      database
        .prepare("INSERT INTO accounts VALUES(?,?,?,?,?)")
        .run(
          "dataset-added-owner",
          "dataset-added@example.test",
          "Dataset Owner",
          hash,
          timestamp,
        );
      database
        .prepare("INSERT INTO memberships VALUES(?,?,?)")
        .run("dataset-added", "dataset-added-owner", "owner");
      const video = {
        id: "dataset-video",
        title: "A row added after startup",
        year: 2015,
        recordedDate: "2015",
        datePrecision: "year",
        description: "Inserted directly into the linked SQLite dataset.",
        collectionIds: ["dataset-collection"],
        people: [],
        poster: "/artwork/lake.svg",
        duration: 4,
        status: "published",
        processingStatus: "ready",
        visibility: "all",
        gathering: true,
        familyTv: true,
        demo: true,
        url: DEMO_STREAM_URL,
      };
      const records: [string, Record<string, unknown>][] = [
        [
          "profiles",
          {
            id: "dataset-profile",
            name: "New viewing profile",
            color: "#e9bd67",
          },
        ],
        [
          "collections",
          {
            id: "dataset-collection",
            title: "Inserted collection",
            visibility: "all",
            gathering: true,
          },
        ],
        ["videos", video],
        [
          "moments",
          {
            id: "dataset-moment",
            videoId: video.id,
            title: "Inserted moment",
            start: 0.2,
            end: 1.2,
            approved: true,
            visibility: "all",
          },
        ],
        [
          "stories",
          {
            id: "dataset-story",
            videoId: video.id,
            text: "Inserted story",
            timestamp: 0.5,
            approved: true,
            status: "approved",
            visibility: "all",
          },
        ],
        [
          "transcripts",
          {
            id: "dataset-transcript",
            videoId: video.id,
            text: "A manual test caption",
            start: 0,
            end: 1,
          },
        ],
      ];
      for (const [resource, value] of records)
        database
          .prepare(
            "INSERT INTO records(id,tenant_id,resource,data,created_at,updated_at) VALUES(?,?,?,?,?,?)",
          )
          .run(
            value.id as string,
            "dataset-added",
            resource,
            JSON.stringify(value),
            timestamp,
            timestamp,
          );
      database.exec("COMMIT");
      const directory = await request("demo/accounts");
      assert.equal(directory.status, 200);
      assert.ok(directory.text.includes("dataset-added@example.test"));
      assert.equal(directory.text.includes(hash), false);
      const signIn = await request("login", {
        method: "POST",
        body: {
          email: "dataset-added@example.test",
          password: "dataset-demo-password",
        },
      });
      assert.equal(signIn.status, 200, signIn.text);
      assert.ok(signIn.cookie);
      const bootstrap = await request("bootstrap", { cookie: signIn.cookie });
      assert.equal(bootstrap.status, 200);
      assert.equal(bootstrap.data.tenant.name, identity.name);
      for (const [resource, value] of records)
        assert.ok(
          bootstrap.data[resource].some((item: any) => item.id === value.id),
          resource,
        );
      database
        .prepare(
          "UPDATE records SET data=? WHERE tenant_id=? AND resource=? AND id=?",
        )
        .run(
          JSON.stringify({
            ...video,
            title: "Edited through the open dataset",
          }),
          "dataset-added",
          "videos",
          video.id,
        );
      const reloaded = await request("videos/" + video.id, {
        cookie: signIn.cookie,
      });
      assert.equal(reloaded.data.title, "Edited through the open dataset");
      const firstOwner = await request("login", {
        method: "POST",
        body: { email: "demo@example.test", password: "premiere-demo" },
      });
      assert.equal(
        (await request("videos/" + video.id, { cookie: firstOwner.cookie }))
          .status,
        404,
      );
    } finally {
      database.close();
    }
  });
});

test("programme moment references cannot substitute a different public source to bypass moment visibility", async () => {
  await fixture(true, async (app, request) => {
    const moment = app.store.get("demo", "moments", "demo-moment-1")!;
    app.store.put("demo", "moments", { ...moment, visibility: "admin" });
    const viewer = await request("login", {
      method: "POST",
      body: { email: "viewer@example.test", password: "premiere-demo" },
    });
    const result = await request("programmes", {
      method: "POST",
      cookie: viewer.cookie,
      body: {
        title: "Mismatched source attempt",
        queue: [{ momentId: moment.id, videoId: "demo-video-2" }],
      },
    });
    assert.ok([400, 403, 404].includes(result.status), result.text);
  });
});

test("publishing an appearance discovery draft changes the canonical viewer preference only on publication", async () => {
  await fixture(true, async (_app, request) => {
    const owner = await request("login", {
      method: "POST",
      body: { email: "demo@example.test", password: "premiere-demo" },
    });
    const viewer = await request("login", {
      method: "POST",
      body: { email: "viewer@example.test", password: "premiere-demo" },
    });
    const draft = await request("tenant", {
      method: "PATCH",
      cookie: owner.cookie,
      body: { memoryDiscovery: { enabled: false } },
    });
    assert.equal(draft.status, 200, draft.text);
    assert.equal(
      (await request("session", { cookie: viewer.cookie })).data.tenant
        .memoryDiscovery.enabled,
      true,
    );
    const publish = await request("tenant/publish", {
      method: "POST",
      cookie: owner.cookie,
      body: {},
    });
    assert.equal(publish.status, 200, publish.text);
    assert.equal(
      (await request("session", { cookie: viewer.cookie })).data.tenant
        .memoryDiscovery.enabled,
      false,
    );
  });
});

test("account edits remain self-scoped and owner billing stays private to its archive", async () => {
  await fixture(true, async (app, request) => {
    const owner = await request("login", {
      method: "POST",
      body: { email: "demo@example.test", password: "premiere-demo" },
    });
    const viewer = await request("login", {
      method: "POST",
      body: { email: "viewer@example.test", password: "premiere-demo" },
    });
    const other = await request("login", {
      method: "POST",
      body: { email: "other@example.test", password: "premiere-demo" },
    });
    const privateBilling = app.store.get("demo", "billing", "subscription")!;
    app.store.put("demo", "billing", {
      ...privateBilling,
      billingName: "PRIVATE-BILLING-NAME",
      address: { ...privateBilling.address, line1: "PRIVATE-BILLING-ADDRESS" },
    });
    for (const path of ["account", "billing", "session", "bootstrap"]) {
      const value = await request(path, { cookie: viewer.cookie });
      assert.equal(value.status, 200, path);
      assert.equal(value.text.includes("PRIVATE-BILLING-"), false, path);
      assert.equal(/password_hash|passwordHash/.test(value.text), false);
    }
    assert.equal(
      (await request("billing", { cookie: owner.cookie })).data.billingName,
      "PRIVATE-BILLING-NAME",
    );
    assert.equal(
      (await request("billing", { cookie: other.cookie })).text.includes(
        "PRIVATE-BILLING-",
      ),
      false,
    );
    assert.equal(
      (
        await request("billing/invoices/demo-invoice-2026-11", {
          cookie: other.cookie,
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request("billing/invoices/demo-invoice-2026-11", {
          cookie: viewer.cookie,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request("billing", {
          cookie: viewer.cookie,
          method: "PATCH",
          body: { billingName: "Unauthorised change" },
        })
      ).status,
      403,
    );
    const edit = await request("account", {
      cookie: viewer.cookie,
      method: "PATCH",
      body: {
        name: "Viewer Own Name",
        accountId: "other-owner",
        tenantId: "other",
        role: "owner",
      },
    });
    assert.equal(edit.status, 200, edit.text);
    assert.equal(edit.data.account.name, "Viewer Own Name");
    assert.equal(edit.data.account.role, "viewer");
    const unchanged = app.store.db
      .prepare("SELECT name FROM accounts WHERE id=?")
      .get("other-owner") as { name: string };
    assert.equal(unchanged.name, "Other Owner");
    assert.equal(
      (
        await request("tenant", {
          cookie: owner.cookie,
          method: "PATCH",
          body: { font: "untrusted-url-font" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("tenant", {
          cookie: owner.cookie,
          method: "PATCH",
          body: { palette: "untrusted-css-palette" },
        })
      ).status,
      400,
    );
  });
});

test("switching stations uses their own eligible collections and guide reads preserve the active queue", async () => {
  await fixture(true, async (app, request) => {
    const viewer = await request("login", {
      method: "POST",
      body: { email: "viewer@example.test", password: "premiere-demo" },
    });
    const channels = await request("channels", { cookie: viewer.cookie });
    assert.equal(
      channels.data.filter(
        (channel: any) => channel.enabled && channel.published,
      ).length,
      3,
    );
    for (const [channelId, collectionId] of [
      ["demo-channel-summers", "demo-collection-1"],
      ["demo-channel-celebrations", "demo-collection-2"],
    ]) {
      const tuned = await request("channels/" + channelId + "/mix", {
        cookie: viewer.cookie,
        method: "POST",
        body: { mode: "mix", minutes: 30 },
      });
      assert.equal(tuned.status, 200, tuned.text);
      assert.equal(tuned.data.channelId, channelId);
      assert.ok(tuned.data.queue.length > 0);
      for (const item of tuned.data.queue)
        assert.ok(
          app.store
            .get("demo", "videos", item.videoId)!
            .collectionIds.includes(collectionId),
        );
      const queuedBefore = app.store.list("demo", "queues").length;
      await request("channels", { cookie: viewer.cookie });
      await request("bootstrap", { cookie: viewer.cookie });
      const resumed = await request("queues/" + tuned.data.id, {
        cookie: viewer.cookie,
      });
      assert.equal(
        app.store.list("demo", "queues").length,
        queuedBefore,
        "opening the guide must not generate another programme",
      );
      assert.deepEqual(resumed.data.queue, tuned.data.queue);
      assert.equal(resumed.data.index, 0);
    }
  });
});
