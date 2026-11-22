import { useEffect, useState } from "react";
import { api, artworkUrl, assetUrl, duration, upload, type Item } from "./api";
import { Choices, Empty, Field, MediaPreview, Toggle } from "./Controls";
import Icon from "./Icon";

export default function Channels({
  channels,
  collections,
  videos,
  moments,
  accounts,
  save,
  remove,
  report,
  onDirty,
}: {
  channels: Item[];
  collections: Item[];
  videos: Item[];
  moments: Item[];
  accounts: Item[];
  save: (resource: string, item: Item) => Promise<void>;
  remove: (resource: string, item: Item) => Promise<void>;
  report: (e: unknown) => void;
  onDirty?: (value: boolean) => void;
}) {
  const blank: Item = {
    id: "",
    name: "Our Family Channel",
    description: "A new way to enjoy your memories.",
    mode: "mix",
    collectionIds: [],
    excludedVideoIds: [],
    excludedMomentIds: [],
    excludedIntervals: [],
    minSeconds: 30,
    maxSeconds: 90,
    minutes: 30,
    enabled: true,
    gathering: true,
    status: "draft",
    artwork: "/artwork/lake.png",
  };
  const [selected, setSelected] = useState<Item>(
    channels[0] ? { ...channels[0], ...channels[0].draft } : blank,
  );
  const [queue, setQueue] = useState<Item[]>([]);
  const [playing, setPlaying] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [interval, setIntervalValue] = useState({
    videoId: videos[0]?.id || "",
    start: 0,
    end: 10,
  });
  const original = channels.find((c) => c.id === selected.id);
  const dirty =
    JSON.stringify(selected) !==
    JSON.stringify(original ? { ...original, ...original.draft } : blank);
  useEffect(() => {
    onDirty?.(dirty);
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => {
      onDirty?.(false);
      window.removeEventListener("beforeunload", before);
    };
  }, [dirty, onDirty]);
  const update = (key: string, v: unknown) =>
    setSelected((old) => ({ ...old, [key]: v }));
  async function commit(publish: boolean) {
    setBusy(true);
    try {
      if (selected.id) {
        await api(
          `/channels/${selected.id}`,
          { draft: { ...selected, draft: undefined } },
          "PATCH",
        );
        if (publish) await api(`/channels/${selected.id}/publish`, {});
        await save("channels", { id: selected.id });
      } else {
        const created = await api("/channels", {
          ...selected,
          id: undefined,
          published: false,
        });
        if (publish) await api(`/channels/${created.id}/publish`, {});
        setSelected(created);
        await save("channels", { id: created.id });
      }
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function mix() {
    setBusy(true);
    try {
      if (!selected.id)
        throw new Error("Save the channel before previewing a mix.");
      await api(
        `/channels/${selected.id}`,
        { draft: { ...selected, draft: undefined } },
        "PATCH",
      );
      const result = await api(`/channels/${selected.id}/mix`, {
        mode: selected.mode,
        minutes: selected.minutes,
        preview: true,
        config: selected,
      });
      setQueue(result.queue || []);
      setPlaying(null);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="adm-page-heading">
        <div>
          <h1>Family TV</h1>
          <p>Your memories, one continuous programme.</p>
        </div>
        <button
          className="adm-gold"
          onClick={() => {
            setSelected({ ...blank });
            setQueue([]);
          }}
        >
          <Icon name="plus" />
          New channel
        </button>
      </div>
      <div className="adm-tabs">
        {channels.map((c) => (
          <button
            key={c.id}
            className={selected.id === c.id ? "active" : ""}
            onClick={() => {
              setSelected({ ...c, ...c.draft });
              setQueue([]);
            }}
          >
            {c.name || c.title}
          </button>
        ))}
      </div>
      <div className="adm-channel-layout">
        <section className="adm-panel">
          <Field label="Channel name">
            <input
              value={selected.name || ""}
              onChange={(e) => update("name", e.target.value)}
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={2}
              value={selected.description || ""}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>
          <Field label="Channel artwork">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                void upload(file)
                  .then((result) => update("artwork", assetUrl(result)))
                  .catch(report)
                  .finally(() => setBusy(false));
              }}
            />
          </Field>
          <Field label="Channel icon">
            <select
              value={selected.icon || "tv"}
              onChange={(e) => update("icon", e.target.value)}
            >
              <option value="tv">Television</option>
              <option value="cinema">Cinema</option>
              <option value="star">Star</option>
              <option value="heart">Heart</option>
            </select>
          </Field>
          <Field label="Playback mode">
            <select
              value={selected.mode || "mix"}
              onChange={(e) => update("mode", e.target.value)}
            >
              <option value="mix">Memory Mix · random excerpts</option>
              <option value="moments">
                Favourite Moments · saved highlights
              </option>
              <option value="films">Full Films · complete videos</option>
            </select>
          </Field>
          <Field
            label="Included collections"
            hint="Leave empty to include all permitted collections."
          >
            <Choices
              options={collections}
              values={selected.collectionIds || []}
              onChange={(v) => update("collectionIds", v)}
            />
          </Field>
          <details>
            <summary>Exclusions & selection rules</summary>
            <Field label="Excluded videos">
              <Choices
                options={videos}
                values={selected.excludedVideoIds || []}
                onChange={(v) => update("excludedVideoIds", v)}
              />
            </Field>
            <Field label="Excluded moments">
              <Choices
                options={moments}
                values={selected.excludedMomentIds || []}
                onChange={(v) => update("excludedMomentIds", v)}
              />
            </Field>
            <div className="adm-pair">
              <Field label="Shortest excerpt (seconds)">
                <input
                  type="number"
                  min="1"
                  max="600"
                  value={selected.minSeconds || 30}
                  onChange={(e) => update("minSeconds", Number(e.target.value))}
                />
              </Field>
              <Field label="Longest excerpt (seconds)">
                <input
                  type="number"
                  min="1"
                  max="600"
                  value={selected.maxSeconds || 90}
                  onChange={(e) => update("maxSeconds", Number(e.target.value))}
                />
              </Field>
            </div>
            <h4>Excluded time intervals</h4>
            {(selected.excludedIntervals || []).map((i: Item, n: number) => (
              <div key={n} className="adm-inline">
                <span>
                  {videos.find((v) => v.id === i.videoId)?.title}:{" "}
                  {duration(i.start)}–{duration(i.end)}
                </span>
                <button
                  aria-label="Remove excluded interval"
                  onClick={() =>
                    update(
                      "excludedIntervals",
                      selected.excludedIntervals.filter(
                        (_: Item, index: number) => index !== n,
                      ),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <Field label="Source film">
              <select
                value={interval.videoId}
                onChange={(e) =>
                  setIntervalValue((v) => ({ ...v, videoId: e.target.value }))
                }
              >
                {videos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
            </Field>
            <div className="adm-pair">
              <Field label="Start (seconds)">
                <input
                  type="number"
                  min="0"
                  value={interval.start}
                  onChange={(e) =>
                    setIntervalValue((v) => ({
                      ...v,
                      start: Number(e.target.value),
                    }))
                  }
                />
              </Field>
              <Field label="End (seconds)">
                <input
                  type="number"
                  min="1"
                  value={interval.end}
                  onChange={(e) =>
                    setIntervalValue((v) => ({
                      ...v,
                      end: Number(e.target.value),
                    }))
                  }
                />
              </Field>
            </div>
            <button
              onClick={() => {
                if (interval.end > interval.start)
                  update("excludedIntervals", [
                    ...(selected.excludedIntervals || []),
                    interval,
                  ]);
                else report(new Error("The end must be after the start."));
              }}
            >
              Exclude interval
            </button>
          </details>
          <Field label="Default session">
            <select
              value={selected.minutes ?? 30}
              onChange={(e) => update("minutes", Number(e.target.value))}
            >
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
              <option value="120">120 minutes</option>
              <option value="0">Continuous · explicit viewer choice</option>
            </select>
          </Field>
          <Field label="Audience">
            <select
              value={selected.visibility || "all"}
              onChange={(e) => update("visibility", e.target.value)}
            >
              <option value="all">Archive members</option>
              <option value="selected">Selected accounts</option>
              <option value="admin">Administrators</option>
            </select>
          </Field>
          {selected.visibility === "selected" && (
            <Choices
              options={accounts}
              values={selected.allowedAccounts || []}
              onChange={(v) => update("allowedAccounts", v)}
            />
          )}
          <Toggle
            label="Show title at each segment"
            checked={selected.overlay !== false}
            onChange={(v) => update("overlay", v)}
          />
          <Toggle
            label="Available in Gathering Mode"
            checked={!!selected.gathering}
            onChange={(v) => update("gathering", v)}
          />
          <Toggle
            label="Enable channel"
            checked={selected.enabled !== false}
            onChange={(v) => update("enabled", v)}
          />
          <div className="adm-actions">
            <button
              disabled={busy || !selected.name}
              onClick={() => void commit(false)}
            >
              Save draft
            </button>
            <button
              className="adm-gold"
              disabled={busy || !selected.name}
              onClick={() => void commit(true)}
            >
              Publish channel
            </button>
            {selected.id && (
              <button
                className="adm-danger"
                onClick={() => void remove("channels", selected)}
              >
                Delete
              </button>
            )}
          </div>
        </section>
        <section className="adm-panel">
          <div className="adm-section-heading">
            <div>
              <h2>On your television</h2>
              <p>Preview a programme before publishing.</p>
            </div>
            <button disabled={busy || !selected.id} onClick={() => void mix()}>
              <Icon name="play" />
              {busy
                ? "Building…"
                : queue.length
                  ? "Another mix"
                  : "Preview channel"}
            </button>
          </div>
          <div className="adm-channel-preview">
            {playing ? (
              <MediaPreview
                url={playing.url}
                start={playing.start}
                end={playing.end}
              />
            ) : (
              <>
                <img
                  src={artworkUrl(selected.artwork, "/artwork/lake.png")}
                  alt="Channel artwork"
                />
                <div>
                  <Icon name={selected.icon || "tv"} size={34} />
                  <span className="adm-eyebrow">FAMILY TV</span>
                  <h2>{selected.name}</h2>
                  <p>{selected.description}</p>
                </div>
              </>
            )}
          </div>
          {queue.length ? (
            <>
              <h3>Now playing & Up next</h3>
              <ol className="adm-programme-list">
                {queue.slice(0, 10).map((q, i) => (
                  <li key={i}>
                    <span className="adm-queue-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{q.title}</strong>
                      <small>
                        {duration(q.start)}–{duration(q.end)} ·{" "}
                        {q.year || "Date unknown"}
                      </small>
                    </div>
                    <button
                      aria-label={`Preview ${q.title}`}
                      onClick={() =>
                        void api(`/playback/${q.videoId}`)
                          .then((p) =>
                            setPlaying({
                              id: q.videoId,
                              url: p.url,
                              start: q.start,
                              end: q.end,
                            }),
                          )
                          .catch(report)
                      }
                    >
                      <Icon name="play" size={16} />
                    </button>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <Empty title="Your next programme starts here">
              <p>
                Save a channel, then generate a preview using its approved
                videos and moments.
              </p>
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
