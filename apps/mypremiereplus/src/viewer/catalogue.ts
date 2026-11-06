import { artworkUrl } from "../artwork";
import type { Collection, Profile, VideoRecord } from "@mypremiere/types";
import { api } from "../api";
import { brand, setBrand } from "../brand";
import { setStored } from "@mypremiere/shared";
export interface CatalogueVideoRecord
  extends Omit<VideoRecord, "durationSeconds"> {
  catalogueId: number;
  posterUrl: string;
  streamVideoId: string;
  durationSeconds: number | null;
  priority: -1 | 0 | 1 | 2;
  available: boolean;
}
export interface LoadedCatalogue {
  catalogue: CatalogueVideoRecord[];
  collections: Collection[];
  source: "api" | "fallback";
}
export const profiles: Profile[] = [];
const defaultPalette: [string, string, string] = [
  "#091321",
  "#274c62",
  "#e9c778",
];
export function fromVideo(
  v: any,
  index = 0,
  collections: any[] = [],
): CatalogueVideoRecord {
  v = {
    ...v,
    poster: artworkUrl(v.poster),
    backdrop: artworkUrl(v.backdrop ?? v.poster),
  };
  const categories = collections
    .filter((c) => (v.collectionIds ?? []).includes(c.id))
    .map((c) => c.title ?? c.name);
  return {
    id: v.id,
    catalogueId: index + 1,
    slug: v.id,
    title: v.title,
    subtitle: [v.year, ...categories].filter(Boolean).join(" · "),
    description: v.description || "A memory from your private archive.",
    originalFilename: "archive-video",
    sourceType: "mp4",
    recordingDate: v.recordedDate || null,
    dateApproximate: v.datePrecision !== "exact",
    year: v.year ?? null,
    durationSeconds: v.duration > 0 ? v.duration : null,
    aspectRatio: "16:9",
    resolution: "Adaptive",
    frameRate: 30,
    interlaced: false,
    people: v.people ?? [],
    location: v.location ?? null,
    country: null,
    tags: [...(v.people ?? []), v.occasion ?? ""],
    categories: categories.length ? categories : ["Memories"],
    collectionId: v.collectionIds?.[0] ?? null,
    seasonNumber: null,
    episodeNumber: null,
    artwork: {
      thumbnail: v.poster || "/artwork/cinema.svg",
      landscape: v.poster || "/artwork/cinema.svg",
      portrait: v.poster || "/artwork/cinema.svg",
      backdrop: v.backdrop || v.poster || brand.background,
      palette: defaultPalette,
    },
    previewStartSeconds: 0,
    featured: !!v.featured,
    priority: v.priority ?? 0,
    available: v.status === "published" && v.processingStatus === "ready",
    visibility: "family",
    processingStatus:
      v.processingStatus === "ready"
        ? "ready"
        : v.processingStatus === "failed"
          ? "failed"
          : v.processingStatus === "processing"
            ? "processing"
            : "unavailable",
    playbackProvider:
      v.playbackProvider === "cloudflare-stream"
        ? "cloudflare-stream"
        : "local",
    playbackAssetId: null,
    playbackUrl: v.url ?? null,
    progressSeconds: 0,
    lastWatched: null,
    addedDate: v.createdAt ?? new Date(0).toISOString(),
    restorationNotes: null,
    legacyFormat: null,
    chapterMarkers: v.chapters ?? [],
    playCount: 0,
    posterUrl: v.poster || "/artwork/cinema.svg",
    streamVideoId: v.url ?? "",
  };
}
export const orderCatalogueByPriority = (
  items: readonly CatalogueVideoRecord[],
) => [...items].sort((a, b) => b.priority - a.priority);
export const featuredCatalogue = (items: readonly CatalogueVideoRecord[]) =>
  items.filter((v) => v.featured);
export async function loadCatalogue(): Promise<LoadedCatalogue> {
  const data = await api("bootstrap");
  setBrand(data.tenant);
  const loadedProfiles = await Promise.all(
    data.profiles.map(async (p: any) => {
      let watchlist = p.watchlist ?? [];
      if (typeof window !== "undefined")
        try {
          const saved = await api(
            "watchlist?profileId=" + encodeURIComponent(p.id),
          );
          if (
            !Array.isArray(saved.videos) ||
            !saved.videos.every((value: unknown) => typeof value === "string")
          )
            throw new Error("Invalid watchlist response.");
          watchlist = saved.videos;
          setStored("watchlist:" + p.id, []);
          setStored("watchlist-removed:" + p.id, []);
        } catch {
          /* Keep scoped local additions/removals if the server cannot be read. */
        }
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        initials: p.name
          .split(" ")
          .map((s: string) => s[0])
          .join("")
          .slice(0, 2),
        accent: p.color ?? brand.accent,
        watchlist,
        recentlyDiscovered: [],
      };
    }),
  );
  profiles.splice(0, profiles.length, ...loadedProfiles);
  if (!profiles.length)
    profiles.push({
      id: "",
      name: "Everyone",
      initials: "EV",
      accent: brand.accent,
      watchlist: [],
      recentlyDiscovered: [],
    });
  const entries = data.videos.filter((v: any) => v.status === "published");
  const videos = await Promise.all(
    entries.map(async (v: any, i: number) => {
      try {
        const playback = await api(`playback/${v.id}`);
        return fromVideo(
          {
            ...v,
            url: playback.url,
            duration: playback.duration,
            playbackProvider:
              playback.provider === "cloudflare-demo"
                ? "cloudflare-stream"
                : "local",
          },
          i,
          data.collections,
        );
      } catch {
        return fromVideo(
          { ...v, processingStatus: "unavailable" },
          i,
          data.collections,
        );
      }
    }),
  );
  return {
    catalogue: orderCatalogueByPriority(videos),
    collections: data.collections.map((c: any) => ({
      id: c.id,
      title: c.title ?? c.name,
      description: c.description ?? "",
      kind: "curated",
      videoIds: videos
        .filter((v) =>
          entries
            .find((e: any) => e.id === v.id)
            ?.collectionIds?.includes(c.id),
        )
        .map((v) => v.id),
    })),
    source: "api",
  };
}
// Synthetic fixtures only, for the migrated viewer's regression tests.
export const catalogue: CatalogueVideoRecord[] = Array.from(
  { length: 8 },
  (_, i) =>
    fromVideo(
      {
        id: `test-film-${i}`,
        title: i === 0 ? "Archive trailer" : `Synthetic film ${i}`,
        year: i === 0 ? 2026 : 2000 + i,
        status: "published",
        processingStatus: "ready",
        duration: 120,
        url: "https://media.example/synthetic.mp4",
        featured: i === 0,
        priority: 0,
      },
      i,
    ),
);
if (typeof window === "undefined")
  profiles.push(
    ...["Everyone", "Family", "Guests"].map((name, i) => ({
      id: `profile-${i}`,
      name,
      initials: name[0],
      accent: "#e9c778",
      watchlist: [],
      recentlyDiscovered: [],
    })),
  );
