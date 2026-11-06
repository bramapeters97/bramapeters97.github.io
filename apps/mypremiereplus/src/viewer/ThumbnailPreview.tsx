import { useEffect, useId, useRef, useState } from "react";
import type HlsInstance from "hls.js";
import { api } from "../api";
import { resolvePlaybackSource } from "./media";
import "./thumbnail-preview.css";

export type PreviewState = "poster" | "loading" | "playing";
export type PreviewWindow = { start: number; end: number };

export function thumbnailWindow(duration: number): PreviewWindow | null {
  if (!Number.isFinite(duration) || duration < 0.3) return null;
  const start = Math.min(duration * 0.2, 20),
    end = Math.min(duration - 0.04, start + 4);
  return end > start ? { start, end } : null;
}

export type PreviewPorts = {
  video: HTMLVideoElement;
  playback: (signal: AbortSignal) => Promise<{ url: string; duration: number }>;
  attach: (
    url: string,
    signal: AbortSignal,
    onError: () => void,
  ) => Promise<() => void>;
  state: (state: PreviewState) => void;
  claim: () => void;
};

/** Native HLS/MP4 needs an explicit load when its idle poster used preload=none. */
export function loadNativeThumbnail(
  video: HTMLVideoElement,
  url: string,
  signal: AbortSignal,
): void {
  if (signal.aborted) return;
  video.src = url;
  video.load();
}

/** Delays authorisation and owns every request/media resource until hover/focus ends. */
export function beginThumbnailPreview(ports: PreviewPorts): () => void {
  const element = ports.video,
    controller = new AbortController();
  let disposed = false,
    detach: (() => void) | undefined,
    window: PreviewWindow | null = null,
    cued = false,
    sourceDuration = 0,
    deadline: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    clearTimeout(deadline);
    controller.abort();
    element.removeEventListener("loadedmetadata", cue);
    element.removeEventListener("seeked", play);
    element.removeEventListener("playing", playing);
    element.removeEventListener("timeupdate", loop);
    element.removeEventListener("ended", loop);
    element.removeEventListener("error", stop);
    detach?.();
    element.pause();
    element.preload = "none";
    element.removeAttribute("src");
    element.load();
    ports.state("poster");
  };
  const play = () => {
    if (disposed || !window || cued) return;
    cued = true;
    element.muted = true;
    element.defaultMuted = true;
    element.volume = 0;
    void element.play().catch(stop);
  };
  const cue = () => {
    if (disposed || element.readyState < 1) return;
    const duration =
      Number.isFinite(element.duration) && element.duration > 0
        ? element.duration
        : sourceDuration;
    window = thumbnailWindow(duration);
    if (!window) {
      stop();
      return;
    }
    try {
      element.currentTime = window.start;
      if (!element.seeking) play();
    } catch {
      stop();
    }
  };
  const playing = () => {
    if (!disposed) {
      clearTimeout(deadline);
      ports.state("playing");
    }
  };
  const loop = () => {
    if (disposed || !window) return;
    if (element.ended || element.currentTime >= window.end) {
      try {
        element.currentTime = window.start;
        void element.play().catch(stop);
      } catch {
        stop();
      }
    }
  };
  element.muted = true;
  element.defaultMuted = true;
  element.volume = 0;
  element.addEventListener("loadedmetadata", cue);
  element.addEventListener("seeked", play);
  element.addEventListener("playing", playing);
  element.addEventListener("timeupdate", loop);
  element.addEventListener("ended", loop);
  element.addEventListener("error", stop);
  const timer = setTimeout(() => {
    if (disposed) return;
    ports.claim();
    ports.state("loading");
    deadline = setTimeout(stop, 12_000);
    void (async () => {
      try {
        const source = await ports.playback(controller.signal);
        if (disposed) return;
        sourceDuration = source.duration;
        element.preload = "auto";
        const release = await ports.attach(source.url, controller.signal, stop);
        if (disposed) {
          release();
          return;
        }
        detach = release;
        if (element.readyState >= 1) cue();
      } catch {
        stop();
      }
    })();
  }, 500);
  return stop;
}

const PREVIEW_OWNER = "mpp:thumbnail-preview-owner";

export default function ThumbnailPreview({
  videoId,
  available,
  activation,
}: {
  videoId: string;
  available: boolean;
  activation: "pointer" | "keyboard" | null;
}) {
  const owner = useId(),
    element = useRef<HTMLVideoElement>(null),
    frame = useRef<HTMLSpanElement>(null),
    stop = useRef<() => void>(() => undefined),
    mounted = useRef(false);
  const [state, setState] = useState<PreviewState>("poster");
  useEffect(() => {
    mounted.current = true;
    const other = (event: Event) => {
      if ((event as CustomEvent).detail !== owner) stop.current();
    };
    const hidden = () => {
      if (document.hidden) stop.current();
    };
    const blurred = () => stop.current();
    window.addEventListener(PREVIEW_OWNER, other);
    window.addEventListener("blur", blurred);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      mounted.current = false;
      stop.current();
      window.removeEventListener(PREVIEW_OWNER, other);
      window.removeEventListener("blur", blurred);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [owner]);
  useEffect(() => {
    const video = element.current;
    if (!video) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
      hover = matchMedia("(hover: hover) and (pointer: fine)");
    if (
      !available ||
      !activation ||
      reduced.matches ||
      (activation === "pointer" && !hover.matches)
    ) {
      setState("poster");
      return;
    }
    let binding: HlsInstance | undefined;
    const cancel = beginThumbnailPreview({
      video,
      playback: (signal) => api("playback/" + videoId, { signal }),
      claim: () =>
        window.dispatchEvent(new CustomEvent(PREVIEW_OWNER, { detail: owner })),
      state: (next) => {
        if (mounted.current) setState(next);
      },
      attach: async (url, signal, onError) => {
        const source = resolvePlaybackSource(url, { preferDirectHls: true });
        if (source.kind !== "hls" && source.kind !== "mp4")
          throw new Error("Preview source is unsupported.");
        if (
          source.kind === "hls" &&
          !video.canPlayType("application/vnd.apple.mpegurl")
        ) {
          const { default: Hls } = await import("hls.js");
          if (signal.aborted) return () => undefined;
          if (!Hls.isSupported())
            throw new Error("Preview playback is unsupported.");
          binding = new Hls({
            enableWorker: true,
            autoStartLoad: true,
            backBufferLength: 0,
            maxBufferLength: 8,
            maxMaxBufferLength: 12,
            maxBufferSize: 8 * 1024 * 1024,
          });
          binding.on(Hls.Events.ERROR, (_event, detail) => {
            if (detail.fatal) onError();
          });
          const activeBinding = binding;
          binding.on(Hls.Events.MEDIA_ATTACHED, () => {
            if (!signal.aborted) activeBinding.startLoad();
          });
          binding.loadSource(source.url);
          binding.attachMedia(video);
        } else loadNativeThumbnail(video, source.url, signal);
        return () => {
          binding?.destroy();
          binding = undefined;
        };
      },
    });
    stop.current = cancel;
    const preference = () => {
      if (reduced.matches || (activation === "pointer" && !hover.matches))
        cancel();
    };
    reduced.addEventListener("change", preference);
    hover.addEventListener("change", preference);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? undefined
        : new IntersectionObserver((entries) => {
            if (entries.some((entry) => !entry.isIntersecting)) cancel();
          });
    if (frame.current) observer?.observe(frame.current);
    return () => {
      cancel();
      observer?.disconnect();
      reduced.removeEventListener("change", preference);
      hover.removeEventListener("change", preference);
      stop.current = () => undefined;
    };
  }, [videoId, available, activation, owner]);
  return (
    <span
      ref={frame}
      className={
        "thumbnail-preview " + (state === "playing" ? "is-playing" : "")
      }
      aria-hidden="true"
      data-thumbnail-preview={videoId}
      data-preview-state={state}
    >
      <video ref={element} muted playsInline preload="none" tabIndex={-1} />
      <span className="thumbnail-preview-sound" aria-hidden="true">
        SILENT PREVIEW
      </span>
    </span>
  );
}
