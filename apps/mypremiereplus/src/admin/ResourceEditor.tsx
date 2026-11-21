import { useState } from "react";
import { api, assetUrl, upload, type Data, type Item } from "./api";
import {
  Choices,
  Field,
  MediaPreview,
  Modal,
  Toggle,
  VoiceRecorder,
} from "./Controls";

type Definition = {
  label: string;
  key: string;
  type?: string;
  options?: string[];
  hint?: string;
};
const definitions: Record<string, Definition[]> = {
  collections: [
    { label: "Collection name", key: "title" },
    { label: "Description", key: "description", type: "textarea" },
    { label: "Display priority", key: "priority", type: "number" },
    { label: "Cover artwork", key: "artwork", type: "image" },
    { label: "Show on homepage", key: "homepage", type: "toggle" },
  ],
  moments: [
    { label: "Moment title", key: "title" },
    { label: "Source film", key: "videoId", type: "video" },
    { label: "Beginning (seconds)", key: "start", type: "number" },
    { label: "End (seconds)", key: "end", type: "number" },
    { label: "Description", key: "description", type: "textarea" },
    { label: "Thumbnail", key: "thumbnail", type: "image" },
    { label: "Collections", key: "collectionIds", type: "collections" },
    { label: "Approved for Family TV", key: "familyTv", type: "toggle" },
    {
      label: "Approval",
      key: "status",
      type: "select",
      options: ["pending", "approved", "rejected"],
    },
  ],
  stories: [
    { label: "Source film", key: "videoId", type: "video" },
    { label: "Story title", key: "title" },
    { label: "Your story", key: "text", type: "textarea" },
    {
      label: "At (seconds)",
      key: "timestamp",
      type: "number",
      hint: "The story appears as an optional marker; it never interrupts video audio.",
    },
    { label: "Voice commentary", key: "audio", type: "audio" },
    {
      label: "Approval",
      key: "status",
      type: "select",
      options: ["pending", "approved", "rejected"],
    },
  ],
  transcripts: [
    { label: "Source film", key: "videoId", type: "video" },
    { label: "Beginning (seconds)", key: "start", type: "number" },
    { label: "End (seconds)", key: "end", type: "number" },
    { label: "Spoken text", key: "text", type: "textarea" },
    { label: "Language", key: "language" },
  ],
  profiles: [
    { label: "Profile name", key: "name" },
    { label: "Profile photo", key: "avatar", type: "image" },
    { label: "Accent colour", key: "color", type: "color" },
  ],
  premieres: [
    { label: "Premiere title", key: "title" },
    { label: "Associated film", key: "videoId", type: "video" },
    {
      label: "Release date and time",
      key: "releaseAt",
      type: "datetime-local",
      hint: "Saved as an absolute instant. The server controls when playback becomes available.",
    },
    { label: "Time zone", key: "timezone" },
    { label: "Dedication", key: "dedication", type: "textarea" },
    { label: "Introduction title card", key: "intro", type: "textarea" },
    { label: "Cover artwork", key: "artwork", type: "image" },
    {
      label: "Publication",
      key: "status",
      type: "select",
      options: ["draft", "published"],
    },
    { label: "Invited accounts", key: "allowedAccounts", type: "accounts" },
  ],
  programmes: [
    { label: "Programme name", key: "title" },
    { label: "Viewing profiles", key: "profileIds", type: "profiles" },
    { label: "Films", key: "videoIds", type: "videos" },
    {
      label: "Status",
      key: "status",
      type: "select",
      options: ["draft", "active", "ended"],
    },
  ],
};

export default function ResourceEditor({
  resource,
  item,
  data,
  close,
  save,
  report,
}: {
  resource: string;
  item: Item;
  data: Data;
  close: () => void;
  save: (resource: string, item: Item) => Promise<void>;
  report: (e: unknown) => void;
}) {
  const [value, set] = useState<Item>({
    ...item,
    ...(resource === "moments" && !item.status
      ? { status: item.approved === false ? "pending" : "approved" }
      : {}),
  });
  const [busy, setBusy] = useState(false);
  const [playback, setPlayback] = useState("");
  const update = (key: string, v: unknown) =>
    set((old) => ({ ...old, [key]: v }));
  const dismiss = () => {
    if (
      JSON.stringify(value) === JSON.stringify(item) ||
      window.confirm("Discard your unsaved changes?")
    )
      close();
  };
  const needsVisibility = [
    "collections",
    "moments",
    "stories",
    "premieres",
  ].includes(resource);
  async function send() {
    setBusy(true);
    try {
      if (resource === "moments" && Number(value.end) <= Number(value.start))
        throw new Error("The end of a moment must be after its beginning.");
      if (resource === "premieres" && value.timezone)
        new Intl.DateTimeFormat(undefined, {
          timeZone: value.timezone,
        }).format();
      await save(resource, {
        ...value,
        ...(resource === "moments"
          ? {
              approved:
                value.status !== "pending" && value.status !== "rejected",
            }
          : {}),
        ...(resource === "stories"
          ? { approved: value.status === "approved" }
          : {}),
        ...(resource === "premieres"
          ? {
              published: value.status === "published",
              introEnabled: !!value.intro,
            }
          : {}),
      });
      close();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function file(key: string, f?: File) {
    if (!f) return;
    setBusy(true);
    try {
      update(key, assetUrl(await upload(f)));
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${item.id ? "Edit" : "Create"} ${resource === "stories" ? "story" : resource === "premieres" ? "premiere" : resource === "profiles" ? "viewing profile" : resource.replace(/s$/, "")}`}
      close={dismiss}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {(definitions[resource] || []).map((d) => (
          <Field key={d.key} label={d.label} hint={d.hint}>
            {d.type === "textarea" ? (
              <textarea
                rows={4}
                value={value[d.key] || ""}
                onChange={(e) => update(d.key, e.target.value)}
              />
            ) : d.type === "toggle" ? (
              <Toggle
                label={d.label}
                checked={!!value[d.key]}
                onChange={(v) => update(d.key, v)}
              />
            ) : d.type === "video" ? (
              <select
                required
                value={value[d.key] || ""}
                onChange={(e) => update(d.key, e.target.value)}
              >
                <option value="">Choose a film</option>
                {(data.videos || []).map((v: Item) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
            ) : d.type === "select" ? (
              <select
                value={value[d.key] || d.options?.[0]}
                onChange={(e) => update(d.key, e.target.value)}
              >
                {d.options?.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            ) : ["collections", "accounts", "profiles", "videos"].includes(
                d.type || "",
              ) ? (
              <Choices
                options={data[d.type || ""] || []}
                values={value[d.key] || []}
                onChange={(v) => update(d.key, v)}
              />
            ) : ["image", "audio"].includes(d.type || "") ? (
              <>
                {value[d.key] &&
                  (d.type === "image" ? (
                    <img
                      className="adm-upload-preview"
                      src={value[d.key]}
                      alt="Uploaded preview"
                    />
                  ) : (
                    <audio controls src={value[d.key]} />
                  ))}
                {d.type === "audio" && (
                  <VoiceRecorder
                    onRecord={(f) => void file(d.key, f)}
                    report={report}
                  />
                )}
                <input
                  aria-label={d.label}
                  type="file"
                  disabled={busy}
                  accept={
                    d.type === "image"
                      ? "image/png,image/jpeg,image/webp"
                      : "audio/webm,audio/ogg,audio/mpeg,audio/wav"
                  }
                  onChange={(e) => void file(d.key, e.target.files?.[0])}
                />
              </>
            ) : (
              <input
                type={d.type || "text"}
                required={["title", "name", "releaseAt", "text"].includes(
                  d.key,
                )}
                min={d.type === "number" ? 0 : undefined}
                step={d.type === "number" ? "any" : undefined}
                value={
                  d.type === "datetime-local"
                    ? value[d.key]
                      ? new Date(
                          new Date(value[d.key]).getTime() -
                            new Date(value[d.key]).getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                    : (value[d.key] ?? "")
                }
                onChange={(e) =>
                  update(
                    d.key,
                    d.type === "number"
                      ? Number(e.target.value)
                      : d.type === "datetime-local"
                        ? e.target.value
                          ? new Date(e.target.value).toISOString()
                          : ""
                        : e.target.value,
                  )
                }
              />
            )}
          </Field>
        ))}
        {resource === "moments" && (
          <section className="adm-panel">
            <h3>Moment timeline</h3>
            <Field label="Beginning">
              <input
                type="range"
                min="0"
                max={
                  (data.videos || []).find((v: Item) => v.id === value.videoId)
                    ?.duration || 1
                }
                step="0.1"
                value={value.start || 0}
                onChange={(e) => update("start", Number(e.target.value))}
              />
            </Field>
            <Field label="End">
              <input
                type="range"
                min="0"
                max={
                  (data.videos || []).find((v: Item) => v.id === value.videoId)
                    ?.duration || 1
                }
                step="0.1"
                value={value.end || 0}
                onChange={(e) => update("end", Number(e.target.value))}
              />
            </Field>
            <button
              type="button"
              onClick={() =>
                void api(`/playback/${value.videoId}`)
                  .then((p) => setPlayback(p.url))
                  .catch(report)
              }
            >
              Preview source at beginning
            </button>
            {playback && (
              <MediaPreview
                url={playback}
                start={value.start}
                end={value.end}
              />
            )}
          </section>
        )}
        {resource === "collections" && (
          <Field label="Video membership">
            <Choices
              options={data.videos || []}
              values={value.videoIds || []}
              onChange={(v) => update("videoIds", v)}
            />
          </Field>
        )}
        {needsVisibility && (
          <>
            <Field label="Visibility">
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
                options={data.accounts || []}
                values={value.allowedAccounts || []}
                onChange={(v) => update("allowedAccounts", v)}
              />
            )}
            <Toggle
              label="Approved for Gathering Mode"
              checked={!!value.gathering}
              onChange={(v) => update("gathering", v)}
            />
          </>
        )}
        <div className="adm-actions adm-modal-actions">
          <button type="button" onClick={dismiss}>
            Cancel
          </button>
          <button type="submit" className="adm-gold" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
