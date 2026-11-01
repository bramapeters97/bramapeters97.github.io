import { DEMO_DURATION, DEMO_STREAM_URL } from "./demo.js";

export const DEMO_MEDIA_DATASET_VERSION = "stock-v1";
export const LEGACY_DEMO_VIDEO_DESCRIPTION =
  "Fictional demonstration metadata. Every demo title plays the same supplied sample footage.";
export const DEMO_VIDEO_DESCRIPTION =
  "Fictional demonstration metadata. Sample footage is used for local testing.";
export const LEGACY_DEMO_MOMENT_DESCRIPTION =
  "A sample interval in the shared four-second demo stream.";
export const DEMO_MOMENT_DESCRIPTION =
  "A sample interval from this film's demonstration footage.";

export type DemoStockClip = {
  id: `stock${string}`;
  title: string;
  author: string;
  sourceProvider: string;
  sourceId: string;
  sourcePage: string;
  url: string;
  kind: "mp4" | "hls";
  duration: number;
  bytes: number | null;
  license: {
    name: string;
    url: string;
    attribution: string;
    externalPlaybackAllowed: true;
  };
  verification: {
    verifiedAt: string;
    durationSource:
      | "container-metadata"
      | "browser-metadata"
      | "hls-manifest"
      | "provider-metadata";
    httpStatus: 200 | 206;
    contentType: string;
    cors: "anonymous" | "blocked" | "unknown";
    noRecognizablePeople: true;
  };
  approved: true;
};

/** Reviewed 2026-11-01 from the official pages and actual sampled video frames.
 * Evidence: docs/demo-media-research-{a,b}.json. This file never downloads media. */
export const DEMO_STOCK_MEDIA: readonly DemoStockClip[] = [
  {
    id: "stock01",
    title: "Aerial View Of Ocean Waves",
    author: "ArtHouse Studio",
    sourceProvider: "Pexels",
    sourceId: "4631568",
    sourcePage:
      "https://www.pexels.com/video/aerial-view-of-ocean-waves-4631568/",
    url: "https://videos.pexels.com/video-files/4631568/4631568-hd_1280_720_24fps.mp4",
    kind: "mp4",
    duration: 12.436666666666667,
    bytes: 4596861,
    license: {
      name: "Pexels License",
      url: "https://www.pexels.com/license/",
      attribution: "Aerial View Of Ocean Waves by ArtHouse Studio / Pexels",
      externalPlaybackAllowed: true,
    },
    verification: {
      verifiedAt: "2026-11-01",
      durationSource: "container-metadata",
      httpStatus: 206,
      contentType: "video/mp4",
      cors: "anonymous",
      noRecognizablePeople: true,
    },
    approved: true,
  },
  {
    id: "stock02",
    title: "Time Lapse of Moving Clouds over the Mountains at Sunset",
    author: "Erhan Dayı",
    sourceProvider: "Pexels",
    sourceId: "11998311",
    sourcePage:
      "https://www.pexels.com/video/time-lapse-of-moving-clouds-over-the-mountains-at-sunset-11998311/",
    url: "https://videos.pexels.com/video-files/11998311/11998311-hd_1280_720_24fps.mp4",
    kind: "mp4",
    duration: 14.25,
    bytes: 5696617,
    license: {
      name: "Pexels License",
      url: "https://www.pexels.com/license/",
      attribution:
        "Time Lapse of Moving Clouds over the Mountains at Sunset by Erhan Dayı / Pexels",
      externalPlaybackAllowed: true,
    },
    verification: {
      verifiedAt: "2026-11-01",
      durationSource: "container-metadata",
      httpStatus: 206,
      contentType: "video/mp4",
      cors: "anonymous",
      noRecognizablePeople: true,
    },
    approved: true,
  },
  {
    id: "stock03",
    title: "Flowing Water in Waterfall",
    author: "Ambient_Nature_ Atmosphere",
    sourceProvider: "Pexels",
    sourceId: "13071923",
    sourcePage:
      "https://www.pexels.com/video/flowing-water-in-waterfall-13071923/",
    url: "https://videos.pexels.com/video-files/13071923/13071923-hd_1280_720_30fps.mp4",
    kind: "mp4",
    duration: 31.018333333333334,
    bytes: 11782914,
    license: {
      name: "Pexels License",
      url: "https://www.pexels.com/license/",
      attribution:
        "Flowing Water in Waterfall by Ambient_Nature_ Atmosphere / Pexels",
      externalPlaybackAllowed: true,
    },
    verification: {
      verifiedAt: "2026-11-01",
      durationSource: "container-metadata",
      httpStatus: 206,
      contentType: "video/mp4",
      cors: "anonymous",
      noRecognizablePeople: true,
    },
    approved: true,
  },
  {
    id: "stock04",
    title: "A Footage of a Forest",
    author: "Cristina Verceles",
    sourceProvider: "Pexels",
    sourceId: "5367420",
    sourcePage: "https://www.pexels.com/video/a-footage-of-a-forest-5367420/",
    url: "https://videos.pexels.com/video-files/5367420/5367420-hd_1280_720_24fps.mp4",
    kind: "mp4",
    duration: 14.933333333333334,
    bytes: 5799911,
    license: {
      name: "Pexels License",
      url: "https://www.pexels.com/license/",
      attribution: "A Footage of a Forest by Cristina Verceles / Pexels",
      externalPlaybackAllowed: true,
    },
    verification: {
      verifiedAt: "2026-11-01",
      durationSource: "container-metadata",
      httpStatus: 206,
      contentType: "video/mp4",
      cors: "anonymous",
      noRecognizablePeople: true,
    },
    approved: true,
  },
  {
    id: "stock05",
    title: "Scenic View of a Placid Lake",
    author: "Mehmet Ali Turan",
    sourceProvider: "Pexels",
    sourceId: "5511816",
    sourcePage:
      "https://www.pexels.com/video/scenic-view-of-a-placid-lake-5511816/",
    url: "https://videos.pexels.com/video-files/5511816/5511816-hd_1280_720_25fps.mp4",
    kind: "mp4",
    duration: 15.486666666666666,
    bytes: 3176842,
    license: {
      name: "Pexels License",
      url: "https://www.pexels.com/license/",
      attribution: "Scenic View of a Placid Lake by Mehmet Ali Turan / Pexels",
      externalPlaybackAllowed: true,
    },
    verification: {
      verifiedAt: "2026-11-01",
      durationSource: "container-metadata",
      httpStatus: 206,
      contentType: "video/mp4",
      cors: "anonymous",
      noRecognizablePeople: true,
    },
    approved: true,
  },
  {
    id: "stock06",
    title: "Mountainous area in the Alps",
    author: "@dubassy",
    sourceProvider: "Mixkit",
    sourceId: "4132",
    sourcePage:
      "https://mixkit.co/free-stock-video/mountainous-area-in-the-alps-4132/",
    url: "https://assets.mixkit.co/videos/4132/4132-720.mp4",
    kind: "mp4",
    duration: 15.8,
    bytes: 4901373,
    license: {
      name: "Mixkit Stock Video Free License",
      url: "https://mixkit.co/license/modal/videoFree/",
      attribution: "Mountainous area in the Alps by @dubassy / Mixkit",
      externalPlaybackAllowed: true,
    },
    verification: {
      verifiedAt: "2026-11-01",
      durationSource: "browser-metadata",
      httpStatus: 206,
      contentType: "video/mp4",
      cors: "unknown",
      noRecognizablePeople: true,
    },
    approved: true,
  },
  {
    id: "stock07",
    title: "Turquoise blue water bay from above",
    author: "@marcolopez",
    sourceProvider: "Mixkit",
    sourceId: "5008",
    sourcePage:
      "https://mixkit.co/free-stock-video/turquoise-blue-water-bay-from-above-5008/",
    url: "https://assets.mixkit.co/videos/5008/5008-720.mp4",
    kind: "mp4",
    duration: 15.098417,
    bytes: 4493509,
    license: {
      name: "Mixkit Stock Video Free License",
      url: "https://mixkit.co/license/modal/videoFree/",
      attribution:
        "Turquoise blue water bay from above by @marcolopez / Mixkit",
      externalPlaybackAllowed: true,
    },
    verification: {
      verifiedAt: "2026-11-01",
      durationSource: "browser-metadata",
      httpStatus: 206,
      contentType: "video/mp4",
      cors: "unknown",
      noRecognizablePeople: true,
    },
    approved: true,
  },
  {
    id: "stock08",
    title: "Waterfall in woods",
    author: "@marcolopez",
    sourceProvider: "Mixkit",
    sourceId: "2212",
    sourcePage: "https://mixkit.co/free-stock-video/waterfall-in-woods-2212/",
    url: "https://assets.mixkit.co/videos/2212/2212-720.mp4",
    kind: "mp4",
    duration: 15.056708,
    bytes: 5425641,
    license: {
      name: "Mixkit Stock Video Free License",
      url: "https://mixkit.co/license/modal/videoFree/",
      attribution: "Waterfall in woods by @marcolopez / Mixkit",
      externalPlaybackAllowed: true,
    },
    verification: {
      verifiedAt: "2026-11-01",
      durationSource: "browser-metadata",
      httpStatus: 206,
      contentType: "video/mp4",
      cors: "unknown",
      noRecognizablePeople: true,
    },
    approved: true,
  },
  {
    id: "stock09",
    title: "Countryside meadow",
    author: "@dubassy",
    sourceProvider: "Mixkit",
    sourceId: "4075",
    sourcePage: "https://mixkit.co/free-stock-video/countryside-meadow-4075/",
    url: "https://assets.mixkit.co/videos/4075/4075-720.mp4",
    kind: "mp4",
    duration: 23.12,
    bytes: 8865733,
    license: {
      name: "Mixkit Stock Video Free License",
      url: "https://mixkit.co/license/modal/videoFree/",
      attribution: "Countryside meadow by @dubassy / Mixkit",
      externalPlaybackAllowed: true,
    },
    verification: {
      verifiedAt: "2026-11-01",
      durationSource: "browser-metadata",
      httpStatus: 206,
      contentType: "video/mp4",
      cors: "unknown",
      noRecognizablePeople: true,
    },
    approved: true,
  },
  {
    id: "stock10",
    title: "Aerial view of city traffic at night",
    author: "@franklandgrave",
    sourceProvider: "Mixkit",
    sourceId: "11",
    sourcePage:
      "https://mixkit.co/free-stock-video/aerial-view-of-city-traffic-at-night-11/",
    url: "https://assets.mixkit.co/videos/11/11-720.mp4",
    kind: "mp4",
    duration: 12.5125,
    bytes: 3254260,
    license: {
      name: "Mixkit Stock Video Free License",
      url: "https://mixkit.co/license/modal/videoFree/",
      attribution:
        "Aerial view of city traffic at night by @franklandgrave / Mixkit",
      externalPlaybackAllowed: true,
    },
    verification: {
      verifiedAt: "2026-11-01",
      durationSource: "browser-metadata",
      httpStatus: 206,
      contentType: "video/mp4",
      cors: "unknown",
      noRecognizablePeople: true,
    },
    approved: true,
  },
];

export const ORIGINAL_DEMO_MEDIA = {
  id: "original-fallback",
  title: "Original supplied sample",
  url: DEMO_STREAM_URL,
  kind: "hls" as const,
  duration: DEMO_DURATION,
  provider: "cloudflare-demo" as const,
};

function publicHttps(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`A ${field} URL is required.`);
  const parsed = new URL(value);
  const host = parsed.hostname.toLowerCase();
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    Array.from(parsed.searchParams.keys()).some((key) =>
      /^(api[_-]?key|access[_-]?token|token|secret|authorization|signature)$/i.test(
        key,
      ),
    ) ||
    host === "localhost" ||
    host.endsWith(".local") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    host.includes(":")
  )
    throw new Error(
      `The ${field} must be a public HTTPS URL without credentials.`,
    );
  return parsed.toString();
}

export function validateDemoStockManifest(
  input: readonly DemoStockClip[] = DEMO_STOCK_MEDIA,
  requireComplete = false,
): readonly DemoStockClip[] {
  if (requireComplete && input.length !== 10)
    throw new Error(
      "Ten individually approved, distinct stock clips are required before applying the dataset.",
    );
  const ids = new Set<string>(),
    urls = new Set<string>(),
    assets = new Set<string>(),
    pages = new Set<string>();
  for (const item of input) {
    if (!/^stock(0[1-9]|10)$/.test(item.id) || ids.has(item.id))
      throw new Error(
        "Stock identifiers must be unique stock01–stock10 values.",
      );
    if (
      item.approved !== true ||
      item.license?.externalPlaybackAllowed !== true ||
      item.verification?.noRecognizablePeople !== true
    )
      throw new Error(
        `Clip ${item.id} lacks explicit approval, external-playback permission or the people review.`,
      );
    if (
      !item.title?.trim() ||
      !item.author?.trim() ||
      !item.sourceProvider?.trim() ||
      !item.sourceId?.trim() ||
      !item.license?.name?.trim()
    )
      throw new Error(
        `Clip ${item.id} requires its title, author, provider, distinct source ID and licence name.`,
      );
    if (
      !Number.isFinite(item.duration) ||
      item.duration < 3.5 ||
      item.duration > 7200
    )
      throw new Error(
        `Clip ${item.id} requires a verified duration between 3.5 seconds and two hours.`,
      );
    if (
      !["mp4", "hls"].includes(item.kind) ||
      ![200, 206].includes(item.verification.httpStatus) ||
      ![
        "container-metadata",
        "browser-metadata",
        "hls-manifest",
        "provider-metadata",
      ].includes(item.verification.durationSource) ||
      !["anonymous", "blocked", "unknown"].includes(item.verification.cors) ||
      !item.verification.contentType?.trim() ||
      !Number.isFinite(Date.parse(item.verification.verifiedAt))
    )
      throw new Error(
        `Clip ${item.id} has incomplete playback, CORS or duration verification.`,
      );
    const mime = item.verification.contentType
      .split(";")[0]!
      .trim()
      .toLowerCase();
    const supported =
      item.kind === "mp4"
        ? [
            "video/mp4",
            "application/mp4",
            "application/octet-stream",
            "binary/octet-stream",
          ]
        : [
            "application/vnd.apple.mpegurl",
            "application/x-mpegurl",
            "audio/mpegurl",
            "audio/x-mpegurl",
            "text/plain",
            "application/octet-stream",
          ];
    if (!supported.includes(mime))
      throw new Error(
        `Clip ${item.id} did not verify a supported media content type.`,
      );
    if (
      item.bytes !== null &&
      (!Number.isSafeInteger(item.bytes) || item.bytes <= 0)
    )
      throw new Error(`Clip ${item.id} has an invalid verified byte length.`);
    const url = publicHttps(item.url, "playback"),
      page = new URL(publicHttps(item.sourcePage, "source"));
    publicHttps(item.license.url, "licence");
    const asset = `${item.sourceProvider.trim().toLowerCase()}:${item.sourceId.trim()}`;
    const pageKey = `${page.origin}${page.pathname.replace(/\/+$/, "")}`;
    if (urls.has(url) || assets.has(asset) || pages.has(pageKey))
      throw new Error(
        "Different encodings of one source clip do not count as distinct stock clips.",
      );
    ids.add(item.id);
    urls.add(url);
    assets.add(asset);
    pages.add(pageKey);
  }
  if (
    requireComplete &&
    Array.from(
      { length: 10 },
      (_, i) => `stock${String(i + 1).padStart(2, "0")}`,
    ).some((id) => !ids.has(id))
  )
    throw new Error(
      "The complete dataset must contain stock01 through stock10.",
    );
  return input;
}

export function stockClipsForTenant(
  tenantId: string,
  input: readonly DemoStockClip[] = DEMO_STOCK_MEDIA,
): readonly DemoStockClip[] {
  validateDemoStockManifest(input, true);
  const ids =
    tenantId === "demo"
      ? ["stock01", "stock02", "stock03", "stock04"]
      : tenantId === "other"
        ? ["stock05", "stock06", "stock07"]
        : tenantId === "third"
          ? ["stock08", "stock09", "stock10"]
          : [];
  return ids.map((id) => input.find((clip) => clip.id === id)!);
}

export function resolveDemoMedia(
  video: {
    demo?: boolean;
    url?: string;
    demoMediaId?: string;
    assetId?: string;
  },
  input: readonly DemoStockClip[] = DEMO_STOCK_MEDIA,
) {
  if (!video.demo || video.assetId) return undefined;
  if (
    video.url === ORIGINAL_DEMO_MEDIA.url &&
    (!video.demoMediaId || video.demoMediaId === ORIGINAL_DEMO_MEDIA.id)
  )
    return ORIGINAL_DEMO_MEDIA;
  const match = input.find(
    (clip) =>
      clip.url === video.url &&
      (!video.demoMediaId || clip.id === video.demoMediaId),
  );
  return match ? { ...match, provider: "demo-stock" as const } : undefined;
}

export function demoMediaCredits(clip: DemoStockClip) {
  return {
    id: clip.id,
    title: clip.title,
    author: clip.author,
    sourceProvider: clip.sourceProvider,
    sourceId: clip.sourceId,
    sourcePage: clip.sourcePage,
    licenseName: clip.license.name,
    licensePage: clip.license.url,
    attribution: clip.license.attribution,
    duration: clip.duration,
    bytes: clip.bytes,
    cors: clip.verification.cors,
    verifiedAt: clip.verification.verifiedAt,
  };
}
