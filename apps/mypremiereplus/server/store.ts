import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  DEMO_DURATION,
  DEMO_PASSWORD,
  DEMO_STREAM_ID,
  DEMO_STREAM_URL,
  DEMO_TITLES,
} from "./demo.js";
import { migrateCanonicalArtwork } from "./artwork.js";
import { tableForResource } from "./schema.js";
import { PRICING } from "../shared/pricing.js";
import {
  DEMO_VIDEO_DESCRIPTION,
  DEMO_MOMENT_DESCRIPTION,
} from "./demo-media.js";

export type Data = Record<string, any>;
export type Role = "owner" | "editor" | "viewer";
export type Actor = {
  id: string;
  tenantId: string;
  accountId: string;
  name: string;
  email: string;
  role: Role;
  gathering: boolean;
};
export const now = () => new Date().toISOString();
export const id = () => randomBytes(16).toString("hex");
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string): boolean {
  const [salt, expected] = hash.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 32);
  const wanted = Buffer.from(expected, "hex");
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

export class Store {
  db: DatabaseSync;
  directory: string;
  databasePath: string;
  constructor(
    directory = resolve(process.env.DATA_DIRECTORY || ".local"),
    databasePath?: string,
    options: { readOnly?: boolean } = {},
  ) {
    this.directory = directory;
    if (!options.readOnly) {
      mkdirSync(directory, { recursive: true });
      mkdirSync(resolve(directory, "assets"), { recursive: true });
    }
    this.databasePath = resolve(
      databasePath ?? resolve(directory, "archive.sqlite"),
    );
    if (!options.readOnly)
      mkdirSync(resolve(this.databasePath, ".."), { recursive: true });
    this.db = new DatabaseSync(this.databasePath, {
      readOnly: options.readOnly ?? false,
    });
    if (options.readOnly) {
      this.db.exec(
        "PRAGMA query_only=ON; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
      );
      if (
        !this.db
          .prepare(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='videos'",
          )
          .get()
      ) {
        this.db.close();
        throw new Error(
          "Read-only planning requires an existing schema 2 database.",
        );
      }
      return;
    }
    this.db.exec(
      "PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL);",
    );
    try {
      for (const [version, file] of [
        [1, "0001_initial.sql"],
        [2, "0002_domain_tables.sql"],
      ] as const)
        if (
          !this.db
            .prepare("SELECT 1 FROM schema_migrations WHERE version=?")
            .get(version)
        )
          this.db.exec(
            readFileSync(
              new URL(`../migrations/${file}`, import.meta.url),
              "utf8",
            ),
          );
    } catch (error) {
      try {
        this.db.exec("ROLLBACK");
      } catch {}
      this.db.close();
      throw error;
    }
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  }
  close() {
    this.db.close();
  }
  private hydrate(tenant: string, resource: string, value: Data): Data {
    if (resource === "videos")
      value.collectionIds = this.db
        .prepare(
          "SELECT collection_id AS id FROM video_collections WHERE tenant_id=? AND video_id=?",
        )
        .all(tenant, value.id)
        .map((r) => r.id);
    if (resource === "channels")
      value.collectionIds = this.db
        .prepare(
          "SELECT collection_id AS id FROM channel_collections WHERE tenant_id=? AND channel_id=?",
        )
        .all(tenant, value.id)
        .map((r) => r.id);
    if (resource === "watchlists")
      value.videos = this.db
        .prepare(
          "SELECT video_id AS id FROM watchlist_items WHERE tenant_id=? AND watchlist_id=? ORDER BY position",
        )
        .all(tenant, value.id)
        .map((r) => r.id);
    if (resource === "programmes") {
      const items = this.db
        .prepare(
          "SELECT video_id AS videoId,moment_id AS momentId,position FROM programme_items WHERE tenant_id=? AND programme_id=? ORDER BY position",
        )
        .all(tenant, value.id) as Data[];
      value.queue = items.map((item) => {
        const original = value.queue?.[item.position];
        return {
          ...(original?.videoId === item.videoId ? original : {}),
          videoId: item.videoId,
          ...(item.momentId ? { momentId: item.momentId } : {}),
        };
      });
      value.profileIds = this.db
        .prepare(
          "SELECT profile_id AS id FROM programme_profiles WHERE tenant_id=? AND programme_id=?",
        )
        .all(tenant, value.id)
        .map((r) => r.id);
    }
    return value;
  }
  list(tenant: string, resource: string, deleted = false): Data[] {
    return (
      this.db
        .prepare(
          `SELECT id,data,deleted_at FROM records WHERE tenant_id=? AND resource=? AND deleted_at IS ${deleted ? "NOT " : ""}NULL ORDER BY created_at DESC`,
        )
        .all(tenant, resource) as Data[]
    ).map((r) =>
      this.hydrate(tenant, resource, {
        ...JSON.parse(r.data),
        id: r.id,
        ...(r.deleted_at ? { deletedAt: r.deleted_at } : {}),
      }),
    );
  }
  get(
    tenant: string,
    resource: string,
    recordId: string,
    includeDeleted = false,
  ): Data | undefined {
    const row = this.db
      .prepare(
        `SELECT id,data,deleted_at FROM records WHERE tenant_id=? AND resource=? AND id=? ${includeDeleted ? "" : "AND deleted_at IS NULL"}`,
      )
      .get(tenant, resource, recordId) as Data | undefined;
    return row
      ? this.hydrate(tenant, resource, {
          ...JSON.parse(row.data),
          id: row.id,
          ...(row.deleted_at ? { deletedAt: row.deleted_at } : {}),
        })
      : undefined;
  }
  put(tenant: string, resource: string, data: Data): Data {
    const recordId = data.id ?? id();
    const value = {
      ...data,
      id: recordId,
      updatedAt: now(),
      createdAt: data.createdAt ?? now(),
    };
    const table = tableForResource(resource);
    if (table === "other_records")
      this.db
        .prepare(
          "INSERT INTO other_records(id,tenant_id,resource,data,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(tenant_id,resource,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
        )
        .run(
          recordId,
          tenant,
          resource,
          JSON.stringify(value),
          value.createdAt,
          value.updatedAt,
        );
    else
      this.db
        .prepare(
          `INSERT INTO ${table}(id,tenant_id,data,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at`,
        )
        .run(
          recordId,
          tenant,
          JSON.stringify(value),
          value.createdAt,
          value.updatedAt,
        );
    return value;
  }
  tenant(tenantId: string): Data {
    const row = this.db
      .prepare("SELECT settings FROM tenants WHERE id=?")
      .get(tenantId) as Data | undefined;
    if (!row) throw new Error("Unknown archive");
    return { id: tenantId, ...JSON.parse(row.settings) };
  }
  saveTenant(tenantId: string, value: Data) {
    const { id: ignored, ...settings } = value;
    this.db
      .prepare("UPDATE tenants SET settings=? WHERE id=?")
      .run(JSON.stringify(settings), tenantId);
    return this.tenant(tenantId);
  }
  history(
    tenant: string,
    actor: string,
    action: string,
    resource: string,
    recordId: string,
    before?: Data,
  ) {
    this.put(tenant, "history", { actor, action, resource, recordId, before });
  }
  seed() {
    this.db
      .prepare("INSERT OR IGNORE INTO demo_fixture VALUES(?,?)")
      .run("fixture", "mypremiereplus-fictional-demo-v1");
    for (const [tenantId, email, name, archive] of [
      ["demo", "demo@example.test", "Demo Owner", "The Sunday Cinema"],
      ["other", "other@example.test", "Other Owner", "The Coastal Archive"],
      ["third", "third@example.test", "Third Owner", "The Fireside Archive"],
    ]) {
      if (
        !this.db.prepare("SELECT id FROM tenants WHERE id=?").get(tenantId!)
      ) {
        const brand = {
          name: archive,
          slogan: "Our stories. Our cinema.",
          icon: "clapperboard",
          accent:
            tenantId === "other"
              ? "#8fb4d7"
              : tenantId === "third"
                ? "#bfa0c7"
                : "#e9bd67",
          theme: tenantId === "third" ? "vintage" : "classic",
          palette: "midnight",
          font: "inter",
          background:
            tenantId === "third"
              ? "/artwork/cinema.png"
              : tenantId === "other"
                ? "/artwork/coast.png"
                : "/artwork/lake.png",
          intro: true,
          homepage: ["featured", "continue", "collections"],
          memoryDiscovery: {
            enabled: true,
            collectionIds: [],
            excludedVideoIds: [],
            sensitiveOccasions: [],
          },
          storageLimitBytes: 10737418240,
          storageLimitHours: PRICING.includedHours,
          demo: true,
        };
        this.db
          .prepare("INSERT INTO tenants VALUES(?,?,?)")
          .run(
            tenantId!,
            JSON.stringify({ ...brand, draft: { ...brand } }),
            now(),
          );
        const accountId = `${tenantId}-owner`;
        this.db
          .prepare("INSERT INTO accounts VALUES(?,?,?,?,?)")
          .run(accountId, email!, name!, hashPassword(DEMO_PASSWORD), now());
        this.db
          .prepare("INSERT INTO memberships VALUES(?,?,?)")
          .run(tenantId!, accountId, "owner");
        this.put(tenantId!, "profiles", {
          id: `${tenantId}-profile`,
          name: "Everyone",
          avatar: "/artwork/profile.svg",
          color: "#e9bd67",
        });
        const categories = [
          "Holidays",
          "Celebrations",
          "Traditions",
          "Everyday",
        ];
        categories.forEach((title, n) =>
          this.put(tenantId!, "collections", {
            id: `${tenantId}-collection-${n + 1}`,
            title,
            description: `${title} from our archive.`,
            artwork: `/artwork/${["lake", "garden", "cinema", "mountains"][n]}.png`,
            priority: n,
            visibility: "all",
            allowedAccounts: [],
            gathering: true,
            homepage: true,
          }),
        );
        DEMO_TITLES.forEach(
          ([title, year, category, location, occasion, art], n) => {
            const v = this.put(tenantId!, "videos", {
              id: `${tenantId}-video-${n + 1}`,
              title:
                tenantId === "other"
                  ? `Coastal: ${title}`
                  : tenantId === "third"
                    ? `Fireside: ${title}`
                    : title,
              year,
              recordedDate: String(year),
              datePrecision: "year",
              description: DEMO_VIDEO_DESCRIPTION,
              location,
              people: [],
              occasion,
              collectionIds: [
                `${tenantId}-collection-${categories.indexOf(category) + 1}`,
              ],
              poster: `/artwork/${art === "winter" ? "cinema" : art}.png`,
              backdrop: `/artwork/${art === "winter" ? "cinema" : art}.png`,
              duration: DEMO_DURATION,
              status: n === 6 ? "ready" : n === 7 ? "draft" : "published",
              processingStatus: "ready",
              featured: n < 2,
              priority: 8 - n,
              visibility: "all",
              allowedAccounts: [],
              gathering: true,
              familyTv: true,
              demo: true,
              streamVideoId: DEMO_STREAM_ID,
              url: DEMO_STREAM_URL,
              availableAt: null,
            });
            if (n < 3)
              this.put(tenantId!, "moments", {
                id: `${tenantId}-moment-${n + 1}`,
                videoId: v.id,
                title: [
                  "A little sunshine",
                  "The journey begins",
                  "Together again",
                ][n],
                start: n * 0.5,
                end: Math.min(DEMO_DURATION, 1.5 + n * 0.5),
                description: DEMO_MOMENT_DESCRIPTION,
                familyTv: true,
                collectionIds: v.collectionIds,
                visibility: "all",
                gathering: true,
                creator: accountId,
                approved: true,
                thumbnail: v.poster,
              });
          },
        );
        this.put(tenantId!, "channels", {
          id: `${tenantId}-channel`,
          name: "The Family Channel",
          description: "A little of everything we love.",
          artwork: "/artwork/lake.png",
          mode: "mix",
          collectionIds: [],
          excludedVideoIds: [],
          excludedMomentIds: [],
          excludedIntervals: [],
          minSeconds: 30,
          maxSeconds: 90,
          minutes: 30,
          enabled: true,
          published: true,
          gathering: true,
          visibility: "all",
          allowedAccounts: [],
          overlay: true,
        });
        this.put(tenantId!, "settings", {
          id: "archive",
          notifications: false,
          recoveryDays: 30,
          memoryDiscovery: {
            enabled: true,
            collectionIds: [],
            excludedVideoIds: [],
            sensitiveOccasions: [],
          },
        });
      }
      // Add the new demo profiles on existing installations without replacing edited data.
      for (const [suffix, profileName, color] of [
        ["", "Everyone", "#e9bd67"],
        ["-2", "Alex", "#8fb4d7"],
        ["-3", "Sam", "#bfa0c7"],
      ]) {
        const profileId = `${tenantId}-profile${suffix}`;
        if (!this.get(tenantId!, "profiles", profileId, true))
          this.put(tenantId!, "profiles", {
            id: profileId,
            name: profileName,
            avatar: "/artwork/profile.svg",
            color,
          });
      }
      const settings = this.tenant(tenantId!);
      if (
        !settings.palette ||
        !settings.font ||
        !settings.draft?.palette ||
        !settings.draft?.font
      )
        this.saveTenant(tenantId!, {
          ...settings,
          palette: settings.palette ?? "midnight",
          font: settings.font ?? "inter",
          draft: {
            ...settings.draft,
            palette: settings.draft?.palette ?? settings.palette ?? "midnight",
            font: settings.draft?.font ?? settings.font ?? "inter",
          },
        });
      for (const [suffix, channelName, collection, art] of [
        ["summers", "Our Summers", 1, "lake"],
        ["celebrations", "Celebration TV", 2, "garden"],
      ]) {
        const channelId = `${tenantId}-channel-${suffix}`;
        if (!this.get(tenantId!, "channels", channelId, true))
          this.put(tenantId!, "channels", {
            id: channelId,
            name: channelName,
            description:
              suffix === "summers"
                ? "Sunny days and the journeys between them."
                : "The occasions we love to remember.",
            artwork: `/artwork/${art === "winter" ? "cinema" : art}.png`,
            mode: "mix",
            collectionIds: [`${tenantId}-collection-${collection}`],
            excludedVideoIds: [],
            excludedMomentIds: [],
            excludedIntervals: [],
            minSeconds: 30,
            maxSeconds: 90,
            minutes: 30,
            enabled: true,
            published: true,
            gathering: true,
            visibility: "all",
            allowedAccounts: [],
            overlay: true,
          });
      }
      if (!this.get(tenantId!, "billing", "subscription", true))
        this.put(tenantId!, "billing", {
          id: "subscription",
          planName: "Family Cinema",
          monthlyPrice: 14.99,
          currency: "EUR",
          cadence: "monthly",
          status: "demo-active",
          demo: true,
          nextBillingAt: "2026-12-01T00:00:00.000Z",
          billingName: name,
          address: {
            line1: "1 Example Lane",
            line2: "Fictional demonstration address",
            city: "Example Town",
            postalCode: "0000 AA",
            country: "NL",
          },
          vat: "",
          paymentMethod: { label: "Demo card", last4: "4242" },
        });
      for (const month of ["09", "10", "11"]) {
        const invoiceId = `${tenantId}-invoice-2026-${month}`;
        if (!this.get(tenantId!, "invoices", invoiceId, true))
          this.put(tenantId!, "invoices", {
            id: invoiceId,
            number: `DEMO-${tenantId.toUpperCase()}-2026${month}`,
            date: `2026-${month}-01`,
            periodStart: `2026-${month}-01`,
            total: 14.99,
            currency: "EUR",
            status: "demo",
            description:
              "Fictional Family Cinema subscription. No payment has been charged.",
            billingName: name,
            address: {
              line1: "1 Example Lane",
              line2: "Fictional demonstration address",
              city: "Example Town",
              postalCode: "0000 AA",
              country: "NL",
            },
            items: [
              {
                description: "Family Cinema · one demo month",
                quantity: 1,
                unitPrice: 14.99,
                total: 14.99,
              },
            ],
            demo: true,
          });
      }
      const mediaAssetId = `${tenantId}-sample-media`;
      if (!this.get(tenantId!, "mediaAssets", mediaAssetId, true))
        this.put(tenantId!, "mediaAssets", {
          id: mediaAssetId,
          provider: "cloudflare-demo",
          providerVideoId: DEMO_STREAM_ID,
          kind: "video",
          duration: DEMO_DURATION,
          protected: false,
          demo: true,
          note: "The single supplied public demonstration sample; customer media requires protected playback.",
        });
      for (const video of this.list(tenantId!, "videos"))
        if (video.demo && !video.mediaAssetId)
          this.db
            .prepare(
              "UPDATE videos SET data=json_set(data,'$.mediaAssetId',?) WHERE tenant_id=? AND id=?",
            )
            .run(mediaAssetId, tenantId!, video.id);
      for (const [provider, capability] of [
        ["cloudflare-stream", "Customer video upload and signed playback"],
        ["private-r2", "Private artwork, original files and voice storage"],
        ["ai-images", "Optional configured cover generation"],
        ["transcription", "Optional configured speech transcription"],
      ])
        if (!this.get(tenantId!, "providerConfigs", provider!, true))
          this.put(tenantId!, "providerConfigs", {
            id: provider,
            provider,
            configured: false,
            capability,
            demo: true,
            credentialsStoredHere: false,
          });
      if (!this.get(tenantId!, "playbackLicenses", "demo-sample", true))
        this.put(tenantId!, "playbackLicenses", {
          id: "demo-sample",
          mediaAssetId,
          provider: "cloudflare-demo",
          configured: false,
          requiresSigning: false,
          demo: true,
          note: "Public sample only; configured protected customer playback is signed per request.",
        });
      if (!this.get(tenantId!, "accessPolicies", "archive-members", true))
        this.put(tenantId!, "accessPolicies", {
          id: "archive-members",
          scope: "archive",
          visibility: "members",
          configured: false,
          demo: true,
          authoritativeSource:
            "Authenticated memberships and each resource visibility policy are enforced by the API.",
        });
      if (!this.get(tenantId!, "consents", "private-images-ai", true))
        this.put(tenantId!, "consents", {
          id: "private-images-ai",
          accountId: `${tenantId}-owner`,
          kind: "private-images-to-ai",
          granted: false,
          provider: "none",
          demo: true,
        });
      if (
        !this.get(
          tenantId!,
          "watchlists",
          `${tenantId}-owner:${tenantId}-profile`,
          true,
        )
      )
        this.put(tenantId!, "watchlists", {
          id: `${tenantId}-owner:${tenantId}-profile`,
          accountId: `${tenantId}-owner`,
          profileId: `${tenantId}-profile`,
          videos: [`${tenantId}-video-1`, `${tenantId}-video-2`],
        });
    }
    if (
      !this.db.prepare("SELECT id FROM accounts WHERE id=?").get("demo-viewer")
    ) {
      this.db
        .prepare("INSERT INTO accounts VALUES(?,?,?,?,?)")
        .run(
          "demo-viewer",
          "viewer@example.test",
          "Demo Viewer",
          hashPassword(DEMO_PASSWORD),
          now(),
        );
      this.db
        .prepare("INSERT OR IGNORE INTO memberships VALUES(?,?,?)")
        .run("demo", "demo-viewer", "viewer");
    }
    migrateCanonicalArtwork(this);
  }
}
