import { apiUrl, appUrl, normalizeApiUrls } from "./paths";
import { artworkUrl } from "./artwork";
import { useCallback, useEffect, useRef, useState } from "react";
import type HlsInstance from "hls.js";
import { api, json } from "./api";
import { brand } from "./brand";
import "./broadcast.css";
const time = (s = 0) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const notify = (error: unknown) =>
  (error as Error).message || "Something went wrong. Please try again.";

export function MomentEditor({
  initial,
  onClose,
}: {
  initial: any;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void api("bootstrap")
      .then((d) => {
        for (const resource of [
          "videos",
          "collections",
          "channels",
          "premieres",
          "moments",
        ])
          d[resource] = d[resource].map((v: any) => ({
            ...v,
            ...Object.fromEntries(
              ["poster", "backdrop", "artwork", "thumbnail"]
                .filter((k) => v[k])
                .map((k) => [k, artworkUrl(v[k])]),
            ),
          }));
        setData(d);
      })
      .catch((e) => setError(notify(e)));
    const previous = document.activeElement as HTMLElement;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          "button,input,textarea,select",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    setTimeout(() => ref.current?.querySelector("input")?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div className="dialog-backdrop">
      <div
        className="moment-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="moment-heading"
        ref={ref}
      >
        <h2 id="moment-heading">Save this moment</h2>
        <p>
          A small memory, easy to find again. The original film stays intact.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await api(
                initial.id ? `moments/${initial.id}` : "moments",
                json(initial.id ? "PATCH" : "POST", {
                  ...f,
                  videoId: initial.videoId,
                  start: Number(f.start),
                  end: Number(f.end),
                  familyTv: f.familyTv === "on",
                  collectionIds: f.collection ? [f.collection] : [],
                  visibility: "all",
                }),
              );
              onClose();
            } catch (e) {
              setError(notify(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Moment title
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={initial.title ?? ""}
            />
          </label>
          <div className="time-fields">
            <label>
              Beginning (seconds)
              <input
                name="start"
                type="number"
                step="0.1"
                min="0"
                max={initial.duration}
                defaultValue={initial.start ?? 0}
                required
              />
            </label>
            <label>
              End (seconds)
              <input
                name="end"
                type="number"
                step="0.1"
                min="0.1"
                max={initial.duration}
                defaultValue={
                  initial.end ??
                  Math.min(initial.duration, (initial.start ?? 0) + 30)
                }
                required
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              name="description"
              defaultValue={initial.description ?? ""}
            />
          </label>
          <label>
            Collection
            <select name="collection">
              <option value="">No collection</option>
              {data?.collections.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              name="familyTv"
              defaultChecked={initial.familyTv ?? true}
            />
            Include in Family TV
          </label>
          <p>
            Available interval: 0–{time(initial.duration)}. Saved moments
            reference this film.
          </p>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="gold-button" disabled={busy}>
              {busy ? "Saving…" : "Save moment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type SegmentPlayerProps = {
  videoId: string;
  start?: number;
  end?: number;
  onEnd?: () => void;
  onPosition?: (seconds: number) => void;
  title: string;
  onSave?: (seconds: number, duration: number) => void;
  overlay?: boolean;
  broadcastFullscreen?: boolean;
  sequenceKey?: string | number;
  suspended?: boolean;
};

function SegmentPlayer(props: SegmentPlayerProps) {
  return props.broadcastFullscreen ? (
    <BroadcastSegmentPlayer {...props} />
  ) : (
    <StandardSegmentPlayer {...props} />
  );
}

function BroadcastSegmentPlayer({
  videoId,
  start = 0,
  end,
  onEnd,
  onPosition,
  title,
  onSave,
  sequenceKey,
  suspended = false,
}: SegmentPlayerProps) {
  const video = useRef<HTMLVideoElement>(null),
    hls = useRef<HlsInstance | null>(null),
    installedUrl = useRef("");
  const mounted = useRef(false),
    authorized = useRef(false),
    cued = useRef(false),
    ended = useRef(false),
    previousTime = useRef(start),
    manualSeekUntil = useRef(0),
    recover = useRef(false);
  const segment = useRef({ start, end, suspended }),
    endAction = useRef(onEnd),
    positionAction = useRef(onPosition);
  segment.current = { start, end, suspended };
  endAction.current = onEnd;
  positionAction.current = onPosition;
  const [position, setPosition] = useState(start),
    [duration, setDuration] = useState(0),
    [pending, setPending] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [hint, setHint] = useState(""),
    [retry, setRetry] = useState(0);
  function finish() {
    if (ended.current) return;
    ended.current = true;
    cued.current = false;
    video.current?.pause();
    hls.current?.stopLoad();
    endAction.current?.();
  }
  function inspect() {
    const element = video.current,
      range = segment.current;
    if (
      !element ||
      !authorized.current ||
      !cued.current ||
      range.suspended ||
      element.paused ||
      element.seeking
    )
      return;
    const current = element.currentTime,
      limit = Math.min(range.end ?? element.duration, element.duration);
    if (!Number.isFinite(limit) || limit <= range.start) return;
    const tolerance = Math.min(
      0.06,
      Math.max(0.001, (limit - range.start) / 3),
    );
    const wrapped =
      Date.now() > manualSeekUntil.current &&
      current + 0.2 < previousTime.current &&
      previousTime.current >= limit - 0.8;
    previousTime.current = current;
    if (current >= limit - tolerance || wrapped) finish();
  }
  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(inspect, 50);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      video.current?.pause();
      hls.current?.destroy();
      hls.current = null;
      installedUrl.current = "";
      video.current?.removeAttribute("src");
      video.current?.load();
    };
  }, []);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let disposed = false,
      waitingForSeek = false;
    const controller = new AbortController();
    authorized.current = false;
    cued.current = false;
    ended.current = false;
    previousTime.current = start;
    manualSeekUntil.current = 0;
    element.pause();
    hls.current?.stopLoad();
    setReady(false);
    setError("");
    setHint("");
    setPosition(start);
    if (!videoId || suspended) {
      setPending(false);
      return () => controller.abort();
    }
    setPending(true);
    const play = () => {
      if (disposed || !waitingForSeek) return;
      waitingForSeek = false;
      cued.current = true;
      setReady(true);
      setPending(false);
      previousTime.current = element.currentTime;
      void element.play().catch(() => {
        if (!disposed) setHint("Press Play to start this broadcast.");
      });
    };
    const cue = () => {
      if (disposed || !authorized.current || element.readyState < 1) return;
      const realDuration = Number.isFinite(element.duration)
        ? element.duration
        : duration;
      const target = Math.min(start, Math.max(0, realDuration - 0.01));
      waitingForSeek = true;
      try {
        element.currentTime = target;
        setPosition(target);
        previousTime.current = target;
        if (!element.seeking) play();
      } catch {
        setError(
          "This segment could not be cued. Retry it or choose the next memory.",
        );
        setPending(false);
      }
    };
    element.addEventListener("loadedmetadata", cue);
    element.addEventListener("seeked", play);
    void (async () => {
      try {
        const source = await api("playback/" + videoId, {
          signal: controller.signal,
        });
        if (disposed) return;
        const url = String(source.url ?? "");
        if (!url) throw new Error("The viewing copy is unavailable.");
        setDuration(Number(source.duration) || 0);
        authorized.current = true;
        const changed = installedUrl.current !== url;
        if (changed) {
          let HlsClass: (typeof import("hls.js"))["default"] | undefined;
          if (
            url.includes(".m3u8") &&
            !element.canPlayType("application/vnd.apple.mpegurl")
          ) {
            HlsClass = (await import("hls.js")).default;
            if (disposed) return;
            if (!HlsClass.isSupported())
              throw new Error("This browser cannot play this broadcast.");
          }
          // The video node persists. Replace a media binding only when its actual URL changes.
          installedUrl.current = url;
          hls.current?.destroy();
          hls.current = null;
          if (HlsClass) {
            const binding = new HlsClass({
              backBufferLength: 10,
              maxBufferLength: 20,
            });
            hls.current = binding;
            binding.on(HlsClass.Events.ERROR, (_event, detail) => {
              if (
                detail.fatal &&
                mounted.current &&
                installedUrl.current === url
              ) {
                element.pause();
                setError(
                  "Playback was interrupted. Retry, or skip to the next memory.",
                );
                setPending(false);
                setReady(false);
              }
            });
            binding.loadSource(url);
            binding.attachMedia(element);
          } else element.src = url;
        } else {
          if (recover.current) {
            hls.current?.recoverMediaError();
            recover.current = false;
          }
          hls.current?.startLoad();
        }
        if (!changed && element.readyState >= 1) cue();
      } catch (cause) {
        if (!disposed) {
          authorized.current = false;
          setError(notify(cause));
          setPending(false);
          setReady(false);
        }
      }
    })();
    // No media teardown on a clip boundary: an identical stream keeps its HLS binding.
    return () => {
      disposed = true;
      controller.abort();
      element.removeEventListener("loadedmetadata", cue);
      element.removeEventListener("seeked", play);
      element.pause();
      hls.current?.stopLoad();
    };
  }, [videoId, start, end, sequenceKey, suspended, retry]);
  const markManualSeek = () => {
    manualSeekUntil.current = Date.now() + 1500;
  };
  return (
    <div className="feature-player broadcast-persistent-player">
      <video
        ref={video}
        controls
        controlsList="nofullscreen nodownload"
        playsInline
        loop
        preload="metadata"
        aria-label={title}
        onPointerDown={markManualSeek}
        onPointerUp={markManualSeek}
        onPointerMove={(event) => {
          if (event.buttons) markManualSeek();
        }}
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            markManualSeek();
        }}
        onPlay={(event) => {
          if (!authorized.current || !cued.current || segment.current.suspended)
            event.currentTarget.pause();
          else setHint("");
        }}
        onTimeUpdate={(event) => {
          setPosition(event.currentTarget.currentTime);
          positionAction.current?.(event.currentTarget.currentTime);
          inspect();
        }}
        onEnded={finish}
        onError={() => {
          if (authorized.current) {
            setError(
              "This browser could not play this programme. Retry it or choose another memory.",
            );
            setPending(false);
            setReady(false);
          }
        }}
      />
      {pending && (
        <div className="broadcast-player-feedback" role="status">
          Preparing your next memory…
        </div>
      )}
      {error && (
        <div
          className="broadcast-player-feedback broadcast-player-error"
          role="alert"
        >
          <h2>Let’s try that again.</h2>
          <p>{error}</p>
          <div className="feature-actions">
            <button
              onClick={() => {
                recover.current = true;
                setRetry((value) => value + 1);
              }}
            >
              Retry playback
            </button>
            {onEnd && <button onClick={finish}>Skip this item</button>}
          </div>
        </div>
      )}
      <div className="player-caption">
        <span>
          {title} <small>· {time(position)}</small>
          {hint && <small> · {hint}</small>}
        </span>
        {onSave && (
          <button
            disabled={!ready || pending || suspended}
            onClick={() => {
              video.current?.pause();
              onSave(position, duration);
            }}
          >
            ✦ Save this moment
          </button>
        )}
      </div>
    </div>
  );
}

function StandardSegmentPlayer({
  videoId,
  start = 0,
  end,
  onEnd,
  onPosition,
  title,
  onSave,
  overlay = false,
  broadcastFullscreen = false,
}: {
  videoId: string;
  start?: number;
  end?: number;
  onEnd?: () => void;
  onPosition?: (s: number) => void;
  title: string;
  onSave?: (s: number, d: number) => void;
  overlay?: boolean;
  broadcastFullscreen?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null),
    [source, setSource] = useState<any>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [position, setPosition] = useState(start);
  const ended = useRef(false),
    endRef = useRef(onEnd);
  endRef.current = onEnd;
  useEffect(() => {
    let active = true;
    setSource(null);
    setError("");
    ended.current = false;
    setPosition(start);
    void api(`playback/${videoId}`)
      .then((v) => {
        if (active) setSource(v);
      })
      .catch((e) => {
        if (active) setError(notify(e));
      });
    return () => {
      active = false;
    };
  }, [videoId, retry, start, end]);
  useEffect(() => {
    const element = video.current;
    if (!source || !element) return;
    let disposed = false;
    let hls: HlsInstance | undefined;
    const failed = () => {
      if (!disposed)
        setError(
          "Playback was interrupted. Retry, or skip to the next memory.",
        );
    };
    async function attach() {
      if (
        source.url.includes(".m3u8") &&
        !element!.canPlayType("application/vnd.apple.mpegurl")
      ) {
        const { default: Hls } = await import("hls.js");
        if (disposed) return;
        if (!Hls.isSupported()) {
          failed();
          return;
        }
        hls = new Hls({ backBufferLength: 10 });
        hls.on(Hls.Events.ERROR, (_e, d) => {
          if (d.fatal) failed();
        });
        hls.loadSource(source.url);
        hls.attachMedia(element!);
      } else element!.src = source.url;
    }
    void attach().catch(failed);
    return () => {
      disposed = true;
      hls?.destroy();
      element.pause();
      element.removeAttribute("src");
      element.load();
    };
  }, [source]);
  function finish() {
    if (ended.current) return;
    ended.current = true;
    video.current?.pause();
    endRef.current?.();
  }
  return (
    <div className="feature-player">
      {error ? (
        <div className="feature-panel" role="alert">
          <h2>Let’s try that again.</h2>
          <p>{error}</p>
          <button onClick={() => setRetry((r) => r + 1)}>Retry playback</button>
          {onEnd && <button onClick={finish}>Skip this item</button>}
        </div>
      ) : (
        <>
          <video
            ref={video}
            controls
            controlsList={
              broadcastFullscreen ? "nofullscreen nodownload" : "nodownload"
            }
            playsInline
            autoPlay
            preload="metadata"
            aria-label={title}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              v.currentTime = Math.min(start, Math.max(0, v.duration - 0.05));
              void v.play().catch(() => undefined);
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              setPosition(v.currentTime);
              onPosition?.(v.currentTime);
              if (end !== undefined && v.currentTime >= end - 0.08) finish();
            }}
            onEnded={finish}
            onError={() =>
              setError(
                "This browser could not play the video. Try a compatible MP4 or another browser.",
              )
            }
          />
          {!source && <p role="status">Preparing your video…</p>}
          {overlay && (
            <div className="tv-segment-overlay" key={`${videoId}:${start}`}>
              <strong>{title}</strong>
              <small>
                {time(start)}–{time(end ?? source?.duration ?? 0)}
              </small>
            </div>
          )}
        </>
      )}
      <div className="player-caption">
        <span>
          {title} <small>· {time(position)}</small>
        </span>
        {onSave && (
          <button
            onClick={() => {
              video.current?.pause();
              onSave(position, source?.duration ?? 0);
            }}
          >
            ✦ Save this moment
          </button>
        )}
      </div>
    </div>
  );
}

function FamilyTV({ data, session }: { data: any; session: any }) {
  const stations = data.channels
    .filter((station: any) => station.enabled && station.published)
    .sort(
      (left: any, right: any) =>
        String(left.createdAt ?? "9999").localeCompare(
          String(right.createdAt ?? "9999"),
        ) || String(left.id).localeCompare(String(right.id)),
    );
  const [channel, setChannel] = useState(stations[0]?.id ?? ""),
    [mode, setMode] = useState(stations[0]?.mode ?? "mix");
  const [minutes, setMinutes] = useState(String(stations[0]?.minutes ?? 30)),
    [active, setActive] = useState<any>(null),
    [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [guide, setGuide] = useState(true),
    [caption, setCaption] = useState(false);
  const [switching, setSwitching] = useState(false),
    [signal, setSignal] = useState(0),
    [announcement, setAnnouncement] = useState(
      "Choose a station. Your family is on television.",
    );
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false),
    [immersive, setImmersive] = useState(false),
    [savedMoment, setSavedMoment] = useState<any>(null);
  const screen = useRef<HTMLDivElement>(null),
    generation = useRef(0),
    alive = useRef(true),
    locked = useRef(false);
  const immersiveRef = useRef(false);
  immersiveRef.current = immersive;
  const fullscreenActive = nativeFullscreen || immersive;
  const request = useRef<AbortController | null>(null),
    switchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    captionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const remote = useRef<(direction: number) => void>(() => undefined);
  const stationData = stations.find((station: any) => station.id === channel);
  const stationNumber =
    Math.max(
      0,
      stations.findIndex((station: any) => station.id === channel),
    ) + 1;
  const broadcastMode = active?.mode ?? mode;
  const number = (value: number) => String(value).padStart(2, "0");
  const key = "mpp-tv:" + session.tenant.id + ":" + session.account.id;
  const item = active?.queue?.[index];
  function revealCaption() {
    setCaption(true);
    if (captionTimer.current) clearTimeout(captionTimer.current);
    captionTimer.current = setTimeout(() => setCaption(false), 2300);
  }
  function changeSignal() {
    if (switchTimer.current) clearTimeout(switchTimer.current);
    setSwitching(true);
    setSignal((value) => value + 1);
    switchTimer.current = setTimeout(() => setSwitching(false), 580);
  }
  useEffect(() => {
    alive.current = true;
    const restore = new AbortController(),
      initial = generation.current;
    const saved = localStorage.getItem(key);
    if (saved)
      void api("queues/" + saved, { signal: restore.signal })
        .then((queue) => {
          if (!alive.current || generation.current !== initial) return;
          if (
            queue.status === "active" &&
            stations.some((station: any) => station.id === queue.channelId) &&
            queue.queue?.[queue.index ?? 0]
          ) {
            setActive(queue);
            setIndex(queue.index ?? 0);
            setChannel(queue.channelId);
            setMode(queue.mode);
            setMinutes(String(queue.minutes));
            setGuide(false);
            setAnnouncement(
              "Your broadcast has resumed from its saved programme.",
            );
          } else localStorage.removeItem(key);
        })
        .catch(() => {
          if (!restore.signal.aborted) localStorage.removeItem(key);
        });
    return () => {
      alive.current = false;
      restore.abort();
      request.current?.abort();
      if (switchTimer.current) clearTimeout(switchTimer.current);
      if (captionTimer.current) clearTimeout(captionTimer.current);
    };
  }, []);
  useEffect(() => {
    const wrapper = screen.current;
    const changed = () =>
      setNativeFullscreen(document.fullscreenElement === wrapper);
    document.addEventListener("fullscreenchange", changed);
    changed();
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      // Never exit another surface's fullscreen while cleaning up this broadcast.
      if (wrapper && document.fullscreenElement === wrapper)
        void document.exitFullscreen().catch(() => undefined);
    };
  }, []);
  useEffect(() => {
    if (!fullscreenActive) return;
    const bodyOverflow = document.body.style.overflow,
      htmlOverflow = document.documentElement.style.overflow;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const containFocus = (event: KeyboardEvent) => {
      if (
        event.key !== "Tab" ||
        (event.target as HTMLElement | null)?.closest('[role="dialog"],dialog')
      )
        return;
      const nodes = Array.from(
        screen.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),video[controls],input,select,textarea,a[href]",
        ) ?? [],
      ).filter((node) => node.getClientRects().length > 0);
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", containFocus);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      document.removeEventListener("keydown", containFocus);
      const dialogInput = screen.current?.querySelector<HTMLElement>(
        '[role="dialog"] input',
      );
      if (dialogInput) dialogInput.focus();
      else if (previous?.isConnected) previous.focus();
    };
  }, [fullscreenActive]);
  useEffect(() => {
    if (item) revealCaption();
  }, [active?.id, index]);
  async function exitBroadcastFullscreen() {
    setImmersive(false);
    if (document.fullscreenElement === screen.current)
      try {
        await document.exitFullscreen();
      } catch {
        setError(
          "Use Escape or the fullscreen exit control to return to your broadcast page.",
        );
      }
  }
  async function toggleBroadcastFullscreen() {
    const wrapper = screen.current;
    if (!wrapper) return;
    if (document.fullscreenElement === wrapper || immersiveRef.current) {
      await exitBroadcastFullscreen();
      return;
    }
    if (
      document.fullscreenElement &&
      !wrapper.contains(document.fullscreenElement)
    ) {
      setError(
        "Close the other fullscreen view before opening this broadcast fullscreen.",
      );
      return;
    }
    if (
      typeof wrapper.requestFullscreen === "function" &&
      document.fullscreenEnabled !== false
    ) {
      try {
        await wrapper.requestFullscreen();
        return;
      } catch {
        /* Older mobile browsers use the immersive viewport below. */
      }
    }
    if (alive.current) setImmersive(true);
  }
  async function tune(target = channel, force = false, chosenMode?: string) {
    const station = stations.find((value: any) => value.id === target);
    if (!station || locked.current) return;
    if (active?.channelId === target && item && !force) {
      setGuide(false);
      revealCaption();
      return;
    }
    locked.current = true;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const serial = ++generation.current;
    const playbackMode =
      chosenMode ?? (target === channel ? mode : (station.mode ?? "mix"));
    screen.current?.querySelector("video")?.pause();
    setChannel(target);
    setMode(playbackMode);
    setBusy(true);
    setError("");
    setGuide(false);
    localStorage.removeItem(key);
    changeSignal();
    setAnnouncement(
      "Tuning to channel " +
        number(stations.indexOf(station) + 1) +
        ", " +
        station.name +
        ".",
    );
    try {
      const queue = await api("channels/" + target + "/mix", {
        ...json("POST", { mode: playbackMode, minutes: Number(minutes) }),
        signal: controller.signal,
      });
      if (!alive.current || serial !== generation.current) return;
      setActive(queue);
      setIndex(0);
      if (queue.queue?.length) {
        localStorage.setItem(key, queue.id);
        setAnnouncement(
          "Channel " +
            number(stations.indexOf(station) + 1) +
            ", " +
            station.name +
            ". Now showing " +
            queue.queue[0].title +
            ".",
        );
        revealCaption();
      } else {
        setError(
          "This station has no approved programmes in this mode. Try another station or playback mode.",
        );
        setAnnouncement("No programme is available on this station.");
      }
    } catch (cause) {
      if (alive.current && !controller.signal.aborted) {
        setActive(null);
        setError(notify(cause));
        setAnnouncement(
          "This station could not be tuned. Choose another station or try again.",
        );
      }
    } finally {
      locked.current = false;
      if (alive.current && serial === generation.current) setBusy(false);
    }
  }
  async function move(next: number) {
    if (!active || locked.current || next < 0) return;
    if (next >= active.queue.length && active.continuous) {
      await tune(channel, true);
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await api(
        "queues/" + active.id,
        json("PATCH", {
          index: next,
          status: next >= active.queue.length ? "ended" : "active",
          history: active.queue.slice(Math.max(0, next - 20), next),
        }),
      );
      if (!alive.current) return;
      setIndex(next);
      if (next >= active.queue.length) {
        localStorage.removeItem(key);
        setAnnouncement("Your broadcast session has ended.");
      } else setAnnouncement("Now showing " + active.queue[next].title + ".");
    } catch (cause) {
      if (alive.current) setError(notify(cause));
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function powerOff() {
    if (locked.current) return;
    screen.current?.querySelector("video")?.pause();
    const previous = active;
    setActive(null);
    setGuide(true);
    localStorage.removeItem(key);
    setMediaPlaying(false);
    setAnnouncement("Family TV is off. Choose a station when you are ready.");
    if (previous)
      try {
        await api(
          "queues/" + previous.id,
          json("PATCH", { index, status: "ended" }),
        );
      } catch (cause) {
        if (alive.current) setError(notify(cause));
      }
  }
  function step(direction: number) {
    if (!stations.length || locked.current) return;
    const current = Math.max(
      0,
      stations.findIndex((station: any) => station.id === channel),
    );
    void tune(
      stations[(current + direction + stations.length) % stations.length].id,
    );
  }
  remote.current = step;
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key === "Escape" &&
        immersiveRef.current &&
        !target?.closest('[role="dialog"],dialog')
      ) {
        event.preventDefault();
        setImmersive(false);
        return;
      }
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey)
        return;
      if (
        target?.closest(
          'input,textarea,select,[contenteditable="true"],[role="dialog"],dialog',
        )
      )
        return;
      if (event.key === "PageUp" || event.key === "ArrowUp") {
        event.preventDefault();
        remote.current(1);
      }
      if (event.key === "PageDown" || event.key === "ArrowDown") {
        event.preventDefault();
        remote.current(-1);
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);
  async function pause() {
    const video = screen.current?.querySelector("video");
    if (!video) return;
    try {
      if (video.paused) await video.play();
      else video.pause();
    } catch {
      setError("Press Play on the video to resume this broadcast.");
    }
  }
  return (
    <div className="broadcast-page">
      <header className="broadcast-masthead">
        <div>
          <p className="eyebrow">A BROADCAST MADE OF YOUR MEMORIES</p>
          <h1>
            Family TV<span className="broadcast-plus">+</span>
          </h1>
          <p>Your family. Always something worth watching.</p>
        </div>
        <div className="broadcast-archive-sign">
          <span className="broadcast-on-air-dot" aria-hidden="true" />
          <span>
            {brand.name}
            <small>PRIVATE TELEVISION</small>
          </span>
        </div>
      </header>
      <p className="broadcast-sr" role="status" aria-live="polite">
        {announcement}
      </p>
      <div className="broadcast-layout">
        <section className="broadcast-stage">
          <div
            className={
              "broadcast-screen" + (immersive ? " broadcast-immersive" : "")
            }
            ref={screen}
            onPlayCapture={() => setMediaPlaying(true)}
            onPauseCapture={() => setMediaPlaying(false)}
            onDoubleClickCapture={(event) => {
              if ((event.target as HTMLElement).tagName === "VIDEO") {
                event.preventDefault();
                event.stopPropagation();
                void toggleBroadcastFullscreen();
              }
            }}
          >
            <SegmentPlayer
              videoId={item?.videoId ?? ""}
              start={item?.start ?? 0}
              end={item?.end}
              sequenceKey={(active?.id ?? "standby") + ":" + index}
              suspended={busy || !item}
              title={
                item
                  ? item.title + (item.year ? " · " + item.year : "")
                  : (stationData?.name ?? "Family TV")
              }
              overlay={false}
              broadcastFullscreen
              onEnd={() => void move(index + 1)}
              onSave={(start, duration) => {
                if (item)
                  setSavedMoment({
                    videoId: item.videoId,
                    start: Math.min(start, Math.max(0, duration - 0.1)),
                    duration,
                  });
              }}
            />
            {!item &&
              (active && !active.queue?.length ? (
                <div className="broadcast-off-air broadcast-idle-overlay">
                  <span>CH {number(stationNumber)}</span>
                  <h2>We’re between programmes.</h2>
                  <p>
                    This station needs approved films or moments. Another
                    station may have something for you.
                  </p>
                  <button onClick={() => setGuide(true)}>
                    Open station guide
                  </button>
                </div>
              ) : active ? (
                <div className="broadcast-off-air broadcast-idle-overlay">
                  <span>UNTIL NEXT TIME</span>
                  <h2>A lovely place to leave it.</h2>
                  <p>Your viewing session is complete.</p>
                  <button
                    className="gold-button"
                    disabled={busy}
                    onClick={() => void tune(channel, true)}
                  >
                    Start another broadcast
                  </button>
                </div>
              ) : (
                <div className="broadcast-standby broadcast-idle-overlay">
                  <img src={stationData?.artwork ?? brand.background} alt="" />
                  <div>
                    <span className="broadcast-channel-kicker">
                      CH {number(stationNumber)} ·{" "}
                      {busy ? "TUNING IN" : "READY WHEN YOU ARE"}
                    </span>
                    <h2>{stationData?.name ?? "Your private television"}</h2>
                    <p>
                      {stationData?.description ??
                        "The archive team can publish your first station in Family TV management."}
                    </p>
                    <button
                      className="gold-button"
                      disabled={!channel || busy}
                      onClick={() => void tune()}
                    >
                      {busy ? "Finding your programme…" : "▶ Tune in"}
                    </button>
                  </div>
                </div>
              ))}
            {item && (
              <div
                className={"broadcast-channel-hud " + (caption ? "shown" : "")}
                aria-hidden="true"
              >
                <span>{number(stationNumber)}</span>
                <div>
                  <strong>{stationData?.name}</strong>
                  <small>
                    {item.title}
                    {item.year ? " · " + item.year : ""}
                    {item.location ? " · " + item.location : ""}
                  </small>
                </div>
              </div>
            )}
            {switching && (
              <div className="broadcast-vhs" key={signal} aria-hidden="true">
                <div className="broadcast-tracking" />
                <span>
                  CH {number(stationNumber)}
                  <small>FINDING YOUR MEMORIES</small>
                </span>
              </div>
            )}
            <button
              className={
                "broadcast-fullscreen-toggle" +
                (fullscreenActive ? " is-fullscreen" : "")
              }
              aria-label={
                fullscreenActive
                  ? "Exit broadcast fullscreen"
                  : "Enter broadcast fullscreen"
              }
              title={
                fullscreenActive
                  ? "Exit broadcast fullscreen"
                  : "Enter broadcast fullscreen"
              }
              onClick={() => void toggleBroadcastFullscreen()}
            >
              <span aria-hidden="true">{fullscreenActive ? "×" : "⛶"}</span>
              {fullscreenActive ? "Exit broadcast fullscreen" : "Fullscreen"}
            </button>
            {fullscreenActive && (
              <div
                className="broadcast-fullscreen-controls"
                role="group"
                aria-label="Fullscreen broadcast controls"
              >
                <button
                  disabled={busy || stations.length < 2}
                  onClick={() => step(-1)}
                  aria-label="Previous channel"
                >
                  CH −
                </button>
                <button
                  disabled={busy || !item || index === 0}
                  onClick={() => void move(index - 1)}
                  aria-label="Previous programme item"
                >
                  ⏮
                </button>
                <button
                  disabled={busy || !item}
                  onClick={() => void pause()}
                  aria-label={
                    mediaPlaying ? "Pause broadcast" : "Resume broadcast"
                  }
                >
                  {mediaPlaying ? "Ⅱ" : "▶"}
                </button>
                <button
                  disabled={busy || !item}
                  onClick={() => void move(index + 1)}
                  aria-label="Next programme item"
                >
                  ⏭
                </button>
                <button
                  disabled={busy || stations.length < 2}
                  onClick={() => step(1)}
                  aria-label="Next channel"
                >
                  CH +
                </button>
              </div>
            )}
            {savedMoment && (
              <MomentEditor
                initial={savedMoment}
                onClose={() => setSavedMoment(null)}
              />
            )}
          </div>
          <div className="broadcast-transmission">
            <span>
              <i aria-hidden="true" />
              {busy
                ? "TUNING"
                : item
                  ? "ON AIR"
                  : active
                    ? "OFF AIR"
                    : "STANDBY"}
            </span>
            <span>
              {active?.continuous
                ? "CONTINUOUS"
                : (active?.minutes ?? minutes) + " MIN"}
              <b>·</b>
              {broadcastMode === "mix"
                ? "MEMORY MIX"
                : broadcastMode === "moments"
                  ? "FAVOURITE MOMENTS"
                  : "FULL FILMS"}
            </span>
            <button
              onClick={() => setGuide((value) => !value)}
              aria-expanded={guide}
              aria-controls="broadcast-stations"
            >
              Station guide {guide ? "−" : "+"}
            </button>
          </div>
          {item && (
            <div className="broadcast-film-actions">
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("mpp:play", {
                      detail: { videoId: item.videoId, returnRoute: "tv" },
                    }),
                  )
                }
              >
                Watch full film ↗
              </button>
              <span>Personal Continue Watching stays separate.</span>
            </div>
          )}
          {error && (
            <div className="broadcast-error" role="alert">
              <p>{error}</p>
              <div className="feature-actions">
                <button
                  disabled={busy}
                  onClick={() => void tune(channel, true)}
                >
                  Try this station again
                </button>
                <button onClick={() => setGuide(true)}>Choose a station</button>
                {item && (
                  <button disabled={busy} onClick={() => void move(index + 1)}>
                    Skip unavailable item
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
        <aside className="broadcast-remote" aria-label="Television remote">
          <div className="broadcast-remote-brand">
            <span>THE FAMILY REMOTE</span>
            <button
              className={"broadcast-power " + (item ? "on" : "")}
              disabled={busy || !stations.length}
              aria-label={active ? "Turn Family TV off" : "Turn Family TV on"}
              onClick={() => (active ? void powerOff() : void tune())}
            >
              ⏻
            </button>
          </div>
          <div className="broadcast-tuner-display">
            <small>YOU’RE WATCHING</small>
            <strong>
              <span>CH</span> {number(stationNumber)}
            </strong>
            <span>{stationData?.name ?? "No stations yet"}</span>
          </div>
          <div className="broadcast-channel-rocker">
            <button
              disabled={busy || stations.length < 2}
              onClick={() => step(-1)}
              aria-label="Previous channel"
              aria-keyshortcuts="PageDown ArrowDown"
            >
              <span>−</span>CH
            </button>
            <button
              disabled={busy || stations.length < 2}
              onClick={() => step(1)}
              aria-label="Next channel"
              aria-keyshortcuts="PageUp ArrowUp"
            >
              CH<span>+</span>
            </button>
          </div>
          <div className="broadcast-preset-keys" aria-label="Preset channels">
            {stations.map((station: any, position: number) => (
              <button
                key={station.id}
                className={station.id === channel ? "selected" : ""}
                disabled={busy}
                aria-label={
                  "Tune channel " + number(position + 1) + ", " + station.name
                }
                aria-pressed={station.id === channel}
                onClick={() => void tune(station.id)}
              >
                {number(position + 1)}
              </button>
            ))}
          </div>
          <div className="broadcast-transport">
            <button
              disabled={busy || !item || index === 0}
              onClick={() => void move(index - 1)}
              aria-label="Previous programme item"
            >
              ⏮
            </button>
            <button
              className="broadcast-play-key"
              disabled={busy || !item}
              onClick={() => void pause()}
              aria-label={mediaPlaying ? "Pause broadcast" : "Resume broadcast"}
            >
              {mediaPlaying ? "Ⅱ" : "▶"}
            </button>
            <button
              disabled={busy || !item}
              onClick={() => void move(index + 1)}
              aria-label="Next programme item"
            >
              ⏭
            </button>
          </div>
          <p className="broadcast-remote-hint">
            Channel surf with ↑ ↓ or Page Up / Page Down.
          </p>
          <details className="broadcast-preferences">
            <summary>Broadcast settings</summary>
            <label>
              Playback mode
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value)}
              >
                <option value="mix">Memory Mix</option>
                <option value="moments">Favourite Moments</option>
                <option value="films">Full Films</option>
              </select>
            </label>
            <label>
              Session length
              <select
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              >
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
                <option value="120">120 minutes</option>
                <option value="0">Continuous · keep watching</option>
              </select>
            </label>
            <p>
              Settings apply when you tune a station. Your current queue stays
              intact while this menu is open.
            </p>
            <button
              disabled={busy || !channel}
              onClick={() => void tune(channel, true)}
            >
              Retune with these settings
            </button>
          </details>
        </aside>
      </div>
      {guide && (
        <section
          className="broadcast-station-guide"
          id="broadcast-stations"
          aria-label="Station guide"
        >
          <div className="broadcast-guide-heading">
            <div>
              <p className="eyebrow">FIND YOUR FREQUENCY</p>
              <h2>Your stations</h2>
            </div>
            <span>
              {stations.length} private channel
              {stations.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="broadcast-station-grid">
            {stations.map((station: any, position: number) => (
              <button
                className={
                  "broadcast-station " +
                  (channel === station.id ? "selected" : "")
                }
                key={station.id}
                disabled={busy}
                onClick={() => void tune(station.id)}
                aria-label={
                  "Watch channel " + number(position + 1) + ", " + station.name
                }
              >
                <img
                  src={station.artwork ?? brand.background}
                  alt=""
                  loading="lazy"
                />
                <span className="broadcast-station-number">
                  {number(position + 1)}
                </span>
                <div>
                  <small>
                    {station.mode === "moments"
                      ? "FAVOURITE MOMENTS"
                      : station.mode === "films"
                        ? "FULL FILMS"
                        : "MEMORY MIX"}
                  </small>
                  <strong>{station.name}</strong>
                  <p>{station.description}</p>
                  <span>
                    {channel === station.id && item ? "Now showing" : "Tune in"}{" "}
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
          {!stations.length && (
            <p className="feature-empty">
              There are no published stations yet. Your archive team can create
              one in Family TV management.
            </p>
          )}
        </section>
      )}
      {item && (
        <section className="broadcast-programme">
          <div className="broadcast-guide-heading">
            <div>
              <p className="eyebrow">THE PROGRAMME CONTINUES</p>
              <h2>Coming up on {stationData?.name}</h2>
            </div>
            <button disabled={busy} onClick={() => void tune(channel, true)}>
              Another mix ↻
            </button>
          </div>
          <ol>
            {active.queue
              .slice(index, index + 6)
              .map((upcoming: any, offset: number) => (
                <li key={[upcoming.videoId, offset].join(":")}>
                  <span className="broadcast-programme-number">
                    {offset === 0 ? "NOW" : number(offset)}
                  </span>
                  <div>
                    <strong>{upcoming.title}</strong>
                    <small>
                      {upcoming.year ?? "Year unknown"} ·{" "}
                      {time(upcoming.end - upcoming.start)}
                    </small>
                  </div>
                  <button
                    disabled={busy || offset === 0}
                    aria-label={"Play " + upcoming.title}
                    onClick={() => void move(index + offset)}
                  >
                    {offset === 0 ? "On air" : "Play →"}
                  </button>
                </li>
              ))}
          </ol>
        </section>
      )}
      <p className="feature-notice broadcast-demo-note">
        A private channel built from your authorised archive. Demo films use
        nature and cityscape stock footage. Short sources produce short
        excerpts.
      </p>
    </div>
  );
}

function StoryForm({
  videoId,
  onSaved,
}: {
  videoId: string;
  onSaved: () => void;
}) {
  const [error, setError] = useState(""),
    [audio, setAudio] = useState<any>(null),
    [recording, setRecording] = useState(false),
    [uploading, setUploading] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null);
  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  async function uploadVoice(file: Blob, name = "memory.webm") {
    setUploading(true);
    setError("");
    try {
      const r = await fetch(apiUrl("uploads"), {
        method: "POST",
        headers: {
          "x-file-name": encodeURIComponent(name),
          "x-file-type": file.type,
          "x-upload-purpose": "voice",
        },
        body: file,
      });
      const v = normalizeApiUrls(await r.json());
      if (!r.ok) throw new Error(v.error);
      setAudio(v.asset);
    } catch (e) {
      setError(notify(e));
    } finally {
      setUploading(false);
    }
  }
  async function record() {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const chunks: BlobPart[] = [];
      const r = new MediaRecorder(stream.current);
      recorder.current = r;
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        void uploadVoice(new Blob(chunks, { type: r.mimeType }));
      };
      r.start();
      setRecording(true);
      setTimeout(() => {
        if (r.state === "recording") {
          r.stop();
          setRecording(false);
        }
      }, 60000);
    } catch {
      setError(
        "Microphone access is unavailable. You can upload an audio recording instead.",
      );
    }
  }
  return (
    <form
      className="feature-panel feature-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setError("");
        try {
          await api(
            "stories",
            json("POST", {
              videoId,
              text: f.get("text"),
              timestamp: Number(f.get("timestamp") || 0),
              audioAssetId: audio?.id,
              status: "pending",
              visibility: "all",
            }),
          );
          onSaved();
          (e.target as HTMLFormElement).reset();
          setAudio(null);
        } catch (e) {
          setError(notify(e));
        }
      }}
    >
      <h2>Add a family story</h2>
      <label>
        Your memory
        <textarea
          name="text"
          required
          placeholder="What do you remember about this day?"
        />
      </label>
      <label>
        At time (seconds)
        <input
          name="timestamp"
          type="number"
          min="0"
          step="0.1"
          defaultValue="0"
        />
      </label>
      <div className="feature-actions">
        <button
          type="button"
          className={recording ? "voice-recording" : ""}
          onClick={() => void record()}
        >
          {recording ? "■ Stop recording" : "● Record a voice memory"}
        </button>
        <label>
          Or upload audio
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadVoice(f, f.name);
            }}
          />
        </label>
      </div>
      {audio && <audio controls src={audio.url} />}
      <p className="feature-notice">
        Voice memories play only when someone chooses to hear them. Stories go
        to the archive team for review.
      </p>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <button className="gold-button" disabled={recording || uploading}>
        Submit story for review
      </button>
    </form>
  );
}

function Memories({
  data,
  onPlay,
  reload,
}: {
  data: any;
  onPlay: (v: any) => void;
  reload: () => void;
}) {
  const [tab, setTab] = useState("years"),
    [q, setQ] = useState(""),
    [year, setYear] = useState(""),
    [decade, setDecade] = useState(""),
    [person, setPerson] = useState(""),
    [place, setPlace] = useState(""),
    [occasion, setOccasion] = useState(""),
    [collection, setCollection] = useState(""),
    [storyVideo, setStoryVideo] = useState(""),
    [error, setError] = useState("");
  const videos = data.videos.filter((v: any) => v.status === "published"),
    people = [...new Set<string>(videos.flatMap((v: any) => v.people ?? []))],
    places = [
      ...new Set<string>(videos.map((v: any) => v.location).filter(Boolean)),
    ],
    occasions = [
      ...new Set<string>(videos.map((v: any) => v.occasion).filter(Boolean)),
    ];
  const years = [
      ...new Set<number>(videos.map((v: any) => v.year).filter(Boolean)),
    ].sort((a, b) => b - a),
    decades = [...new Set(years.map((y) => Math.floor(y / 10) * 10))];
  const matches = (v: any) =>
    v &&
    (!year || String(v.year) === year) &&
    (!decade || Math.floor(v.year / 10) * 10 === Number(decade)) &&
    (!person || v.people?.includes(person)) &&
    (!place || v.location === place) &&
    (!occasion || v.occasion === occasion) &&
    (!collection || v.collectionIds?.includes(collection)) &&
    (!q ||
      [v.title, v.description, v.location, ...(v.people ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase()));
  const filtered = videos.filter(matches);
  const discovery =
    data.settings?.find((s: any) => s.memoryDiscovery)?.memoryDiscovery ??
    data.tenant.memoryDiscovery;
  const today = new Date();
  const resurfaced =
    discovery?.enabled === false
      ? []
      : videos.filter((v: any) => {
          if (
            v.resurface === false ||
            discovery?.excludedVideoIds?.includes(v.id) ||
            discovery?.sensitiveOccasions?.includes(v.occasion) ||
            (discovery?.collectionIds?.length &&
              !v.collectionIds.some((id: string) =>
                discovery.collectionIds.includes(id),
              ))
          )
            return false;
          if (v.datePrecision === "exact" || v.datePrecision === "month")
            return (
              v.recordedDate?.slice(5, 7) ===
              String(today.getMonth() + 1).padStart(2, "0")
            );
          return (
            v.year &&
            today.getFullYear() - v.year > 0 &&
            (today.getFullYear() - v.year) % 5 === 0
          );
        });
  function poster(v: any) {
    return (
      <article className="feature-card" key={v.id}>
        <img
          loading="lazy"
          src={appUrl(v.poster || "/artwork/lake.svg")}
          alt=""
        />
        <div>
          <h3>{v.title}</h3>
          <p>
            {v.year ?? "Date unknown"} ·{" "}
            {v.datePrecision === "exact"
              ? v.recordedDate
              : v.datePrecision === "season"
                ? `${v.season ?? ""} ${v.year}`
                : v.datePrecision === "approximate"
                  ? "Approximate year"
                  : v.location || "Your archive"}
          </p>
          <div className="feature-actions">
            <button onClick={() => onPlay({ videoId: v.id, title: v.title })}>
              ▶ Play film
            </button>
            <button
              onClick={() => {
                setStoryVideo(v.id);
                setTab("stories");
              }}
            >
              Add a story
            </button>
          </div>
        </div>
      </article>
    );
  }
  return (
    <>
      <p className="eyebrow">A LIFETIME, TOGETHER</p>
      <h1>Moments & years</h1>
      <p>Find the little things. Remember the big ones.</p>
      <div className="feature-tabs">
        {[
          ["years", "Through the years"],
          ["moments", "Saved moments"],
          ["stories", "Family stories"],
          ["day", "On this day"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="feature-filters">
        <input
          aria-label="Search memories"
          placeholder="Search memories"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {[
          ["Year", year, setYear, years],
          ["Decade", decade, setDecade, decades],
          ["Person", person, setPerson, people],
          ["Location", place, setPlace, places],
          ["Occasion", occasion, setOccasion, occasions],
        ].map(([label, value, set, values]: any) => (
          <select
            key={label}
            aria-label={label}
            value={value}
            onChange={(e) => set(e.target.value)}
          >
            <option value="">All {String(label).toLowerCase()}s</option>
            {values.map((v: any) => (
              <option key={v} value={v}>
                {v}
                {label === "Decade" ? "s" : ""}
              </option>
            ))}
          </select>
        ))}
        <select
          aria-label="Collection"
          value={collection}
          onChange={(e) => setCollection(e.target.value)}
        >
          <option value="">All collections</option>
          {data.collections.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>
      {tab === "years" && (
        <>
          {[...new Set(filtered.map((v: any) => v.year ?? "Unknown date"))].map(
            (y) => (
              <section key={String(y)}>
                <h2 className="feature-year">{String(y)}</h2>
                <div className="feature-grid">
                  {filtered
                    .filter((v: any) => (v.year ?? "Unknown date") === y)
                    .map(poster)}
                </div>
              </section>
            ),
          )}
          {!filtered.length && (
            <p className="feature-empty">No films match these filters.</p>
          )}
        </>
      )}
      {tab === "moments" && (
        <div className="feature-grid">
          {data.moments
            .filter((m: any) =>
              matches(videos.find((v: any) => v.id === m.videoId)),
            )
            .map((m: any) => {
              const v = videos.find((v: any) => v.id === m.videoId);
              return (
                <article className="feature-card" key={m.id}>
                  <img src={m.thumbnail || v?.poster} alt="" loading="lazy" />
                  <div>
                    <h3>{m.title}</h3>
                    <p>
                      {v?.title} · {time(m.start)}–{time(m.end)}
                    </p>
                    <p>{m.description}</p>
                    <div className="feature-actions">
                      <button
                        onClick={() => onPlay({ ...m, videoId: m.videoId })}
                      >
                        ▶ Play moment
                      </button>
                      <button
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent("mpp:moment", {
                              detail: { ...m, duration: v?.duration },
                            }),
                          )
                        }
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm("Delete this saved moment?")) return;
                          try {
                            await api(`moments/${m.id}`, json("DELETE"));
                            reload();
                          } catch (e) {
                            setError(notify(e));
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          {!data.moments.length && (
            <p className="feature-empty">
              Save a moment while watching a film. It will appear here.
            </p>
          )}
        </div>
      )}
      {tab === "stories" && (
        <div className="feature-two">
          <div className="feature-stack">
            {data.stories.map((s: any) => (
              <article className="feature-panel" key={s.id}>
                <p className="eyebrow">
                  {s.status ?? "Family story"} ·{" "}
                  {s.creatorName ?? "Family member"}
                </p>
                <h3>{videos.find((v: any) => v.id === s.videoId)?.title}</h3>
                <p>{s.text}</p>
                {s.audioAssetId && (
                  <audio
                    controls
                    preload="none"
                    src={appUrl(`/api/assets/${s.audioAssetId}`)}
                  />
                )}
                <button
                  onClick={() =>
                    onPlay({
                      videoId: s.videoId,
                      start: s.timestamp ?? 0,
                      title: "Family story",
                    })
                  }
                >
                  Open at {time(s.timestamp)}
                </button>
              </article>
            ))}
            {!data.stories.length && (
              <p className="feature-empty">
                There are no family stories yet. Add the first memory.
              </p>
            )}
          </div>
          <div className="feature-stack">
            <label>
              Film
              <select
                value={storyVideo}
                onChange={(e) => setStoryVideo(e.target.value)}
              >
                <option value="">Choose a film</option>
                {videos.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
            </label>
            {storyVideo && <StoryForm videoId={storyVideo} onSaved={reload} />}
          </div>
        </div>
      )}
      {tab === "day" && (
        <>
          <h2>
            {discovery?.enabled === false
              ? "Memory discovery is turned off"
              : "Worth another watch"}
          </h2>
          <p>
            Exact dates appear only when they are known. Year-only memories are
            suggested at five-year milestones.
          </p>
          <div className="feature-grid">
            {resurfaced.filter(matches).map(poster)}
          </div>
          {!resurfaced.length && (
            <p className="feature-empty">
              No memories to resurface today. Your archive grows more useful as
              you add recording dates.
            </p>
          )}
        </>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function AdvancedSearch({
  onPlay,
  data,
}: {
  onPlay: (v: any) => void;
  data: any;
}) {
  const [q, setQ] = useState(""),
    [results, setResults] = useState<any[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }
    const c = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      void api(`search?q=${encodeURIComponent(q)}`, { signal: c.signal })
        .then(setResults)
        .catch((e) => {
          if (e.name !== "AbortError") setError(notify(e));
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [q]);
  return (
    <>
      <p className="eyebrow">FIND YOUR WAY BACK</p>
      <h1>Search your archive</h1>
      <p>Films, people, places, moments and the words you remember.</p>
      <div className="feature-filters">
        <input
          autoFocus
          type="search"
          value={q}
          placeholder="Try a place, year or a phrase from a transcript"
          aria-label="Search your archive"
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {loading && <p role="status">Searching…</p>}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <div className="feature-grid">
        {results.map((r: any) => (
          <article className="feature-card" key={`${r.type}:${r.id}`}>
            <div>
              <span className="feature-tag">
                {{
                  film: "Whole film",
                  moment: "Saved moment",
                  transcript: "Transcript match",
                  collection: "Collection",
                  story: "Family story",
                  chapter: "Chapter",
                }[r.type as string] ?? r.type}
              </span>
              <h3>{r.title}</h3>
              {r.start !== undefined && <p>At {time(r.start)}</p>}
              {r.videoId ? (
                <button
                  onClick={() =>
                    onPlay({
                      videoId: r.videoId,
                      title: r.title,
                      start: r.start ?? 0,
                      end:
                        r.type === "moment"
                          ? data.moments.find((m: any) => m.id === r.id)?.end
                          : undefined,
                    })
                  }
                >
                  ▶ {r.start ? "Jump to this moment" : "Open film"}
                </button>
              ) : (
                <div className="feature-stack">
                  {data.videos
                    .filter(
                      (v: any) =>
                        v.collectionIds?.includes(r.id) &&
                        v.status === "published",
                    )
                    .map((v: any) => (
                      <button
                        key={v.id}
                        onClick={() =>
                          onPlay({ videoId: v.id, title: v.title })
                        }
                      >
                        {v.title} →
                      </button>
                    ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {q && !loading && !results.length && (
        <p className="feature-empty">
          No matches yet. Try a title, a year or another detail.
        </p>
      )}
    </>
  );
}

function Tonight({
  data,
  session,
  onPlay,
  reload,
}: {
  data: any;
  session: any;
  onPlay: (v: any) => void;
  reload: () => void;
}) {
  const [selected, setSelected] = useState(
    data.programmes.find((p: any) => p.status !== "ended")?.id ?? "",
  );
  const [kind, setKind] = useState("film"),
    [choice, setChoice] = useState(""),
    [host, setHost] = useState(session.account.id);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now());
  const programme = data.programmes.find((p: any) => p.id === selected);
  const isHost =
    programme?.hostId === session.account.id ||
    session.account.role !== "viewer";
  const members = (
    data.programmeHosts?.length
      ? data.programmeHosts
      : data.accounts?.length
        ? data.accounts
        : [session.account]
  ) as any[];
  const films = data.videos.filter((v: any) => v.status === "published");
  const moments = data.moments.filter((m: any) =>
    films.some((v: any) => v.id === m.videoId),
  );
  const queue = programme?.queue ?? [];
  const activeIndex = Math.min(
    programme?.index ?? 0,
    Math.max(0, queue.length - 1),
  );
  const hostName =
    members.find((m: any) => m.id === programme?.hostId)?.name ??
    "Programme host";
  function resolveItem(item: any) {
    const moment = item?.momentId
      ? moments.find((m: any) => m.id === item.momentId)
      : undefined;
    if (!item || (item.momentId && !moment)) return undefined;
    const video = films.find(
      (v: any) => v.id === (moment?.videoId ?? item.videoId),
    );
    if (!video) return undefined;
    return {
      videoId: video.id,
      momentId: moment?.id,
      title: moment?.title ?? video.title,
      start: moment?.start,
      end: moment?.end,
      filmTitle: video.title,
    };
  }
  const current = resolveItem(queue[activeIndex]);
  useEffect(() => {
    const timer = setInterval(() => {
      reload();
      setNow(Date.now());
    }, 3000);
    return () => clearInterval(timer);
  }, [reload]);
  async function update(changes: any) {
    if (!selected) return false;
    setBusy(true);
    setError("");
    try {
      await api("programmes/" + selected, json("PATCH", changes));
      reload();
      return true;
    } catch (e) {
      setError(notify(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const created = await api(
        "programmes",
        json("POST", {
          title: form.get("title"),
          profileIds: form.getAll("profiles"),
          queue: [],
          status: "draft",
          index: 0,
        }),
      );
      if (host !== session.account.id)
        await api("programmes/" + created.id, json("PATCH", { hostId: host }));
      setSelected(created.id);
      reload();
    } catch (e) {
      setError(notify(e));
    } finally {
      setBusy(false);
    }
  }
  function next() {
    return update(
      activeIndex + 1 >= queue.length
        ? { status: "ended" }
        : { index: activeIndex + 1 },
    );
  }
  function reorder(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= queue.length) return;
    const changed = [...queue],
      playing = queue[activeIndex];
    [changed[index], changed[target]] = [changed[target], changed[index]];
    void update({
      queue: changed,
      index: Math.max(0, changed.indexOf(playing)),
    });
  }
  function remove(index: number) {
    const changed = queue.filter((_: any, n: number) => n !== index);
    const position =
      index < activeIndex
        ? activeIndex - 1
        : Math.min(activeIndex, Math.max(0, changed.length - 1));
    void update({
      queue: changed,
      index: position,
      ...(!changed.length && programme.status === "active"
        ? { status: "ended" }
        : {}),
    });
  }
  async function add() {
    const selectedMoment =
      kind === "moment" ? moments.find((m: any) => m.id === choice) : undefined;
    const selectedFilm = films.find(
      (v: any) => v.id === (selectedMoment?.videoId ?? choice),
    );
    if (!selectedFilm) return;
    const item = {
      videoId: selectedFilm.id,
      ...(selectedMoment ? { momentId: selectedMoment.id } : {}),
      title: selectedMoment?.title ?? selectedFilm.title,
    };
    if (
      await update(isHost ? { queue: [...queue, item] } : { suggestion: item })
    )
      setChoice("");
  }
  return (
    <>
      <p className="eyebrow">EVERYONE HAS A FRONT ROW SEAT</p>
      <h1>Tonight, we’re all watching.</h1>
      <p>
        A shared programme for your family. The host chooses what plays next.
      </p>
      <div className="feature-two">
        <section className="feature-panel">
          <div className="feature-top">
            <h2>Tonight’s programme</h2>
            <div className="feature-actions">
              <select
                aria-label="Choose programme"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Create a programme</option>
                {data.programmes.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.title ?? p.name}
                  </option>
                ))}
              </select>
              {programme && (
                <button
                  onClick={() => {
                    setSelected("");
                    setHost(session.account.id);
                  }}
                >
                  New programme
                </button>
              )}
            </div>
          </div>
          {!programme ? (
            <form
              className="feature-stack"
              onSubmit={(event) => void create(event)}
            >
              <label>
                Programme name
                <input
                  name="title"
                  placeholder="A night of our favourite memories"
                  required
                  maxLength={150}
                />
              </label>
              <label>
                Programme host
                <select value={host} onChange={(e) => setHost(e.target.value)}>
                  {members.map((member: any) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                      {member.id === session.account.id ? " (you)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <p>Who’s watching?</p>
              {data.profiles.map((profile: any) => (
                <label className="profile-check" key={profile.id}>
                  <input name="profiles" type="checkbox" value={profile.id} />
                  {profile.name}
                </label>
              ))}
              <p className="feature-notice">
                Viewing profiles identify your audience. Account permissions
                control who can host and manage the programme.
              </p>
              <button className="gold-button" disabled={busy}>
                {busy ? "Creating…" : "Create programme"}
              </button>
            </form>
          ) : (
            <>
              <h2>{programme.title ?? programme.name}</h2>
              <p>
                {programme.status === "ended"
                  ? "Programme ended"
                  : isHost
                    ? "You control this programme."
                    : "Suggest a film or saved moment to the host."}{" "}
                · Hosted by {hostName} · Updates every three seconds
              </p>
              {isHost ? (
                <details>
                  <summary>Host and viewing profiles</summary>
                  <div className="feature-stack">
                    <label>
                      Programme host
                      <select
                        disabled={busy}
                        value={programme.hostId}
                        onChange={(e) =>
                          void update({ hostId: e.target.value })
                        }
                      >
                        {members.map((member: any) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {data.profiles.map((profile: any) => (
                      <label className="profile-check" key={profile.id}>
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={(programme.profileIds ?? []).includes(
                            profile.id,
                          )}
                          onChange={(e) =>
                            void update({
                              profileIds: e.target.checked
                                ? [...(programme.profileIds ?? []), profile.id]
                                : (programme.profileIds ?? []).filter(
                                    (id: string) => id !== profile.id,
                                  ),
                            })
                          }
                        />
                        {profile.name}
                      </label>
                    ))}
                  </div>
                </details>
              ) : (
                <p>
                  Watching together:{" "}
                  {data.profiles
                    .filter((profile: any) =>
                      (programme.profileIds ?? []).includes(profile.id),
                    )
                    .map((profile: any) => profile.name)
                    .join(", ") || "No viewing profiles selected"}
                </p>
              )}
              <ol className="queue-list">
                {queue.map((item: any, index: number) => {
                  const resolved = resolveItem(item);
                  return (
                    <li
                      key={[item.videoId, item.momentId, index].join(":")}
                      className={index === activeIndex ? "current" : ""}
                    >
                      <span>
                        <strong>
                          {index + 1}.{" "}
                          {resolved?.title ?? "Item no longer available"}
                        </strong>
                        <br />
                        <small>
                          {resolved?.momentId
                            ? "Saved moment · " +
                              resolved.filmTitle +
                              " · " +
                              time(resolved.start) +
                              "–" +
                              time(resolved.end)
                            : "Whole film"}
                        </small>
                      </span>
                      {isHost && (
                        <div className="feature-actions">
                          <button
                            disabled={busy || index === 0}
                            aria-label={
                              "Move " + (resolved?.title ?? "item") + " up"
                            }
                            onClick={() => reorder(index, -1)}
                          >
                            ↑
                          </button>
                          <button
                            disabled={busy || index === queue.length - 1}
                            aria-label={
                              "Move " + (resolved?.title ?? "item") + " down"
                            }
                            onClick={() => reorder(index, 1)}
                          >
                            ↓
                          </button>
                          <button
                            disabled={busy}
                            aria-label={
                              "Remove " +
                              (resolved?.title ?? "item") +
                              " from programme"
                            }
                            onClick={() => remove(index)}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
              {!queue.length && (
                <p className="feature-empty">
                  Add a whole film or a saved moment to begin.
                </p>
              )}
              <div className="feature-filters">
                <label>
                  What to add
                  <select
                    value={kind}
                    onChange={(e) => {
                      setKind(e.target.value);
                      setChoice("");
                    }}
                  >
                    <option value="film">Whole film</option>
                    <option value="moment">Saved moment</option>
                  </select>
                </label>
                <label>
                  {kind === "moment" ? "Saved moment" : "Film"}
                  <select
                    aria-label="Programme item"
                    value={choice}
                    onChange={(e) => setChoice(e.target.value)}
                  >
                    <option value="">
                      Choose {kind === "moment" ? "a saved moment" : "a film"}
                    </option>
                    {(kind === "moment" ? moments : films).map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                        {kind === "moment"
                          ? " · " + time(item.start) + "–" + time(item.end)
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <button disabled={!choice || busy} onClick={() => void add()}>
                  {isHost ? "Add to programme" : "Suggest to host"}
                </button>
              </div>
              {kind === "moment" && !moments.length && (
                <p className="feature-notice">
                  Save a moment while watching a film to include it here.
                </p>
              )}
              {isHost && (
                <>
                  <div className="feature-actions">
                    <button
                      className="gold-button"
                      disabled={busy || !queue.length}
                      onClick={() =>
                        void update({
                          status: "active",
                          index: programme.status === "ended" ? 0 : activeIndex,
                        })
                      }
                    >
                      ▶ {programme.status === "ended" ? "Restart" : "Start"}{" "}
                      programme
                    </button>
                    <button
                      disabled={busy || programme.status === "ended"}
                      onClick={() => void update({ status: "ended" })}
                    >
                      End programme
                    </button>
                  </div>
                  {(programme.suggestions ?? [])
                    .filter(
                      (suggestion: any) => suggestion.status === "pending",
                    )
                    .map((suggestion: any) => {
                      const resolved = resolveItem(suggestion);
                      return (
                        <div className="feature-panel" key={suggestion.id}>
                          <strong>
                            Suggested: {resolved?.title ?? "Item unavailable"}
                          </strong>
                          {resolved?.momentId && (
                            <p>
                              Saved moment · {time(resolved.start)}–
                              {time(resolved.end)}
                            </p>
                          )}
                          <div className="feature-actions">
                            <button
                              disabled={busy || !resolved}
                              onClick={() =>
                                void update({
                                  queue: [
                                    ...queue,
                                    {
                                      videoId: resolved!.videoId,
                                      ...(resolved!.momentId
                                        ? { momentId: resolved!.momentId }
                                        : {}),
                                      title: resolved!.title,
                                    },
                                  ],
                                  suggestions: programme.suggestions.map(
                                    (item: any) =>
                                      item.id === suggestion.id
                                        ? { ...item, status: "approved" }
                                        : item,
                                  ),
                                })
                              }
                            >
                              Approve
                            </button>
                            <button
                              disabled={busy}
                              onClick={() =>
                                void update({
                                  suggestions: programme.suggestions.map(
                                    (item: any) =>
                                      item.id === suggestion.id
                                        ? { ...item, status: "rejected" }
                                        : item,
                                  ),
                                })
                              }
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </>
              )}
              {programme.status === "active" && current && (
                <div className="feature-stack">
                  <SegmentPlayer
                    key={[
                      programme.id,
                      activeIndex,
                      current.videoId,
                      current.momentId,
                    ].join(":")}
                    videoId={current.videoId}
                    start={current.start ?? 0}
                    end={current.end}
                    title={current.title}
                    onEnd={isHost ? () => void next() : undefined}
                  />
                  {isHost && (
                    <button disabled={busy} onClick={() => void next()}>
                      Next item →
                    </button>
                  )}
                </div>
              )}
              <p className="feature-notice">
                Programme changes are shared across authorised browsers. The
                host controls the queue. Playback clocks across homes are not
                synchronised. Personal Continue Watching is unchanged.
              </p>
            </>
          )}
        </section>
        <aside className="feature-stack">
          <h2>Upcoming premieres</h2>
          {data.premieres
            .filter((premiere: any) => premiere.published)
            .map((premiere: any) => {
              const release = Date.parse(
                  premiere.releaseAt ?? premiere.scheduledAt,
                ),
                seconds = Math.max(0, Math.floor((release - now) / 1000)),
                available = seconds === 0;
              return (
                <article className="feature-card" key={premiere.id}>
                  <img
                    src={
                      premiere.artwork || premiere.backdrop || brand.background
                    }
                    alt=""
                  />
                  <div>
                    <p className="eyebrow">FAMILY PREMIERE</p>
                    <h2>{premiere.title}</h2>
                    <p>{premiere.dedication}</p>
                    <p>
                      {new Date(release).toLocaleString(undefined, {
                        timeZone: premiere.timezone ?? "UTC",
                      })}{" "}
                      · {premiere.timezone ?? "UTC"}
                    </p>
                    {!!premiere.profileIds?.length && (
                      <p>
                        Invited:{" "}
                        {data.profiles
                          .filter((profile: any) =>
                            premiere.profileIds.includes(profile.id),
                          )
                          .map((profile: any) => profile.name)
                          .join(", ")}
                      </p>
                    )}
                    <p className="countdown">
                      {available
                        ? "The premiere is ready."
                        : "Starts in " +
                          Math.floor(seconds / 86400) +
                          "d " +
                          time(seconds % 86400)}
                    </p>
                    <div className="feature-actions">
                      <button
                        className="gold-button"
                        disabled={!available}
                        onClick={() =>
                          onPlay({
                            videoId: premiere.videoId,
                            title: premiere.title,
                            intro: premiere.introEnabled
                              ? premiere.intro
                              : undefined,
                          })
                        }
                      >
                        ▶ Join premiere
                      </button>
                      <button
                        onClick={() => {
                          localStorage.setItem(
                            "mpp-watch-later:" +
                              session.tenant.id +
                              ":" +
                              session.account.id +
                              ":" +
                              premiere.id,
                            "true",
                          );
                          setError("Premiere saved for later on this browser.");
                        }}
                      >
                        Watch later
                      </button>
                    </div>
                    <p className="feature-notice">
                      Scheduled playback. Each household starts independently.
                    </p>
                  </div>
                </article>
              );
            })}
          {!data.premieres.filter((premiere: any) => premiere.published)
            .length && (
            <p className="feature-empty">
              Your next family premiere will appear here.
            </p>
          )}
        </aside>
      </div>
      {error && (
        <p role="status" className="feature-status">
          {error}
        </p>
      )}
    </>
  );
}

export function FeatureHub({
  route,
  session,
  onNavigate,
  initialPlay,
}: {
  route: string;
  session: any;
  onNavigate: (s: string) => void;
  initialPlay?: any;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [playing, setPlaying] = useState<any>(initialPlay ?? null),
    [intro, setIntro] = useState("");
  const reload = useCallback(() => {
    void api("bootstrap")
      .then((d) => {
        for (const resource of [
          "videos",
          "collections",
          "channels",
          "premieres",
          "moments",
        ])
          d[resource] = d[resource].map((v: any) => ({
            ...v,
            ...Object.fromEntries(
              ["poster", "backdrop", "artwork", "thumbnail"]
                .filter((k) => v[k])
                .map((k) => [k, artworkUrl(v[k])]),
            ),
          }));
        setData(d);
      })
      .catch((e) => setError(notify(e)));
  }, []);
  useEffect(reload, [reload]);
  function play(value: any) {
    setPlaying(value);
    setIntro(value.intro ?? "");
  }
  return (
    <main className="feature-app">
      <div className="feature-top">
        <button onClick={() => onNavigate("viewer")}>
          ← Back to {brand.name}
        </button>
        <span className="eyebrow">{brand.name}</span>
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <p role="status">Opening your archive…</p>
      ) : playing ? (
        <>
          <div className="feature-top">
            <h1>{playing.title}</h1>
            <button
              onClick={() => {
                setPlaying(null);
                if (route === "clip") onNavigate("memories");
              }}
            >
              ← Back to browsing
            </button>
          </div>
          {intro ? (
            <div className="feature-hero">
              <img src={brand.background} alt="" />
              <div>
                <p className="eyebrow">A SPECIAL PREMIERE</p>
                <h2>{playing.title}</h2>
                <p>{intro}</p>
                <button className="gold-button" onClick={() => setIntro("")}>
                  Skip introduction · Play film →
                </button>
              </div>
            </div>
          ) : (
            <SegmentPlayer
              key={`${playing.videoId}:${playing.start}`}
              videoId={playing.videoId}
              start={playing.start ?? 0}
              end={playing.end}
              title={playing.title}
              onEnd={
                playing.end !== undefined
                  ? () => {
                      setPlaying(null);
                      if (route === "clip") onNavigate("memories");
                    }
                  : undefined
              }
              onSave={(s, d) =>
                window.dispatchEvent(
                  new CustomEvent("mpp:moment", {
                    detail: {
                      videoId: playing.videoId,
                      start: Math.min(s, Math.max(0, d - 0.1)),
                      duration: d,
                    },
                  }),
                )
              }
            />
          )}
          <div className="feature-transcript">
            {data.stories
              .filter(
                (s: any) =>
                  s.videoId === playing.videoId && s.timestamp !== undefined,
              )
              .map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => play({ ...playing, start: s.timestamp })}
                >
                  ◷ {time(s.timestamp)} · {s.text}
                </button>
              ))}
          </div>
          <p className="feature-notice">
            Demo titles and dates are fictional. Their sample nature and
            cityscape footage is provided for testing.
          </p>
          <StoryForm videoId={playing.videoId} onSaved={reload} />
        </>
      ) : route === "tv" ? (
        <FamilyTV data={data} session={session} />
      ) : route === "memories" ? (
        <Memories data={data} onPlay={play} reload={reload} />
      ) : route === "search" ? (
        <AdvancedSearch data={data} onPlay={play} />
      ) : (
        <Tonight data={data} session={session} onPlay={play} reload={reload} />
      )}
    </main>
  );
}

export function GuestUpload({ token }: { token: string }) {
  const [policy, setPolicy] = useState<any>(null),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void api(`guest/${token}`)
      .then(setPolicy)
      .catch((e) => setError(notify(e)));
  }, [token]);
  return (
    <main className="invite-page">
      <div className="moment-dialog">
        <img src={appUrl("/icon.svg")} width="50" alt="" />
        <p className="eyebrow">A MEMORY WORTH SHARING</p>
        <h1>{policy?.eventName ?? "Contribute a film"}</h1>
        {done ? (
          <>
            <h2>Thank you for sharing.</h2>
            <p>
              Your video is in the private review inbox. The archive team will
              review it before publishing.
            </p>
          </>
        ) : policy ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const f = new FormData(e.currentTarget),
                file = f.get("file") as File;
              try {
                const r = await fetch(apiUrl(`guest/${token}`), {
                  method: "POST",
                  headers: {
                    "x-file-name": encodeURIComponent(file.name),
                    "x-file-type": file.type,
                    "x-title": encodeURIComponent(String(f.get("title"))),
                    "x-contributor-name": encodeURIComponent(
                      String(f.get("name") || ""),
                    ),
                    "x-description": encodeURIComponent(
                      String(f.get("description") || ""),
                    ),
                  },
                  body: file,
                });
                const v = await r.json();
                if (!r.ok) throw new Error(v.error);
                setDone(true);
              } catch (e) {
                setError(notify(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              This link accepts uploads only. Your film will be reviewed before
              it joins the archive.
            </p>
            <label>
              Film title
              <input name="title" required />
            </label>
            <label>
              Your name (optional)
              <input name="name" />
            </label>
            <label>
              A few words about this memory
              <textarea name="description" />
            </label>
            <label>
              Video
              <input
                name="file"
                type="file"
                required
                accept="video/mp4,video/webm"
              />
            </label>
            <p>
              Up to {Math.round(policy.maxBytes / 1024 / 1024)} MB · Expires{" "}
              {new Date(policy.expiresAt).toLocaleString()} ·{" "}
              {policy.uploadsRemaining} uploads remaining
            </p>
            <button className="gold-button" disabled={busy}>
              {busy ? "Uploading your memory…" : "Share film →"}
            </button>
          </form>
        ) : (
          !error && <p>Opening your invitation…</p>
        )}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <p className="demo-note">
          Powered by MyPremierePlus · Private contribution link
        </p>
      </div>
    </main>
  );
}
