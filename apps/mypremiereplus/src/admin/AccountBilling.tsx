import { apiUrl } from "../paths";

import { useEffect, useState } from "react";
import { api, type Item } from "./api";
import { Empty, Field, Modal } from "./Controls";
import Icon from "./Icon";

const money = (value: number, currency = "EUR") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    value,
  );
const date = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

export default function AccountBilling({
  refresh,
  report,
  notify,
}: {
  refresh: () => Promise<void>;
  report: (e: unknown) => void;
  notify: (value: string) => void;
}) {
  const [account, setAccount] = useState<Item | null>(null);
  const [billing, setBilling] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState<Item>({
    id: "billing",
    billingName: "",
    address: { line1: "", line2: "", postalCode: "", city: "", country: "NL" },
    vat: "",
    cadence: "monthly",
  });
  const [selectedInvoice, setSelectedInvoice] = useState<Item | null>(null);
  const [error, setError] = useState("");
  async function load() {
    try {
      const [identity, subscription] = await Promise.all([
        api("/account"),
        api("/billing"),
      ]);
      setAccount(identity.account);
      setBilling(subscription);
      setDetails({
        id: "billing",
        billingName: subscription.billingName || identity.account.name,
        address: {
          line1: "",
          line2: "",
          postalCode: "",
          city: "",
          country: "NL",
          ...subscription.address,
        },
        vat: subscription.vat || "",
        cadence: subscription.plan.cadence || "monthly",
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setBusy(true);
    try {
      const result = await api(
        "/account",
        { name: account.name, email: account.email },
        "PATCH",
      );
      setAccount(result.account);
      await refresh();
      notify("Your account details have been saved.");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function saveBilling(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(
        "/billing",
        { ...details, address: { ...details.address } },
        "PATCH",
      );
      await load();
      notify("Demo billing preferences saved. No payment has been taken.");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  function address(key: string, value: string) {
    setDetails((old) => ({
      ...old,
      address: { ...old.address, [key]: value },
    }));
  }
  async function downloadInvoice(invoice: Item) {
    setBusy(true);
    try {
      const response = await fetch(apiUrl(`billing/invoices/${invoice.id}`), {
        credentials: "same-origin",
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "The invoice could not be downloaded.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.number || "demo-invoice"}.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify(
        "Demo invoice downloaded. This is a sample billing record, not evidence of payment.",
      );
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  if (!account || !billing)
    return (
      <Empty title={error ? "Account unavailable" : "Opening your account…"}>
        <p>{error}</p>
        {error && <button onClick={() => void load()}>Try again</button>}
      </Empty>
    );
  const plan = billing.plan || {};
  return (
    <>
      <div className="adm-page-heading">
        <div>
          <span className="adm-eyebrow">YOUR MEMBERSHIP</span>
          <h1>Account & billing</h1>
          <p>A home for your details and your family cinema plan.</p>
        </div>
        <span className="adm-demo-label">DEMO BILLING · NO REAL CHARGES</span>
      </div>
      <section className="adm-membership-hero">
        <div>
          <span className="adm-membership-symbol">
            <Icon name="cinema" size={44} />
          </span>
          <div>
            <span className="adm-eyebrow">MYPREMIEREPLUS</span>
            <h2>{plan.name || "Family Cinema"}</h2>
            <p>Your family's stories, beautifully together.</p>
          </div>
        </div>
        <div className="adm-plan-price">
          <strong>
            {money(
              Number(plan.monthlyPrice || plan.price || 14.99),
              plan.currency || "EUR",
            )}
          </strong>
          <span>per month</span>
          <small>
            {plan.cadence === "annual"
              ? `${money(Number(plan.amount || 179.88))} billed annually`
              : "Monthly plan"}{" "}
            · Demo subscription
          </small>
        </div>
      </section>
      <div className="adm-two-column adm-account-columns">
        <section className="adm-panel">
          <h2>
            <Icon name="family" />
            Your account
          </h2>
          <p className="adm-note">
            These are your sign-in details. Viewing profiles are managed
            separately in Family & access.
          </p>
          <form onSubmit={saveAccount}>
            <Field label="Your name">
              <input
                required
                value={account.name || ""}
                autoComplete="name"
                maxLength={100}
                onChange={(e) =>
                  setAccount((old) => ({ ...old!, name: e.target.value }))
                }
              />
            </Field>
            <Field label="Email address">
              <input
                required
                type="email"
                autoComplete="email"
                value={account.email || ""}
                onChange={(e) =>
                  setAccount((old) => ({ ...old!, email: e.target.value }))
                }
              />
            </Field>
            <div className="adm-account-role">
              <span>Archive role</span>
              <strong>{account.role}</strong>
            </div>
            <button className="adm-gold" disabled={busy} type="submit">
              Save account details
            </button>
          </form>
          <div className="adm-account-security-note">
            <Icon name="lock" size={18} />
            <p>
              This local demo uses demonstration accounts. Production identity,
              email verification and password recovery require a configured
              sign-in provider.
            </p>
          </div>
        </section>
        <section className="adm-panel">
          <h2>
            <Icon name="storage" />
            Your subscription
          </h2>
          <div className="adm-subscription-facts">
            <div>
              <span>Plan</span>
              <strong>{plan.name || "Family Cinema"}</strong>
            </div>
            <div>
              <span>Status</span>
              <span className="adm-status">
                <i />
                Demo active
              </span>
            </div>
            <div>
              <span>Billing frequency</span>
              <strong>
                {plan.cadence === "annual" ? "Annual" : "Monthly"}
              </strong>
            </div>
            <div>
              <span>Next sample billing date</span>
              <strong>{date(plan.nextBillingAt)}</strong>
            </div>
            <div>
              <span>Amount per billing period</span>
              <strong>
                {money(Number(plan.amount || 14.99), plan.currency || "EUR")}
              </strong>
            </div>
          </div>
          <p className="adm-note">
            {billing.message ||
              plan.message ||
              "This is a local demonstration. No card is charged and no payment is sent."}
          </p>
          <div className="adm-payment-card">
            <Icon name="lock" size={22} />
            <div>
              <strong>
                {billing.paymentMethod?.label || "No live payment method"}
              </strong>
              <small>
                {billing.paymentMethod?.last4
                  ? `•••• ${billing.paymentMethod.last4} · Fictional card details`
                  : "Live payments require a configured billing provider."}
              </small>
            </div>
          </div>
        </section>
        {billing.canManage && (
          <section className="adm-panel">
            <h2>Billing details</h2>
            <p className="adm-note">
              Saved for this archive's demo subscription. Account sign-in
              details are unchanged.
            </p>
            <form onSubmit={saveBilling}>
              <Field label="Billing name">
                <input
                  required
                  autoComplete="organization"
                  value={details.billingName}
                  onChange={(e) =>
                    setDetails((old) => ({
                      ...old,
                      billingName: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Address line 1">
                <input
                  autoComplete="address-line1"
                  value={details.address.line1}
                  onChange={(e) => address("line1", e.target.value)}
                />
              </Field>
              <Field label="Address line 2">
                <input
                  autoComplete="address-line2"
                  value={details.address.line2}
                  onChange={(e) => address("line2", e.target.value)}
                />
              </Field>
              <div className="adm-pair">
                <Field label="Postal code">
                  <input
                    autoComplete="postal-code"
                    value={details.address.postalCode}
                    onChange={(e) => address("postalCode", e.target.value)}
                  />
                </Field>
                <Field label="City">
                  <input
                    autoComplete="address-level2"
                    value={details.address.city}
                    onChange={(e) => address("city", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Country">
                <select
                  autoComplete="country"
                  value={details.address.country}
                  onChange={(e) => address("country", e.target.value)}
                >
                  {[
                    ["NL", "Netherlands"],
                    ["BE", "Belgium"],
                    ["DE", "Germany"],
                    ["FR", "France"],
                    ["GB", "United Kingdom"],
                    ["IE", "Ireland"],
                    ["ES", "Spain"],
                    ["IT", "Italy"],
                    ["PT", "Portugal"],
                    ["AT", "Austria"],
                    ["CH", "Switzerland"],
                    ["US", "United States"],
                    ["CA", "Canada"],
                    ["AU", "Australia"],
                  ].map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="VAT number (optional)">
                <input
                  value={details.vat}
                  onChange={(e) =>
                    setDetails((old) => ({ ...old, vat: e.target.value }))
                  }
                />
              </Field>
              <Field label="Billing frequency">
                <select
                  value={details.cadence}
                  onChange={(e) =>
                    setDetails((old) => ({ ...old, cadence: e.target.value }))
                  }
                >
                  <option value="monthly">Monthly · €14.99 per month</option>
                  <option value="annual">Annual · €179.88 per year</option>
                </select>
              </Field>
              <button className="adm-gold" type="submit" disabled={busy}>
                Save demo billing details
              </button>
            </form>
          </section>
        )}
        {billing.canManage ? (
          <section className="adm-panel">
            <h2>
              <Icon name="list" />
              Invoices
            </h2>
            <p className="adm-note">
              Sample invoices for this archive only. They are not tax invoices
              or proof of a completed payment.
            </p>
            <div className="adm-invoice-list">
              {(billing.invoices || []).map((invoice: Item) => (
                <article key={invoice.id}>
                  <div>
                    <button
                      className="adm-invoice-title"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      {invoice.number}
                    </button>
                    <small>
                      {date(invoice.date)} ·{" "}
                      {invoice.description || "Family Cinema subscription"}
                    </small>
                  </div>
                  <strong>
                    {money(
                      Number(invoice.total || 0),
                      invoice.currency || "EUR",
                    )}
                  </strong>
                  <button
                    aria-label={`Download demo invoice ${invoice.number}`}
                    disabled={busy}
                    onClick={() => void downloadInvoice(invoice)}
                  >
                    <Icon name="upload" size={17} />
                    <span>Download</span>
                  </button>
                </article>
              ))}
            </div>
            {!billing.invoices?.length && (
              <Empty title="Your invoices will appear here">
                <p>No demo billing records are available.</p>
              </Empty>
            )}
          </section>
        ) : (
          <section className="adm-panel">
            <h2>Private billing information</h2>
            <p>
              The archive owner manages billing details and invoices. Your own
              account remains yours to manage.
            </p>
          </section>
        )}
      </div>
      {selectedInvoice && (
        <Modal
          title={`Demo invoice ${selectedInvoice.number}`}
          close={() => setSelectedInvoice(null)}
        >
          <span className="adm-demo-label">SAMPLE · NO PAYMENT RECEIVED</span>
          <div className="adm-invoice-preview">
            <p>
              <strong>{billing.billingName}</strong>
            </p>
            <p>{date(selectedInvoice.date)}</p>
            <hr />
            <p>{selectedInvoice.description || "Family Cinema subscription"}</p>
            <div className="adm-invoice-total">
              <strong>Total</strong>
              <strong>
                {money(
                  Number(selectedInvoice.total || 0),
                  selectedInvoice.currency || "EUR",
                )}
              </strong>
            </div>
            <p className="adm-note">
              This fictional invoice demonstrates the local billing interface.
              Live invoicing and payments require a configured provider.
            </p>
            <button
              className="adm-gold"
              disabled={busy}
              onClick={() => void downloadInvoice(selectedInvoice)}
            >
              Download sample invoice
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
