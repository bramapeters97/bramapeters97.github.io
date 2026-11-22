import { appUrl } from "../paths";
import { useEffect, useState, type CSSProperties } from "react";
import { api, artworkUrl, assetUrl, upload, type Item } from "./api";
import { Choices, Field, Modal, Toggle } from "./Controls";
import Icon from "./Icon";
import { palettes, fonts, splashBackground, fontFamily } from "../appearance";
import "../fonts.css";

export default function Personalise({
  tenant,
  collections,
  saved,
  report,
  onDirty,
}: {
  tenant: Item;
  collections: Item[];
  saved: () => Promise<void>;
  report: (e: unknown) => void;
  onDirty?: (value: boolean) => void;
}) {
  const initial = { ...tenant, ...tenant.draft };
  const [value, set] = useState<Item>(initial);
  const [tab, setTab] = useState("identity");
  const [device, setDevice] = useState("tv");
  const [full, setFull] = useState(false);
  const [intro, setIntro] = useState(false);
  const [busy, setBusy] = useState(false);
  const update = (key: string, v: unknown) =>
    set((old) => ({ ...old, [key]: v }));
  const changed = JSON.stringify(value) !== JSON.stringify(initial);
  const pending = Object.entries(tenant.draft || {}).some(
    ([key, v]) => JSON.stringify(v) !== JSON.stringify(tenant[key]),
  );
  useEffect(() => {
    onDirty?.(changed);
    const before = (e: BeforeUnloadEvent) => {
      if (changed) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => {
      onDirty?.(false);
      window.removeEventListener("beforeunload", before);
    };
  }, [changed, onDirty]);
  async function save(publish: boolean) {
    setBusy(true);
    try {
      await api("/tenant", value, "PATCH");
      if (publish) await api("/tenant/publish", {});
      await saved();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function image(key: string, file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      update(key, assetUrl(await upload(file)));
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  const screen = (
    <div
      className={`adm-welcome-preview adm-gradient-welcome ${intro ? "animate-intro" : ""}`}
      style={
        {
          "--archive-accent": value.accent || "#efc674",
          background: splashBackground(value.palette || "midnight"),
          fontFamily: fontFamily(value.font || "inter"),
        } as CSSProperties
      }
    >
      <div className="adm-welcome-mark">
        {value.customIcon ? (
          <img src={value.customIcon} alt="" />
        ) : (
          <Icon
            name={
              value.icon === "clapperboard" ? "cinema" : value.icon || "cinema"
            }
            size={device === "mobile" ? 52 : 80}
          />
        )}
      </div>
      <h2>{value.name || "Your family cinema"}</h2>
      <p>{value.slogan || "Your stories. Your cinema."}</p>
      {intro && (
        <button onClick={() => setIntro(false)}>Skip introduction</button>
      )}
    </div>
  );
  return (
    <>
      <div className="adm-page-heading">
        <div>
          <h1>Your own family cinema</h1>
          <p>
            Give your archive its own identity. See it come to life on every
            screen.
          </p>
        </div>
      </div>
      <div className="adm-tabs">
        {[
          { id: "identity", title: "Identity", icon: "edit" },
          { id: "homepage", title: "Homepage", icon: "home" },
          { id: "theme", title: "Theme & welcome", icon: "image" },
        ].map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} />
            {t.title}
          </button>
        ))}
      </div>
      <div className="adm-personalise">
        <section className="adm-panel adm-identity">
          {tab === "identity" && (
            <>
              <Field label="Archive name">
                <input
                  value={value.name || ""}
                  maxLength={50}
                  onChange={(e) => update("name", e.target.value)}
                />
                <small>{(value.name || "").length}/50</small>
              </Field>
              <Field label="Archive font">
                <select
                  value={value.font || "inter"}
                  onChange={(e) => update("font", e.target.value)}
                >
                  {fonts.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Slogan">
                <input
                  value={value.slogan || ""}
                  maxLength={100}
                  onChange={(e) => update("slogan", e.target.value)}
                />
              </Field>
              <Field label="Archive icon">
                <div className="adm-icon-choices">
                  {[
                    {
                      id: "clapperboard",
                      name: "cinema",
                      label: "Clapperboard",
                    },
                    { id: "home", name: "home", label: "Home" },
                    { id: "video", name: "video", label: "Filmstrip" },
                    { id: "star", name: "star", label: "Star" },
                  ].map((i) => (
                    <button
                      key={i.id}
                      aria-pressed={value.icon === i.id && !value.customIcon}
                      className={
                        value.icon === i.id && !value.customIcon
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        set((v) => ({ ...v, icon: i.id, customIcon: "" }))
                      }
                    >
                      <Icon name={i.name} size={32} />
                      <span>{i.label}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Your own icon">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) =>
                    void image("customIcon", e.target.files?.[0])
                  }
                />
              </Field>
              <Field label="Accent colour">
                <div className="adm-swatches">
                  {["#e9bd67", "#76a7d8", "#63927c", "#bd7e89", "#f1f3f5"].map(
                    (c) => (
                      <button
                        key={c}
                        aria-label={`Use ${c} accent`}
                        style={{ background: c }}
                        className={value.accent === c ? "selected" : ""}
                        onClick={() => update("accent", c)}
                      />
                    ),
                  )}
                  <input
                    type="color"
                    aria-label="Custom accent colour"
                    value={value.accent || "#efc674"}
                    onChange={(e) => update("accent", e.target.value)}
                  />
                </div>
              </Field>
            </>
          )}
          {tab === "homepage" && (
            <>
              <h3>A homepage for your family</h3>
              <p className="adm-muted">
                Select and order the collections you want to greet people with.
              </p>
              <Choices
                options={[
                  { id: "featured", title: "Featured films" },
                  { id: "continue", title: "Continue Watching" },
                  { id: "collections", title: "Collections" },
                  { id: "premieres", title: "Premieres" },
                  ...collections,
                ]}
                values={value.homepage || []}
                onChange={(v) => update("homepage", v)}
              />
              <div className="adm-order-list">
                {(value.homepage || []).map((id: string, index: number) => (
                  <div key={id}>
                    <span>
                      {collections.find((c) => c.id === id)?.title ||
                        (
                          {
                            featured: "Featured films",
                            continue: "Continue Watching",
                            collections: "Collections",
                            premieres: "Premieres",
                          } as Record<string, string>
                        )[id] ||
                        id}
                    </span>
                    <button
                      aria-label="Move collection up"
                      disabled={!index}
                      onClick={() => {
                        const list = [...value.homepage];
                        [list[index - 1], list[index]] = [
                          list[index],
                          list[index - 1],
                        ];
                        update("homepage", list);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      aria-label="Move collection down"
                      disabled={index === value.homepage.length - 1}
                      onClick={() => {
                        const list = [...value.homepage];
                        [list[index + 1], list[index]] = [
                          list[index],
                          list[index + 1],
                        ];
                        update("homepage", list);
                      }}
                    >
                      ↓
                    </button>
                  </div>
                ))}
              </div>
              <Toggle
                label="Show Continue Watching"
                checked={(value.homepage || []).includes("continue")}
                onChange={(v) =>
                  update(
                    "homepage",
                    v
                      ? [...(value.homepage || []), "continue"]
                      : (value.homepage || []).filter(
                          (id: string) => id !== "continue",
                        ),
                  )
                }
              />
              <Toggle
                label="Show memory discoveries"
                checked={value.memoryDiscovery?.enabled !== false}
                onChange={(v) =>
                  update("memoryDiscovery", {
                    ...value.memoryDiscovery,
                    enabled: v,
                  })
                }
              />
              <Toggle
                label="Show upcoming premieres"
                checked={(value.homepage || []).includes("premieres")}
                onChange={(v) =>
                  update(
                    "homepage",
                    v
                      ? [...(value.homepage || []), "premieres"]
                      : (value.homepage || []).filter(
                          (id: string) => id !== "premieres",
                        ),
                  )
                }
              />
              <Field
                label="Homepage artwork"
                hint="Used for archive cards and featured artwork. Your welcome screen always uses a gradient palette."
              >
                {value.background && (
                  <img
                    className="adm-home-artwork"
                    src={artworkUrl(value.background, "/artwork/lake.png")}
                    alt="Current homepage artwork"
                  />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(e) =>
                    void image("background", e.target.files?.[0])
                  }
                />
              </Field>
              <button onClick={() => update("background", "/artwork/lake.png")}>
                Restore default homepage artwork
              </button>
            </>
          )}
          {tab === "theme" && (
            <>
              <Field label="Theme">
                <div className="adm-theme-options">
                  {[
                    { id: "classic", title: "Classic Cinema", image: "lake" },
                    {
                      id: "vintage",
                      title: "Vintage Memories",
                      image: "garden",
                    },
                    { id: "minimal", title: "Minimal", image: "mountains" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      aria-pressed={value.theme === t.id}
                      className={value.theme === t.id ? "selected" : ""}
                      onClick={() => update("theme", t.id)}
                    >
                      <img src={appUrl(`/artwork/${t.image}.png`)} alt="" />
                      <span>{t.title}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field
                label="Welcome screen palette"
                hint="A calm gradient with a soft glow behind your archive identity."
              >
                <div className="adm-palette-grid">
                  {palettes.map((p) => (
                    <button
                      key={p.id}
                      aria-pressed={(value.palette || "midnight") === p.id}
                      className={
                        value.palette === p.id ||
                        (!value.palette && p.id === "midnight")
                          ? "selected"
                          : ""
                      }
                      onClick={() => update("palette", p.id)}
                    >
                      <span
                        className="adm-palette-swatch"
                        style={{ background: splashBackground(p.id) }}
                      >
                        <Icon name="cinema" size={27} />
                      </span>
                      <strong>{p.name}</strong>
                      {(value.palette || "midnight") === p.id && (
                        <Icon name="check" size={14} />
                      )}
                    </button>
                  ))}
                </div>
              </Field>
              <Toggle
                label="Short introduction when opening"
                hint="A brief welcome with your archive icon, name and slogan."
                checked={value.intro !== false}
                onChange={(v) => update("intro", v)}
              />
            </>
          )}
        </section>
        <section className="adm-panel adm-live-preview">
          <div className="adm-section-heading">
            <div>
              <h2>Live preview</h2>
              <p>Your welcome screen, with a live preview of every change.</p>
            </div>
            <div className="adm-actions">
              <button
                aria-pressed={device === "tv"}
                className={device === "tv" ? "selected" : ""}
                onClick={() => setDevice("tv")}
              >
                <Icon name="tv" />
                TV
              </button>
              <button
                aria-pressed={device === "mobile"}
                className={device === "mobile" ? "selected" : ""}
                onClick={() => setDevice("mobile")}
              >
                <Icon name="mobile" />
                Mobile
              </button>
            </div>
          </div>
          <div className={`adm-device-frame ${device}`}>{screen}</div>
          <div className="adm-actions">
            <button
              onClick={() => {
                setIntro(true);
                window.setTimeout(() => setIntro(false), 6000);
              }}
            >
              <Icon name="play" />
              Preview introduction
            </button>
            <button onClick={() => setFull(true)}>
              <Icon name="external" />
              Fullscreen preview
            </button>
          </div>
        </section>
      </div>
      <div className="adm-save-bar">
        <div>
          <Icon name="clock" />
          <span>
            <strong>
              {changed || pending
                ? "Changes have not been published"
                : "Your archive is up to date"}
            </strong>
            <small>Existing viewers see your published appearance.</small>
          </span>
        </div>
        <div className="adm-actions">
          <button disabled={busy} onClick={() => void save(false)}>
            Save draft
          </button>
          <button
            className="adm-gold"
            disabled={busy || !value.name?.trim()}
            onClick={() => void save(true)}
          >
            <Icon name="upload" />
            {busy ? "Saving…" : "Publish changes"}
          </button>
        </div>
      </div>
      {full && (
        <Modal title="Your welcome screen" wide close={() => setFull(false)}>
          {screen}
        </Modal>
      )}
    </>
  );
}
