import { createHash } from "node:crypto";
import type { Data, Store } from "./store.js";
import {
  DEMO_DURATION,
  DEMO_STREAM_ID,
  DEMO_STREAM_URL,
  DEMO_TITLES,
} from "./demo.js";
import { canonicalizeArtwork } from "./artwork.js";
import {
  DEMO_MEDIA_DATASET_VERSION,
  DEMO_STOCK_MEDIA,
  DEMO_VIDEO_DESCRIPTION,
  LEGACY_DEMO_VIDEO_DESCRIPTION,
  stockClipsForTenant,
  validateDemoStockManifest,
  type DemoStockClip,
} from "./demo-media.js";

export type DemoMediaAssignment = {
  tenantId: string;
  videoId: string;
  clip: DemoStockClip;
  eligible: boolean;
  reason: string;
};
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

function unchangedSeedVideo(
  store: Store,
  tenantId: string,
  index: number,
  value: Data,
): string | undefined {
  const [title, year, category, location, occasion, art] = DEMO_TITLES[index]!;
  const expectedTitle =
    tenantId === "other"
      ? `Coastal: ${title}`
      : tenantId === "third"
        ? `Fireside: ${title}`
        : title;
  const poster = `/artwork/${art === "winter" ? "cinema" : art}.png`;
  const categories = ["Holidays", "Celebrations", "Traditions", "Everyday"];
  const fields = {
    title: expectedTitle,
    year,
    recordedDate: String(year),
    datePrecision: "year",
    location,
    people: [],
    occasion,
    collectionIds: [
      `${tenantId}-collection-${categories.indexOf(category) + 1}`,
    ],
    poster,
    backdrop: poster,
    duration: DEMO_DURATION,
    status: index === 6 ? "ready" : index === 7 ? "draft" : "published",
    processingStatus: "ready",
    featured: index < 2,
    priority: 8 - index,
    visibility: "all",
    allowedAccounts: [],
    gathering: true,
    familyTv: true,
    demo: true,
  };
  if (value.deletedAt) return "deleted";
  if (!value.demo || value.assetId || value.source)
    return "custom or uploaded source";
  if (value.url !== DEMO_STREAM_URL || value.streamVideoId !== DEMO_STREAM_ID)
    return "custom or already replaced media";
  if (value.mediaAssetId && value.mediaAssetId !== `${tenantId}-sample-media`)
    return "custom media asset";
  if (value.draft !== undefined && value.draft !== null)
    return "unpublished video draft";
  if (value.availableAt !== null && value.availableAt !== undefined)
    return "edited availability";
  if (
    ![LEGACY_DEMO_VIDEO_DESCRIPTION, DEMO_VIDEO_DESCRIPTION].includes(
      value.description,
    )
  )
    return "edited description";
  for (const [key, expected] of Object.entries(fields)) {
    const actual = ["poster", "backdrop"].includes(key)
      ? (canonicalizeArtwork({ poster: value[key] }) as Data)
      : undefined;
    if (!equal(actual ? actual.poster : value[key], expected))
      return `edited ${key}`;
  }
  const allowedKeys = new Set([
    ...Object.keys(fields),
    "id",
    "url",
    "streamVideoId",
    "mediaAssetId",
    "availableAt",
    "description",
    "createdAt",
    "updatedAt",
    "draft",
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key)))
    return "additional edited metadata";
  const created = Date.parse(value.createdAt),
    updated = Date.parse(value.updatedAt);
  if (
    Number.isFinite(created) &&
    Number.isFinite(updated) &&
    updated > created + 10
  )
    return "previous metadata edit";
  if (
    store
      .list(tenantId, "history")
      .some((h) => h.resource === "videos" && h.recordId === value.id)
  )
    return "video edit history";
  return undefined;
}

export function planDemoMediaMigration(
  store: Store,
  input: readonly DemoStockClip[] = DEMO_STOCK_MEDIA,
) {
  validateDemoStockManifest(input, true);
  const assignments: DemoMediaAssignment[] = [];
  for (const tenantId of ["demo", "other", "third"]) {
    const clips = stockClipsForTenant(tenantId, input);
    for (let index = 0; index < 8; index++) {
      const videoId = `${tenantId}-video-${index + 1}`,
        clip = clips[index % clips.length]!;
      const video = store.get(tenantId, "videos", videoId, true);
      let reason = !video
        ? "missing"
        : video.demoMediaVersion === DEMO_MEDIA_DATASET_VERSION
          ? "already applied"
          : unchangedSeedVideo(store, tenantId, index, video);
      if (!reason) {
        for (const resource of ["moments", "transcripts", "chapters"]) {
          const children = [
            ...store.list(tenantId, resource),
            ...store.list(tenantId, resource, true),
          ].filter((v) => v.videoId === videoId);
          if (
            children.some(
              (v) =>
                Number(v.end) > clip.duration ||
                Number(v.start) >= clip.duration,
            )
          ) {
            reason = `existing ${resource} interval exceeds selected clip`;
            break;
          }
        }
      }
      assignments.push({
        tenantId,
        videoId,
        clip,
        eligible: !reason,
        reason: reason ?? "unchanged seeded record",
      });
    }
  }
  return {
    datasetVersion: DEMO_MEDIA_DATASET_VERSION,
    manifestFingerprint: createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex"),
    assignments,
  };
}

/** Call only after the complete manifest has been explicitly approved. No media is
 * downloaded and no source, cloud resources, customer edits or uploads are changed. */
export function applyDemoMediaMigration(
  store: Store,
  input: readonly DemoStockClip[] = DEMO_STOCK_MEDIA,
) {
  validateDemoStockManifest(input, true);
  store.db.exec("BEGIN IMMEDIATE");
  try {
    const plan = planDemoMediaMigration(store, input);
    for (const assignment of plan.assignments.filter((v) => v.eligible)) {
      const { tenantId, videoId, clip } = assignment;
      const current = store.get(tenantId, "videos", videoId)!;
      const assetId = `${tenantId}-${clip.id}`;
      store.put(tenantId, "mediaAssets", {
        id: assetId,
        provider: "demo-stock",
        providerVideoId: `${clip.sourceProvider}:${clip.sourceId}`,
        kind: "video",
        duration: clip.duration,
        protected: false,
        demo: true,
        title: clip.title,
        author: clip.author,
        sourcePage: clip.sourcePage,
        licenseName: clip.license.name,
        licensePage: clip.license.url,
        attribution: clip.license.attribution,
        bytes: clip.bytes,
        verification: clip.verification,
      });
      const next = {
        ...current,
        url: clip.url,
        streamVideoId: clip.url,
        duration: clip.duration,
        mediaAssetId: assetId,
        demoMediaId: clip.id,
        demoMediaVersion: DEMO_MEDIA_DATASET_VERSION,
        playbackProvider: "local",
        description: `Fictional demonstration metadata. Sample footage: ${clip.title}.`,
      };
      store.db
        .prepare("UPDATE videos SET data=? WHERE tenant_id=? AND id=?")
        .run(JSON.stringify(next), tenantId, videoId);
    }
    // Direct SQL edits need not update timestamps/history. Never rewrite moments;
    // legacy template descriptions are normalised only by the API presentation.
    for (const tenantId of ["demo", "other", "third"]) {
      const applied = plan.assignments
        .filter((v) => v.tenantId === tenantId && v.eligible)
        .map((v) => ({ videoId: v.videoId, mediaId: v.clip.id }));
      if (applied.length)
        store.put(tenantId, "settings", {
          id: `demo-media-${DEMO_MEDIA_DATASET_VERSION}`,
          datasetVersion: DEMO_MEDIA_DATASET_VERSION,
          manifestFingerprint: plan.manifestFingerprint,
          appliedAt: new Date().toISOString(),
          applied,
          skipped: plan.assignments
            .filter((v) => v.tenantId === tenantId && !v.eligible)
            .map((v) => ({ videoId: v.videoId, reason: v.reason })),
        });
    }
    store.db.exec("COMMIT");
    return plan;
  } catch (error) {
    store.db.exec("ROLLBACK");
    throw error;
  }
}
