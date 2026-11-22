import { useEffect, useRef, useState } from "react";
import { api, artworkUrl, assetUrl, upload, type Item } from "./api";
import { Choices, Field, MediaPreview, Modal, Toggle } from "./Controls";
import Icon from "./Icon";
import { appPathname, appUrl } from "../paths";

export default function VideoEditor({
  video,
  collections,
  accounts,
  close,
  save,
  report,
}: {
  video: Item;
  collections: Item[];
  accounts: Item[];
  close: () => void;
  save: (item: Item) => Promise<void>;
  report: (error: unknown) => void;
}) {
  const [value, set] = useState<Item>({ ...video, ...video.draft });
  const [cover, setCover] = useState(false);
  const [playing, setPlaying] = useState("");
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  const changed =
    JSON.stringify(value) !== JSON.stringify({ ...video, ...video.draft });
  const update = (key: string, v: unknown) =>
    set((old) => ({ ...old, [key]: v }));
  const dismiss = () => {
    if (!changed || window.confirm("Discard your unsaved video changes?"))
      close();
  };
  async function commit(asDraft = false) {
    setBusy(true);
    try {
      if (asDraft) {
        await api(
          `/videos/${video.id}`,
          { draft: { ...value, draft: undefined } },
          "PATCH",
        );
        await save({ id: video.id });
      } else await save({ ...value, draft: null });
      close();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside
      ref={panel}
      className="adm-drawer"
      aria-label="Edit video"
      onKeyDown={(e) => {
        if (
          e.key === "Escape" &&
          !(e.target as HTMLElement).closest("dialog")
        ) {
          e.stopPropagation();
          dismiss();
        }
      }}
    >
      <header>
        <h2>Edit video</h2>
        <button
          className="adm-icon-btn"
          aria-label="Close video editor"
          onClick={dismiss}
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="adm-drawer-body">
        <div className="adm-cover-image">
          <img
            src={artworkUrl(value.poster)}
            alt="Video cover"
            style={{
              objectPosition: value.coverCrop
                ? `${value.coverCrop.x}% ${value.coverCrop.y}%`
                : "50% 50%",
            }}
          />
          <button onClick={() => setCover(true)}>
            <Icon name="image" size={18} /> Change cover
          </button>
        </div>
        <button
          className="adm-wide adm-secondary"
          onClick={() => {
            void api(`/playback/${video.id}`)
              .then((p) => setPlaying(p.url))
              .catch(report);
          }}
        >
          <Icon name="play" size={17} /> Preview playback
        </button>
        <Field label="Title">
          <input
            value={value.title || ""}
            maxLength={150}
            onChange={(e) => update("title", e.target.value)}
            required
          />
        </Field>
        <div className="adm-pair">
          <Field label="Recording year">
            <input
              type="number"
              min="1800"
              max="2200"
              value={value.year || ""}
              onChange={(e) =>
                update("year", e.target.value ? Number(e.target.value) : null)
              }
            />
          </Field>
          <Field label="Date accuracy">
            <select
              value={value.datePrecision || "unknown"}
              onChange={(e) => update("datePrecision", e.target.value)}
            >
              {[
                "exact",
                "month",
                "year",
                "approximate",
                "season",
                "unknown",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
        </div>
        {["exact", "month"].includes(value.datePrecision) && (
          <Field label="Recording date">
            <input
              type={value.datePrecision === "month" ? "month" : "date"}
              value={value.recordedDate || ""}
              onChange={(e) => update("recordedDate", e.target.value)}
            />
          </Field>
        )}
        {value.datePrecision === "season" && (
          <Field label="Season">
            <select
              value={value.season || "summer"}
              onChange={(e) => update("season", e.target.value)}
            >
              {["spring", "summer", "autumn", "winter"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Collections">
          <Choices
            options={collections}
            values={value.collectionIds || []}
            onChange={(v) => update("collectionIds", v)}
          />
        </Field>
        <Field label="Status">
          <select
            value={value.status || "draft"}
            onChange={(e) => update("status", e.target.value)}
          >
            {[
              "draft",
              "processing",
              "ready",
              "published",
              "failed",
              "unavailable",
            ].map((s) => (
              <option key={s} value={s}>
                {s === "ready" ? "Ready to publish" : s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description">
          <textarea
            rows={4}
            value={value.description || ""}
            maxLength={2000}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>
        <Field label="Location">
          <input
            value={value.location || ""}
            onChange={(e) => update("location", e.target.value)}
          />
        </Field>
        <Field label="People" hint="Separate names with commas.">
          <input
            value={(value.people || []).join(", ")}
            onChange={(e) =>
              update(
                "people",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </Field>
        <Field label="Occasion">
          <input
            value={value.occasion || ""}
            onChange={(e) => update("occasion", e.target.value)}
          />
        </Field>
        <div className="adm-pair">
          <Field label="Display priority">
            <input
              type="number"
              value={value.priority || 0}
              onChange={(e) => update("priority", Number(e.target.value))}
            />
          </Field>
          <Field label="Available from">
            <input
              type="datetime-local"
              value={(value.availableAt || "").slice(0, 16)}
              onChange={(e) =>
                update(
                  "availableAt",
                  e.target.value ? new Date(e.target.value).toISOString() : "",
                )
              }
            />
          </Field>
        </div>
        <Field label="Who can watch">
          <select
            value={value.visibility || "all"}
            onChange={(e) => update("visibility", e.target.value)}
          >
            <option value="all">All archive members</option>
            <option value="selected">Selected accounts</option>
            <option value="admin">Administrators only</option>
          </select>
        </Field>
        {value.visibility === "selected" && (
          <Choices
            options={accounts}
            values={value.allowedAccounts || []}
            onChange={(v) => update("allowedAccounts", v)}
          />
        )}
        <Toggle
          label="Featured on the homepage"
          checked={!!value.featured}
          onChange={(v) => update("featured", v)}
        />
        <Toggle
          label="Include in Family TV"
          checked={value.familyTv !== false}
          onChange={(v) => update("familyTv", v)}
        />
        <Toggle
          label="Approved for Gathering Mode"
          checked={!!value.gathering}
          onChange={(v) => update("gathering", v)}
        />
        <Toggle
          label="Available for viewing"
          checked={value.availability !== "unavailable"}
          onChange={(v) =>
            update("availability", v ? "available" : "unavailable")
          }
        />
      </div>
      <footer>
        <button
          disabled={busy || !value.title?.trim()}
          className="adm-gold"
          onClick={() => void commit()}
        >
          <Icon name="check" size={18} />
          {busy ? "Saving…" : "Publish changes"}
        </button>
        <button disabled={busy} onClick={() => void commit(true)}>
          Save as draft
        </button>
      </footer>
      {playing && (
        <Modal title="Playback preview" wide close={() => setPlaying("")}>
          <MediaPreview url={playing} poster={value.poster} />
        </Modal>
      )}
      {cover && (
        <CoverStudio
          video={value}
          close={() => setCover(false)}
          apply={(changes) => {
            set((old) => ({ ...old, ...changes }));
            setCover(false);
          }}
          report={report}
        />
      )}
    </aside>
  );
}

export function CoverStudio({
  video,
  close,
  apply,
  report,
}: {
  video: Item;
  close: () => void;
  apply: (changes: Record<string, unknown>) => void;
  report: (e: unknown) => void;
}) {
  const [method, setMethod] = useState("choose");
  const [timestamp, setTimestamp] = useState(Number(video.coverTimestamp || 0));
  const [preview, setPreview] = useState(
    artworkUrl(video.poster, "/artwork/lake.png"),
  );
  const [title, setTitle] = useState(video.title || "");
  const [year, setYear] = useState(String(video.year || ""));
  const [style, setStyle] = useState("classic");
  const [format, setFormat] = useState("cover");
  const [keywords, setKeywords] = useState<string[]>([
    video.location || "Summer",
    String(video.year || "Memories"),
  ]);
  const [description, setDescription] = useState(
    video.description || "A beautiful memory in warm evening light.",
  );
  const [keyword, setKeyword] = useState("");
  const [match, setMatch] = useState(true);
  const [position, setPosition] = useState({ x: 50, y: 50, zoom: 1 });
  const [previews, setPreviews] = useState<Item[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  async function frame() {
    setBusy(true);
    try {
      const result = await api(`/thumbnail/${video.id}?time=${timestamp}`);
      if (result.unavailable) {
        const source = await api(`/playback/${video.id}`);
        const blob = await captureFrame(
          source.url,
          timestamp,
          source.cors === "anonymous" && result.browserCaptureAllowed === true,
        );
        setPreview(assetUrl(await upload(blob, "video-frame.jpg", "artwork")));
      } else setPreview(result.url);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function own(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      setPreview(assetUrl(await upload(file)));
      setMethod("upload");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    try {
      const result = await api("/covers/preview", {
        videoId: video.id,
        keywords,
        description,
        style,
        format,
        matchArchive: match,
      });
      setPreviews(
        (result.previews || []).map((p: Item) => ({
          ...p,
          url: artworkUrl(p.url),
        })),
      );
      setPreview(artworkUrl(result.previews?.[0]?.url, "/artwork/lake.png"));
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function useCover() {
    setBusy(true);
    try {
      let result = preview;
      if (method === "upload" || method === "ai") {
        const blob = await composeCover(
          preview,
          format,
          position,
          method === "ai" ? { title, year, style } : undefined,
        );
        result = assetUrl(await upload(blob, "cover-artwork.jpg", "artwork"));
      }
      apply({
        [format === "backdrop" ? "backdrop" : "poster"]: result,
        coverMethod: method,
        coverTimestamp: method === "frame" ? timestamp : undefined,
        coverCrop: position,
        coverTitle: method === "ai" ? title : "",
        coverYear: method === "ai" ? year : "",
        coverStyle: method === "ai" ? style : "",
      });
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  const choose = (mode: string) => {
    setMethod(mode);
    if (mode === "frame") {
      void api(`/playback/${video.id}`)
        .then((p) => setUrl(p.url))
        .catch(report);
      void frame();
    }
  };
  return (
    <Modal
      title={
        method === "ai"
          ? "Create your cover"
          : method === "choose"
            ? "Choose your cover"
            : method === "frame"
              ? "Choose a video frame"
              : "Make the image yours"
      }
      wide
      close={close}
    >
      <p className="adm-muted">
        {video.title}
        {video.year ? ` · ${video.year}` : ""}
      </p>
      {method === "choose" ? (
        <>
          <div className="adm-cover-choices">
            {[
              {
                id: "frame",
                title: "Video frame",
                hint: "Pick a moment from the film",
                icon: "video",
                image: artworkUrl(video.poster),
              },
              {
                id: "upload",
                title: "Upload a photo",
                hint: "Choose your own image",
                icon: "upload",
                image: "/artwork/garden.png",
              },
              {
                id: "ai",
                title: "Create with AI",
                hint: "Describe your cover",
                icon: "sparkles",
                image: "/artwork/lake.png",
              },
            ].map((c) => (
              <button key={c.id} onClick={() => choose(c.id)}>
                <img src={appUrl(c.image || "/artwork/cinema.png")} alt="" />
                <div>
                  <h3>{c.title}</h3>
                  <span>
                    <Icon name={c.icon} />
                    {c.hint}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <p className="adm-note">
            AI previews use clearly labelled sample artwork until a live
            provider is configured.
          </p>
        </>
      ) : (
        <div className="adm-cover-studio">
          <div className="adm-panel">
            <button onClick={() => setMethod("choose")}>← Cover options</button>
            {method === "frame" && (
              <>
                <Field label={`Frame at ${timestamp.toFixed(1)} seconds`}>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(1, (video.duration || 60) - 1)}
                    step="0.1"
                    value={timestamp}
                    onChange={(e) => setTimestamp(Number(e.target.value))}
                  />
                </Field>
                <Field label="Exact time in seconds">
                  <input
                    type="number"
                    min="0"
                    max={video.duration || 60}
                    step="0.1"
                    value={timestamp}
                    onChange={(e) => setTimestamp(Number(e.target.value))}
                  />
                </Field>
                <button disabled={busy} onClick={() => void frame()}>
                  Update frame preview
                </button>
                <p className="adm-note">
                  Uses provider thumbnails, or captures a frame when the source
                  permits it. Some public demo sources require your own cover
                  image.
                </p>
                {url && (
                  <MediaPreview url={url} start={timestamp} poster={preview} />
                )}
              </>
            )}
            {method === "upload" && (
              <>
                <Field label="Choose image">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(e) => void own(e.target.files?.[0])}
                  />
                </Field>
                <Field label="Horizontal position">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={position.x}
                    onChange={(e) =>
                      setPosition((v) => ({ ...v, x: Number(e.target.value) }))
                    }
                  />
                </Field>
                <Field label="Vertical position">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={position.y}
                    onChange={(e) =>
                      setPosition((v) => ({ ...v, y: Number(e.target.value) }))
                    }
                  />
                </Field>
                <Field label="Zoom">
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={position.zoom}
                    onChange={(e) =>
                      setPosition((v) => ({
                        ...v,
                        zoom: Number(e.target.value),
                      }))
                    }
                  />
                </Field>
                <p className="adm-note">
                  Save a cropped copy while keeping your original upload intact.
                </p>
              </>
            )}
            {method === "ai" && (
              <>
                <span className="adm-demo-label">DEMO ARTWORK PROVIDER</span>
                <p className="adm-note">
                  These are bundled illustrations, not live AI results. Live
                  generation requires provider configuration. No family image is
                  sent anywhere.
                </p>
                <Field label="Keywords">
                  <div className="adm-chips">
                    {keywords.map((k, i) => (
                      <button
                        key={`${k}-${i}`}
                        onClick={() =>
                          setKeywords((v) => v.filter((_, n) => n !== i))
                        }
                      >
                        {k} ×
                      </button>
                    ))}
                  </div>
                  <div className="adm-inline">
                    <input
                      aria-label="New keyword"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                    />
                    <button
                      aria-label="Add keyword"
                      onClick={() => {
                        if (keyword.trim())
                          setKeywords((v) => [...v, keyword.trim()]);
                        setKeyword("");
                      }}
                    >
                      <Icon name="plus" />
                    </button>
                  </div>
                </Field>
                <Field label="Describe the scene">
                  <textarea
                    rows={4}
                    maxLength={300}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <small>{description.length}/300</small>
                </Field>
                <Field label="Style">
                  <div className="adm-style-options">
                    {["classic", "vintage", "minimal"].map((s) => (
                      <button
                        className={style === s ? "selected" : ""}
                        key={s}
                        onClick={() => setStyle(s)}
                      >
                        <Icon name={s === "classic" ? "cinema" : "image"} />
                        {s === "classic"
                          ? "Classic cinema"
                          : s === "vintage"
                            ? "Vintage postcard"
                            : "Minimal"}
                      </button>
                    ))}
                  </div>
                </Field>
                <Toggle
                  label="Match my archive"
                  checked={match}
                  onChange={setMatch}
                />
                <button
                  className="adm-gold adm-wide"
                  disabled={busy}
                  onClick={() => void generate()}
                >
                  <Icon name="sparkles" />
                  {busy
                    ? "Preparing…"
                    : previews.length
                      ? "Refresh demo previews"
                      : "Preview demo artwork"}
                </button>
              </>
            )}
            <Field label="Title overlay">
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Year overlay">
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                maxLength={12}
              />
            </Field>
          </div>
          <div className="adm-cover-result">
            <div
              className={`adm-art-preview ${style}`}
              style={{ aspectRatio: format === "backdrop" ? "21/9" : "16/9" }}
            >
              <img
                src={preview}
                alt="Selected cover preview"
                style={{
                  objectPosition: `${position.x}% ${position.y}%`,
                  transform: `scale(${position.zoom})`,
                }}
              />
              {method === "ai" && (
                <div>
                  <strong>{title}</strong>
                  <span>{year}</span>
                </div>
              )}
            </div>
            {previews.length > 0 && (
              <div className="adm-preview-gallery">
                {previews.map((p, i) => (
                  <button
                    key={i}
                    className={preview === p.url ? "selected" : ""}
                    onClick={() => setPreview(p.url)}
                  >
                    <img src={p.url} alt={`Demo option ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
            <div className="adm-actions">
              <button
                className={format === "cover" ? "selected" : ""}
                onClick={() => setFormat("cover")}
              >
                <Icon name="tv" /> Cover
              </button>
              <button
                className={format === "backdrop" ? "selected" : ""}
                onClick={() => setFormat("backdrop")}
              >
                <Icon name="image" /> Backdrop
              </button>
              <button
                disabled={busy}
                className="adm-gold"
                onClick={() => void useCover()}
              >
                Use this {format}
                <Icon name="arrow" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

async function captureFrame(
  url: string,
  time: number,
  allowAnonymous = false,
): Promise<Blob> {
  const localAsset = appPathname(url).startsWith("/api/assets/");
  const anonymous = !localAsset && allowAnonymous && url.startsWith("https://");
  if (!localAsset && !anonymous)
    throw new Error(
      "This provider cannot extract a frame. Upload your own cover instead.",
    );
  const media = document.createElement("video");
  media.preload = "auto";
  media.muted = true;
  media.playsInline = true;
  // CORS must be configured before src. Each capture owns a fresh video element,
  // so an anonymous Pexels request cannot leak into native-only Mixkit playback.
  if (anonymous) media.crossOrigin = "anonymous";
  else media.removeAttribute("crossorigin");
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = window.setTimeout(
      () =>
        finish(
          new Error(
            "The frame could not be read. Try another timestamp or upload an image.",
          ),
        ),
      15000,
    );
    const finish = (error?: Error, blob?: Blob) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      media.pause();
      media.removeAttribute("src");
      media.removeAttribute("crossorigin");
      media.load();
      if (error) reject(error);
      else resolve(blob!);
    };
    const draw = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = media.videoWidth;
        canvas.height = media.videoHeight;
        if (!canvas.width) throw new Error("The video has no readable image.");
        canvas.getContext("2d")!.drawImage(media, 0, 0);
        canvas.toBlob(
          (blob) =>
            blob
              ? finish(undefined, blob)
              : finish(new Error("Could not save this frame.")),
          "image/jpeg",
          0.9,
        );
      } catch (e) {
        finish(e instanceof Error ? e : new Error("Frame extraction failed."));
      }
    };
    media.onerror = () =>
      finish(new Error("The video could not be opened for frame capture."));
    media.onloadeddata = () => {
      if (time < 0.01) draw();
      else
        media.currentTime = Math.min(time, Math.max(0, media.duration - 0.05));
    };
    media.onseeked = draw;
    media.src = appUrl(url);
  });
}

async function composeCover(
  url: string,
  format: string,
  position: { x: number; y: number; zoom: number },
  overlay?: { title: string; year: string; style: string },
): Promise<Blob> {
  if (!url.startsWith("/"))
    throw new Error(
      "Choose a local image or demo illustration to create a cover.",
    );
  const image = new Image();
  image.src = appUrl(url);
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = format === "backdrop" ? 549 : 720;
  const context = canvas.getContext("2d");
  if (!context)
    throw new Error("Image editing is not supported by this browser.");
  const scale =
    Math.max(
      canvas.width / image.naturalWidth,
      canvas.height / image.naturalHeight,
    ) * position.zoom;
  const width = image.naturalWidth * scale,
    height = image.naturalHeight * scale;
  context.drawImage(
    image,
    ((canvas.width - width) * position.x) / 100,
    ((canvas.height - height) * position.y) / 100,
    width,
    height,
  );
  if (overlay) {
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#00000000");
    gradient.addColorStop(1, "#020b1666");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "center";
    context.shadowColor = "#000000";
    context.shadowBlur = 12;
    context.shadowOffsetY = 3;
    context.fillStyle = "#f8d490";
    context.font = `${overlay.style === "minimal" ? "500 64px system-ui" : "78px Georgia"}`;
    const words = overlay.title.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > 1120 && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    const start = canvas.height / 2 - (Math.min(3, lines.length) - 1) * 44;
    lines
      .slice(0, 3)
      .forEach((text, i) => context.fillText(text, 640, start + i * 88));
    context.font = "40px Georgia";
    context.fillText(overlay.year, 640, start + Math.min(3, lines.length) * 88);
    if (overlay.style === "classic") {
      context.shadowBlur = 0;
      context.strokeStyle = "#dcb76b";
      context.lineWidth = 3;
      context.strokeRect(17, 17, 1246, canvas.height - 34);
      context.lineWidth = 1;
      context.strokeRect(24, 24, 1232, canvas.height - 48);
    }
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("The cover could not be saved.")),
      "image/jpeg",
      0.92,
    ),
  );
}
