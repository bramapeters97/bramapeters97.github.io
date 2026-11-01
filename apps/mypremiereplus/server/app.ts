import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomBytes, createHash } from "node:crypto";
import {
  createReadStream,
  existsSync,
  statSync,
  writeFileSync,
  unlinkSync,
  readFileSync,
} from "node:fs";
import { basename, extname, resolve } from "node:path";
import {
  Store,
  hashPassword,
  verifyPassword,
  id,
  now,
  type Actor,
  type Data,
  type Role,
} from "./store.js";
import { generateQueue } from "./queue.js";
import { DEMO_STREAM_HOST, DEMO_STREAM_ID, DEMO_STREAM_URL } from "./demo.js";
import { DeviceService, DeviceError } from "./devices.js";
import { PRICING } from "../shared/pricing.js";
import { ensureWorkingDemoDatabase } from "./demo-database.js";
import { populateFictionalDataset } from "./fixture.js";
import {
  DEMO_STOCK_MEDIA,
  DEMO_MEDIA_DATASET_VERSION,
  DEMO_VIDEO_DESCRIPTION,
  DEMO_MOMENT_DESCRIPTION,
  LEGACY_DEMO_VIDEO_DESCRIPTION,
  LEGACY_DEMO_MOMENT_DESCRIPTION,
  demoMediaCredits,
  resolveDemoMedia,
  validateDemoStockManifest,
  type DemoStockClip,
} from "./demo-media.js";
import { applyDemoMediaMigration } from "./demo-media-migration.js";

const resources = new Set([
  "videos",
  "collections",
  "profiles",
  "moments",
  "stories",
  "transcripts",
  "chapters",
  "channels",
  "programmes",
  "premieres",
  "contributions",
  "links",
  "history",
  "exports",
  "settings",
  "uploads",
  "notifications",
  "queues",
]);
const viewerWrites = new Set(["moments", "stories", "programmes"]);
const administrative = new Set([
  "contributions",
  "links",
  "history",
  "exports",
  "uploads",
  "settings",
  "notifications",
]);
const videoStates = new Set([
  "draft",
  "processing",
  "ready",
  "published",
  "failed",
  "unavailable",
]);
const palettes = new Set([
  "midnight",
  "ocean",
  "aurora",
  "plum",
  "forest",
  "slate",
  "burgundy",
  "amber",
  "teal",
  "starlight",
]);
const fonts = new Set([
  "inter",
  "manrope",
  "dm-sans",
  "jakarta",
  "outfit",
  "sora",
  "lora",
  "playfair",
  "cormorant",
  "baskerville",
]);
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}
const need = (condition: unknown, message: string): void => {
  if (!condition) fail(400, message);
};
const string = (v: unknown, max = 300): string =>
  typeof v === "string" ? v.slice(0, max).trim() : "";
function headerText(value: unknown, max = 300) {
  const text = String(value ?? "");
  try {
    return string(decodeURIComponent(text), max);
  } catch {
    return string(text, max);
  }
}
const digest = (v: string) => createHash("sha256").update(v).digest("hex");
const isAdmin = (actor: Actor) =>
  actor.role === "owner" || actor.role === "editor";
function requireAdmin(actor: Actor) {
  if (!isAdmin(actor)) fail(403, "Archive management permission required.");
}
function requireOwner(actor: Actor) {
  if (actor.role !== "owner") fail(403, "Only the archive owner can do this.");
}
const safeKeys = (input: Data, keys: string[]): Data =>
  Object.fromEntries(
    keys.filter((k) => Object.hasOwn(input, k)).map((k) => [k, input[k]]),
  );
const common = [
  "title",
  "name",
  "description",
  "visibility",
  "allowedAccounts",
  "gathering",
];
const fields: Record<string, string[]> = {
  videos: [
    ...common,
    "year",
    "recordedDate",
    "datePrecision",
    "season",
    "location",
    "people",
    "occasion",
    "collectionIds",
    "poster",
    "backdrop",
    "cover",
    "coverTimestamp",
    "coverCrop",
    "coverStyle",
    "coverTitle",
    "coverYear",
    "duration",
    "status",
    "featured",
    "priority",
    "familyTv",
    "availableAt",
    "availability",
    "excludedIntervals",
    "resurface",
    "draft",
    "thumbnail",
    "coverMethod",
  ],
  collections: [...common, "artwork", "priority", "homepage", "videoIds"],
  profiles: ["name", "avatar", "color"],
  moments: [
    ...common,
    "videoId",
    "start",
    "end",
    "thumbnail",
    "familyTv",
    "collectionIds",
    "approved",
  ],
  stories: [
    ...common,
    "videoId",
    "timestamp",
    "text",
    "audio",
    "audioAssetId",
    "status",
    "approved",
  ],
  transcripts: ["videoId", "start", "end", "text", "language"],
  chapters: ["videoId", "start", "end", "title"],
  channels: [
    ...common,
    "artwork",
    "icon",
    "mode",
    "collectionIds",
    "excludedVideoIds",
    "excludedMomentIds",
    "excludedIntervals",
    "minSeconds",
    "maxSeconds",
    "minutes",
    "enabled",
    "published",
    "overlay",
    "draft",
    "selectionPreference",
  ],
  programmes: [
    "title",
    "name",
    "profileIds",
    "hostId",
    "queue",
    "suggestions",
    "status",
    "index",
  ],
  premieres: [
    ...common,
    "videoId",
    "artwork",
    "backdrop",
    "releaseAt",
    "scheduledAt",
    "timezone",
    "dedication",
    "intro",
    "introEnabled",
    "profileIds",
    "published",
    "status",
  ],
  contributions: [
    "title",
    "description",
    "contributorName",
    "status",
    "collectionIds",
    "videoId",
  ],
  settings: [
    "notifications",
    "memoryDiscovery",
    "recoveryDays",
    "storageLimitHours",
    "storageLimitBytes",
    "originalStorage",
    "homepage",
  ],
  notifications: ["read"],
};
function safeUrl(value: unknown): boolean {
  return (
    typeof value === "string" &&
    ((value.startsWith("/artwork/") && !value.includes("..")) ||
      /^\/api\/assets\/[a-f0-9]{32}$/.test(value) ||
      /^https:\/\/customer-[a-z0-9]+\.cloudflarestream\.com\/[a-f0-9]+\/thumbnails\//.test(
        value,
      ))
  );
}

async function body(req: IncomingMessage, max = 1024 * 1024): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > max) fail(413, "The file is larger than the permitted limit.");
    chunks.push(Buffer.from(part));
  }
  return Buffer.concat(chunks);
}
async function jsonBody(req: IncomingMessage): Promise<Data> {
  const data = await body(req);
  if (!data.length) return {};
  try {
    const value = JSON.parse(data.toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail(400, "An object is required.");
    return value;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    fail(400, "Invalid JSON body.");
  }
}
function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(data));
}
function cookie(
  res: ServerResponse,
  value: string,
  secure = false,
  path = "/",
) {
  res.setHeader(
    "set-cookie",
    `mpp_session=${value}; HttpOnly; SameSite=Strict; Path=${path}; Max-Age=${value ? 604800 : 0}${secure ? "; Secure" : ""}`,
  );
}

export function createApplication(
  options: {
    directory?: string;
    databasePath?: string;
    seed?: boolean;
    demo?: boolean;
    frontendDirectory?: string;
    basePath?: string;
    exposeDemoAccounts?: boolean;
    demoMediaManifest?: readonly DemoStockClip[];
  } = {},
) {
  const configuredBase = options.basePath ?? "";
  if (
    configuredBase !== "" &&
    configuredBase !== "/" &&
    !/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/?$/.test(configuredBase)
  )
    throw new Error(
      "basePath must be an absolute path containing only letters, digits, hyphens, underscores and path separators.",
    );
  const basePath = configuredBase.replace(/\/$/, "");
  const cookiePath = `${basePath}/`;
  const demo = options.demo ?? process.env.DEMO_MODE !== "false";
  const stockManifest = validateDemoStockManifest(
    options.demoMediaManifest ?? DEMO_STOCK_MEDIA,
  );
  const defaultDemoPath = resolve("demo-data", "mypremiereplus.db");
  const configuredPath =
    options.databasePath?.trim() || process.env.DB_PATH?.trim() || undefined;
  const useDefaultDemo =
    !configuredPath &&
    !options.directory &&
    !process.env.DATA_DIRECTORY &&
    demo;
  const databasePath =
    configuredPath ?? (useDefaultDemo ? defaultDemoPath : undefined);
  const demoDatabaseState =
    useDefaultDemo && options.seed !== false
      ? ensureWorkingDemoDatabase(
          defaultDemoPath,
          resolve("demo-data", "seed.db"),
        )
      : undefined;
  const store = new Store(options.directory, databasePath);
  if (options.seed !== false && demo && demoDatabaseState !== "existing")
    store.seed();
  if (options.seed !== false && demoDatabaseState === "fresh")
    populateFictionalDataset(store);
  if (
    options.seed !== false &&
    demoDatabaseState &&
    demoDatabaseState !== "existing" &&
    stockManifest.length
  )
    applyDemoMediaMigration(store, stockManifest);
  const deviceService = new DeviceService(store);
  // Account selection is explicitly restricted to this project's fictional local fixture.
  // Pointing DB_PATH or DATA_DIRECTORY at another database never exposes its accounts.
  const demoDirectory =
    demo &&
    (options.exposeDemoAccounts === true ||
      (!configuredPath &&
        !options.directory &&
        !process.env.DATA_DIRECTORY &&
        store.databasePath === defaultDemoPath));
  const attempts = new Map<string, { count: number; reset: number }>();
  function session(req: IncomingMessage): Actor {
    const sessionId = (req.headers.cookie ?? "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("mpp_session="))
      ?.slice(12);
    if (!sessionId) fail(401, "Please sign in to your archive.");
    const row = store.db
      .prepare(
        "SELECT s.id,s.tenant_id AS tenantId,s.account_id AS accountId,s.device_id AS deviceId,s.gathering,a.name,a.email,m.role FROM sessions s JOIN accounts a ON a.id=s.account_id JOIN memberships m ON m.tenant_id=s.tenant_id AND m.account_id=s.account_id WHERE s.id=? AND s.expires_at>?",
      )
      .get(digest(sessionId), Date.now()) as Data | undefined;
    if (!row) fail(401, "Your session has expired. Please sign in again.");
    if (row.deviceId)
      store.db
        .prepare(
          "UPDATE devices SET last_seen_at=? WHERE id=? AND last_seen_at<? AND revoked_at IS NULL",
        )
        .run(now(), row.deviceId, new Date(Date.now() - 60000).toISOString());
    return { ...row, gathering: !!row.gathering } as Actor;
  }
  function account(actor: Actor) {
    return {
      id: actor.accountId,
      name: actor.name,
      email: actor.email,
      role: actor.role,
    };
  }
  function billingRecord(actor: Actor): Data {
    return (
      store.get(actor.tenantId, "billing", "subscription") ?? {
        id: "subscription",
        planName: "Family Cinema",
        monthlyPrice: 14.99,
        currency: "EUR",
        cadence: "monthly",
        status: demo ? "demo-active" : "not-configured",
        demo,
        nextBillingAt: "2026-12-01T00:00:00.000Z",
        billingName: actor.name,
        address: {
          line1: "",
          line2: "",
          city: "",
          postalCode: "",
          country: "NL",
        },
        vat: "",
        paymentMethod: { label: "Demo card", last4: "4242" },
      }
    );
  }
  function safePlan(actor: Actor) {
    const b = billingRecord(actor);
    return {
      name: "Family Cinema",
      price: PRICING.monthly,
      monthlyPrice: PRICING.monthly,
      amount: b.cadence === "annual" ? PRICING.annual : PRICING.monthly,
      currency: PRICING.currency,
      cadence: b.cadence ?? "monthly",
      includedHours: PRICING.includedHours,
      storageBlockHours: PRICING.blockHours,
      extraBlockMonthly: PRICING.extraBlockMonthly,
      extraBlockAnnual: PRICING.extraBlockAnnual,
      status: demo ? "demo-active" : "not-configured",
      demo,
      nextBillingAt: demo ? b.nextBillingAt : null,
      message: demo
        ? "Demonstration subscription. No payments are charged."
        : "Billing provider is not configured.",
    };
  }
  function accountState(actor: Actor) {
    return {
      account: account(actor),
      profiles: list(actor, "profiles"),
      plan: safePlan(actor),
      devices: deviceService.list(actor),
    };
  }
  function billingState(actor: Actor) {
    const b = billingRecord(actor);
    return {
      plan: safePlan(actor),
      canManage: actor.role === "owner",
      ...(actor.role === "owner"
        ? {
            billingName: b.billingName,
            address: b.address,
            vat: b.vat,
            paymentMethod: b.paymentMethod,
            invoices: store.list(actor.tenantId, "invoices"),
          }
        : {}),
      message:
        "Local demonstration billing only. No charge, email or external account change is made.",
    };
  }
  function tenant(actor: Actor) {
    const t = store.tenant(actor.tenantId);
    const preferences = store.get(
      actor.tenantId,
      "settings",
      "archive",
    )?.memoryDiscovery;
    if (preferences)
      t.memoryDiscovery = { ...t.memoryDiscovery, ...preferences };
    if (!isAdmin(actor)) {
      delete t.draft;
      delete t.storageLimitBytes;
      delete t.storageLimitHours;
      if (t.memoryDiscovery?.audience === "admin")
        t.memoryDiscovery = { enabled: false };
    }
    return t;
  }
  function issueSession(
    res: ServerResponse,
    accountId: string,
    tenantId: string,
    device?: { id: string; name: string },
  ) {
    const token = randomBytes(32).toString("hex");
    store.db
      .prepare(
        "INSERT INTO sessions(id,tenant_id,account_id,expires_at,gathering,created_at,device_name,device_id) VALUES(?,?,?,?,?,?,?,?)",
      )
      .run(
        digest(token),
        tenantId,
        accountId,
        Date.now() + 7 * 86400000,
        0,
        now(),
        device?.name ?? "Browser session",
        device?.id ?? null,
      );
    cookie(res, token, !demo, cookiePath);
  }
  function policy(actor: Actor, value: Data): boolean {
    if (actor.gathering && !value.gathering) return false;
    if (isAdmin(actor) && !actor.gathering) return true;
    const visibility = value.visibility ?? "all";
    return (
      visibility === "all" ||
      (visibility === "selected" &&
        Array.isArray(value.allowedAccounts) &&
        value.allowedAccounts.includes(actor.accountId))
    );
  }
  function videoAllowed(actor: Actor, v: Data, playback = false): boolean {
    if (!policy(actor, v)) return false;
    for (const cid of v.collectionIds ?? []) {
      const c = store.get(actor.tenantId, "collections", cid);
      if (c && !policy(actor, c)) return false;
    }
    if (!isAdmin(actor) && v.status !== "published") return false;
    if (v.availability === "unavailable" && (!isAdmin(actor) || playback))
      return false;
    if (playback) {
      if (v.demo && !v.assetId && !resolveDemoMedia(v, stockManifest))
        return false;
      if (
        v.processingStatus !== "ready" ||
        !["published", "ready", "draft"].includes(v.status) ||
        (!isAdmin(actor) && v.status !== "published")
      )
        return false;
      const release = Date.parse(v.availableAt ?? "");
      if (Number.isFinite(release) && release > Date.now()) return false;
      if (
        store
          .list(actor.tenantId, "premieres")
          .some(
            (p) =>
              p.videoId === v.id &&
              p.published &&
              Date.parse(p.releaseAt ?? p.scheduledAt) > Date.now(),
          )
      )
        return false;
    }
    return true;
  }
  function getVideo(actor: Actor, videoId: string, playback = false): Data {
    const v = store.get(actor.tenantId, "videos", videoId);
    if (!v || !videoAllowed(actor, v, playback))
      fail(404, "Video not available.");
    const media = resolveDemoMedia(v, stockManifest);
    return media ? { ...v, duration: media.duration } : v;
  }
  function visible(actor: Actor, resource: string, value: Data): boolean {
    if (administrative.has(resource) && !isAdmin(actor)) return false;
    if (resource === "videos") return videoAllowed(actor, value);
    if (["moments", "stories", "transcripts", "chapters"].includes(resource)) {
      const v = store.get(actor.tenantId, "videos", value.videoId);
      if (!v || !videoAllowed(actor, v) || !policy(actor, value)) return false;
      if (
        resource === "stories" &&
        !isAdmin(actor) &&
        !(
          value.approved ||
          value.status === "approved" ||
          value.creator === actor.accountId
        )
      )
        return false;
    }
    if (
      resource === "channels" &&
      !isAdmin(actor) &&
      (!value.published || !value.enabled)
    )
      return false;
    if (resource === "queues") {
      if (value.accountId !== actor.accountId) return false;
      for (const item of [...(value.queue ?? []), ...(value.history ?? [])]) {
        if (!item || typeof item !== "object") continue;
        const source = store.get(actor.tenantId, "videos", item.videoId);
        if (!source || !videoAllowed(actor, source, true)) return false;
        if (item.momentId) {
          const moment = store.get(actor.tenantId, "moments", item.momentId);
          if (!moment || !visible(actor, "moments", moment)) return false;
        }
      }
    }
    if (resource === "programmes")
      return (value.queue ?? []).every((item: Data) => {
        const moment = item.momentId
          ? store.get(actor.tenantId, "moments", item.momentId)
          : undefined;
        if (item.momentId && (!moment || !visible(actor, "moments", moment)))
          return false;
        const v = store.get(
          actor.tenantId,
          "videos",
          item.videoId ?? moment?.videoId,
        );
        return !!v && videoAllowed(actor, v);
      });
    if (resource === "premieres") {
      const v = store.get(actor.tenantId, "videos", value.videoId);
      if (!v || !videoAllowed(actor, v)) return false;
    }
    if (
      resource === "collections" ||
      resource === "channels" ||
      resource === "premieres"
    )
      return policy(actor, value);
    return true;
  }
  function clean(actor: Actor, resource: string, value: Data): Data {
    const result = { ...value };
    if (resource === "videos") {
      const media = resolveDemoMedia(value, stockManifest);
      if (media) {
        result.duration = media.duration;
        result.demoMediaId = media.id;
      }
      if (result.description === LEGACY_DEMO_VIDEO_DESCRIPTION)
        result.description = DEMO_VIDEO_DESCRIPTION;
      delete result.url;
      delete result.streamVideoId;
      delete result.assetId;
      delete result.source;
      delete result.demoSource;
    }
    if (
      resource === "moments" &&
      result.description === LEGACY_DEMO_MOMENT_DESCRIPTION
    )
      result.description = DEMO_MOMENT_DESCRIPTION;
    if (result.creator) {
      const author = store.db
        .prepare(
          "SELECT a.name FROM accounts a JOIN memberships m ON m.account_id=a.id WHERE a.id=? AND m.tenant_id=?",
        )
        .get(result.creator, actor.tenantId) as Data | undefined;
      if (author) result.creatorName = author.name;
    }
    if (resource === "stories" && result.audioAssetId)
      result.audio = `/api/assets/${result.audioAssetId}`;
    if (!isAdmin(actor)) {
      delete result.allowedAccounts;
      delete result.draft;
      if (resource === "programmes") delete result.rejectedSuggestions;
    }
    if (resource === "programmes")
      result.suggestions = (result.suggestions ?? []).filter((item: Data) => {
        const m = item.momentId
          ? store.get(actor.tenantId, "moments", item.momentId)
          : undefined;
        if (item.momentId && (!m || !visible(actor, "moments", m)))
          return false;
        const v = store.get(
          actor.tenantId,
          "videos",
          item.videoId ?? m?.videoId,
        );
        return !!v && videoAllowed(actor, v);
      });
    if (resource === "collections" && result.videoIds)
      result.videoIds = result.videoIds.filter((vid: string) => {
        const v = store.get(actor.tenantId, "videos", vid);
        return !!v && videoAllowed(actor, v);
      });
    return result;
  }
  function list(actor: Actor, resource: string): Data[] {
    return store
      .list(actor.tenantId, resource)
      .filter((v) => visible(actor, resource, v))
      .map((v) => clean(actor, resource, v));
  }
  function get(actor: Actor, resource: string, recordId: string): Data {
    const value = store.get(actor.tenantId, resource, recordId);
    if (!value || !visible(actor, resource, value))
      fail(404, "This item is not available.");
    return value;
  }
  function ownReference(actor: Actor, resource: string, recordId: unknown) {
    need(
      typeof recordId === "string" &&
        !!store.get(actor.tenantId, resource, recordId),
      `Choose a valid ${resource} item from this archive.`,
    );
  }
  function validate(
    actor: Actor,
    resource: string,
    input: Data,
    previous?: Data,
  ): Data {
    const value = {
      ...(previous ?? {}),
      ...safeKeys(input, fields[resource] ?? common),
    };
    delete value.tenantId;
    delete value.tenant_id;
    for (const key of [
      "title",
      "name",
      "description",
      "text",
      "location",
      "occasion",
      "dedication",
      "intro",
    ])
      if (value[key] !== undefined) {
        need(
          typeof value[key] === "string" &&
            value[key].length <=
              (key === "text" ? 20000 : key === "description" ? 3000 : 500),
          `Invalid ${key}.`,
        );
        value[key] = value[key].trim();
      }
    if (
      [
        "videos",
        "moments",
        "premieres",
        "collections",
        "channels",
        "profiles",
      ].includes(resource)
    )
      need(!!(value.title || value.name), "A name or title is required.");
    if (value.visibility !== undefined)
      need(
        ["all", "selected", "admin"].includes(value.visibility),
        "Invalid audience.",
      );
    if (value.allowedAccounts !== undefined) {
      need(Array.isArray(value.allowedAccounts), "Choose archive members.");
      for (const a of value.allowedAccounts)
        need(
          !!store.db
            .prepare(
              "SELECT 1 FROM memberships WHERE tenant_id=? AND account_id=?",
            )
            .get(actor.tenantId, a),
          "A selected account is outside this archive.",
        );
    }
    for (const key of [
      "collectionIds",
      "excludedVideoIds",
      "excludedMomentIds",
      "profileIds",
      "people",
    ])
      if (value[key] !== undefined) {
        need(
          Array.isArray(value[key]) && value[key].length <= 200,
          `Invalid ${key}.`,
        );
        if (key === "people") {
          need(
            value[key].every(
              (p: unknown) => typeof p === "string" && p.length < 100,
            ),
            "Invalid people tags.",
          );
          continue;
        }
        const target =
          key === "collectionIds"
            ? "collections"
            : key === "excludedVideoIds"
              ? "videos"
              : key === "excludedMomentIds"
                ? "moments"
                : "profiles";
        value[key].forEach((v: unknown) => ownReference(actor, target, v));
      }
    for (const key of [
      "poster",
      "backdrop",
      "artwork",
      "thumbnail",
      "avatar",
      "audio",
    ])
      if (value[key]) {
        need(safeUrl(value[key]), `Invalid ${key} asset URL.`);
        if (String(value[key]).startsWith("/api/assets/"))
          tenantAsset(actor, String(value[key]).split("/").pop()!);
      }
    if (value.audioAssetId) {
      const asset = tenantAsset(actor, value.audioAssetId);
      need(asset.purpose === "voice", "Choose a voice commentary recording.");
    }
    if (resource === "collections" && value.videoIds) {
      need(Array.isArray(value.videoIds), "Choose videos from this archive.");
      value.videoIds.forEach((v: unknown) => ownReference(actor, "videos", v));
    }
    if (resource === "videos") {
      need(
        videoStates.has(value.status ?? "draft"),
        "Invalid publication state.",
      );
      value.status ??= "draft";
      value.processingStatus = previous?.processingStatus ?? "unavailable";
      // Media readiness is derived from the upload/provider, never a publication form.
      if (value.status === "published")
        need(
          value.processingStatus === "ready" && Number(value.duration) > 0,
          "The viewing copy must be processed before publication.",
        );
      if (value.duration !== undefined) {
        need(
          Number.isFinite(value.duration) &&
            value.duration > 0 &&
            value.duration <= 86400,
          "Invalid duration.",
        );
        if (previous?.demo) value.duration = previous.duration;
      }
      if (value.year !== null && value.year !== undefined)
        need(
          Number.isInteger(Number(value.year)) &&
            Number(value.year) >= 1800 &&
            Number(value.year) <= 2200,
          "Invalid recording year.",
        );
      if (value.datePrecision !== undefined)
        need(
          [
            "exact",
            "month",
            "year",
            "approximate",
            "season",
            "unknown",
          ].includes(value.datePrecision),
          "Invalid date precision.",
        );
      if (value.datePrecision === "exact" && value.recordedDate) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
          String(value.recordedDate),
        );
        need(!!match, "Use a real recording date.");
        const stamp = new Date(`${value.recordedDate}T00:00:00Z`);
        need(
          Number.isFinite(stamp.getTime()) &&
            stamp.toISOString().slice(0, 10) === value.recordedDate,
          "Use a real recording date.",
        );
      }
      if (value.datePrecision === "month" && value.recordedDate)
        need(
          /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value.recordedDate)),
          "Choose a real recording month.",
        );
      if (value.datePrecision === "year" && value.year)
        value.recordedDate = String(value.year);
      if (value.coverTimestamp !== undefined)
        need(
          Number.isFinite(value.coverTimestamp) &&
            value.coverTimestamp >= 0 &&
            value.coverTimestamp <= value.duration,
          "Cover timestamp is outside the film.",
        );
      if (value.availableAt)
        need(
          Number.isFinite(Date.parse(value.availableAt)),
          "Invalid availability time.",
        );
      if (input.draft !== undefined && input.draft !== null) {
        need(
          typeof input.draft === "object" &&
            !Array.isArray(input.draft) &&
            !input.draft.draft,
          "Invalid video draft.",
        );
        const draft = validate(
          actor,
          "videos",
          { ...input.draft, draft: undefined },
          previous ? { ...previous, draft: undefined } : undefined,
        );
        delete draft.draft;
        return { ...(previous ?? value), draft };
      }
    }
    if (
      ["moments", "stories", "transcripts", "chapters", "premieres"].includes(
        resource,
      )
    ) {
      ownReference(actor, "videos", value.videoId);
      const v = getVideo(actor, value.videoId);
      if (["moments", "transcripts", "chapters"].includes(resource))
        need(
          Number.isFinite(value.start) &&
            Number.isFinite(value.end) &&
            value.start >= 0 &&
            value.end > value.start &&
            value.end <= v.duration,
          "Choose an interval within the film duration.",
        );
      if (resource === "stories" && value.timestamp !== undefined)
        need(
          Number.isFinite(value.timestamp) &&
            value.timestamp >= 0 &&
            value.timestamp <= v.duration,
          "Commentary timestamp is outside the film.",
        );
      if (resource === "stories" && !isAdmin(actor)) {
        value.approved = false;
        value.status = "pending";
      }
      if (resource === "moments" && !isAdmin(actor)) value.approved = false;
      if (resource === "premieres") {
        const release = value.releaseAt ?? value.scheduledAt;
        need(
          Number.isFinite(Date.parse(release)),
          "Choose a valid scheduled release time.",
        );
        value.releaseAt = new Date(release).toISOString();
        need(
          !value.timezone ||
            (typeof value.timezone === "string" &&
              value.timezone.length <= 100),
          "Invalid timezone.",
        );
        if (value.timezone)
          try {
            new Intl.DateTimeFormat("en", {
              timeZone: value.timezone,
            }).format();
          } catch {
            fail(400, "Choose a valid time zone.");
          }
      }
    }
    if (resource === "channels") {
      need(
        ["mix", "moments", "films"].includes(value.mode ?? "mix"),
        "Invalid playback mode.",
      );
      need(
        value.minutes === undefined ||
          [0, 30, 60, 120].includes(Number(value.minutes)),
        "Invalid session length.",
      );
      if (value.minSeconds !== undefined || value.maxSeconds !== undefined)
        need(
          Number.isFinite(Number(value.minSeconds)) &&
            Number(value.minSeconds) >= 1 &&
            Number(value.maxSeconds) >= Number(value.minSeconds) &&
            Number(value.maxSeconds) <= 600,
          "Invalid excerpt length range.",
        );
      for (const x of value.excludedIntervals ?? []) {
        ownReference(actor, "videos", x.videoId);
        const v = store.get(actor.tenantId, "videos", x.videoId)!;
        need(
          Number.isFinite(x.start) &&
            Number.isFinite(x.end) &&
            x.start >= 0 &&
            x.end > x.start &&
            x.end <= v.duration,
          "Invalid excluded interval.",
        );
      }
      // Published channel remains a snapshot while drafts are edited.
      if (input.draft) {
        need(
          typeof input.draft === "object" && !Array.isArray(input.draft),
          "Invalid channel draft.",
        );
        const draft = validate(
          actor,
          resource,
          { ...input.draft, draft: undefined },
          previous ? { ...previous, draft: undefined } : undefined,
        );
        value.draft = draft;
      }
    }
    if (resource === "programmes") {
      if (!previous) value.hostId = actor.accountId;
      if (previous && previous.hostId !== actor.accountId && !isAdmin(actor)) {
        const suggestion = input.suggestion;
        if (suggestion) {
          ownReference(
            actor,
            suggestion.momentId ? "moments" : "videos",
            suggestion.momentId ?? suggestion.videoId,
          );
          const source = suggestion.momentId
            ? get(actor, "moments", suggestion.momentId).videoId
            : suggestion.videoId;
          getVideo(actor, source, true);
          return {
            ...previous,
            suggestions: [
              ...(previous.suggestions ?? []),
              {
                ...safeKeys(suggestion, ["videoId", "momentId", "title"]),
                id: id(),
                creator: actor.accountId,
                status: "pending",
              },
            ],
          };
        }
        fail(403, "Only the programme host controls the queue.");
      }
      if (value.hostId)
        need(
          !!store.db
            .prepare(
              "SELECT 1 FROM memberships WHERE tenant_id=? AND account_id=?",
            )
            .get(actor.tenantId, value.hostId),
          "Choose an archive member as host.",
        );
      need(
        Array.isArray(value.queue ?? []) && (value.queue ?? []).length <= 200,
        "Choose at most 200 programme items.",
      );
      for (const item of value.queue ?? []) {
        ownReference(
          actor,
          item.momentId ? "moments" : "videos",
          item.momentId ?? item.videoId,
        );
        const m = item.momentId
          ? get(actor, "moments", item.momentId)
          : undefined;
        if (m && item.videoId)
          need(
            item.videoId === m.videoId,
            "A saved moment must use its original source film.",
          );
        getVideo(actor, m?.videoId ?? item.videoId, true);
      }
      need(
        value.status === undefined ||
          ["draft", "active", "ended"].includes(value.status),
        "Invalid programme state.",
      );
    }
    return value;
  }
  function createToken(
    tenantId: string,
    kind: string,
    value: Data,
    expiresAt: number,
  ) {
    const raw = randomBytes(32).toString("base64url");
    store.db
      .prepare(
        "INSERT INTO tokens(hash,tenant_id,kind,data,expires_at) VALUES(?,?,?,?,?)",
      )
      .run(digest(raw), tenantId, kind, JSON.stringify(value), expiresAt);
    return raw;
  }
  function readToken(raw: string, kind: string): Data {
    const t = store.db
      .prepare(
        "SELECT * FROM tokens WHERE hash=? AND kind=? AND disabled=0 AND expires_at>?",
      )
      .get(digest(raw), kind, Date.now()) as Data | undefined;
    if (!t) fail(404, "This link has expired or is no longer available.");
    return { ...t, data: JSON.parse(t.data) };
  }
  function tenantAsset(actor: Actor, assetId: string): Data {
    const asset = store.db
      .prepare("SELECT * FROM assets WHERE id=? AND tenant_id=?")
      .get(assetId, actor.tenantId) as Data | undefined;
    if (!asset) fail(404, "File not available.");
    if (!isAdmin(actor)) {
      const videos = store.list(actor.tenantId, "videos");
      const referenced = videos.filter(
        (v) =>
          v.assetId === assetId ||
          [v.poster, v.backdrop, v.thumbnail].some(
            (url) => url === `/api/assets/${assetId}`,
          ),
      );
      const voice = store
        .list(actor.tenantId, "stories")
        .filter(
          (s) =>
            s.audio === `/api/assets/${assetId}` || s.audioAssetId === assetId,
        );
      const brand = store.tenant(actor.tenantId);
      const publicInTenant = [
        brand.background,
        brand.customIcon,
        ...store.list(actor.tenantId, "profiles").map((p) => p.avatar),
        ...store
          .list(actor.tenantId, "collections")
          .filter((c) => policy(actor, c))
          .map((c) => c.artwork),
      ].includes(`/api/assets/${assetId}`);
      const ownership = store.get(actor.tenantId, "assetOwnership", assetId);
      const ownStagedVoice =
        asset.purpose === "voice" &&
        ownership?.accountId === actor.accountId &&
        !ownership?.attached;
      if (
        !ownStagedVoice &&
        !publicInTenant &&
        !referenced.some((v) => videoAllowed(actor, v, true)) &&
        !voice.some((s) => visible(actor, "stories", s))
      )
        fail(404, "File not available.");
    }
    return asset;
  }
  function mediaType(buffer: Buffer): string | undefined {
    if (buffer.subarray(4, 8).toString() === "ftyp") return "video/mp4";
    if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))
      return "video/webm";
    if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
      return "image/jpeg";
    if (
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      return "image/png";
    if (
      buffer.subarray(0, 4).toString() === "RIFF" &&
      buffer.subarray(8, 12).toString() === "WEBP"
    )
      return "image/webp";
    if (buffer.subarray(0, 4).toString() === "OggS") return "audio/ogg";
    if (
      buffer.subarray(0, 4).toString() === "RIFF" &&
      buffer.subarray(8, 12).toString() === "WAVE"
    )
      return "audio/wav";
    if (
      buffer.subarray(0, 3).toString() === "ID3" ||
      (buffer[0] === 255 && ((buffer[1] ?? 0) & 224) === 224)
    )
      return "audio/mpeg";
    return undefined;
  }
  function mp4Duration(buffer: Buffer): number | undefined {
    for (let offset = 4; offset < buffer.length - 32; offset++) {
      if (buffer.toString("ascii", offset, offset + 4) !== "mvhd") continue;
      const version = buffer[offset + 4];
      const scaleOffset = version === 1 ? offset + 24 : offset + 16;
      const durationOffset = version === 1 ? offset + 28 : offset + 20;
      try {
        const scale = buffer.readUInt32BE(scaleOffset);
        const duration =
          version === 1
            ? Number(buffer.readBigUInt64BE(durationOffset))
            : buffer.readUInt32BE(durationOffset);
        if (scale > 0 && duration > 0 && duration / scale <= 86400)
          return duration / scale;
      } catch {}
    }
    return undefined;
  }
  async function upload(
    req: IncomingMessage,
    tenantId: string,
    purpose: string,
    limits: { maxBytes?: number; allowedTypes?: string[] } = {},
    uploaderId?: string,
  ): Promise<Data> {
    const data = await body(req, limits.maxBytes ?? 100 * 1024 * 1024);
    need(data.length > 0, "Choose a file.");
    const mime = mediaType(data);
    need(
      !!mime,
      "Unsupported file content. Use MP4, WebM, PNG, JPEG, WebP, WAV, Ogg or MP3.",
    );
    if (limits.allowedTypes)
      need(
        limits.allowedTypes.includes(mime!),
        "This file format is not permitted by the upload link.",
      );
    if (purpose === "artwork")
      need(mime!.startsWith("image/"), "Choose a supported image.");
    if (purpose === "voice")
      need(
        mime!.startsWith("audio/") || mime === "video/webm",
        "Choose a voice recording.",
      );
    if (purpose === "video")
      need(mime!.startsWith("video/"), "Choose an MP4 or WebM video.");
    if (mime!.startsWith("image/"))
      need(data.length <= 10 * 1024 * 1024, "Images must be 10 MB or smaller.");
    const usage = store.db
      .prepare(
        "SELECT COALESCE(SUM(size),0) AS bytes FROM assets WHERE tenant_id=?",
      )
      .get(tenantId) as Data;
    need(
      usage.bytes + data.length <=
        (store.tenant(tenantId).storageLimitBytes ?? 10737418240),
      "This archive has reached its storage limit.",
    );
    const assetId = id(),
      path = resolve(store.directory, "assets", assetId);
    const filename = basename(
      headerText(req.headers["x-file-name"] ?? "upload", 200),
    );
    writeFileSync(path, data, { flag: "wx" });
    store.db
      .prepare("INSERT INTO assets VALUES(?,?,?,?,?,?,?,?)")
      .run(
        assetId,
        tenantId,
        filename,
        mime!,
        data.length,
        path,
        purpose,
        now(),
      );
    if (uploaderId)
      store.put(tenantId, "assetOwnership", {
        id: assetId,
        accountId: uploaderId,
        attached: false,
      });
    return {
      id: assetId,
      url: `/api/assets/${assetId}`,
      filename,
      contentType: mime,
      size: data.length,
      duration: mime === "video/mp4" ? mp4Duration(data) : undefined,
    };
  }

  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("referrer-policy", "same-origin");
    try {
      const url = new URL(
        req.url ?? "/",
        `http://${req.headers.host ?? "localhost"}`,
      );
      if (basePath) {
        if (url.pathname === basePath) {
          res.writeHead(308, { location: `${basePath}/${url.search}` });
          res.end();
          return;
        }
        if (!url.pathname.startsWith(`${basePath}/`)) fail(404, "Not found.");
        url.pathname = url.pathname.slice(basePath.length);
      }
      const parts = url.pathname
        .split("/")
        .filter(Boolean)
        .map(decodeURIComponent);
      const method = req.method ?? "GET";
      if (!url.pathname.startsWith("/api/")) {
        if (options.frontendDirectory && ["GET", "HEAD"].includes(method)) {
          const root = resolve(options.frontendDirectory);
          let target = resolve(root, "." + url.pathname);
          if (
            target !== root &&
            !target.startsWith(root + "/") &&
            !target.startsWith(root + "\\")
          )
            fail(404, "Not found.");
          if (!existsSync(target) || statSync(target).isDirectory())
            target = resolve(root, "index.html");
          if (!existsSync(target))
            fail(404, "Build the web application first.");
          const contentType =
            (
              {
                ".html": "text/html",
                ".js": "text/javascript",
                ".css": "text/css",
                ".svg": "image/svg+xml",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".woff2": "font/woff2",
                ".ttf": "font/ttf",
                ".webmanifest": "application/manifest+json",
              } as Record<string, string>
            )[extname(target)] ?? "application/octet-stream";
          res.writeHead(200, {
            "content-type": contentType,
            "cache-control": target.endsWith("index.html")
              ? "no-cache"
              : "public, max-age=3600",
          });
          if (method === "HEAD") res.end();
          else createReadStream(target).pipe(res);
          return;
        }
        fail(404, "Not found.");
      }
      if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host)
          fail(403, "Cross-site changes are not permitted.");
        if (req.headers["sec-fetch-site"] === "cross-site")
          fail(403, "Cross-site changes are not permitted.");
      }
      const route = parts[1],
        recordId = parts[2];
      if (route === "demo" && recordId === "accounts" && method === "GET") {
        const remote = req.socket.remoteAddress ?? "";
        const hostname = url.hostname.toLowerCase();
        const loopback =
          ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote) &&
          ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);
        const marker = store.db
          .prepare("SELECT kind FROM demo_fixture WHERE id=?")
          .get("fixture") as Data | undefined;
        if (
          !demoDirectory ||
          !loopback ||
          marker?.kind !== "mypremiereplus-fictional-demo-v1"
        )
          fail(404, "Endpoint not found.");
        const accounts = (
          store.db
            .prepare(
              "SELECT id,email,name FROM accounts ORDER BY created_at,id",
            )
            .all() as Data[]
        ).map((a) => {
          const archives = (
            store.db
              .prepare(
                "SELECT t.id,t.settings,m.role FROM memberships m JOIN tenants t ON t.id=m.tenant_id WHERE m.account_id=? ORDER BY t.id",
              )
              .all(a.id) as Data[]
          ).map((t) => ({
            id: t.id,
            name: JSON.parse(t.settings).name,
            role: t.role,
            profileCount: store.list(t.id, "profiles").length,
          }));
          return {
            ...a,
            status: archives.length ? "ready" : "needs-membership",
            archives,
          };
        });
        json(res, 200, { accounts });
        return;
      }
      if (route === "health" && method === "GET") {
        json(res, 200, {
          ok: true,
          product: "MyPremierePlus",
          mode: demo ? "local-demo" : "configured",
        });
        return;
      }
      if (
        route === "device" &&
        method === "POST" &&
        ["start", "poll", "redeem"].includes(recordId ?? "")
      ) {
        if (!demo)
          fail(
            503,
            "Browser code sign-in requires a configured production identity provider.",
          );
        const input = await jsonBody(req);
        const ip = req.socket.remoteAddress ?? "local";
        const result =
          recordId === "start"
            ? deviceService.start(input, ip)
            : recordId === "poll"
              ? deviceService.poll(input, ip)
              : deviceService.redeem(input, ip);
        if (result.accountId && result.tenantId && result.device)
          issueSession(res, result.accountId, result.tenantId, result.device);
        json(res, 200, {
          ...result.body,
          ...(typeof result.body.verificationUrl === "string"
            ? { verificationUrl: `${basePath}${result.body.verificationUrl}` }
            : {}),
        });
        return;
      }
      if (route === "login" && method === "POST") {
        if (!demo)
          fail(
            503,
            "Demo authentication is disabled. Configure production identity before opening this service.",
          );
        const key = req.socket.remoteAddress ?? "local";
        let rate = attempts.get(key);
        if (!rate || rate.reset < Date.now()) {
          rate = { count: 0, reset: Date.now() + 60000 };
          attempts.set(key, rate);
        }
        if (++rate.count > 20)
          fail(429, "Too many sign-in attempts. Please wait one minute.");
        const b = await jsonBody(req);
        const a = store.db
          .prepare("SELECT * FROM accounts WHERE email=?")
          .get(string(b.email, 254).toLowerCase()) as Data | undefined;
        const m = a
          ? (store.db
              .prepare(
                "SELECT tenant_id,role FROM memberships WHERE account_id=? ORDER BY tenant_id LIMIT 1",
              )
              .get(a.id) as Data | undefined)
          : undefined;
        if (
          !a ||
          !m ||
          !verifyPassword(string(b.password, 200), a.password_hash)
        )
          fail(401, "Email or password is incorrect.");
        issueSession(res, a.id, m.tenant_id);
        const brand = store.tenant(m.tenant_id);
        if (m.role === "viewer") delete brand.draft;
        json(res, 200, {
          account: { id: a.id, name: a.name, email: a.email, role: m.role },
          tenant: brand,
        });
        return;
      }
      if (route === "archives" && method === "POST") {
        if (!demo)
          fail(
            503,
            "Account registration requires a configured production identity provider.",
          );
        const b = await jsonBody(req);
        const email = string(b.email, 254).toLowerCase();
        const password = string(b.password, 200);
        need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "Enter a valid email.");
        need(
          password.length >= 10,
          "Use a password of at least ten characters.",
        );
        need(string(b.name).length >= 2, "Choose an archive name.");
        if (
          store.db.prepare("SELECT id FROM accounts WHERE email=?").get(email)
        )
          fail(409, "This email already has an account.");
        const tenantId = id(),
          accountId = id();
        const brand = {
          name: string(b.name, 100),
          slogan: string(b.slogan ?? "Our stories. Our cinema.", 100),
          icon: "clapperboard",
          accent: "#e9bd67",
          theme: "classic",
          palette: "midnight",
          font: "inter",
          background: "/artwork/lake.png",
          intro: true,
          homepage: ["featured", "continue", "collections"],
          demo: true,
          storageLimitBytes: 10737418240,
          storageLimitHours: PRICING.includedHours,
        };
        store.db.exec("BEGIN");
        try {
          store.db
            .prepare("INSERT INTO tenants VALUES(?,?,?)")
            .run(
              tenantId,
              JSON.stringify({ ...brand, draft: { ...brand } }),
              now(),
            );
          store.db
            .prepare("INSERT INTO accounts VALUES(?,?,?,?,?)")
            .run(
              accountId,
              email,
              string(b.ownerName ?? "Archive owner", 100),
              hashPassword(password),
              now(),
            );
          store.db
            .prepare("INSERT INTO memberships VALUES(?,?,?)")
            .run(tenantId, accountId, "owner");
          store.put(tenantId, "profiles", {
            id: id(),
            name: "Everyone",
            color: "#e9bd67",
          });
          store.put(tenantId, "settings", {
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
          store.db.exec("COMMIT");
        } catch (e) {
          store.db.exec("ROLLBACK");
          throw e;
        }
        issueSession(res, accountId, tenantId);
        json(res, 201, { id: tenantId, ...brand });
        return;
      }
      if (route === "guest" && recordId) {
        const t = readToken(recordId, "contribution");
        const policy = t.data;
        if (method === "GET") {
          json(res, 200, {
            eventName: policy.eventName,
            expiresAt: new Date(t.expires_at).toISOString(),
            maxBytes: policy.maxBytes,
            allowedTypes: policy.allowedTypes,
            uploadsRemaining: Math.max(0, policy.maxUploads - t.uses),
          });
          return;
        }
        if (method === "POST") {
          // Reserve the quota before awaiting a streamed request body; parallel uploads cannot
          // all observe the same final slot. Failed validation releases the reservation.
          const reserved = store.db
            .prepare(
              "UPDATE tokens SET uses=uses+1 WHERE hash=? AND uses<? AND disabled=0 AND expires_at>?",
            )
            .run(t.hash, policy.maxUploads, Date.now());
          need(
            reserved.changes === 1,
            "This link has reached its upload limit.",
          );
          try {
            const asset = await upload(req, t.tenant_id, "video", policy);
            const contribution = store.put(t.tenant_id, "contributions", {
              title: headerText(req.headers["x-title"] ?? asset.filename, 200),
              description: headerText(req.headers["x-description"], 3000),
              contributorName: headerText(
                req.headers["x-contributor-name"],
                100,
              ),
              status: "pending",
              collectionIds: policy.collectionId ? [policy.collectionId] : [],
              assetId: asset.id,
              duration: asset.duration ?? 0,
              contentType: asset.contentType,
              tokenHash: t.hash,
            });
            json(res, 201, {
              received: true,
              id: contribution.id,
              status: "pending",
            });
          } catch (error) {
            store.db
              .prepare("UPDATE tokens SET uses=MAX(0,uses-1) WHERE hash=?")
              .run(t.hash);
            throw error;
          }
          return;
        }
        fail(405, "Method not supported.");
      }
      if (route === "accept-invitation" && method === "POST") {
        const b = await jsonBody(req);
        const t = readToken(string(b.token, 200), "invitation");
        need(t.uses === 0, "This invitation has already been used.");
        need(
          string(b.password, 200).length >= 10,
          "Use a password of at least ten characters.",
        );
        let a = store.db
          .prepare("SELECT * FROM accounts WHERE email=?")
          .get(t.data.email) as Data | undefined;
        if (a) {
          need(
            verifyPassword(string(b.password, 200), a.password_hash),
            "Sign in with the password for the invited email.",
          );
        } else {
          a = {
            id: id(),
            email: t.data.email,
            name: string(b.name ?? "Family member", 100),
          };
          store.db
            .prepare("INSERT INTO accounts VALUES(?,?,?,?,?)")
            .run(a.id, a.email, a.name, hashPassword(b.password), now());
        }
        store.db
          .prepare("INSERT OR IGNORE INTO memberships VALUES(?,?,?)")
          .run(t.tenant_id, a.id, t.data.role);
        store.db
          .prepare("UPDATE tokens SET uses=uses+1,disabled=1 WHERE hash=?")
          .run(t.hash);
        issueSession(res, a.id, t.tenant_id);
        json(res, 200, { accepted: true });
        return;
      }
      const actor = session(req);
      if (route === "demo" && recordId === "media" && method === "GET") {
        const used = store
          .list(actor.tenantId, "videos")
          .filter((v) => videoAllowed(actor, v))
          .map((v) => resolveDemoMedia(v, stockManifest));
        const ids = new Set(used.filter(Boolean).map((v) => v!.id));
        json(res, 200, {
          datasetVersion: DEMO_MEDIA_DATASET_VERSION,
          media: stockManifest
            .filter((v) => ids.has(v.id))
            .map(demoMediaCredits),
          originalFallbackUsed: ids.has("original-fallback"),
        });
        return;
      }
      if (
        route === "device" &&
        method === "POST" &&
        ["approve", "code"].includes(recordId ?? "")
      ) {
        const input = await jsonBody(req);
        const ip = req.socket.remoteAddress ?? "local";
        const result =
          recordId === "approve"
            ? deviceService.approve(actor, input, ip)
            : deviceService.issueCode(actor, input, ip);
        json(res, 200, result.body);
        return;
      }
      if (route === "devices") {
        if (method === "GET" && !recordId) {
          json(res, 200, { devices: deviceService.list(actor) });
          return;
        }
        if (method === "DELETE" && recordId) {
          json(res, 200, deviceService.revoke(actor, recordId).body);
          return;
        }
      }
      if (route === "logout" && method === "POST") {
        store.db.prepare("DELETE FROM sessions WHERE id=?").run(actor.id);
        cookie(res, "", !demo, cookiePath);
        json(res, 200, { ok: true });
        return;
      }
      if (route === "session" && method === "GET") {
        json(res, 200, {
          account: account(actor),
          tenant: tenant(actor),
          profiles: list(actor, "profiles"),
          gathering: actor.gathering,
          demo,
        });
        return;
      }
      if (route === "account") {
        if (method === "GET") {
          json(res, 200, accountState(actor));
          return;
        }
        if (method === "PATCH") {
          const b = await jsonBody(req);
          const name = b.name === undefined ? actor.name : string(b.name, 101);
          const email =
            b.email === undefined
              ? actor.email
              : string(b.email, 255).toLowerCase();
          need(
            typeof b.name === "undefined" || typeof b.name === "string",
            "Enter a valid account name.",
          );
          need(
            name.length >= 2 && name.length <= 100,
            "Choose an account name between 2 and 100 characters.",
          );
          need(
            email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
            "Enter a valid email address.",
          );
          const conflict = store.db
            .prepare("SELECT id FROM accounts WHERE email=? AND id<>?")
            .get(email, actor.accountId);
          if (conflict)
            fail(409, "Another account already uses this email address.");
          store.db
            .prepare("UPDATE accounts SET name=?,email=? WHERE id=?")
            .run(name, email, actor.accountId);
          store.history(
            actor.tenantId,
            actor.accountId,
            "update-own-account",
            "accounts",
            actor.accountId,
            { name: actor.name, email: actor.email },
          );
          json(res, 200, accountState({ ...actor, name, email }));
          return;
        }
      }
      if (route === "billing") {
        if (recordId === "invoices" && parts[3] && method === "GET") {
          requireOwner(actor);
          const invoice = store.get(actor.tenantId, "invoices", parts[3]);
          if (!invoice) fail(404, "Invoice not found.");
          res.setHeader(
            "content-disposition",
            `attachment; filename="mypremiereplus-demo-invoice.json"`,
          );
          json(res, 200, {
            ...invoice,
            archive: store.tenant(actor.tenantId).name,
            product: "MyPremierePlus",
            notice:
              "Fictional demonstration invoice. This is not evidence of a payment or a tax invoice.",
          });
          return;
        }
        if (method === "GET" && !recordId) {
          json(res, 200, billingState(actor));
          return;
        }
        if (method === "PATCH" && !recordId) {
          requireOwner(actor);
          if (!demo)
            fail(
              503,
              "A billing provider must be configured before changing a subscription.",
            );
          const b = await jsonBody(req);
          const previous = billingRecord(actor);
          const value = {
            ...previous,
            ...safeKeys(b, ["billingName", "address", "vat", "cadence"]),
          };
          need(
            typeof value.billingName === "string" &&
              value.billingName.trim().length >= 2 &&
              value.billingName.length <= 150,
            "Choose a billing name between 2 and 150 characters.",
          );
          need(
            ["monthly", "annual"].includes(value.cadence),
            "Choose a monthly or annual demo cadence.",
          );
          need(
            typeof value.vat === "string" && value.vat.length <= 40,
            "The tax reference must be 40 characters or fewer.",
          );
          need(
            value.address &&
              typeof value.address === "object" &&
              !Array.isArray(value.address),
            "Enter a valid fictional billing address.",
          );
          const address = safeKeys(value.address, [
            "line1",
            "line2",
            "city",
            "postalCode",
            "country",
          ]);
          for (const key of ["line1", "line2", "city", "postalCode"]) {
            need(
              address[key] === undefined ||
                (typeof address[key] === "string" &&
                  address[key].length <= 150),
              "Address fields must be 150 characters or fewer.",
            );
            address[key] = string(address[key], 150);
          }
          need(
            typeof address.country === "string" &&
              /^[A-Za-z]{2}$/.test(address.country),
            "Use a two-letter country code.",
          );
          address.country = address.country.toUpperCase();
          value.address = address;
          value.billingName = value.billingName.trim();
          value.vat = value.vat.trim();
          store.put(actor.tenantId, "billing", value);
          store.history(
            actor.tenantId,
            actor.accountId,
            "update-demo-billing",
            "billing",
            "subscription",
          );
          json(res, 200, billingState(actor));
          return;
        }
      }
      if (route === "bootstrap" && method === "GET") {
        const data: Data = {
          account: account(actor),
          tenant: tenant(actor),
          gathering: actor.gathering,
          demo,
          profiles: [],
          programmeHosts: store.db
            .prepare(
              "SELECT a.id,a.name FROM accounts a JOIN memberships m ON m.account_id=a.id WHERE m.tenant_id=?",
            )
            .all(actor.tenantId),
        };
        for (const r of resources) data[r] = list(actor, r);
        if (isAdmin(actor)) {
          data.accounts = store.db
            .prepare(
              "SELECT a.id,a.name,a.email,m.role FROM accounts a JOIN memberships m ON m.account_id=a.id WHERE m.tenant_id=?",
            )
            .all(actor.tenantId);
          data.sessions = store.db
            .prepare(
              "SELECT id,account_id AS accountId,created_at AS createdAt,expires_at AS expiresAt,device_name AS deviceName FROM sessions WHERE tenant_id=? AND expires_at>?",
            )
            .all(actor.tenantId, Date.now());
          data.storage = store.db
            .prepare(
              "SELECT COALESCE(SUM(size),0) AS bytes,COUNT(*) AS files FROM assets WHERE tenant_id=?",
            )
            .get(actor.tenantId);
        } else {
          data.accounts = [];
          data.sessions = [];
        }
        json(res, 200, data);
        return;
      }
      if (route === "tenant") {
        requireAdmin(actor);
        if (method === "PATCH") {
          const b = await jsonBody(req);
          const t = store.tenant(actor.tenantId);
          const update = safeKeys(b, [
            "name",
            "slogan",
            "icon",
            "customIcon",
            "accent",
            "theme",
            "palette",
            "font",
            "background",
            "intro",
            "homepage",
            "memoryDiscovery",
          ]);
          if (update.name !== undefined)
            need(
              typeof update.name === "string" &&
                update.name.trim().length > 0 &&
                update.name.length <= 100,
              "Choose an archive name up to 100 characters.",
            );
          if (update.slogan !== undefined)
            need(
              typeof update.slogan === "string" && update.slogan.length <= 150,
              "Slogan is too long.",
            );
          if (update.accent !== undefined)
            need(
              /^#[0-9a-fA-F]{6}$/.test(update.accent),
              "Choose a valid accent colour.",
            );
          for (const k of ["background", "customIcon"])
            if (update[k]) {
              need(safeUrl(update[k]), "Choose a safe archive image.");
              if (String(update[k]).startsWith("/api/assets/"))
                tenantAsset(actor, String(update[k]).split("/").pop()!);
            }
          if (update.theme !== undefined)
            need(
              ["classic", "vintage", "minimal"].includes(update.theme),
              "Invalid theme.",
            );
          if (update.palette !== undefined)
            need(
              palettes.has(update.palette),
              "Choose one of the available colour palettes.",
            );
          if (update.font !== undefined)
            need(fonts.has(update.font), "Choose one of the available fonts.");
          const saved = store.saveTenant(actor.tenantId, {
            ...t,
            draft: { ...(t.draft ?? t), ...update },
          });
          store.history(
            actor.tenantId,
            actor.accountId,
            "draft",
            "tenant",
            actor.tenantId,
          );
          json(res, 200, saved);
          return;
        }
        if (recordId === "publish" && method === "POST") {
          const t = store.tenant(actor.tenantId);
          const saved = store.saveTenant(actor.tenantId, {
            ...t,
            ...t.draft,
            draft: { ...t.draft },
          });
          if (t.draft?.memoryDiscovery) {
            const settings = store.get(
              actor.tenantId,
              "settings",
              "archive",
            ) ?? { id: "archive" };
            store.put(actor.tenantId, "settings", {
              ...settings,
              memoryDiscovery: {
                ...settings.memoryDiscovery,
                ...t.draft.memoryDiscovery,
              },
            });
          }
          store.history(
            actor.tenantId,
            actor.accountId,
            "publish",
            "tenant",
            actor.tenantId,
          );
          json(res, 200, saved);
          return;
        }
        if (method === "GET") {
          json(res, 200, tenant(actor));
          return;
        }
      }
      if (route === "gathering" && method === "POST") {
        const b = await jsonBody(req);
        store.db
          .prepare("UPDATE sessions SET gathering=? WHERE id=?")
          .run(b.enabled ? 1 : 0, actor.id);
        json(res, 200, { enabled: !!b.enabled });
        return;
      }
      if (route === "playback" && recordId && method === "GET") {
        const v = getVideo(actor, recordId, true);
        const media = resolveDemoMedia(v, stockManifest);
        let playback = v.url;
        if (v.assetId) {
          tenantAsset(actor, v.assetId);
          playback = `/api/assets/${v.assetId}`;
        }
        need(
          typeof playback === "string" && playback.length > 0,
          "The viewing copy is unavailable.",
        );
        if (!v.demo && !v.assetId)
          fail(
            503,
            "Protected cloud playback requires the configured signed playback provider.",
          );
        json(res, 200, {
          url: media?.url ?? playback,
          duration: v.duration,
          provider: media?.provider ?? "local",
          mediaId: media?.id,
          cors:
            media?.provider === "demo-stock"
              ? media.verification.cors
              : undefined,
          demo: !!v.demo,
        });
        return;
      }
      if (
        route === "videos" &&
        recordId &&
        parts[3] === "publish" &&
        method === "POST"
      ) {
        requireAdmin(actor);
        const previous = get(actor, "videos", recordId);
        const value = validate(
          actor,
          "videos",
          { ...(previous.draft ?? previous), status: "published", draft: null },
          previous,
        );
        const saved = store.put(actor.tenantId, "videos", value);
        store.history(
          actor.tenantId,
          actor.accountId,
          "publish",
          "videos",
          recordId,
          previous,
        );
        json(res, 200, clean(actor, "videos", saved));
        return;
      }
      if (route === "thumbnail" && recordId && method === "GET") {
        const v = getVideo(actor, recordId);
        const time = Number(url.searchParams.get("time") ?? 0);
        need(
          Number.isFinite(time) && time >= 0 && time <= v.duration,
          "Choose a timestamp within the film.",
        );
        const media = resolveDemoMedia(v, stockManifest);
        if (media?.provider === "cloudflare-demo") {
          json(res, 200, {
            url: `https://${DEMO_STREAM_HOST}/${DEMO_STREAM_ID}/thumbnails/thumbnail.jpg?time=${time}s&height=720`,
            provider: "cloudflare-thumbnail",
            timestamp: time,
          });
        } else
          json(res, 200, {
            url: v.poster ?? "/artwork/lake.png",
            timestamp: time,
            unavailable: true,
            browserCaptureAllowed:
              !!v.assetId ||
              (media?.provider === "demo-stock" &&
                media.verification.cors === "anonymous"),
            message:
              media?.provider === "demo-stock"
                ? "This stock source has no configured thumbnail service. Browser frame capture requires its CORS permission; otherwise choose your own cover image."
                : "Local frame extraction is available through the browser video preview.",
          });
        return;
      }
      if (route === "covers" && recordId === "preview" && method === "POST") {
        requireAdmin(actor);
        const b = await jsonBody(req);
        json(res, 200, {
          provider: "demo",
          demo: true,
          message:
            "Sample artwork preview. Live AI generation requires a configured image provider.",
          previews: ["lake", "mountains", "coast"].map((art) => ({
            url: `/artwork/${art}.png`,
            style: string(b.style ?? "classic"),
            format: b.format === "backdrop" ? "backdrop" : "cover",
          })),
        });
        return;
      }
      if (route === "progress") {
        if (method === "GET") {
          const profileId = url.searchParams.get("profileId");
          if (profileId) ownReference(actor, "profiles", profileId);
          const rows = store.db
            .prepare(
              "SELECT profile_id AS profileId,video_id AS videoId,position,duration,updated_at AS updatedAt FROM progress WHERE tenant_id=? AND account_id=?",
            )
            .all(actor.tenantId, actor.accountId) as Data[];
          json(
            res,
            200,
            rows.filter(
              (r) =>
                (!profileId || r.profileId === profileId) &&
                !!store.get(actor.tenantId, "videos", r.videoId) &&
                videoAllowed(
                  actor,
                  store.get(actor.tenantId, "videos", r.videoId)!,
                ),
            ),
          );
          return;
        }
        if (method === "POST") {
          const b = await jsonBody(req);
          ownReference(actor, "profiles", b.profileId);
          const v = getVideo(actor, b.videoId, true);
          need(
            !b.familyTv && !b.programme,
            "Shared playback does not update personal viewing progress.",
          );
          need(
            Number.isFinite(b.position) &&
              b.position >= 0 &&
              b.position <= v.duration + 1,
            "Invalid playback position.",
          );
          store.db
            .prepare(
              "INSERT INTO progress VALUES(?,?,?,?,?,?,?) ON CONFLICT(tenant_id,account_id,profile_id,video_id) DO UPDATE SET position=excluded.position,duration=excluded.duration,updated_at=excluded.updated_at",
            )
            .run(
              actor.tenantId,
              actor.accountId,
              b.profileId,
              b.videoId,
              b.position,
              v.duration,
              now(),
            );
          json(res, 200, { ok: true });
          return;
        }
      }
      if (route === "watchlist") {
        if (method === "GET") {
          const profileId =
            url.searchParams.get("profileId") ?? list(actor, "profiles")[0]?.id;
          ownReference(actor, "profiles", profileId);
          const value = store.get(
            actor.tenantId,
            "watchlists",
            `${actor.accountId}:${profileId}`,
          );
          const videos = (value?.videos ?? []).filter((videoId: string) => {
            const v = store.get(actor.tenantId, "videos", videoId);
            return !!v && videoAllowed(actor, v);
          });
          json(res, 200, { profileId, videos, videoIds: videos });
          return;
        }
        if (method === "POST") {
          const b = await jsonBody(req);
          ownReference(actor, "profiles", b.profileId);
          const input = b.videos ?? b.videoIds;
          need(
            Array.isArray(input) &&
              input.length <= 500 &&
              input.every((v: unknown) => typeof v === "string"),
            "Choose up to 500 videos.",
          );
          const videos = [...new Set<string>(input)];
          for (const videoId of videos) getVideo(actor, videoId);
          const saved = store.put(actor.tenantId, "watchlists", {
            id: `${actor.accountId}:${b.profileId}`,
            accountId: actor.accountId,
            profileId: b.profileId,
            videos,
          });
          json(res, 200, {
            profileId: saved.profileId,
            videos: saved.videos,
            videoIds: saved.videos,
          });
          return;
        }
      }
      if (route === "search" && method === "GET") {
        const q = (url.searchParams.get("q") ?? "").toLowerCase().trim();
        need(q.length <= 200, "Search is too long.");
        const results: Data[] = [];
        if (q) {
          for (const r of [
            "videos",
            "moments",
            "collections",
            "transcripts",
            "chapters",
            "stories",
          ])
            for (const v of list(actor, r)) {
              const haystack = [
                v.title,
                v.description,
                v.text,
                v.year,
                v.location,
                v.occasion,
                ...(v.people ?? []),
              ]
                .join(" ")
                .toLowerCase();
              if (haystack.includes(q)) {
                const source = r === "videos" ? v.id : v.videoId;
                results.push({
                  type:
                    r === "videos"
                      ? "film"
                      : r === "moments"
                        ? "moment"
                        : r === "collections"
                          ? "collection"
                          : r === "transcripts"
                            ? "transcript"
                            : r === "chapters"
                              ? "chapter"
                              : "story",
                  id: v.id,
                  videoId: source,
                  title: v.title ?? v.text ?? "Transcript match",
                  start: v.start ?? v.timestamp,
                  poster: v.poster ?? v.thumbnail,
                });
              }
            }
        }
        json(res, 200, results.slice(0, 100));
        return;
      }
      if (
        route === "channels" &&
        recordId &&
        parts[3] === "mix" &&
        method === "POST"
      ) {
        const ch = get(actor, "channels", recordId);
        const b = await jsonBody(req);
        let config = ch;
        if (b.preview) {
          requireAdmin(actor);
          config = ch.draft ?? ch;
        }
        need(config.enabled !== false, "This channel is disabled.");
        const mode = b.mode ?? config.mode ?? "mix";
        const minutes = Number(b.minutes ?? config.minutes ?? 30);
        need(
          ["mix", "moments", "films"].includes(mode) &&
            [0, 30, 60, 120].includes(minutes),
          "Choose a valid playback mode and session length.",
        );
        const videos = store
          .list(actor.tenantId, "videos")
          .filter(
            (v) =>
              videoAllowed(actor, v, true) &&
              v.status === "published" &&
              v.familyTv &&
              !config.excludedVideoIds?.includes(v.id) &&
              (!config.collectionIds?.length ||
                v.collectionIds?.some((c: string) =>
                  config.collectionIds.includes(c),
                )),
          )
          .map((v) => {
            const media = resolveDemoMedia(v, stockManifest);
            return media ? { ...v, duration: media.duration } : v;
          });
        const moments = store
          .list(actor.tenantId, "moments")
          .filter(
            (m) =>
              visible(actor, "moments", m) &&
              m.familyTv &&
              m.approved !== false,
          );
        const queue = generateQueue(videos as any, moments as any, {
          ...config,
          mode,
          minutes,
        });
        const saved = store.put(actor.tenantId, "queues", {
          channelId: ch.id,
          accountId: actor.accountId,
          mode,
          minutes,
          continuous: minutes === 0,
          queue,
          index: 0,
          history: [],
          status: queue.length ? "active" : "empty",
          createdBy: actor.accountId,
        });
        json(res, 200, saved);
        return;
      }
      if (
        route === "channels" &&
        recordId &&
        parts[3] === "publish" &&
        method === "POST"
      ) {
        requireAdmin(actor);
        const ch = get(actor, "channels", recordId);
        const value = validate(
          actor,
          "channels",
          { ...(ch.draft ?? ch), draft: undefined, published: true },
          ch,
        );
        const saved = store.put(actor.tenantId, "channels", value);
        json(res, 200, saved);
        return;
      }
      if (route === "queues" && recordId && method === "PATCH") {
        const q = get(actor, "queues", recordId);
        need(
          q.accountId === actor.accountId,
          "This playback session belongs to another account.",
        );
        const b = await jsonBody(req);
        const index = Number(b.index ?? q.index);
        need(
          Number.isInteger(index) && index >= 0 && index <= q.queue.length,
          "Invalid queue position.",
        );
        const saved = store.put(actor.tenantId, "queues", {
          ...q,
          index,
          status: b.status === "ended" ? "ended" : q.status,
          history: b.history ?? q.history,
        });
        json(res, 200, saved);
        return;
      }
      if (route === "uploads" && method === "POST") {
        const purpose = String(req.headers["x-upload-purpose"] ?? "video");
        need(
          ["video", "artwork", "voice"].includes(purpose),
          "Invalid upload purpose.",
        );
        if (purpose !== "voice") requireAdmin(actor);
        const asset = await upload(
          req,
          actor.tenantId,
          purpose,
          purpose === "voice" ? { maxBytes: 20 * 1024 * 1024 } : {},
          actor.accountId,
        );
        let video: Data | undefined;
        if (purpose === "video") {
          video = store.put(actor.tenantId, "videos", {
            title: asset.filename.replace(/\.[^.]+$/, ""),
            description:
              "Locally stored upload. No file has been uploaded to a cloud service.",
            year: null,
            datePrecision: "unknown",
            recordedDate: "",
            collectionIds: [],
            people: [],
            status: asset.duration ? "ready" : "processing",
            processingStatus: asset.duration ? "ready" : "processing",
            duration: asset.duration ?? 0,
            assetId: asset.id,
            url: asset.url,
            poster: "/artwork/lake.png",
            familyTv: false,
            gathering: false,
            visibility: "admin",
            allowedAccounts: [],
            source: "local",
          });
          store.put(actor.tenantId, "uploads", {
            videoId: video.id,
            assetId: asset.id,
            status: video.status,
            filename: asset.filename,
            size: asset.size,
            provider: "local",
          });
        }
        json(res, 201, {
          asset,
          video: video ? clean(actor, "videos", video) : undefined,
        });
        return;
      }
      if (
        route === "uploads" &&
        recordId &&
        parts[3] === "metadata" &&
        method === "POST"
      ) {
        requireAdmin(actor);
        const v = get(actor, "videos", recordId);
        need(
          v.source === "local" && !!v.assetId,
          "Only local uploads support local metadata validation.",
        );
        const b = await jsonBody(req);
        need(
          Number.isFinite(b.duration) && b.duration > 0 && b.duration < 86400,
          "The browser could not read a valid media duration.",
        );
        const saved = store.put(actor.tenantId, "videos", {
          ...v,
          duration: b.duration,
          status: "ready",
          processingStatus: "ready",
        });
        json(res, 200, clean(actor, "videos", saved));
        return;
      }
      if (route === "assets" && recordId && ["GET", "HEAD"].includes(method)) {
        const asset = tenantAsset(actor, recordId);
        if (!existsSync(asset.path)) fail(404, "File not found.");
        const size = statSync(asset.path).size;
        const headers: Record<string, string | number> = {
          "content-type": asset.content_type,
          "cache-control": "private, no-store",
          "accept-ranges": "bytes",
          "content-disposition": `inline; filename="${String(asset.filename).replace(/["\r\n]/g, "_")}"`,
        };
        const range = req.headers.range;
        if (range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(range);
          if (!match) fail(416, "Unsupported range.");
          let start = match[1]
            ? Number(match[1])
            : Math.max(0, size - Number(match[2]));
          let end = match[1]
            ? match[2]
              ? Math.min(size - 1, Number(match[2]))
              : size - 1
            : size - 1;
          if (start > end || start >= size || start < 0)
            fail(416, "Range outside file.");
          res.writeHead(206, {
            ...headers,
            "content-length": end - start + 1,
            "content-range": `bytes ${start}-${end}/${size}`,
          });
          if (method === "HEAD") res.end();
          else createReadStream(asset.path, { start, end }).pipe(res);
        } else {
          res.writeHead(200, { ...headers, "content-length": size });
          if (method === "HEAD") res.end();
          else createReadStream(asset.path).pipe(res);
        }
        return;
      }
      if (route === "contribution-links" && method === "POST") {
        requireAdmin(actor);
        const b = await jsonBody(req);
        const expires = Date.parse(
          b.expiresAt ?? new Date(Date.now() + 7 * 86400000).toISOString(),
        );
        need(
          Number.isFinite(expires) &&
            expires > Date.now() &&
            expires <= Date.now() + 90 * 86400000,
          "Choose an expiry within 90 days.",
        );
        if (b.collectionId) ownReference(actor, "collections", b.collectionId);
        const value = {
          eventName: string(b.eventName ?? "Share a memory", 100),
          collectionId: b.collectionId ?? null,
          maxUploads: Math.min(100, Math.max(1, Number(b.maxUploads ?? 10))),
          maxBytes: Math.min(
            100 * 1024 * 1024,
            Math.max(1, Number(b.maxBytes ?? 100 * 1024 * 1024)),
          ),
          allowedTypes: Array.isArray(b.allowedTypes)
            ? b.allowedTypes.filter((t: string) =>
                ["video/mp4", "video/webm"].includes(t),
              )
            : ["video/mp4", "video/webm"],
          approvalRequired: true,
        };
        need(
          Number.isInteger(value.maxUploads) && value.allowedTypes.length > 0,
          "Choose valid contribution limits.",
        );
        const token = createToken(
          actor.tenantId,
          "contribution",
          value,
          expires,
        );
        const link = store.put(actor.tenantId, "links", {
          ...value,
          expiresAt: new Date(expires).toISOString(),
          tokenHash: digest(token),
          enabled: true,
        });
        json(res, 201, { ...link, token, url: `/contribute/${token}` });
        return;
      }
      if (route === "invitations" && method === "POST") {
        requireOwner(actor);
        const b = await jsonBody(req);
        const email = string(b.email, 254).toLowerCase();
        need(
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
          "Enter a valid invited email.",
        );
        need(
          ["viewer", "editor"].includes(b.role ?? "viewer"),
          "Choose viewer or editor.",
        );
        const expires = Date.now() + 7 * 86400000;
        const token = createToken(
          actor.tenantId,
          "invitation",
          { email, role: b.role ?? "viewer" },
          expires,
        );
        json(res, 201, {
          token,
          url: `/invite/${token}`,
          expiresAt: new Date(expires).toISOString(),
          message: "Copy this invitation link. No email has been sent.",
        });
        return;
      }
      if (route === "links" && recordId && method === "PATCH") {
        requireAdmin(actor);
        const link = get(actor, "links", recordId);
        const b = await jsonBody(req);
        need(
          typeof b.enabled === "boolean",
          "Choose whether the upload link is enabled.",
        );
        store.db
          .prepare(
            "UPDATE tokens SET disabled=? WHERE hash=? AND tenant_id=? AND kind=?",
          )
          .run(
            b.enabled ? 0 : 1,
            link.tokenHash,
            actor.tenantId,
            "contribution",
          );
        json(
          res,
          200,
          store.put(actor.tenantId, "links", { ...link, enabled: b.enabled }),
        );
        return;
      }
      if (route === "accounts" && recordId && method === "PATCH") {
        requireOwner(actor);
        const b = await jsonBody(req);
        need(
          ["viewer", "editor"].includes(b.role),
          "Only ownership transfer can change the owner.",
        );
        need(
          recordId !== actor.accountId,
          "Use the ownership transfer workflow for the archive owner.",
        );
        const result = store.db
          .prepare(
            "UPDATE memberships SET role=? WHERE tenant_id=? AND account_id=? AND role<>?",
          )
          .run(b.role, actor.tenantId, recordId, "owner");
        if (!result.changes) fail(404, "Member not found.");
        store.db
          .prepare("DELETE FROM sessions WHERE tenant_id=? AND account_id=?")
          .run(actor.tenantId, recordId);
        json(res, 200, { ok: true });
        return;
      }
      if (route === "sessions" && recordId && method === "DELETE") {
        requireOwner(actor);
        store.db
          .prepare("DELETE FROM sessions WHERE tenant_id=? AND id=?")
          .run(actor.tenantId, recordId);
        json(res, 200, { revoked: true });
        return;
      }
      if (route === "ownership" && !recordId && method === "POST") {
        requireOwner(actor);
        const b = await jsonBody(req);
        ownReferenceMember(b.accountId);
        const a = store.db
          .prepare("SELECT password_hash FROM accounts WHERE id=?")
          .get(actor.accountId) as Data;
        need(
          verifyPassword(string(b.password, 200), a.password_hash),
          "Confirm the owner password.",
        );
        const token = createToken(
          actor.tenantId,
          "ownership",
          { from: actor.accountId, to: b.accountId },
          Date.now() + 86400000,
        );
        json(res, 201, {
          token,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        });
        return;
      }
      if (route === "ownership" && recordId === "accept" && method === "POST") {
        const b = await jsonBody(req);
        const t = readToken(string(b.token, 200), "ownership");
        need(
          t.tenant_id === actor.tenantId && t.data.to === actor.accountId,
          "This transfer is intended for another member.",
        );
        store.db.exec("BEGIN");
        try {
          store.db
            .prepare(
              "UPDATE memberships SET role=? WHERE tenant_id=? AND account_id=?",
            )
            .run("editor", actor.tenantId, t.data.from);
          store.db
            .prepare(
              "UPDATE memberships SET role=? WHERE tenant_id=? AND account_id=?",
            )
            .run("owner", actor.tenantId, actor.accountId);
          store.db
            .prepare("UPDATE tokens SET disabled=1 WHERE hash=?")
            .run(t.hash);
          store.db
            .prepare("DELETE FROM sessions WHERE tenant_id=? AND account_id=?")
            .run(actor.tenantId, t.data.from);
          store.db.exec("COMMIT");
        } catch (e) {
          store.db.exec("ROLLBACK");
          throw e;
        }
        json(res, 200, { transferred: true });
        return;
      }
      function ownReferenceMember(memberId: unknown) {
        need(
          typeof memberId === "string" &&
            memberId !== actor.accountId &&
            !!store.db
              .prepare(
                "SELECT 1 FROM memberships WHERE tenant_id=? AND account_id=?",
              )
              .get(actor.tenantId, memberId),
          "Choose another member of this archive.",
        );
      }
      if (route === "recovery") {
        requireAdmin(actor);
        if (method === "GET") {
          const values = store.db
            .prepare(
              "SELECT id,resource,data,deleted_at AS deletedAt FROM records WHERE tenant_id=? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC",
            )
            .all(actor.tenantId) as Data[];
          json(
            res,
            200,
            values.map((v) => ({
              id: v.id,
              resource: v.resource,
              title:
                JSON.parse(v.data).title ??
                JSON.parse(v.data).name ??
                v.resource,
              deletedAt: v.deletedAt,
              recoverUntil: new Date(
                Date.parse(v.deletedAt) + 30 * 86400000,
              ).toISOString(),
            })),
          );
          return;
        }
        if (recordId && method === "POST" && parts[3] === "restore") {
          const row = store.db
            .prepare(
              "SELECT * FROM records WHERE tenant_id=? AND id=? AND deleted_at IS NOT NULL",
            )
            .get(actor.tenantId, recordId) as Data | undefined;
          if (!row) fail(404, "Deleted item not found.");
          need(
            Date.parse(row.deleted_at) + 30 * 86400000 > Date.now(),
            "The 30-day recovery window has expired.",
          );
          store.db
            .prepare(
              "UPDATE records SET deleted_at=NULL,updated_at=? WHERE tenant_id=? AND id=?",
            )
            .run(now(), actor.tenantId, recordId);
          store.history(
            actor.tenantId,
            actor.accountId,
            "restore",
            row.resource,
            recordId,
          );
          json(res, 200, { restored: true });
          return;
        }
        if (recordId && method === "DELETE") {
          requireOwner(actor);
          const b = await jsonBody(req);
          need(b.confirm === true, "Confirm permanent deletion.");
          const row = store.db
            .prepare(
              "SELECT resource,data FROM records WHERE tenant_id=? AND id=? AND deleted_at IS NOT NULL",
            )
            .get(actor.tenantId, recordId) as Data | undefined;
          if (!row) fail(404, "Deleted item not found.");
          const data = JSON.parse(row.data);
          if (row.resource === "videos") {
            for (const resource of [
              "moments",
              "stories",
              "chapters",
              "transcripts",
            ])
              for (const related of store.list(actor.tenantId, resource))
                if (related.videoId === recordId)
                  store.db
                    .prepare(
                      "DELETE FROM records WHERE tenant_id=? AND resource=? AND id=?",
                    )
                    .run(actor.tenantId, resource, related.id);
            store.db
              .prepare("DELETE FROM progress WHERE tenant_id=? AND video_id=?")
              .run(actor.tenantId, recordId);
            if (data.assetId) {
              const asset = store.db
                .prepare("SELECT path FROM assets WHERE tenant_id=? AND id=?")
                .get(actor.tenantId, data.assetId) as Data | undefined;
              if (asset && existsSync(asset.path)) unlinkSync(asset.path);
              store.db
                .prepare("DELETE FROM assets WHERE tenant_id=? AND id=?")
                .run(actor.tenantId, data.assetId);
            }
          }
          store.db
            .prepare("DELETE FROM records WHERE tenant_id=? AND id=?")
            .run(actor.tenantId, recordId);
          store.history(
            actor.tenantId,
            actor.accountId,
            "permanent-delete",
            row.resource,
            recordId,
          );
          json(res, 200, { deleted: true });
          return;
        }
      }
      if ((route === "export" || route === "exports") && method === "POST") {
        requireOwner(actor);
        const exportData: Data = {
          product: "MyPremierePlus",
          version: 1,
          archive: store.tenant(actor.tenantId),
          exportedAt: now(),
          kind: "metadata-only",
          originalFilesIncluded: false,
        };
        delete exportData.archive.draft;
        for (const r of [
          "videos",
          "collections",
          "profiles",
          "moments",
          "stories",
          "transcripts",
          "chapters",
          "channels",
          "premieres",
          "settings",
        ])
          exportData[r] = store.list(actor.tenantId, r).map((v) => {
            const copy = { ...v };
            delete copy.url;
            delete copy.streamVideoId;
            delete copy.assetId;
            return copy;
          });
        const record = store.put(actor.tenantId, "exports", {
          status: "ready",
          kind: "metadata",
          filename: "mypremiereplus-metadata.json",
          data: exportData,
        });
        json(res, 201, record);
        return;
      }
      if (
        route === "transcripts" &&
        recordId === "import" &&
        method === "POST"
      ) {
        requireAdmin(actor);
        const b = await jsonBody(req);
        const v = getVideo(actor, b.videoId);
        need(
          typeof b.vtt === "string" && b.vtt.length <= 1000000,
          "Choose a VTT transcript under 1 MB.",
        );
        const blocks = b.vtt.replace(/\r/g, "").split(/\n\s*\n/);
        const imported: Data[] = [];
        const seconds = (s: string) => {
          const p = s.trim().replace(",", ".").split(":").map(Number);
          return p.reduce((a: number, n: number) => a * 60 + n, 0);
        };
        for (const block of blocks) {
          const lines = block.split("\n");
          const line = lines.findIndex((l: string) => l.includes("-->"));
          if (line < 0) continue;
          const [from, to] = lines[line].split("-->");
          const input = {
            videoId: v.id,
            start: seconds(from),
            end: seconds(to.trim().split(" ")[0]),
            text: lines
              .slice(line + 1)
              .join("\n")
              .replace(/<[^>]*>/g, ""),
          };
          const value = validate(actor, "transcripts", input);
          imported.push(store.put(actor.tenantId, "transcripts", value));
        }
        need(
          imported.length > 0,
          "No valid timed transcript entries were found.",
        );
        json(res, 201, { count: imported.length, segments: imported });
        return;
      }
      if (route === "transcription" && method === "POST") {
        requireAdmin(actor);
        fail(
          503,
          "Automatic transcription is not configured. Import or edit a transcript manually.",
        );
      }
      if (route && resources.has(route)) {
        if (method === "GET") {
          if (recordId) {
            json(res, 200, clean(actor, route, get(actor, route, recordId)));
          } else json(res, 200, list(actor, route));
          return;
        }
        if (["POST", "PATCH", "DELETE"].includes(method)) {
          if (!viewerWrites.has(route)) requireAdmin(actor);
          if (
            ["history", "queues", "uploads", "exports", "links"].includes(route)
          )
            fail(405, "Use the dedicated workflow for this resource.");
          const previous = recordId
            ? route === "settings" && recordId === "archive"
              ? (store.get(actor.tenantId, "settings", "archive") ?? {
                  id: "archive",
                })
              : get(actor, route, recordId)
            : undefined;
          if (route === "moments" || route === "stories") {
            if (
              previous &&
              !isAdmin(actor) &&
              previous.creator !== actor.accountId
            )
              fail(403, "You can edit only your own contributions.");
          }
          if (
            route === "programmes" &&
            previous &&
            previous.hostId !== actor.accountId &&
            !isAdmin(actor) &&
            method === "DELETE"
          )
            fail(403, "Only the host can end this programme.");
          if (method === "DELETE") {
            need(!!previous, "Choose an existing item.");
            store.db
              .prepare(
                "UPDATE records SET deleted_at=?,updated_at=? WHERE tenant_id=? AND resource=? AND id=?",
              )
              .run(now(), now(), actor.tenantId, route, recordId!);
            store.history(
              actor.tenantId,
              actor.accountId,
              "delete",
              route,
              recordId!,
              previous,
            );
            json(res, 200, { deleted: true, recoveryDays: 30 });
            return;
          }
          const b = await jsonBody(req);
          if (method === "PATCH") need(!!recordId, "Choose an existing item.");
          const value = validate(actor, route, b, previous);
          if (!previous) {
            value.creator = actor.accountId;
            value.createdAt = now();
          }
          if (previous) value.id = previous.id;
          if (
            route === "contributions" &&
            value.status === "approved" &&
            previous?.status !== "approved"
          ) {
            const asset = store.db
              .prepare("SELECT * FROM assets WHERE id=? AND tenant_id=?")
              .get(previous!.assetId, actor.tenantId) as Data | undefined;
            need(!!asset, "Contribution file is missing.");
            const v = store.put(actor.tenantId, "videos", {
              title: value.title,
              description: value.description ?? "",
              collectionIds: value.collectionIds ?? [],
              people: [],
              year: null,
              datePrecision: "unknown",
              recordedDate: "",
              status: previous!.duration ? "ready" : "processing",
              processingStatus: previous!.duration ? "ready" : "processing",
              duration: previous!.duration ?? 0,
              assetId: previous!.assetId,
              url: `/api/assets/${previous!.assetId}`,
              poster: "/artwork/lake.png",
              visibility: "admin",
              gathering: false,
              familyTv: false,
              source: "local",
            });
            value.videoId = v.id;
          }
          const saved = store.put(actor.tenantId, route, value);
          if (route === "stories") {
            const assetId =
              saved.audioAssetId ??
              (typeof saved.audio === "string"
                ? saved.audio.split("/").pop()
                : undefined);
            if (assetId) {
              const ownership = store.get(
                actor.tenantId,
                "assetOwnership",
                assetId,
              );
              if (ownership)
                store.put(actor.tenantId, "assetOwnership", {
                  ...ownership,
                  attached: true,
                  storyId: saved.id,
                });
            }
          }
          if (route === "collections" && b.videoIds) {
            for (const v of store.list(actor.tenantId, "videos")) {
              const ids = new Set<string>(v.collectionIds ?? []);
              if (b.videoIds.includes(v.id)) ids.add(saved.id);
              else ids.delete(saved.id);
              store.put(actor.tenantId, "videos", {
                ...v,
                collectionIds: [...ids],
              });
            }
          }
          store.history(
            actor.tenantId,
            actor.accountId,
            previous ? "update" : "create",
            route,
            saved.id,
            previous,
          );
          json(res, previous ? 200 : 201, clean(actor, route, saved));
          return;
        }
      }
      fail(404, "Endpoint not found.");
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (error instanceof HttpError || error instanceof DeviceError) {
        json(res, error.status, { error: error.message });
      } else {
        console.error(
          error instanceof Error ? error.message : "Unexpected request error",
        );
        json(res, 500, {
          error: "We could not complete this action. Please try again.",
        });
      }
    }
  };
  return {
    store,
    handler,
    server: createServer((req, res) => void handler(req, res)),
  };
}
