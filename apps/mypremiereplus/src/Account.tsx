import { appUrl, canonicalApiUrls } from "./paths";
import { useEffect, useState } from "react";
import { api, json } from "./api";
import { artworkUrl } from "./artwork";
import { DevicePanel } from "./DeviceLogin";
import StudioAttribution from "./StudioAttribution";
type Props = {
  session: any;
  onNavigate: (route: string) => void;
  onLogout: () => void;
  onRefresh: () => Promise<void>;
};
const price = (amount = 14.99) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
    amount,
  );
export default function Account({
  session,
  onNavigate,
  onLogout,
  onRefresh,
}: Props) {
  const [account, setAccount] = useState<any>(null),
    [billing, setBilling] = useState<any>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("account");
  useEffect(() => {
    void Promise.all([api("account"), api("billing")])
      .then(([a, b]) => {
        setAccount(a);
        setBilling(b);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function save(e: React.FormEvent<HTMLFormElement>, kind: string) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (kind === "account") {
        const result = await api("account", json("PATCH", f));
        setAccount((a: any) => ({ ...a, account: result.account ?? result }));
        await onRefresh();
      } else {
        const result = await api(
          "billing",
          json("PATCH", {
            billingName: f.billingName,
            vat: f.vat,
            cadence: f.cadence,
            address: {
              line1: f.line1,
              line2: f.line2,
              city: f.city,
              postalCode: f.postalCode,
              country: f.country,
            },
          }),
        );
        setBilling(result);
      }
      setNotice(
        kind === "account"
          ? "Your account details have been saved."
          : "Demo billing details saved. No payment was taken.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function invoice(id: string) {
    try {
      const result = await api(`billing/invoices/${id}`);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(canonicalApiUrls(result), null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `mypremiereplus-demo-invoice-${id}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main className="feature-app account-screen">
      <p className="eyebrow">YOUR PLACE IN THE CINEMA</p>
      <h1>Your account</h1>
      <p>A few details. A cinema that feels like home.</p>
      <div className="feature-tabs">
        {[
          ["account", "Account"],
          ["profiles", "Viewing profiles"],
          ["plan", "Plan & billing"],
          ["devices", "Devices"],
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
      {error && (
        <p className="error-text feature-status" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="feature-status" role="status">
          {notice}
        </p>
      )}
      {!account || !billing ? (
        <p role="status">Opening your account…</p>
      ) : (
        <>
          {tab === "devices" && <DevicePanel />}
          {tab === "account" && (
            <div className="feature-two">
              <form
                className="feature-panel feature-stack"
                onSubmit={(e) => void save(e, "account")}
              >
                <div className="account-heading">
                  <span className="account-avatar">
                    {account.account.name
                      ?.split(" ")
                      .map((s: string) => s[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <div>
                    <h2>{account.account.name}</h2>
                    <span className="feature-tag">
                      {account.account.role === "owner"
                        ? "ARCHIVE OWNER"
                        : account.account.role.toUpperCase()}
                    </span>
                  </div>
                </div>
                <label>
                  Your name
                  <input
                    name="name"
                    required
                    maxLength={100}
                    defaultValue={account.account.name}
                  />
                </label>
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={account.account.email}
                  />
                </label>
                <button className="gold-button" disabled={busy}>
                  {busy ? "Saving…" : "Save account details"}
                </button>
                <p className="feature-notice">
                  This is a local demonstration account. Account permissions are
                  independent from your viewing profile.
                </p>
              </form>
              <aside className="feature-stack">
                <div className="feature-panel">
                  <p className="eyebrow">{session.tenant.name}</p>
                  <h2>Your home cinema</h2>
                  <p>
                    Everything your family wants to watch, in one private place.
                  </p>
                  <div className="account-shortcuts">
                    <button onClick={() => onNavigate("home")}>
                      ⌂ <span>Back to cinema</span> →
                    </button>
                    <button onClick={() => onNavigate("memories")}>
                      ✦ <span>Moments & years</span> →
                    </button>
                    <button onClick={() => onNavigate("tonight")}>
                      ▷ <span>Tonight’s programme</span> →
                    </button>
                    <button onClick={() => onNavigate("tv")}>
                      ▣ <span>Family TV</span> →
                    </button>
                    {session.account.role !== "viewer" && (
                      <button onClick={() => onNavigate("admin")}>
                        ⚙ <span>Manage your archive</span> →
                      </button>
                    )}
                  </div>
                </div>
                <div className="feature-panel">
                  <h2>Watching together?</h2>
                  <p>
                    Gathering Mode shows only films your archive team has
                    approved for company.
                  </p>
                  <button
                    aria-pressed={session.gathering}
                    onClick={async () => {
                      try {
                        await api(
                          "gathering",
                          json("POST", { enabled: !session.gathering }),
                        );
                        await onRefresh();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    {session.gathering
                      ? "Turn off Gathering Mode"
                      : "Turn on Gathering Mode"}
                  </button>
                </div>
                <button onClick={onLogout}>Sign out of this account</button>
              </aside>
            </div>
          )}
          {tab === "profiles" && (
            <>
              <p>
                Each profile has its own Continue Watching list. Profiles share
                your account’s access permissions.
              </p>
              <div className="profile-account-grid">
                {account.profiles.map((p: any) => (
                  <button
                    className="profile-account-card"
                    key={p.id}
                    onClick={() => onNavigate("profile:" + p.id)}
                  >
                    <span style={{ background: p.color ?? "#1b2d43" }}>
                      {p.avatar ? (
                        <img src={artworkUrl(p.avatar)} alt="" />
                      ) : (
                        p.name[0]
                      )}
                    </span>
                    <strong>{p.name}</strong>
                    <small>Choose a viewing profile →</small>
                  </button>
                ))}
              </div>
              {session.account.role !== "viewer" && (
                <button onClick={() => onNavigate("admin")}>
                  Manage family profiles
                </button>
              )}
            </>
          )}
          {tab === "plan" && (
            <div className="feature-two">
              <div className="feature-stack">
                <section className="feature-panel account-plan">
                  <div className="feature-top">
                    <span className="eyebrow">MY PREMIERE PLUS</span>
                    <span className="feature-tag">DEMO PLAN</span>
                  </div>
                  <h2>{billing.plan.name}</h2>
                  <p className="plan-price">
                    {price(billing.plan.amount ?? billing.plan.price)}
                    <span>
                      {" "}
                      / {billing.plan.cadence === "annual" ? "year" : "month"}
                    </span>
                  </p>
                  <p>A private cinema for all your family memories.</p>
                  <ul>
                    <li>Your personal archive and viewing profiles</li>
                    <li>Films, collections, moments and Family TV</li>
                    <li>Your own name, colours and welcome screen</li>
                  </ul>
                  <p className="feature-notice">
                    Illustrative subscription only. No payment processor is
                    connected and no charge or subscription is created.
                  </p>
                </section>
                {billing.canManage && (
                  <section className="feature-panel">
                    <h2>Sample invoices</h2>
                    <p>
                      These are dummy records for testing your billing
                      experience.
                    </p>
                    <ul className="queue-list">
                      {billing.invoices?.map((i: any) => (
                        <li key={i.id}>
                          <span>
                            {i.number}
                            <br />
                            <small>
                              {i.date} · {price(i.total)}
                            </small>
                          </span>
                          <button onClick={() => void invoice(i.id)}>
                            Download
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
              {billing.canManage ? (
                <form
                  className="feature-panel feature-stack"
                  onSubmit={(e) => void save(e, "billing")}
                >
                  <h2>Billing details</h2>
                  <label>
                    Billing name
                    <input
                      name="billingName"
                      defaultValue={billing.billingName}
                      required
                    />
                  </label>
                  <label>
                    Address
                    <input name="line1" defaultValue={billing.address?.line1} />
                  </label>
                  <label>
                    Address line 2
                    <input name="line2" defaultValue={billing.address?.line2} />
                  </label>
                  <div className="time-fields">
                    <label>
                      Postal code
                      <input
                        name="postalCode"
                        defaultValue={billing.address?.postalCode}
                      />
                    </label>
                    <label>
                      City
                      <input name="city" defaultValue={billing.address?.city} />
                    </label>
                  </div>
                  <label>
                    Country
                    <input
                      name="country"
                      defaultValue={billing.address?.country}
                    />
                  </label>
                  <label>
                    VAT number (optional)
                    <input name="vat" defaultValue={billing.vat} />
                  </label>
                  <label>
                    Demo billing period
                    <select name="cadence" defaultValue={billing.plan.cadence}>
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annually</option>
                    </select>
                  </label>
                  <p>
                    {billing.paymentMethod?.label} · ••••{" "}
                    {billing.paymentMethod?.last4}
                  </p>
                  <button className="gold-button" disabled={busy}>
                    {busy ? "Saving…" : "Save demo billing details"}
                  </button>
                </form>
              ) : (
                <section className="feature-panel">
                  <h2>Your family’s plan</h2>
                  <p>The archive owner manages billing details and invoices.</p>
                </section>
              )}
            </div>
          )}
        </>
      )}
      <footer className="account-legal">
        <a href={appUrl("/legal/privacy")}>Privacy</a>
        <a href={appUrl("/legal/terms")}>Terms</a>
        <a href={appUrl("/legal/cookies")}>Cookies & storage</a>
        <a href={appUrl("/about")}>About MyPremierePlus</a>
      </footer>
      <StudioAttribution />
    </main>
  );
}
