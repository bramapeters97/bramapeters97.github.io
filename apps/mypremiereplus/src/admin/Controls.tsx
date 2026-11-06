import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import Icon from "./Icon";
import { pretty } from "./api";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const direct = Children.toArray(children).some(
    (child) =>
      isValidElement(child) &&
      ["input", "select", "textarea"].includes(String(child.type)),
  );
  const controls = Children.map(children, (child) =>
    isValidElement(child) &&
    ["input", "select", "textarea"].includes(String(child.type))
      ? cloneElement(child as ReactElement<{ id?: string }>, {
          id: (child.props as { id?: string }).id || id,
        })
      : child,
  );
  return (
    <div
      className="adm-field"
      role={direct ? undefined : "group"}
      aria-label={direct ? undefined : label}
    >
      <label htmlFor={id}>{label}</label>
      {controls}
      {hint && <small>{hint}</small>}
    </div>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="adm-toggle">
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <span className={`adm-status ${value}`}>
      <i />
      {pretty(value)}
    </span>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="adm-empty">
      <Icon name="cinema" size={34} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={`adm-modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="adm-modal-title">
        <h2>{title}</h2>
        <button
          className="adm-icon-btn"
          aria-label="Close dialog"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function MediaPreview({
  url,
  start = 0,
  end,
  poster,
}: {
  url: string;
  start?: number;
  end?: number;
  poster?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || !url) return;
    let hls: { destroy: () => void } | undefined;
    let active = true;
    const seek = () => {
      if (start > 0) video.currentTime = start;
    };
    const boundary = () => {
      if (end !== undefined && video.currentTime >= end) video.pause();
    };
    const resume = () => {
      if (end !== undefined && video.currentTime >= end)
        video.currentTime = start;
    };
    video.addEventListener("loadedmetadata", seek);
    video.addEventListener("timeupdate", boundary);
    video.addEventListener("play", resume);
    if (
      url.includes(".m3u8") &&
      !video.canPlayType("application/vnd.apple.mpegurl")
    ) {
      void import("hls.js").then(({ default: Hls }) => {
        if (active && Hls.isSupported()) {
          const player = new Hls();
          hls = player;
          player.loadSource(url);
          player.attachMedia(video);
        }
      });
    } else video.src = url;
    return () => {
      active = false;
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.removeEventListener("loadedmetadata", seek);
      video.removeEventListener("timeupdate", boundary);
      video.removeEventListener("play", resume);
    };
  }, [url, start, end]);
  return (
    <video
      ref={ref}
      controls
      playsInline
      preload="metadata"
      poster={poster}
      className="adm-media"
    />
  );
}
export function Choices({
  options,
  values,
  onChange,
}: {
  options: { id: string; title?: string; name?: string }[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="adm-choices">
      {options.map((item) => (
        <label key={item.id}>
          <input
            type="checkbox"
            checked={values.includes(item.id)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...values, item.id]
                  : values.filter((id) => id !== item.id),
              )
            }
          />
          {item.title || item.name}
        </label>
      ))}
    </div>
  );
}

export function VoiceRecorder({
  onRecord,
  report,
}: {
  onRecord: (file: File) => void;
  report: (error: unknown) => void;
}) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  async function start() {
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Voice recording is unavailable in this browser. Upload an audio file instead.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mime = ["audio/webm", "audio/ogg"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const current = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime } : {},
      );
      const chunks: BlobPart[] = [];
      current.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      current.onstop = () => {
        setRecording(false);
        stream.current?.getTracks().forEach((t) => t.stop());
        const type = current.mimeType || "audio/webm";
        onRecord(
          new File(
            chunks,
            `family-story.${type.includes("ogg") ? "ogg" : "webm"}`,
            { type },
          ),
        );
      };
      current.start();
      recorder.current = current;
      setRecording(true);
      window.setTimeout(() => {
        if (current.state === "recording") current.stop();
      }, 120000);
    } catch (e) {
      report(e);
    }
  }
  return (
    <button
      type="button"
      onClick={() => (recording ? recorder.current?.stop() : void start())}
    >
      {recording ? "Stop and save recording" : "Record a voice story"}
    </button>
  );
}
