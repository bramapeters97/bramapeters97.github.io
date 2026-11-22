import { afterEach, describe, expect, it, vi } from "vitest";
import {
  beginThumbnailPreview,
  loadNativeThumbnail,
  thumbnailWindow,
  type PreviewPorts,
} from "./ThumbnailPreview";

class PreviewVideo extends EventTarget {
  muted = false;
  defaultMuted = false;
  volume = 1;
  readyState = 0;
  duration = 4;
  currentTime = 0;
  seeking = false;
  ended = false;
  paused = true;
  preload = "none";
  src = "";
  play = vi.fn(async () => {
    this.paused = false;
    this.dispatchEvent(new Event("playing"));
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  removeAttribute = vi.fn();
  load = vi.fn();
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
function ports(
  video: PreviewVideo,
  overrides: Partial<PreviewPorts> = {},
): PreviewPorts {
  return {
    video: video as unknown as HTMLVideoElement,
    playback: vi.fn(async () => ({
      url: "https://media.example/preview.mp4",
      duration: 4,
    })),
    attach: vi.fn(async () => () => undefined),
    state: vi.fn(),
    claim: vi.fn(),
    ...overrides,
  };
}
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("thumbnail preview lifecycle", () => {
  it("does not authorise or load media when hover ends before the 500 ms delay", async () => {
    vi.useFakeTimers();
    const video = new PreviewVideo(),
      dependencies = ports(video),
      stop = beginThumbnailPreview(dependencies);
    vi.advanceTimersByTime(499);
    stop();
    vi.advanceTimersByTime(1000);
    await flush();
    expect(dependencies.playback).not.toHaveBeenCalled();
    expect(dependencies.attach).not.toHaveBeenCalled();
    expect(video.play).not.toHaveBeenCalled();
  });
  it("aborts an in-flight authorisation and refuses its late response after leaving the card", async () => {
    vi.useFakeTimers();
    const video = new PreviewVideo();
    let resolve!: (source: { url: string; duration: number }) => void;
    let signal: AbortSignal | undefined;
    const dependencies = ports(video, {
      playback: vi.fn((incoming) => {
        signal = incoming;
        return new Promise((done) => {
          resolve = done;
        });
      }),
    });
    const stop = beginThumbnailPreview(dependencies);
    vi.advanceTimersByTime(500);
    expect(signal?.aborted).toBe(false);
    stop();
    resolve({ url: "https://media.example/preview.mp4", duration: 4 });
    await flush();
    expect(signal?.aborted).toBe(true);
    expect(dependencies.attach).not.toHaveBeenCalled();
    expect(video.play).not.toHaveBeenCalled();
  });
  it("keeps preview audio muted, loops inside the real clip, and tears down media on blur", async () => {
    vi.useFakeTimers();
    const video = new PreviewVideo(),
      release = vi.fn(),
      dependencies = ports(video, { attach: vi.fn(async () => release) });
    const stop = beginThumbnailPreview(dependencies);
    vi.advanceTimersByTime(500);
    await flush();
    video.readyState = 1;
    video.dispatchEvent(new Event("loadedmetadata"));
    await flush();
    expect(video.currentTime).toBeCloseTo(0.8);
    expect(video.muted).toBe(true);
    expect(video.defaultMuted).toBe(true);
    expect(video.volume).toBe(0);
    expect(video.play).toHaveBeenCalledTimes(1);
    video.currentTime = 3.98;
    video.dispatchEvent(new Event("timeupdate"));
    expect(video.currentTime).toBeCloseTo(0.8);
    stop();
    expect(release).toHaveBeenCalledTimes(1);
    expect(video.paused).toBe(true);
    expect(video.removeAttribute).toHaveBeenCalledWith("src");
    expect(video.load).toHaveBeenCalled();
    expect(video.preload).toBe("none");
    const calls = video.play.mock.calls.length;
    video.dispatchEvent(new Event("ended"));
    expect(video.play).toHaveBeenCalledTimes(calls);
  });
  it("starts native metadata loading only after the delay and playback authorisation", async () => {
    vi.useFakeTimers();
    const video = new PreviewVideo();
    video.load.mockImplementation(() => {
      if (video.preload === "auto" && video.src) {
        video.readyState = 1;
        video.dispatchEvent(new Event("loadedmetadata"));
      }
    });
    let authorise!: (source: { url: string; duration: number }) => void;
    const dependencies = ports(video, {
      playback: vi.fn(
        () =>
          new Promise((resolve) => {
            authorise = resolve;
          }),
      ),
      attach: async (url, signal) => {
        loadNativeThumbnail(video as unknown as HTMLVideoElement, url, signal);
        return () => undefined;
      },
    });
    const stop = beginThumbnailPreview(dependencies);
    vi.advanceTimersByTime(500);
    await flush();
    expect(video.preload).toBe("none");
    expect(video.load).not.toHaveBeenCalled();
    expect(video.play).not.toHaveBeenCalled();
    authorise({ url: "https://media.example/native.m3u8", duration: 4 });
    await flush();
    expect(video.preload).toBe("auto");
    expect(video.src).toBe("https://media.example/native.m3u8");
    expect(video.load).toHaveBeenCalledTimes(1);
    expect(video.currentTime).toBeCloseTo(0.8);
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(dependencies.state).toHaveBeenCalledWith("playing");
    stop();
  });
  it("returns to the poster and releases a stalled media load after a bounded deadline", async () => {
    vi.useFakeTimers();
    const video = new PreviewVideo(),
      release = vi.fn();
    const dependencies = ports(video, { attach: vi.fn(async () => release) });
    beginThumbnailPreview(dependencies);
    vi.advanceTimersByTime(500);
    await flush();
    expect(dependencies.state).toHaveBeenLastCalledWith("loading");
    vi.advanceTimersByTime(12_000);
    await flush();
    expect(dependencies.state).toHaveBeenLastCalledWith("poster");
    expect(release).toHaveBeenCalledTimes(1);
    expect(video.preload).toBe("none");
    expect(video.play).not.toHaveBeenCalled();
  });
  it("releases a media binding whose asynchronous creation completes after cancellation", async () => {
    vi.useFakeTimers();
    const video = new PreviewVideo(),
      release = vi.fn();
    let resolve!: (cleanup: () => void) => void;
    const dependencies = ports(video, {
      attach: vi.fn(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      ),
    });
    const stop = beginThumbnailPreview(dependencies);
    vi.advanceTimersByTime(500);
    await flush();
    stop();
    resolve(release);
    await flush();
    expect(release).toHaveBeenCalledTimes(1);
    expect(video.play).not.toHaveBeenCalled();
  });
});

describe("thumbnail interval bounds", () => {
  it("uses a short real interval without inventing a longer demo duration", () => {
    const result = thumbnailWindow(4)!;
    expect(result.start).toBeCloseTo(0.8);
    expect(result.end - result.start).toBeGreaterThan(3);
    expect(result.end).toBeLessThan(4);
  });
  it("caps the preview offset and bounds longer-film loops to four seconds", () => {
    expect(thumbnailWindow(7200)).toEqual({ start: 20, end: 24 });
    expect(thumbnailWindow(10)).toEqual({ start: 2, end: 6 });
  });
  it("rejects invalid and unusably short durations", () => {
    for (const duration of [0, -1, NaN, Infinity, 0.05])
      expect(thumbnailWindow(duration)).toBeNull();
  });
});
