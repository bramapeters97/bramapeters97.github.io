export type QueueVideo = {
  id: string;
  title: string;
  duration: number;
  year?: number;
  location?: string;
};
export type QueueMoment = {
  id: string;
  videoId: string;
  title: string;
  start: number;
  end: number;
  familyTv?: boolean;
};
export type Interval = { videoId: string; start: number; end: number };
export type QueueItem = {
  videoId: string;
  title: string;
  start: number;
  end: number;
  year?: number;
  location?: string;
  momentId?: string;
};
export type QueueConfig = {
  mode: "mix" | "moments" | "films";
  minutes: number;
  minSeconds?: number;
  maxSeconds?: number;
  excludedIntervals?: Interval[];
  excludedMomentIds?: string[];
};

function shuffle<T>(values: T[], rng: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
export function generateQueue(
  videos: QueueVideo[],
  moments: QueueMoment[],
  config: QueueConfig,
  rng: () => number = Math.random,
): QueueItem[] {
  const eligible = videos.filter(
    (v) => Number.isFinite(v.duration) && v.duration > 0,
  );
  const excluded = config.excludedIntervals ?? [];
  const overlaps = (v: string, s: number, e: number) =>
    excluded.some((x) => x.videoId === v && s < x.end && e > x.start);
  const exact = moments.filter(
    (m) =>
      m.familyTv !== false &&
      !config.excludedMomentIds?.includes(m.id) &&
      eligible.some(
        (v) =>
          v.id === m.videoId &&
          m.start >= 0 &&
          m.end <= v.duration &&
          m.end > m.start,
      ) &&
      !overlaps(m.videoId, m.start, m.end),
  );
  const queue: QueueItem[] = [];
  let elapsed = 0;
  let last = "";
  const target = (config.minutes || 60) * 60;
  let attempts = 0;
  while (elapsed < target && queue.length < 5000 && attempts++ < 5000) {
    const candidates: (QueueMoment | QueueVideo)[] =
      config.mode === "moments" ? exact : eligible;
    if (!candidates.length) break;
    let cycle = shuffle(candidates, rng);
    if (
      cycle.length > 1 &&
      ("videoId" in cycle[0]! ? cycle[0]!.videoId : cycle[0]!.id) === last
    ) {
      const i = cycle.findIndex(
        (x) => ("videoId" in x ? x.videoId : x.id) !== last,
      );
      if (i > 0) [cycle[0], cycle[i]] = [cycle[i]!, cycle[0]!];
    }
    let added = false;
    for (const value of cycle) {
      let item: QueueItem;
      if ("videoId" in value) {
        const v = eligible.find((v) => v.id === value.videoId)!;
        item = {
          videoId: v.id,
          title: value.title,
          start: value.start,
          end: value.end,
          year: v.year,
          location: v.location,
          momentId: value.id,
        };
      } else {
        const v = value;
        let start = 0;
        let end = v.duration;
        if (config.mode === "mix") {
          const minimum = Math.max(
            1,
            Math.min(config.minSeconds ?? 30, v.duration),
          );
          const maximum = Math.max(
            minimum,
            Math.min(config.maxSeconds ?? 90, v.duration),
          );
          const length = minimum + rng() * (maximum - minimum);
          let found = false;
          for (let n = 0; n < 50; n++) {
            start = rng() * Math.max(0, v.duration - length);
            end = Math.min(v.duration, start + length);
            if (!overlaps(v.id, start, end)) {
              found = true;
              break;
            }
          }
          if (!found) continue;
        } else if (overlaps(v.id, start, end)) continue;
        item = {
          videoId: v.id,
          title: v.title,
          start,
          end,
          year: v.year,
          location: v.location,
        };
      }
      if (
        item.videoId === last &&
        eligible.length > 1 &&
        cycle.some((x) => ("videoId" in x ? x.videoId : x.id) !== last)
      )
        continue;
      queue.push(item);
      last = item.videoId;
      elapsed += item.end - item.start;
      added = true;
      if (elapsed >= target || queue.length >= 5000) break;
    }
    if (!added) break;
  }
  return queue;
}
