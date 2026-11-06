import { appUrl } from "./paths";
import { useEffect, useRef, useState } from "react";
import { api, json } from "./api";
import StudioAttribution from "./StudioAttribution";
const LegalLinks = ({ minimal: _minimal }: { minimal?: boolean }) => (
  <footer className="login-legal">
    <a href={appUrl("/legal/privacy")}>Privacy</a>
    <a href={appUrl("/legal/terms")}>Terms</a>
    <a href={appUrl("/legal/cookies")}>Cookies</a>
    <a href={appUrl("/legal/legal-notice")}>Legal information</a>
  </footer>
);
const cleanCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
const displayCode = (value = "") =>
  value.length > 4 ? `${value.slice(0, 4)} ${value.slice(4)}` : value;
const message = (e: unknown) => (e as Error).message || "Please try again.";

export function DeviceLogin({
  onSignedIn,
  onBack,
}: {
  onSignedIn: () => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState("phone"),
    [challenge, setChallenge] = useState<any>(null),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [generation, setGeneration] = useState(0),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (tab !== "phone") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let wait = 3000;
    setChallenge(null);
    setError("");
    setStatus("Preparing your sign-in code…");
    void api(
      "device/start",
      json("POST", { deviceName: "Home cinema browser" }),
    )
      .then((result) => {
        if (cancelled) return;
        setChallenge(result);
        setStatus("Waiting for you to approve this screen.");
        wait = (result.interval ?? 3) * 1000;
        const poll = async () => {
          if (cancelled) return;
          if (Date.now() >= Date.parse(result.expiresAt)) {
            setStatus("This code has expired. Generate a new one.");
            return;
          }
          try {
            const r = await api(
              "device/poll",
              json("POST", { deviceCode: result.deviceCode }),
            );
            if (cancelled) return;
            if (r.status === "approved") {
              onSignedIn();
              return;
            }
            if (["expired", "consumed", "denied"].includes(r.status)) {
              setStatus(
                r.status === "expired"
                  ? "This code has expired. Generate a new one."
                  : "This code has already been used. Generate a new one.",
              );
              return;
            }
            if (r.status === "slow_down") wait = Math.min(15000, wait + 1000);
            timer = setTimeout(poll, wait);
          } catch (e) {
            if (!cancelled) {
              if (Date.now() >= Date.parse(result.expiresAt)) {
                setStatus("This code has expired. Generate a new one.");
                return;
              }
              setError(message(e));
              timer = setTimeout(poll, wait);
            }
          }
        };
        timer = setTimeout(poll, wait);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(message(e));
          setStatus("We could not create a sign-in code.");
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tab, generation]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = challenge
    ? Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - now) / 1000))
    : 0;
  return (
    <main className="device-access">
      <a className="product-wordmark" href={appUrl("/")}>
        MyPremierePlus
      </a>
      <section className="device-login-card">
        <img className="device-logo" src={appUrl("/icon.svg")} alt="" />
        <p className="eyebrow">LESS TYPING. MORE CINEMA.</p>
        <h1>Sign in on this screen.</h1>
        <p>Keep your password on your own device.</p>
        <div className="device-tabs">
          <button
            className={tab === "phone" ? "active" : ""}
            onClick={() => setTab("phone")}
          >
            Use your phone
          </button>
          <button
            className={tab === "code" ? "active" : ""}
            onClick={() => setTab("code")}
          >
            Enter a phone code
          </button>
        </div>
        {tab === "phone" ? (
          <>
            <p>On your phone or another signed-in browser, open:</p>
            <a
              className="device-verification-link"
              href={appUrl("/activate")}
              target="_blank"
              rel="noreferrer"
            >
              {location.host}
              {appUrl("/activate")}
            </a>
            <p>Enter this code, check the archive, and approve this screen.</p>
            <output className="device-code" aria-label="Your sign-in code">
              {challenge ? displayCode(challenge.userCode) : "•••• ••••"}
            </output>
            <p className="device-status" role="status">
              {status}
            </p>
            {challenge && seconds > 0 && (
              <small>
                Expires in {Math.floor(seconds / 60)}:
                {String(seconds % 60).padStart(2, "0")} · One use only
              </small>
            )}
            <button
              className="device-secondary"
              onClick={() => setGeneration((g) => g + 1)}
            >
              Get a new code
            </button>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api(
                  "device/redeem",
                  json("POST", { code: cleanCode(code) }),
                );
                onSignedIn();
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              On your signed-in phone, open Account → Devices and choose “Get a
              sign-in code”. Enter that code here.
            </p>
            <label>
              One-time phone code
              <input
                value={displayCode(code)}
                onChange={(e) => setCode(cleanCode(e.target.value))}
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="one-time-code"
                required
                minLength={8}
                maxLength={9}
                placeholder="ABCD EFGH"
              />
            </label>
            <button
              className="gold-button"
              disabled={busy || code.length !== 8}
            >
              {busy ? "Signing in…" : "Sign in with this code →"}
            </button>
          </form>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button className="text-button" onClick={onBack}>
          ← Sign in with email instead
        </button>
        <p className="feature-notice">
          Browser demonstration of big-screen sign-in. This project does not
          include a native Apple TV or Android TV application.
        </p>
      </section>
      <LegalLinks minimal />
      <StudioAttribution />
    </main>
  );
}

export function ActivateDevice({ session }: { session: any }) {
  const [code, setCode] = useState(
      cleanCode(new URLSearchParams(location.search).get("code") ?? ""),
    ),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="device-access">
      <a className="product-wordmark" href={appUrl("/")}>
        MyPremierePlus
      </a>
      <section className="device-login-card">
        <img className="device-logo" src={appUrl("/icon.svg")} alt="" />
        <p className="eyebrow">YOUR CINEMA, ON ANOTHER SCREEN</p>
        <h1>{done ? "You’re connected." : "Approve your screen."}</h1>
        {done ? (
          <>
            <p>
              The other browser can now sign in to {session.tenant.name} as{" "}
              {session.account.name}.
            </p>
            <p>You can close this page and enjoy your cinema.</p>
            <a className="gold-button" href={appUrl("/?screen=home")}>
              Back to your cinema →
            </a>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api(
                  "device/approve",
                  json("POST", { userCode: cleanCode(code) }),
                );
                setDone(true);
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              Type the code displayed on the screen you want to sign in. Approve
              only a screen you recognise and control.
            </p>
            <div className="device-confirmation">
              <span>{session.tenant.name}</span>
              <strong>{session.account.name}</strong>
              <small>
                {session.account.email} · {session.account.role}
              </small>
            </div>
            <label>
              Code displayed on your screen
              <input
                value={displayCode(code)}
                onChange={(e) => setCode(cleanCode(e.target.value))}
                autoCapitalize="characters"
                autoComplete="one-time-code"
                required
                minLength={8}
                maxLength={9}
                placeholder="ABCD EFGH"
              />
            </label>
            <button
              className="gold-button"
              disabled={busy || code.length !== 8}
            >
              {busy ? "Connecting…" : "Approve this screen"}
            </button>
            <a className="text-button" href={appUrl("/")}>
              Cancel
            </a>
          </form>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </section>
      <LegalLinks minimal />
      <StudioAttribution />
    </main>
  );
}

export function DevicePanel() {
  const [devices, setDevices] = useState<any[]>([]),
    [code, setCode] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const refresh = () => {
    void api("devices")
      .then((r) => {
        if (mounted.current) setDevices(r.devices ?? []);
      })
      .catch((e) => {
        if (mounted.current) setError(message(e));
      });
  };
  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <div className="feature-two">
      <section className="feature-panel feature-stack">
        <p className="eyebrow">A PASSWORD-FREE ENTRANCE</p>
        <h2>Sign in on your big screen</h2>
        <p>
          Generate a code here on your phone, then enter it in the other
          browser’s “Enter a phone code” sign-in option.
        </p>
        <button
          className="gold-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              setCode(
                await api(
                  "device/code",
                  json("POST", { deviceName: "My home cinema screen" }),
                ),
              );
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Creating your code…" : "Get a sign-in code"}
        </button>
        {code && (
          <div className="device-issued-code">
            <output className="device-code">{displayCode(code.code)}</output>
            <p>
              One use · Expires {new Date(code.expiresAt).toLocaleTimeString()}
            </p>
            <button
              onClick={() =>
                navigator.clipboard
                  ?.writeText(code.code)
                  .catch(() =>
                    setError(
                      "Copying is unavailable. Type the displayed code instead.",
                    ),
                  )
              }
            >
              Copy code
            </button>
          </div>
        )}
        <p className="feature-notice">
          A code signs another browser in as your account. Share it only with a
          screen you control.
        </p>
        <a href={appUrl("/activate")}>
          Approve a code displayed on another screen →
        </a>
      </section>
      <section className="feature-panel">
        <h2>Your connected screens</h2>
        <p>Revoke a screen to end its access to your account.</p>
        {devices.length ? (
          <ul className="queue-list">
            {devices.map((d) => (
              <li key={d.id}>
                <span>
                  <strong>{d.name ?? d.deviceName ?? "Cinema browser"}</strong>
                  <br />
                  <small>
                    {d.revokedAt
                      ? "Revoked"
                      : d.createdAt
                        ? new Date(d.createdAt).toLocaleString()
                        : "Connected"}
                  </small>
                </span>
                <button
                  disabled={!!d.revokedAt}
                  onClick={async () => {
                    if (!confirm("Sign this screen out?")) return;
                    try {
                      await api(`devices/${d.id}`, json("DELETE"));
                      refresh();
                    } catch (e) {
                      setError(message(e));
                    }
                  }}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="feature-empty">
            Pair a screen with a code and it will appear here.
          </p>
        )}
      </section>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
