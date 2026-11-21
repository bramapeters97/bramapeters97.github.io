import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Store, hashPassword, now, id, type Data } from "../server/store.js";
import { populateFictionalDataset } from "../server/fixture.js";
import { DEMO_PASSWORD } from "../server/demo.js";
import { ensureWorkingDemoDatabase } from "../server/demo-database.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "demo-data");
mkdirSync(output, { recursive: true });
const databaseState = ensureWorkingDemoDatabase(
  resolve(output, "mypremiereplus.db"),
  resolve(output, "seed.db"),
);
const store = new Store(
  resolve(root, ".local"),
  resolve(output, "mypremiereplus.db"),
);
if (databaseState !== "existing") store.seed();
if (databaseState === "fresh") populateFictionalDataset(store);
const args = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
try {
  if (args[0] === "add-account") {
    const email = (option("email") ?? "").trim().toLowerCase();
    const name = option("name") ?? "Fictional account";
    const tenantId = option("archive");
    const role = option("role") ?? "viewer";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error(
        "Use --email with a fictional address such as taylor@example.test.",
      );
    if (!["viewer", "editor"].includes(role))
      throw new Error(
        "Choose --role viewer or editor. Ownership has a separate authenticated workflow.",
      );
    if (
      tenantId &&
      !store.db.prepare("SELECT id FROM tenants WHERE id=?").get(tenantId)
    )
      throw new Error(
        "The --archive must identify an existing archive, such as demo, other or third.",
      );
    let account = store.db
      .prepare("SELECT id FROM accounts WHERE email=?")
      .get(email) as Data | undefined;
    if (!account) {
      account = { id: id() };
      store.db
        .prepare("INSERT INTO accounts VALUES(?,?,?,?,?)")
        .run(
          account.id,
          email,
          name,
          hashPassword(process.env.DEMO_ACCOUNT_PASSWORD ?? DEMO_PASSWORD),
          now(),
        );
    }
    if (tenantId)
      store.db
        .prepare("INSERT OR IGNORE INTO memberships VALUES(?,?,?)")
        .run(tenantId, account.id, role);
    console.log(
      `Fictional account ${email} is available in the local demo directory${tenantId ? ` and linked to archive ${tenantId}` : "; add a membership to enable sign-in"}.`,
    );
  }
  if (args.includes("--clean-runtime")) {
    // Explicit packaging operation for this known fictional fixture only; normal setup
    // never deletes records or overwrites edits. Stop its API server before using this.
    // Acquire the journal-mode change before removing sessions: another open API
    // connection makes this fail without logging out an actively used demo browser.
    store.db.exec("PRAGMA journal_mode=DELETE;");
    store.db.exec(
      "DELETE FROM sessions; DELETE FROM device_codes; DELETE FROM devices; DELETE FROM tokens; DELETE FROM records WHERE resource='history';",
    );
    console.log(
      "Removed fictional runtime sessions, tokens and audit history for packaging.",
    );
  }
  if (args.includes("--clean-runtime")) {
    store.db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
    store.db.exec("PRAGMA journal_mode=DELETE;");
  } else store.db.exec("PRAGMA wal_checkpoint(PASSIVE);");
  console.log(
    "The editable demo database is ready; existing records were preserved. Distributable seed metadata is generated separately with scripts/build-seed.ts.",
  );
} finally {
  store.close();
}
