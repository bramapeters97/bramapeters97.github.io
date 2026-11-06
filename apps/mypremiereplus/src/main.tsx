import { appPathname, appUrl } from "./paths";
import { StrictMode, lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Viewer from "./viewer/App";
import { api, json } from "./api";
import { brand, setBrand } from "./brand";
import { scopeStorage, setStored, progressKey } from "./lib/shared";
import { FeatureHub, GuestUpload, MomentEditor } from "./features";
import "./viewer/styles.css";
import "./viewer/streaming.css";
import "./product.css";
import "./fonts.css";
import Account from "./Account";
import { ActivateDevice, DeviceLogin } from "./DeviceLogin";
import StudioAttribution from "./StudioAttribution";
const Admin = lazy(() => import("./admin/Admin"));
const PublicInfo = lazy(() => import("./public/PublicInfo"));
const LegalPage = lazy(() => import("./public/LegalPage"));

function CinemaSidebar({
  route,
  navigate,
}: {
  route: string;
  navigate: (s: string) => void;
}) {
  const items = [
    {
      id: "home",
      label: "Home",
      path: "M3 11 12 3l9 8M5 10v11h14V10M10 21v-7h4v7",
    },
    {
      id: "search",
      label: "Search",
      path: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6",
    },
    {
      id: "collections",
      label: "Collections",
      path: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    },
    {
      id: "library",
      label: "Film library",
      path: "M3 4h18v16H3zM7 4v16M17 4v16M3 9h4m10 0h4M3 15h4m10 0h4",
    },
    { id: "tv", label: "Family TV", path: "M3 6h18v14H3zM8 2l4 4 4-4M8 23h8" },
  ];
  return (
    <nav className="cinema-side-nav" aria-label="Cinema navigation">
      {items.map((i) => (
        <button
          key={i.id}
          title={i.label}
          aria-label={i.label}
          aria-current={route === i.id ? "page" : undefined}
          className={route === i.id ? "active" : ""}
          onClick={() => navigate(i.id)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d={i.path} />
          </svg>
          <span>{i.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [creating, setCreating] = useState(
      new URLSearchParams(location.search).get("create") === "1",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [device, setDevice] = useState(false);
  const [directory, setDirectory] = useState<any[] | null>(null),
    [email, setEmail] = useState(
      new URLSearchParams(location.search).get("create") === "1"
        ? ""
        : "demo@example.test",
    );
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void api("demo/accounts")
        .then((d) => {
          if (active) setDirectory(d.accounts);
        })
        .catch(() => {
          if (active) setDirectory(null);
        });
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(creating ? "archives" : "login", json("POST", data));
      onLogin();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (device)
    return <DeviceLogin onSignedIn={onLogin} onBack={() => setDevice(false)} />;
  return (
    <main className="access-page">
      <div className="access-art">
        <img
          src={appUrl("/artwork/lake.png")}
          alt="Cinematic sunset over a lake"
        />
        <div>
          <img className="product-icon" src={appUrl("/icon.svg")} alt="" />
          <p className="eyebrow">MY PREMIERE PLUS</p>
          <h1>
            Your stories.
            <br />
            Your cinema.
          </h1>
          <p>A private place for the memories that bring you together.</p>
        </div>
      </div>
      <section className="access-form">
        <a className="product-wordmark" href={appUrl("/")}>
          MyPremierePlus
        </a>
        <p className="eyebrow">WELCOME TO YOUR FAMILY CINEMA</p>
        <h2>{creating ? "Make it yours." : "Good to see you."}</h2>
        <p>
          {creating
            ? "Create your own private archive, then choose its look and feel."
            : "Sign in to watch, rediscover and share your memories."}
        </p>
        {!creating && directory && (
          <label className="demo-account-picker">
            Choose a demo cinema
            <select
              aria-label="Choose a demo account"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            >
              {directory.map((a) => (
                <option key={a.id} value={a.email}>
                  {a.archives[0]?.name ?? "Needs archive membership"} ·{" "}
                  {a.email}
                  {a.archives[0]
                    ? ` · ${a.archives[0].profileCount} profiles`
                    : ""}
                </option>
              ))}
            </select>
            <small>
              Read live from demo-data/mypremiereplus.db · refreshes every 5
              seconds
            </small>
          </label>
        )}
        <form onSubmit={submit}>
          {creating && (
            <>
              <label>
                Archive name
                <input
                  name="name"
                  required
                  maxLength={100}
                  placeholder="Our Family Cinema"
                />
              </label>
              <label>
                Your name
                <input name="ownerName" required autoComplete="name" />
              </label>
              <label>
                Slogan
                <input
                  name="slogan"
                  defaultValue="Our stories. Our cinema."
                  maxLength={100}
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              key={creating ? "create-password" : "login-password"}
              type="password"
              required
              minLength={creating ? 10 : 1}
              autoComplete={creating ? "new-password" : "current-password"}
              defaultValue={creating ? "" : "premiere-demo"}
            />
          </label>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <button className="gold-button" disabled={busy}>
            {busy
              ? "Opening your archive…"
              : creating
                ? "Create archive →"
                : "Enter your cinema →"}
          </button>
        </form>
        {!creating && (
          <button className="code-signin" onClick={() => setDevice(true)}>
            Sign in with another device →
          </button>
        )}
        <button
          className="text-button"
          onClick={() => {
            setCreating(!creating);
            setEmail(creating ? "demo@example.test" : "");
            setError("");
          }}
        >
          {creating
            ? "Already have an archive? Sign in"
            : "New here? Create your archive"}
        </button>
        <a className="login-more-info" href={appUrl("/about")}>
          Discover MyPremierePlus · More information →
        </a>
        <aside className="demo-note">
          Local demo · Fictional content
          <br />
          Owner: demo@example.test · Viewer: viewer@example.test
          <br />
          Second archive: other@example.test
          <br />
          Third archive: third@example.test
          <br />
          Three viewing profiles in each archive.
          <br />
          Password for each: premiere-demo
        </aside>
        <footer className="login-legal">
          <a href={appUrl("/legal/privacy")}>Privacy</a>
          <a href={appUrl("/legal/terms")}>Terms</a>
          <a href={appUrl("/legal/cookies")}>Cookies</a>
          <a href={appUrl("/legal/legal-notice")}>Legal information</a>
          <a href={appUrl("/legal/billing")}>Pricing terms</a>
        </footer>
        <StudioAttribution />
      </section>
    </main>
  );
}
function Application() {
  const [session, setSession] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0),
    [route, setRoute] = useState(
      appPathname(location.pathname).startsWith("/admin") ? "admin" : "viewer",
    ),
    [moment, setMoment] = useState<any>(null),
    [error, setError] = useState(""),
    [returnRoute, setReturnRoute] = useState(""),
    [ownershipDone, setOwnershipDone] = useState(false),
    [clip, setClip] = useState<any>(null),
    [storageNotice, setStorageNotice] = useState("");
  const pathname = appPathname(location.pathname).replace(/\/+$/, "") || "/";
  const publicPage = pathname === "/about";
  const legalSlug = pathname.match(/^\/legal\/([^/]+)\/?$/)?.[1];
  const activate = pathname === "/activate";
  const guest = pathname.match(/^\/contribute\/([^/]+)$/);
  const invite =
    new URLSearchParams(location.search).get("invitation") ??
    pathname.match(/^\/invite\/([^/]+)$/)?.[1];
  const ownership = new URLSearchParams(location.search).get("ownership");
  const [invitationDone, setInvitationDone] = useState(false);
  async function load() {
    setLoading(true);
    try {
      const s = await api("session");
      setBrand(s.tenant);
      scopeStorage(s.tenant.id, s.account.id);
      try {
        const progress = await api("progress");
        for (const p of progress)
          setStored(progressKey(p.profileId, p.videoId), {
            profileId: p.profileId,
            videoId: p.videoId,
            seconds: p.position,
            durationSeconds: p.duration,
            updatedAt: p.updatedAt,
            completed: p.position >= p.duration * 0.94,
          });
      } catch {}
      setSession(s);
      if (s.account.role === "viewer" && route === "admin") setRoute("viewer");
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!guest && !publicPage && !legalSlug) void load();
    else setLoading(false);
  }, []);
  useEffect(() => {
    const navigate = (e: Event) => {
      setRoute((e as CustomEvent).detail);
    };
    const openClip = (e: Event) => {
      setClip((e as CustomEvent).detail);
      setVersion((v) => v + 1);
      setRoute("clip");
    };
    const save = (e: Event) => setMoment((e as CustomEvent).detail);
    const storageError = (e: Event) =>
      setStorageNotice(String((e as CustomEvent).detail));
    const play = (e: Event) => {
      const d = (e as CustomEvent).detail;
      history.replaceState(
        null,
        "",
        appUrl(`/?screen=player&video=${encodeURIComponent(d.videoId)}`),
      );
      setReturnRoute(d.returnRoute ?? "tv");
      setVersion((v) => v + 1);
      setRoute("viewer");
    };
    window.addEventListener("mpp:clip", openClip);
    window.addEventListener("mpp:play", play);
    window.addEventListener("mpp:navigate", navigate);
    window.addEventListener("mpp:moment", save);
    window.addEventListener("mpp:storage-error", storageError);
    return () => {
      window.removeEventListener("mpp:clip", openClip);
      window.removeEventListener("mpp:play", play);
      window.removeEventListener("mpp:navigate", navigate);
      window.removeEventListener("mpp:moment", save);
      window.removeEventListener("mpp:storage-error", storageError);
    };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [route, version]);
  useEffect(() => {
    if (!storageNotice) return;
    const id = setTimeout(() => setStorageNotice(""), 6000);
    return () => clearTimeout(id);
  }, [storageNotice]);
  async function logout() {
    await api("logout", json("POST"));
    setSession(null);
    setRoute("viewer");
    history.replaceState(null, "", appUrl("/"));
  }
  if (publicPage || legalSlug)
    return (
      <Suspense
        fallback={
          <main className="opening-screen">Opening MyPremierePlus…</main>
        }
      >
        {publicPage ? <PublicInfo /> : <LegalPage slug={legalSlug!} />}
      </Suspense>
    );
  if (guest) return <GuestUpload token={guest[1]} />;
  if (invite && !invitationDone)
    return (
      <main className="invite-page">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const b = Object.fromEntries(new FormData(e.currentTarget));
              await api(
                "accept-invitation",
                json("POST", { ...b, token: invite }),
              );
              setInvitationDone(true);
              await load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <h1>You’re invited.</h1>
          <p>
            Create your password, or use your existing password for the invited
            email.
          </p>
          <label>
            Your name
            <input name="name" required />
          </label>
          <label>
            Password
            <input name="password" type="password" minLength={10} required />
          </label>
          <button className="gold-button">Join archive</button>
          <p role="alert">{error}</p>
        </form>
      </main>
    );
  if (loading)
    return (
      <main className="opening-screen">
        <img src={appUrl("/icon.svg")} alt="" />
        <h1>Opening your cinema…</h1>
      </main>
    );
  if (!session) return <Login onLogin={load} />;
  if (activate) return <ActivateDevice session={session} />;
  if (ownership && !ownershipDone)
    return (
      <main className="invite-page">
        <section className="moment-dialog">
          <h1>Accept archive ownership</h1>
          <p>
            You are signed in as {session.account.email}. Only the intended
            archive member can accept this transfer.
          </p>
          <button
            className="gold-button"
            onClick={async () => {
              try {
                await api(
                  "ownership/accept",
                  json("POST", { token: ownership }),
                );
                setOwnershipDone(true);
                await load();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Accept ownership
          </button>
          <p role="alert">{error}</p>
        </section>
      </main>
    );
  function navigate(next: string) {
    if (next === "viewer") next = "home";
    if (next.startsWith("profile:")) {
      setStored("profile-id", next.slice(8));
      next = "home";
    }
    if (
      ["home", "search", "collections", "library", "profiles"].includes(next)
    ) {
      history.replaceState(null, "", appUrl(`/?screen=${next}`));
      setVersion((v) => v + 1);
      setRoute("viewer");
    } else {
      setRoute(next);
      history.replaceState(null, "", appUrl(next === "admin" ? "/admin" : "/"));
    }
  }
  const refreshSession = async () => {
    const s = await api("session");
    setSession(s);
    setBrand(s.tenant);
    setVersion((v) => v + 1);
  };
  return (
    <>
      <Suspense
        fallback={
          <main className="opening-screen">Opening archive management…</main>
        }
      >
        {route === "admin" ? (
          <Admin
            session={session}
            onExit={() => {
              navigate("home");
              void refreshSession();
            }}
            onLogout={logout}
          />
        ) : (
          <>
            <header className="cinema-header">
              <button
                className="cinema-brand"
                aria-label="Cinema home"
                onClick={() => navigate("home")}
              >
                <img src={appUrl("/icon.svg")} alt="" />
                <span>{brand.name}</span>
              </button>
              <div className="cinema-header-actions">
                {returnRoute && (
                  <button
                    className="cinema-return"
                    onClick={() => {
                      navigate(returnRoute);
                      setReturnRoute("");
                    }}
                  >
                    ← Return to Family TV
                  </button>
                )}
                <span className="cinema-private">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <rect x="6" y="10" width="12" height="10" rx="2" />
                    <path d="M9 10V7a3 3 0 0 1 6 0v3" />
                  </svg>
                  {session.gathering ? "Gathering mode" : "Private cinema"}
                </span>
                {session.account.role !== "viewer" && (
                  <button
                    className="cinema-header-icon"
                    aria-label="Manage archive"
                    title="Manage archive"
                    onClick={() => navigate("admin")}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <path d="m10 3-1 3-3 1-2 4 2 2v4l4 3 3-1 3 1 4-3v-4l2-2-2-4-3-1-1-3z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                )}
                <button
                  className="cinema-header-icon cinema-account"
                  aria-label="Your account and billing"
                  title="Your account and billing"
                  onClick={() => navigate("account")}
                >
                  {session.account.name
                    ?.split(" ")
                    .map((s: string) => s[0])
                    .join("")
                    .slice(0, 2)}
                </button>
              </div>
            </header>
            {route === "viewer" ? (
              <Viewer key={version} />
            ) : (
              <>
                <CinemaSidebar route={route} navigate={navigate} />
                {route === "account" ? (
                  <Account
                    session={session}
                    onNavigate={navigate}
                    onLogout={logout}
                    onRefresh={refreshSession}
                  />
                ) : (
                  <FeatureHub
                    key={`${route}:${version}`}
                    route={route}
                    session={session}
                    initialPlay={route === "clip" ? clip : undefined}
                    onNavigate={navigate}
                  />
                )}
              </>
            )}
          </>
        )}
      </Suspense>
      {storageNotice && (
        <div className="cinema-storage-notice" role="status">
          {storageNotice}
        </div>
      )}
      {moment && (
        <MomentEditor initial={moment} onClose={() => setMoment(null)} />
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
