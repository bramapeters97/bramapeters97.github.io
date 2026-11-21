import { appUrl, canonicalApiUrls } from "../paths";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  artworkUrl,
  duration,
  pretty,
  upload,
  type Data,
  type Item,
} from "./api";
import { Choices, Empty, Field, Modal, Status, Toggle } from "./Controls";
import Icon from "./Icon";
import VideoEditor from "./VideoEditor";
import Personalise from "./Personalise";
import Channels from "./Channels";
import ResourceEditor from "./ResourceEditor";
import AccountBilling from "./AccountBilling";
import { legalPolicies } from "../public/LegalPage";
import StudioAttribution from "../StudioAttribution";
import "./admin.css";

const sections = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "videos", label: "Videos", icon: "video" },
  { id: "collections", label: "Collections", icon: "collection" },
  { id: "moments", label: "Moments & stories", icon: "heart" },
  { id: "channels", label: "Family TV", icon: "tv" },
  { id: "personalise", label: "Personalise", icon: "image" },
  { id: "family", label: "Family & access", icon: "family" },
  { id: "premieres", label: "Premieres", icon: "star" },
  { id: "contributions", label: "Contributions", icon: "upload" },
  { id: "storage", label: "Storage", icon: "storage" },
  { id: "account", label: "Account & billing", icon: "billing" },
  { id: "settings", label: "Settings & recovery", icon: "settings" },
  { id: "legal", label: "Legal & policies", icon: "lock" },
];
export default function Admin({
  session,
  onExit,
  onLogout,
}: {
  session: any;
  onExit: () => void;
  onLogout: () => void;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [page, setPage] = useState("overview");
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState("moments");
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [collection, setCollection] = useState("all");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState<string[]>([]);
  const [video, setVideo] = useState<Item | null>(null);
  const [editing, setEditing] = useState<{
    resource: string;
    item: Item;
  } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [recovery, setRecovery] = useState<Item[]>([]);
  const [link, setLink] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const report = useCallback(
    (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    [],
  );
  const reload = useCallback(async () => {
    const result = await api<Data>("/bootstrap");
    setData(result);
  }, []);
  useEffect(() => {
    void reload().catch(report);
  }, [reload, report]);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    if (page === "settings")
      void api<Item[]>("/recovery").then(setRecovery).catch(report);
  }, [page, report]);
  function navigate(id: string) {
    if (
      (dirty || video) &&
      !window.confirm("Leave this editor and discard unsaved changes?")
    )
      return;
    setDirty(false);
    setPage(id);
    setMenu(false);
    setSelected([]);
    setQuery("");
    setStatus("all");
    setCollection("all");
    setVideo(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  async function save(resource: string, item: Item) {
    const { id, ...payload } = item;
    await api(
      `/${resource}${id ? `/${id}` : ""}`,
      payload,
      id ? "PATCH" : "POST",
    );
    await reload();
    setNotice("Changes saved.");
  }
  async function remove(resource: string, item: Item) {
    if (
      !window.confirm(
        `Move “${item.title || item.name || "this item"}” to Recently deleted?`,
      )
    )
      return;
    try {
      await api(`/${resource}/${item.id}`, undefined, "DELETE");
      await reload();
      setNotice("Moved to Recently deleted. You can restore it in Settings.");
    } catch (e) {
      report(e);
    }
  }
  async function action(work: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    try {
      await work();
      await reload();
      setNotice(message);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) await upload(f);
      await reload();
      setUploadOpen(false);
      setNotice(
        "Files saved privately on this computer. Review the videos before publishing.",
      );
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }
  async function bulk(state: string) {
    await action(async () => {
      for (const id of selected)
        await api(`/videos/${id}`, { status: state }, "PATCH");
      setSelected([]);
    }, "Selected videos updated.");
  }
  function newItem(resource: string) {
    const defaults: Record<string, any> = {
      collections: {
        title: "",
        visibility: "all",
        gathering: false,
        videoIds: [],
        priority: 0,
      },
      moments: {
        videoId: data?.videos?.[0]?.id || "",
        title: "",
        start: 0,
        end: Math.min(30, data?.videos?.[0]?.duration || 30),
        familyTv: true,
        status: "approved",
        visibility: "all",
      },
      stories: {
        videoId: data?.videos?.[0]?.id || "",
        title: "",
        text: "",
        timestamp: 0,
        status: "approved",
        approved: true,
        visibility: "all",
      },
      transcripts: {
        videoId: data?.videos?.[0]?.id || "",
        start: 0,
        end: Math.min(5, data?.videos?.[0]?.duration || 5),
        text: "",
        language: "en",
      },
      profiles: { name: "", color: "#efc674" },
      premieres: {
        videoId: data?.videos?.[0]?.id || "",
        title: "",
        releaseAt: new Date(Date.now() + 86400000).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: "draft",
        published: false,
        allowedAccounts: [],
      },
    };
    setEditing({ resource, item: { id: "", ...(defaults[resource] || {}) } });
  }
  const account = data?.account || session?.account || {};
  const tenant = data?.tenant ||
    session?.tenant || { name: "Your family cinema" };
  const videos: Item[] = data?.videos || [];
  const collections: Item[] = data?.collections || [];
  const shown = videos
    .filter(
      (v) =>
        (status === "all" || v.status === status) &&
        (collection === "all" || v.collectionIds?.includes(collection)) &&
        `${v.title} ${v.year} ${v.location} ${(v.people || []).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? String(a.title).localeCompare(String(b.title))
        : sort === "year"
          ? Number(b.year) - Number(a.year)
          : sort === "priority"
            ? Number(b.priority) - Number(a.priority)
            : String(b.createdAt || "").localeCompare(
                String(a.createdAt || ""),
              ),
    );
  const published = videos.filter((v) => v.status === "published").length;
  const awaiting = videos.filter((v) => v.status === "ready").length;
  const pending = (data?.contributions || []).filter(
    (c: Item) => c.status === "pending",
  ).length;
  const missing = videos.filter((v) => !v.poster).length;
  const usage = Number(data?.storage?.bytes || data?.usage?.bytes || 0);
  function table(items: Item[], compact = false) {
    return (
      <div className={`adm-table-wrap ${compact ? "compact" : ""}`}>
        <table className="adm-video-table">
          <thead>
            <tr>
              {!compact && (
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all visible videos"
                    checked={
                      !!items.length &&
                      items.every((v) => selected.includes(v.id))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? items.map((v) => v.id) : [],
                      )
                    }
                  />
                </th>
              )}
              <th>Title</th>
              {!compact && <th>Year</th>}
              <th>Collection</th>
              {!compact && <th>Duration</th>}
              <th>Status</th>
              <th>
                <span className="adm-sr">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id} className={video?.id === v.id ? "chosen" : ""}>
                {!compact && (
                  <td>
                    <input
                      aria-label={`Select ${v.title}`}
                      type="checkbox"
                      checked={selected.includes(v.id)}
                      onChange={(e) =>
                        setSelected((old) =>
                          e.target.checked
                            ? [...old, v.id]
                            : old.filter((id) => id !== v.id),
                        )
                      }
                    />
                  </td>
                )}
                <td>
                  <button
                    className="adm-video-title"
                    onClick={() => setVideo(v)}
                  >
                    <span className="adm-thumb">
                      <img loading="lazy" src={artworkUrl(v.poster)} alt="" />
                      {!compact && <small>{duration(v.duration)}</small>}
                    </span>
                    <span>
                      <strong>{v.title}</strong>
                      {compact && (
                        <small>
                          {v.createdAt
                            ? new Date(v.createdAt).toLocaleDateString()
                            : v.year || "Date unknown"}
                        </small>
                      )}
                    </span>
                  </button>
                </td>
                {!compact && <td>{v.year || "Unknown"}</td>}
                <td>
                  {(v.collectionIds || [])
                    .map(
                      (id: string) =>
                        collections.find((c) => c.id === id)?.title,
                    )
                    .filter(Boolean)
                    .join(", ") || "Unsorted"}
                </td>
                {!compact && <td>{duration(v.duration)}</td>}
                <td>
                  <Status value={v.status} />
                </td>
                <td>
                  <button
                    className="adm-icon-btn"
                    aria-label={`Edit ${v.title}`}
                    onClick={() => setVideo(v)}
                  >
                    <Icon name="edit" size={19} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <Empty title="No videos match">
            <p>Try another search or add your first video.</p>
          </Empty>
        )}
      </div>
    );
  }
  return (
    <div className={`admin-app ${video ? "has-editor" : ""}`}>
      <button
        className="adm-mobile-menu"
        aria-expanded={menu}
        aria-controls="archive-admin-navigation"
        aria-label="Open archive navigation"
        onClick={() => setMenu((v) => !v)}
      >
        <Icon name="menu" />
      </button>
      <aside
        id="archive-admin-navigation"
        className={`adm-sidebar ${menu ? "open" : ""}`}
      >
        <div className="adm-brand">
          <Icon name="cinema" size={35} />
          <div>
            <strong>{tenant.name}</strong>
            <small>Archive management</small>
          </div>
        </div>
        <nav aria-label="Archive administration">
          {sections.map((s, i) => (
            <button
              key={s.id}
              className={`${page === s.id ? "active" : ""} ${i === 9 ? "adm-nav-gap" : ""}`}
              onClick={() => navigate(s.id)}
            >
              <Icon name={s.icon} />
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-bottom">
          <button
            onClick={() => {
              if (
                !dirty ||
                window.confirm("Leave without saving your appearance changes?")
              )
                onExit();
            }}
          >
            <Icon name="external" />
            View archive
            <Icon name="arrow" size={15} />
          </button>
          <button onClick={onLogout}>
            <span className="adm-avatar">
              {String(account.name || "A")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <span>
              {account.name || "Archive owner"}
              <small>Sign out</small>
            </span>
          </button>
          <StudioAttribution />
        </div>
      </aside>
      <div className="adm-main">
        <header className="adm-topbar">
          <span>
            <Icon name="home" size={16} />
            <span className="adm-breadcrumb-divider">›</span>
            {sections.find((s) => s.id === page)?.label}
          </span>
          <div>
            <span className="adm-demo-label">LOCAL DEMO</span>
            <span className="adm-private">
              <Icon name="lock" size={15} />
              Private archive
            </span>
            <span className="adm-avatar">
              {String(account.name || "A")
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>
        </header>
        <main className="adm-content">
          {error && (
            <div className="adm-alert error" role="alert">
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}
          {notice && (
            <div className="adm-alert success" role="status">
              <Icon name="check" size={19} />
              <span>{notice}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {!data ? (
            <Empty
              title={
                error
                  ? "We could not load your archive"
                  : "Opening your archive…"
              }
            >
              <button onClick={() => void reload().catch(report)}>
                Try again
              </button>
            </Empty>
          ) : (
            <>
              {page === "overview" && (
                <>
                  <div className="adm-page-heading">
                    <div>
                      <h1>
                        Welcome back
                        {account.name ? `, ${account.name.split(" ")[0]}` : ""}
                      </h1>
                      <p>Everything for your own family cinema.</p>
                    </div>
                    <button
                      className="adm-gold"
                      onClick={() => setUploadOpen(true)}
                    >
                      <Icon name="plus" />
                      Upload video
                    </button>
                  </div>
                  <div className="adm-stats">
                    {[
                      {
                        n: published,
                        label: "published videos",
                        icon: "video",
                        page: "videos",
                      },
                      {
                        n: collections.length,
                        label: "collections",
                        icon: "collection",
                        page: "collections",
                      },
                      {
                        n: (data.profiles || []).length,
                        label: "viewing profiles",
                        icon: "family",
                        page: "family",
                      },
                    ].map((s) => (
                      <button key={s.label} onClick={() => navigate(s.page)}>
                        <span className="adm-stat-icon">
                          <Icon name={s.icon} size={30} />
                        </span>
                        <span>
                          <strong>{s.n}</strong>
                          <small>{s.label}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="adm-dashboard-grid">
                    <div className="adm-dashboard-primary">
                      <section
                        className="adm-personalise-hero"
                        style={{
                          backgroundImage: `linear-gradient(90deg,rgba(3,12,21,.98),rgba(3,12,21,.65) 44%,rgba(3,12,21,.05)),url("${appUrl("/artwork/cinema.png")}")`,
                        }}
                      >
                        <Icon name="cinema" size={42} />
                        <h2>Make it your own</h2>
                        <p>Name, appearance and welcome screen</p>
                        <button
                          className="adm-gold"
                          onClick={() => navigate("personalise")}
                        >
                          Personalise your archive
                          <Icon name="arrow" />
                        </button>
                      </section>
                      <section className="adm-panel adm-recent">
                        <div className="adm-section-heading">
                          <h2>
                            <Icon name="clock" />
                            Recently added
                          </h2>
                          <button
                            className="adm-text-button"
                            onClick={() => navigate("videos")}
                          >
                            View all
                            <Icon name="arrow" size={17} />
                          </button>
                        </div>
                        {table(
                          [...videos]
                            .sort((a, b) =>
                              String(b.createdAt || "").localeCompare(
                                String(a.createdAt || ""),
                              ),
                            )
                            .slice(0, 3),
                          true,
                        )}
                      </section>
                    </div>
                    <div className="adm-dashboard-side">
                      <section className="adm-panel">
                        <h2>
                          <Icon name="list" />
                          Still to do
                        </h2>
                        <div className="adm-task-list">
                          <button
                            onClick={() => {
                              navigate("videos");
                              setStatus("ready");
                            }}
                          >
                            <span className="adm-task-icon">
                              <Icon name="play" />
                            </span>
                            <span>
                              {awaiting} video{awaiting !== 1 ? "s" : ""} ready
                              to publish
                            </span>
                            <span>›</span>
                          </button>
                          <button
                            onClick={() => {
                              navigate("videos");
                              setQuery("");
                            }}
                          >
                            <span className="adm-task-icon gold">
                              <Icon name="image" />
                            </span>
                            <span>
                              {missing} missing cover{missing !== 1 ? "s" : ""}
                            </span>
                            <span>›</span>
                          </button>
                          {pending > 0 && (
                            <button onClick={() => navigate("contributions")}>
                              <span className="adm-task-icon">
                                <Icon name="upload" />
                              </span>
                              <span>
                                {pending} contribution{pending !== 1 ? "s" : ""}{" "}
                                to review
                              </span>
                              <span>›</span>
                            </button>
                          )}
                        </div>
                      </section>
                      <section className="adm-panel">
                        <div className="adm-section-heading">
                          <h2>
                            <Icon name="storage" />
                            Storage
                          </h2>
                          <button
                            className="adm-text-button"
                            onClick={() => navigate("storage")}
                          >
                            View usage →
                          </button>
                        </div>
                        <meter min="0" max={1024 * 1024 * 1024} value={usage} />
                        <div className="adm-storage-caption">
                          <span>
                            {(usage / 1024 / 1024).toFixed(1)} MB uploaded
                            locally
                          </span>
                        </div>
                        <p className="adm-note">
                          Demo films use licensed public stock footage.
                        </p>
                      </section>
                      <button
                        className="adm-archive-card"
                        onClick={() => {
                          if (
                            !dirty ||
                            window.confirm(
                              "Leave without saving your appearance changes?",
                            )
                          )
                            onExit();
                        }}
                      >
                        <h2>
                          <Icon name="image" />
                          View your archive
                          <Icon name="external" size={19} />
                        </h2>
                        <img
                          src={artworkUrl(
                            tenant.background,
                            "/artwork/lake.png",
                          )}
                          alt="Your archive welcome artwork"
                        />
                        <div>
                          <strong>{tenant.name}</strong>
                          <span>{tenant.slogan}</span>
                          <Icon name="arrow" size={27} />
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
              {page === "videos" && (
                <>
                  <div className="adm-page-heading">
                    <div>
                      <h1>Video library</h1>
                      <p>Your films, carefully kept.</p>
                    </div>
                    <button
                      className="adm-gold"
                      onClick={() => setUploadOpen(true)}
                    >
                      <Icon name="plus" />
                      Upload video
                    </button>
                  </div>
                  <div className="adm-library-toolbar">
                    <label className="adm-search">
                      <Icon name="search" />
                      <input
                        placeholder="Search title, year or person"
                        aria-label="Search videos"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filter collection"
                      value={collection}
                      onChange={(e) => setCollection(e.target.value)}
                    >
                      <option value="all">All collections</option>
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="all">All statuses</option>
                      {[
                        "draft",
                        "processing",
                        "ready",
                        "published",
                        "failed",
                        "unavailable",
                      ].map((s) => (
                        <option value={s} key={s}>
                          {pretty(s)}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Sort videos"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="recent">Recently added</option>
                      <option value="title">Title</option>
                      <option value="year">Recording year</option>
                      <option value="priority">Priority</option>
                    </select>
                    <div className="adm-view-switch">
                      <button
                        aria-label="List view"
                        aria-pressed={view === "list"}
                        className={view === "list" ? "selected" : ""}
                        onClick={() => setView("list")}
                      >
                        <Icon name="list" />
                      </button>
                      <button
                        aria-label="Grid view"
                        aria-pressed={view === "grid"}
                        className={view === "grid" ? "selected" : ""}
                        onClick={() => setView("grid")}
                      >
                        <Icon name="collection" />
                      </button>
                    </div>
                  </div>
                  {selected.length > 0 && (
                    <div className="adm-bulk">
                      <strong>{selected.length} selected</strong>
                      <button
                        disabled={busy}
                        onClick={() => void bulk("published")}
                      >
                        Publish
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void bulk("draft")}
                      >
                        Move to drafts
                      </button>
                      <button onClick={() => setSelected([])}>
                        Clear selection
                      </button>
                    </div>
                  )}
                  {view === "list" ? (
                    table(shown)
                  ) : (
                    <div className="adm-card-grid">
                      {shown.map((v) => (
                        <article className="adm-video-card" key={v.id}>
                          <button onClick={() => setVideo(v)}>
                            <img
                              loading="lazy"
                              src={artworkUrl(v.poster)}
                              alt=""
                            />
                            <div>
                              <h3>{v.title}</h3>
                              <p>
                                {v.year || "Date unknown"} ·{" "}
                                {duration(v.duration)}
                              </p>
                              <Status value={v.status} />
                            </div>
                          </button>
                          <label>
                            <input
                              aria-label={`Select ${v.title}`}
                              type="checkbox"
                              checked={selected.includes(v.id)}
                              onChange={(e) =>
                                setSelected((old) =>
                                  e.target.checked
                                    ? [...old, v.id]
                                    : old.filter((id) => id !== v.id),
                                )
                              }
                            />
                          </label>
                          <button
                            className="adm-delete-card"
                            aria-label={`Delete ${v.title}`}
                            onClick={() => void remove("videos", v)}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                  <p className="adm-note">
                    Demo records use public Pexels and Mixkit stock clips with
                    fictional archive titles. See Legal & policies for sources.
                    Your own uploads are stored privately on this computer.
                  </p>
                </>
              )}
              {page === "collections" && (
                <>
                  <div className="adm-page-heading">
                    <div>
                      <h1>Collections</h1>
                      <p>Bring related memories together.</p>
                    </div>
                    <button
                      className="adm-gold"
                      onClick={() => newItem("collections")}
                    >
                      <Icon name="plus" />
                      New collection
                    </button>
                  </div>
                  <div className="adm-card-grid">
                    {collections.map((c) => (
                      <article
                        className="adm-collection-card adm-panel"
                        key={c.id}
                      >
                        <img
                          src={artworkUrl(c.artwork, "/artwork/garden.png")}
                          alt=""
                        />
                        <h2>{c.title}</h2>
                        <p>{c.description || "A collection of memories."}</p>
                        <span className="adm-muted">
                          {
                            videos.filter((v) =>
                              v.collectionIds?.includes(c.id),
                            ).length
                          }{" "}
                          videos · {c.visibility || "all"} members
                        </span>
                        <div className="adm-actions">
                          <button
                            onClick={() =>
                              setEditing({
                                resource: "collections",
                                item: {
                                  ...c,
                                  videoIds: videos
                                    .filter((v) =>
                                      v.collectionIds?.includes(c.id),
                                    )
                                    .map((v) => v.id),
                                },
                              })
                            }
                          >
                            Edit collection
                          </button>
                          <button
                            className="adm-icon-btn"
                            aria-label={`Delete ${c.title}`}
                            onClick={() => void remove("collections", c)}
                          >
                            <Icon name="trash" size={18} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!collections.length && (
                    <Empty title="A place for every memory">
                      <button onClick={() => newItem("collections")}>
                        Create your first collection
                      </button>
                    </Empty>
                  )}
                </>
              )}
              {page === "personalise" && (
                <Personalise
                  key={JSON.stringify(data.tenant)}
                  tenant={data.tenant}
                  collections={collections}
                  onDirty={setDirty}
                  saved={async () => {
                    await reload();
                    setNotice("Appearance saved.");
                  }}
                  report={report}
                />
              )}
              {page === "channels" && (
                <Channels
                  key={JSON.stringify(data.channels)}
                  channels={data.channels || []}
                  collections={collections}
                  videos={videos}
                  moments={data.moments || []}
                  accounts={data.accounts || []}
                  onDirty={setDirty}
                  save={save}
                  remove={remove}
                  report={report}
                />
              )}
              {page === "moments" && (
                <>
                  <div className="adm-page-heading">
                    <div>
                      <h1>Moments & stories</h1>
                      <p>The little things that make a film yours.</p>
                    </div>
                    <button className="adm-gold" onClick={() => newItem(tab)}>
                      <Icon name="plus" />
                      Add{" "}
                      {tab === "moments"
                        ? "moment"
                        : tab === "stories"
                          ? "story"
                          : "transcript segment"}
                    </button>
                  </div>
                  <div className="adm-tabs">
                    {[
                      { id: "moments", title: "Saved moments" },
                      { id: "stories", title: "Family stories" },
                      { id: "transcripts", title: "Transcripts" },
                    ].map((t) => (
                      <button
                        className={tab === t.id ? "active" : ""}
                        key={t.id}
                        onClick={() => setTab(t.id)}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                  {tab === "transcripts" && (
                    <TranscriptImport
                      videos={videos}
                      refresh={reload}
                      report={report}
                      notify={setNotice}
                    />
                  )}
                  <div className="adm-resource-list">
                    {(data[tab] || []).map((item: Item) => (
                      <article className="adm-panel" key={item.id}>
                        <div>
                          <h3>
                            {item.title ||
                              item.text?.slice(0, 70) ||
                              "Transcript segment"}
                          </h3>
                          <p>
                            {videos.find((v) => v.id === item.videoId)?.title ||
                              "Source film"}{" "}
                            · {duration(item.start ?? item.timestamp)}
                            {item.end != null ? `–${duration(item.end)}` : ""}
                          </p>
                          {item.description && <p>{item.description}</p>}
                          {tab === "stories" && (
                            <>
                              <p>{item.text}</p>
                              {item.audio && (
                                <audio
                                  controls
                                  preload="none"
                                  src={item.audio}
                                />
                              )}
                            </>
                          )}
                          {item.status && <Status value={item.status} />}
                        </div>
                        <div className="adm-actions">
                          {tab === "stories" && item.status !== "approved" && (
                            <button
                              onClick={() =>
                                void action(
                                  () =>
                                    api(
                                      `/stories/${item.id}`,
                                      { status: "approved", approved: true },
                                      "PATCH",
                                    ),
                                  "Story approved.",
                                )
                              }
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => setEditing({ resource: tab, item })}
                          >
                            Edit
                          </button>
                          <button
                            className="adm-icon-btn"
                            aria-label="Delete item"
                            onClick={() => void remove(tab, item)}
                          >
                            <Icon name="trash" size={18} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!(data[tab] || []).length && (
                    <Empty title={`No ${tab} yet`}>
                      <p>
                        Add a moment, story or transcript to make memories
                        easier to rediscover.
                      </p>
                    </Empty>
                  )}
                </>
              )}
              {page === "premieres" && (
                <>
                  <div className="adm-page-heading">
                    <div>
                      <h1>Premieres</h1>
                      <p>Make the first viewing an occasion.</p>
                    </div>
                    <button
                      className="adm-gold"
                      onClick={() => newItem("premieres")}
                    >
                      <Icon name="plus" />
                      Schedule a premiere
                    </button>
                  </div>
                  <div className="adm-card-grid">
                    {(data.premieres || []).map((p: Item) => (
                      <article
                        className="adm-premiere-card adm-panel"
                        key={p.id}
                      >
                        <img
                          src={artworkUrl(p.artwork, "/artwork/garden.png")}
                          alt=""
                        />
                        <span className="adm-eyebrow">FAMILY PREMIERE</span>
                        <h2>{p.title}</h2>
                        <p>{p.dedication}</p>
                        <p>
                          <Icon name="clock" size={18} />
                          {p.releaseAt
                            ? new Date(p.releaseAt).toLocaleString(undefined, {
                                timeZone: p.timezone || undefined,
                              })
                            : "Not scheduled"}{" "}
                          {p.timezone}
                        </p>
                        <Status value={p.status} />
                        <div className="adm-actions">
                          <button
                            onClick={() =>
                              setEditing({ resource: "premieres", item: p })
                            }
                          >
                            Edit premiere
                          </button>
                          <button
                            aria-label="Delete premiere"
                            onClick={() => void remove("premieres", p)}
                          >
                            <Icon name="trash" size={18} />
                          </button>
                        </div>
                        <small>
                          Scheduled access; playback is not synchronised between
                          homes.
                        </small>
                      </article>
                    ))}
                  </div>
                  {!data.premieres?.length && (
                    <Empty title="Set a date for your next premiere">
                      <button onClick={() => newItem("premieres")}>
                        Create a premiere
                      </button>
                    </Empty>
                  )}
                </>
              )}
              {page === "family" && (
                <>
                  <div className="adm-page-heading">
                    <div>
                      <h1>Family & access</h1>
                      <p>Private access for the people who matter.</p>
                    </div>
                    <button
                      className="adm-gold"
                      onClick={() => newItem("profiles")}
                    >
                      <Icon name="plus" />
                      Add viewing profile
                    </button>
                  </div>
                  <div className="adm-two-column">
                    <section className="adm-panel">
                      <h2>Viewing profiles</h2>
                      <p className="adm-note">
                        Profiles personalise viewing. They do not grant account
                        permissions.
                      </p>
                      {(data.profiles || []).map((p: Item) => (
                        <div className="adm-person-row" key={p.id}>
                          {p.avatar ? (
                            <img src={p.avatar} alt="" />
                          ) : (
                            <span className="adm-avatar">
                              {p.name?.slice(0, 2)}
                            </span>
                          )}
                          <strong>{p.name}</strong>
                          <button
                            onClick={() =>
                              setEditing({ resource: "profiles", item: p })
                            }
                          >
                            Edit
                          </button>
                          <button
                            aria-label={`Delete ${p.name}`}
                            onClick={() => void remove("profiles", p)}
                          >
                            <Icon name="trash" size={17} />
                          </button>
                        </div>
                      ))}
                    </section>
                    <section className="adm-panel">
                      <h2>Account permissions</h2>
                      {(data.accounts || []).map((a: Item) => (
                        <div className="adm-account-row" key={a.id}>
                          <div>
                            <strong>{a.name}</strong>
                            <small>{a.email}</small>
                          </div>
                          <select
                            aria-label={`Role for ${a.name}`}
                            disabled={
                              a.id === account.id || account.role !== "owner"
                            }
                            value={a.role}
                            onChange={(e) =>
                              void action(
                                () =>
                                  api(
                                    `/accounts/${a.id}`,
                                    { role: e.target.value },
                                    "PATCH",
                                  ),
                                "Account role updated.",
                              )
                            }
                          >
                            <option value="owner">Owner</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </div>
                      ))}
                      <InviteForm report={report} created={setLink} />
                      {link && (
                        <div className="adm-copy-link">
                          <label>
                            Invitation link
                            <input
                              readOnly
                              value={
                                link.startsWith("http")
                                  ? link
                                  : new URL(
                                      appUrl(link),
                                      location.origin,
                                    ).toString()
                              }
                            />
                          </label>
                          <button
                            onClick={() =>
                              void navigator.clipboard
                                .writeText(
                                  link.startsWith("http")
                                    ? link
                                    : new URL(
                                        appUrl(link),
                                        location.origin,
                                      ).toString(),
                                )
                                .then(() => setNotice("Link copied."))
                                .catch(report)
                            }
                          >
                            Copy
                          </button>
                        </div>
                      )}
                    </section>
                    <section className="adm-panel">
                      <h2>Active sessions</h2>
                      <p className="adm-note">
                        Revoke a device to stop its next request.
                      </p>
                      {(data.sessions || []).map((s: Item) => (
                        <div className="adm-person-row" key={s.id}>
                          <div>
                            <strong>
                              {s.accountName || s.name || "Browser session"}
                            </strong>
                            <small>
                              {s.createdAt
                                ? new Date(s.createdAt).toLocaleString()
                                : ""}
                            </small>
                          </div>
                          <button
                            onClick={() =>
                              void action(
                                () =>
                                  api(`/sessions/${s.id}`, undefined, "DELETE"),
                                "Session revoked.",
                              )
                            }
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </section>
                  </div>
                </>
              )}
              {page === "contributions" && (
                <>
                  <div className="adm-page-heading">
                    <div>
                      <h1>Contribution inbox</h1>
                      <p>
                        Let guests add their memories, without opening your
                        archive.
                      </p>
                    </div>
                  </div>
                  <div className="adm-two-column">
                    <section className="adm-panel">
                      <h2>New upload link</h2>
                      <ContributionLink
                        collections={collections}
                        created={setLink}
                        report={report}
                      />
                      {link && (
                        <div className="adm-copy-link">
                          <label>
                            Upload-only link
                            <input
                              readOnly
                              value={
                                link.startsWith("http")
                                  ? link
                                  : new URL(
                                      appUrl(link),
                                      location.origin,
                                    ).toString()
                              }
                            />
                          </label>
                          <button
                            onClick={() =>
                              void navigator.clipboard
                                .writeText(
                                  link.startsWith("http")
                                    ? link
                                    : new URL(
                                        appUrl(link),
                                        location.origin,
                                      ).toString(),
                                )
                                .then(() => setNotice("Upload link copied."))
                                .catch(report)
                            }
                          >
                            Copy
                          </button>
                        </div>
                      )}
                      <p className="adm-note">
                        Guests can submit files only. They cannot browse this
                        archive or other contributions.
                      </p>
                    </section>
                    <section className="adm-panel">
                      <h2>Upload links</h2>
                      {(data.links || []).map((l: Item) => (
                        <div className="adm-account-row" key={l.id}>
                          <div>
                            <strong>{l.name || l.eventName}</strong>
                            <small>
                              Expires{" "}
                              {l.expiresAt
                                ? new Date(l.expiresAt).toLocaleString()
                                : "unknown"}
                            </small>
                          </div>
                          <button
                            onClick={() =>
                              void action(
                                () =>
                                  api(
                                    `/links/${l.id}`,
                                    { enabled: !l.enabled },
                                    "PATCH",
                                  ),
                                "Upload link updated.",
                              )
                            }
                          >
                            {l.enabled === false ? "Enable" : "Disable"}
                          </button>
                        </div>
                      ))}
                    </section>
                  </div>
                  <h2>Waiting for your review</h2>
                  <div className="adm-resource-list">
                    {(data.contributions || []).map((c: Item) => (
                      <article className="adm-panel" key={c.id}>
                        <div>
                          <h3>{c.title || "Guest contribution"}</h3>
                          <p>
                            {c.contributorName || c.name || "Guest"} ·{" "}
                            {c.description}
                          </p>
                          <Status value={c.status} />
                        </div>
                        <div className="adm-actions">
                          {c.status === "pending" && (
                            <>
                              <button
                                className="adm-gold"
                                onClick={() =>
                                  void action(
                                    () =>
                                      api(
                                        `/contributions/${c.id}`,
                                        { status: "approved" },
                                        "PATCH",
                                      ),
                                    "Contribution approved. Review its video before publishing.",
                                  )
                                }
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  void action(
                                    () =>
                                      api(
                                        `/contributions/${c.id}`,
                                        { status: "rejected" },
                                        "PATCH",
                                      ),
                                    "Contribution rejected.",
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  {!data.contributions?.length && (
                    <Empty title="The inbox is quiet">
                      <p>
                        Create a temporary upload link for your next occasion.
                      </p>
                    </Empty>
                  )}
                </>
              )}
              {page === "storage" && (
                <>
                  <div className="adm-page-heading">
                    <div>
                      <h1>Storage & plan</h1>
                      <p>A clear view of what your archive holds.</p>
                    </div>
                  </div>
                  <div className="adm-stats">
                    <div className="adm-panel">
                      <strong>{videos.length}</strong>
                      <p>video records</p>
                    </div>
                    <div className="adm-panel">
                      <strong>{(usage / 1024 / 1024).toFixed(1)} MB</strong>
                      <p>locally stored uploads</p>
                    </div>
                    <div className="adm-panel">
                      <strong>Demo</strong>
                      <p>Local development plan</p>
                    </div>
                  </div>
                  <section className="adm-panel">
                    <h2>Your media stays yours</h2>
                    <p>
                      Local uploads are stored privately by this application's
                      backend. The seeded library uses licensed public landscape
                      and city clips from Pexels and Mixkit. Archive titles and
                      metadata are fictional. Stock media is delivered by its
                      external provider; it is not a local private upload.
                    </p>
                    <p>
                      Production storage, streaming delivery, billing, automatic
                      transcription and live AI artwork require provider
                      configuration. No commercial usage or billable cloud
                      action is simulated.
                    </p>
                    <div className="adm-actions">
                      <button onClick={() => setUploadOpen(true)}>
                        Upload video
                      </button>
                      <button onClick={() => navigate("settings")}>
                        Export archive metadata
                      </button>
                    </div>
                  </section>
                </>
              )}
              {page === "account" && (
                <AccountBilling
                  refresh={reload}
                  report={report}
                  notify={setNotice}
                />
              )}
              {page === "settings" && (
                <Settings
                  data={data}
                  recovery={recovery}
                  refresh={async () => {
                    await reload();
                    setRecovery(await api("/recovery"));
                  }}
                  report={report}
                  notify={setNotice}
                  account={account}
                />
              )}
              {page === "legal" && (
                <>
                  <div className="adm-page-heading">
                    <div>
                      <span className="adm-eyebrow">
                        INFORMATION & RESPONSIBILITIES
                      </span>
                      <h1>Care for your stories</h1>
                      <p>
                        Read the policies for the local demonstration and what a
                        public service still needs.
                      </p>
                    </div>
                    <a
                      className="adm-button"
                      href={appUrl("/about")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="external" size={18} /> Public introduction
                    </a>
                  </div>
                  <section className="adm-legal-banner">
                    <Icon name="edit" size={27} />
                    <div>
                      <h2>Operator details are still required</h2>
                      <p>
                        These are visible draft policies for a local
                        demonstration. No legal operator, business address or
                        monitored support and privacy contacts have been
                        supplied. They describe current data handling and
                        example prices; they do not establish legal compliance
                        or a paid service agreement. Complete the production
                        record in <code>docs/LEGAL.md</code> before a commercial
                        launch.
                      </p>
                    </div>
                  </section>
                  <div className="adm-legal-grid">
                    {legalPolicies.map((policy) => (
                      <a
                        className="adm-legal-card"
                        key={policy.slug}
                        href={appUrl(`/legal/${policy.slug}`)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Icon
                          name={
                            policy.slug === "billing"
                              ? "billing"
                              : policy.slug === "content"
                                ? "video"
                                : policy.slug === "accessibility"
                                  ? "family"
                                  : "lock"
                          }
                          size={24}
                        />
                        <div>
                          <h2>{policy.title}</h2>
                          <p>{policy.description}</p>
                          <span className="adm-note">
                            Open policy in a new tab
                          </span>
                        </div>
                        <Icon name="external" size={17} />
                      </a>
                    ))}
                  </div>
                  <DemoMediaCredits />
                </>
              )}
              {(page === "settings" || page === "legal") && (
                <StudioAttribution />
              )}
            </>
          )}
        </main>
      </div>
      {video && (
        <VideoEditor
          key={video.id}
          video={video}
          collections={collections}
          accounts={data?.accounts || []}
          close={() => setVideo(null)}
          save={(item) => save("videos", item)}
          report={report}
        />
      )}
      {editing && data && (
        <ResourceEditor
          key={`${editing.resource}-${editing.item.id}`}
          resource={editing.resource}
          item={editing.item}
          data={data}
          close={() => setEditing(null)}
          save={save}
          report={report}
        />
      )}
      {uploadOpen && (
        <Modal
          title="Add your next memory"
          close={() => {
            if (!busy) setUploadOpen(false);
          }}
        >
          <div className="adm-upload-zone">
            <Icon name="upload" size={42} />
            <h3>Choose videos to add</h3>
            <p>MP4, MOV or WebM. Files stay private on this computer.</p>
            <input
              ref={uploadRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              multiple
              disabled={busy}
              onChange={(e) => void uploadFiles(e.target.files)}
            />
            <p className="adm-note">
              {busy
                ? "Uploading and validating your files…"
                : "Files enter your library for review. Check their title, cover and permissions before publishing."}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DemoMediaCredits() {
  const [credits, setCredits] = useState<{
    media: Record<string, any>[];
    datasetVersion?: string;
    originalFallbackUsed?: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setCredits(await api("/demo/media"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the media credits.",
      );
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section
      className="adm-panel adm-media-credits"
      aria-labelledby="demo-media-heading"
    >
      <div className="adm-media-credits-heading">
        <div>
          <span className="adm-eyebrow">DEMO FOOTAGE · SOURCE CREDITS</span>
          <h2 id="demo-media-heading">Scenery with a source</h2>
        </div>
        {credits && (
          <span className="adm-note">
            {credits.media.length} registered clips
          </span>
        )}
      </div>
      <p>
        Public sample footage comes from creators on Pexels and Mixkit. Archive
        titles, collections and stories are fictional. Previews and playback
        contact the external media host, which receives your IP address and
        technical request data. Availability can change. Your private uploads
        are separate from these public samples.
      </p>
      <p className="adm-note">
        Stock media retains its own licence; credits do not imply endorsement or
        transfer of ownership.{" "}
        <a
          href={appUrl("/legal/legal-notice#stock-credits")}
          target="_blank"
          rel="noreferrer"
        >
          Read the footage notice
        </a>{" "}
        or{" "}
        <a href={appUrl("/legal/privacy")} target="_blank" rel="noreferrer">
          provider privacy information
        </a>
        .
      </p>
      {busy && (
        <p className="adm-note" role="status">
          Loading source credits…
        </p>
      )}
      {error && (
        <div className="adm-alert error" role="alert">
          <span>{error}</span>
          <button onClick={() => void load()}>Try again</button>
        </div>
      )}
      {credits && (
        <div className="adm-media-credit-grid">
          {credits.media.map((clip, index) => (
            <article key={`${clip.sourceProvider}-${clip.sourceId}-${index}`}>
              <div>
                <span>
                  {clip.sourceProvider || "Stock footage"} ·{" "}
                  {duration(clip.duration || 0)}
                </span>
                <h3>{clip.title}</h3>
                {clip.author && <p>{clip.author}</p>}
              </div>
              <div className="adm-credit-links">
                {clip.sourcePage && (
                  <a href={clip.sourcePage} target="_blank" rel="noreferrer">
                    Original source <Icon name="external" size={13} />
                  </a>
                )}
                {clip.licensePage && (
                  <a href={clip.licensePage} target="_blank" rel="noreferrer">
                    {clip.licenseName || "Licence"}{" "}
                    <Icon name="external" size={13} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {credits?.originalFallbackUsed && (
        <p className="adm-note">
          Some entries may use an additional configured sample stream. The
          displayed catalogue titles remain fictional.
        </p>
      )}
      {credits && !credits.media.length && (
        <p className="adm-note">
          No stock clips are registered for this dataset.
        </p>
      )}
    </section>
  );
}

function InviteForm({
  report,
  created,
}: {
  report: (e: unknown) => void;
  created: (token: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="adm-invite-form"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void api("/invitations", {
          email,
          role,
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        })
          .then((r) => {
            created(r.url || `/invite/${r.token}`);
            setEmail("");
          })
          .catch(report)
          .finally(() => setBusy(false));
      }}
    >
      <h3>Invite someone</h3>
      <Field label="Email">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Role">
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
      </Field>
      <button disabled={busy} type="submit">
        {busy ? "Creating…" : "Create 7-day invitation"}
      </button>
      <p className="adm-note">Share the link yourself. No email is sent.</p>
    </form>
  );
}
function ContributionLink({
  collections,
  created,
  report,
}: {
  collections: Item[];
  created: (token: string) => void;
  report: (e: unknown) => void;
}) {
  const [value, set] = useState({
    name: "",
    collectionId: "",
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    maxUploads: 10,
    maxBytes: 100 * 1024 * 1024,
    enabled: true,
    approvalRequired: true,
    allowedTypes: ["video/mp4", "video/webm", "video/quicktime"],
  });
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void api("/contribution-links", {
          ...value,
          eventName: value.name,
          expiresAt: new Date(value.expiresAt).toISOString(),
        })
          .then((r) => created(r.url || `/contribute/${r.token}`))
          .catch(report)
          .finally(() => setBusy(false));
      }}
    >
      <Field label="Event name">
        <input
          required
          value={value.name}
          onChange={(e) => set((v) => ({ ...v, name: e.target.value }))}
        />
      </Field>
      <Field label="Destination collection">
        <select
          value={value.collectionId}
          onChange={(e) => set((v) => ({ ...v, collectionId: e.target.value }))}
        >
          <option value="">Unsorted</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Expires">
        <input
          type="datetime-local"
          required
          value={value.expiresAt}
          onChange={(e) => set((v) => ({ ...v, expiresAt: e.target.value }))}
        />
      </Field>
      <div className="adm-pair">
        <Field label="Maximum uploads">
          <input
            type="number"
            min="1"
            max="100"
            value={value.maxUploads}
            onChange={(e) =>
              set((v) => ({ ...v, maxUploads: Number(e.target.value) }))
            }
          />
        </Field>
        <Field label="Maximum file size (MB)">
          <input
            type="number"
            min="1"
            max="100"
            value={value.maxBytes / 1024 / 1024}
            onChange={(e) =>
              set((v) => ({
                ...v,
                maxBytes: Number(e.target.value) * 1024 * 1024,
              }))
            }
          />
        </Field>
      </div>
      <button type="submit" className="adm-gold" disabled={busy}>
        {busy ? "Creating…" : "Create upload-only link"}
      </button>
    </form>
  );
}
function TranscriptImport({
  videos,
  refresh,
  report,
  notify,
}: {
  videos: Item[];
  refresh: () => Promise<void>;
  report: (e: unknown) => void;
  notify: (value: string) => void;
}) {
  const [videoId, setVideoId] = useState(videos[0]?.id || "");
  const [busy, setBusy] = useState(false);
  async function parse(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const blocks = text.replace(/\r/g, "").split(/\n\s*\n/);
      let count = 0;
      const seconds = (s: string) =>
        s.split(":").reduce((v, n) => v * 60 + Number(n.replace(",", ".")), 0);
      for (const b of blocks) {
        const lines = b.trim().split("\n");
        const at = lines.findIndex((l) => l.includes("-->"));
        if (at < 0) continue;
        const parts = lines[at]!.split("-->");
        const start = seconds(parts[0]!.trim());
        const end = seconds(parts[1]!.trim().split(" ")[0]!);
        const spoken = lines
          .slice(at + 1)
          .join(" ")
          .replace(/<[^>]*>/g, "");
        if (!spoken || !Number.isFinite(start) || end <= start) continue;
        await api("/transcripts", {
          videoId,
          start,
          end,
          text: spoken,
          language: "en",
        });
        count++;
      }
      if (!count)
        throw new Error(
          "No valid timed captions found. Choose a WebVTT or SRT file.",
        );
      await refresh();
      notify(`${count} transcript segments imported.`);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="adm-panel adm-transcript-import">
      <Field label="Film for subtitles">
        <select value={videoId} onChange={(e) => setVideoId(e.target.value)}>
          {videos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label={busy ? "Importing captions…" : "Import WebVTT or SRT"}>
        <input
          type="file"
          accept=".vtt,.srt,text/vtt"
          disabled={busy || !videoId}
          onChange={(e) => void parse(e.target.files?.[0])}
        />
      </Field>
      <p className="adm-note">
        Imported captions become searchable immediately. Automatic transcription
        requires a configured provider; no dialogue is invented.
      </p>
    </section>
  );
}
function Settings({
  data,
  recovery,
  refresh,
  report,
  notify,
  account,
}: {
  data: Data;
  recovery: Item[];
  refresh: () => Promise<void>;
  report: (e: unknown) => void;
  notify: (value: string) => void;
  account: Item;
}) {
  const [value, set] = useState<Item>({
    id: "archive",
    ...((data.settings || []).find((s: Item) => s.id === "archive") || {}),
    memoryDiscovery:
      (data.settings || []).find((s: Item) => s.id === "archive")
        ?.memoryDiscovery ||
      data.tenant.memoryDiscovery ||
      {},
  });
  const [owner, setOwner] = useState("");
  const [busy, setBusy] = useState(false);
  const [transfer, setTransfer] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  async function exportData() {
    setBusy(true);
    try {
      const result = await api("/export", {});
      const blob = new Blob(
        [JSON.stringify(canonicalApiUrls(result.data || result), null, 2)],
        {
          type: "application/json",
        },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "MyPremierePlus-archive-metadata.json";
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Archive metadata exported. Video source files are not included.");
      await refresh();
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
          <h1>Settings & recovery</h1>
          <p>Your memories, under your control.</p>
        </div>
      </div>
      <div className="adm-two-column">
        <section className="adm-panel">
          <h2>Memory discoveries</h2>
          <Toggle
            label="On this day"
            checked={value.memoryDiscovery.enabled !== false}
            onChange={(v) =>
              set((old) => ({
                ...old,
                memoryDiscovery: { ...old.memoryDiscovery, enabled: v },
              }))
            }
          />
          <Toggle
            label="Optional memory notifications"
            hint="Preference only. Delivery requires a configured notification provider."
            checked={!!value.notifications}
            onChange={(v) => set((old) => ({ ...old, notifications: v }))}
          />
          <Field
            label="Exclude sensitive occasions"
            hint="Separate occasions with commas."
          >
            <input
              value={(value.memoryDiscovery.sensitiveOccasions || []).join(
                ", ",
              )}
              onChange={(e) =>
                set((old) => ({
                  ...old,
                  memoryDiscovery: {
                    ...old.memoryDiscovery,
                    sensitiveOccasions: e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  },
                }))
              }
            />
          </Field>
          <Field label="Discovery audience">
            <select
              value={value.memoryDiscovery.audience || "all"}
              onChange={(e) =>
                set((old) => ({
                  ...old,
                  memoryDiscovery: {
                    ...old.memoryDiscovery,
                    audience: e.target.value,
                  },
                }))
              }
            >
              <option value="all">All archive members</option>
              <option value="admin">Administrators only</option>
            </select>
          </Field>
          <Field
            label="Included collections"
            hint="Leave empty to allow all permitted collections."
          >
            <Choices
              options={data.collections || []}
              values={value.memoryDiscovery.collectionIds || []}
              onChange={(v) =>
                set((old) => ({
                  ...old,
                  memoryDiscovery: { ...old.memoryDiscovery, collectionIds: v },
                }))
              }
            />
          </Field>
          <Field label="Excluded videos">
            <Choices
              options={data.videos || []}
              values={value.memoryDiscovery.excludedVideoIds || []}
              onChange={(v) =>
                set((old) => ({
                  ...old,
                  memoryDiscovery: {
                    ...old.memoryDiscovery,
                    excludedVideoIds: v,
                  },
                }))
              }
            />
          </Field>
          <button
            className="adm-gold"
            onClick={() =>
              void api(
                (data.settings || []).some((s: Item) => s.id === "archive")
                  ? "/settings/archive"
                  : "/settings",
                value,
                (data.settings || []).some((s: Item) => s.id === "archive")
                  ? "PATCH"
                  : "POST",
              )
                .then(() => notify("Preferences saved."))
                .catch(report)
            }
          >
            Save preferences
          </button>
        </section>
        <section className="adm-panel">
          <h2>Export your archive</h2>
          <p>
            Download the metadata for your videos, collections, moments,
            stories, tags and transcripts.
          </p>
          <p className="adm-note">
            This is a metadata export. It does not contain original video files
            or claim original-file preservation.
          </p>
          <button
            disabled={busy}
            className="adm-gold"
            onClick={() => void exportData()}
          >
            <Icon name="upload" />
            {busy ? "Preparing…" : "Export metadata"}
          </button>
          {(data.exports || []).map((e: Item) => (
            <p className="adm-note" key={e.id}>
              {e.createdAt ? new Date(e.createdAt).toLocaleString() : ""} ·{" "}
              {e.status}
            </p>
          ))}
        </section>
        <section className="adm-panel">
          <h2>Recently deleted</h2>
          <p className="adm-note">
            Items remain recoverable for 30 days. Restoring an item preserves
            its metadata and relationships.
          </p>
          {recovery.map((item) => (
            <div className="adm-person-row" key={item.id}>
              <div>
                <strong>
                  {item.title || item.name || item.data?.title || item.id}
                </strong>
                <small>
                  {item.resource || item.type} ·{" "}
                  {item.deletedAt
                    ? new Date(item.deletedAt).toLocaleDateString()
                    : ""}
                </small>
              </div>
              <button
                onClick={() =>
                  void api(`/recovery/${item.id}/restore`, {})
                    .then(refresh)
                    .then(() => notify("Item restored."))
                    .catch(report)
                }
              >
                Restore
              </button>
              <button
                className="adm-danger"
                aria-label="Permanently delete"
                onClick={() => {
                  if (
                    window.confirm(
                      "Permanently delete this item? This cannot be undone.",
                    )
                  )
                    void api(
                      `/recovery/${item.id}`,
                      { confirm: true },
                      "DELETE",
                    )
                      .then(refresh)
                      .then(() => notify("Item permanently deleted."))
                      .catch(report);
                }}
              >
                <Icon name="trash" size={17} />
              </button>
            </div>
          ))}
          {!recovery.length && <p>Your recovery area is empty.</p>}
        </section>
        <section className="adm-panel">
          <h2>Archive ownership</h2>
          <p>
            Only the owner can start an ownership transfer. The recipient must
            accept while signed in.
          </p>
          <Field label="New owner account">
            <select
              disabled={account.role !== "owner"}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              <option value="">Choose an archive account</option>
              {(data.accounts || [])
                .filter((a: Item) => a.id !== account.id)
                .map((a: Item) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.email}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Confirm your owner password">
            <input
              type="password"
              autoComplete="current-password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
            />
          </Field>
          <button
            disabled={!owner || !ownerPassword || account.role !== "owner"}
            onClick={() => {
              if (
                window.confirm(
                  "Create an ownership transfer request for this account?",
                )
              )
                void api("/ownership", {
                  accountId: owner,
                  password: ownerPassword,
                })
                  .then((r) => {
                    setTransfer(
                      `${location.origin}${appUrl(`/?ownership=${encodeURIComponent(r.token)}`)}`,
                    );
                    setOwnerPassword("");
                    notify(
                      "Ownership transfer created. The recipient must accept.",
                    );
                  })
                  .catch(report);
            }}
          >
            Begin authenticated transfer
          </button>
          {transfer && <p className="adm-copy-link">{transfer}</p>}
        </section>
        <section className="adm-panel">
          <h2>Recent changes</h2>
          {(data.history || [])
            .slice(-10)
            .reverse()
            .map((h: Item) => (
              <p className="adm-note" key={h.id}>
                <strong>{h.action || h.resource}</strong> ·{" "}
                {h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
              </p>
            ))}
        </section>
      </div>
    </>
  );
}
