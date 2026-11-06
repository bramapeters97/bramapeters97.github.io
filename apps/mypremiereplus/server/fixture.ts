import { Store, type Data } from "./store.js";

/** Rich fictional metadata for the inspectable dataset. Never copy production content.
 * Inserts only absent records: repeatedly preparing this dataset preserves local edits. */
export function populateFictionalDataset(store: Store) {
  for (const tenantId of ["demo", "other", "third"]) {
    const put = (resource: string, value: Data) => {
      if (!store.get(tenantId, resource, value.id, true))
        store.put(tenantId, resource, value);
    };
    const owner = `${tenantId}-owner`,
      videoId = `${tenantId}-video-1`;
    put("stories", {
      id: `${tenantId}-story-1`,
      videoId,
      text: "A fictional written family story, added to demonstrate optional commentary. This note does not describe or transcribe the sample footage.",
      timestamp: 1,
      creator: owner,
      status: "approved",
      approved: true,
      visibility: "all",
      gathering: true,
    });
    put("transcripts", {
      id: `${tenantId}-caption-1`,
      videoId,
      start: 0,
      end: 2,
      text: "Synthetic demonstration caption — not a transcription of the sample video.",
      language: "en",
      synthetic: true,
    });
    put("chapters", {
      id: `${tenantId}-chapter-1`,
      videoId,
      start: 0,
      end: 2,
      title: "Sample clip · opening interval",
    });
    put("chapters", {
      id: `${tenantId}-chapter-2`,
      videoId,
      start: 2,
      end: 4,
      title: "Sample clip · closing interval",
    });
    put("programmes", {
      id: `${tenantId}-programme-1`,
      title: "Our next movie night",
      hostId: owner,
      profileIds: [
        `${tenantId}-profile`,
        `${tenantId}-profile-2`,
        `${tenantId}-profile-3`,
      ],
      queue: [
        { videoId },
        { videoId: `${tenantId}-video-2`, momentId: `${tenantId}-moment-2` },
      ],
      suggestions: [],
      status: "draft",
      index: 0,
      creator: owner,
    });
    put("premieres", {
      id: `${tenantId}-premiere-1`,
      title: "A night to remember",
      videoId: `${tenantId}-video-6`,
      artwork: "/artwork/cinema.png",
      backdrop: "/artwork/cinema.png",
      releaseAt: "2099-12-24T18:00:00.000Z",
      timezone: "Europe/Amsterdam",
      dedication: "A fictional premiere for this demonstration archive.",
      intro:
        "Welcome to our family cinema. This is a demonstration title card.",
      introEnabled: true,
      profileIds: [
        `${tenantId}-profile`,
        `${tenantId}-profile-2`,
        `${tenantId}-profile-3`,
      ],
      published: true,
      status: "published",
      visibility: "all",
      gathering: true,
      creator: owner,
    });
  }
}

/** Demonstration preferences for a newly built pristine fixture only.
 * Never call this while applying media changes to an existing working archive. */
export function populatePristineProfileWatchlists(store: Store) {
  for (const tenantId of ["demo", "other", "third"]) {
    for (const [profileSuffix, videoNumbers] of [
      ["", [1, 2]],
      ["-2", [3, 4]],
      ["-3", [5, 6]],
    ] as const) {
      const profileId = `${tenantId}-profile${profileSuffix}`;
      const recordId = `${tenantId}-owner:${profileId}`;
      if (!store.get(tenantId, "watchlists", recordId, true))
        store.put(tenantId, "watchlists", {
          id: recordId,
          accountId: `${tenantId}-owner`,
          profileId,
          videos: videoNumbers.map((number) => `${tenantId}-video-${number}`),
        });
    }
  }
}
