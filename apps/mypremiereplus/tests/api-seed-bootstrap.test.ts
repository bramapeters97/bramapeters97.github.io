import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { Store } from "../server/store.js";
import { populateFictionalDataset } from "../server/fixture.js";
import { ensureWorkingDemoDatabase } from "../server/demo-database.js";

test("copying the seed never overwrites an existing editable working file", () => {
  const directory = mkdtempSync(join(tmpdir(), "mypremiereplus-bootstrap-"));
  try {
    const working = join(directory, "working.db"),
      seed = join(directory, "seed.db");
    writeFileSync(seed, "fresh seed");
    writeFileSync(working, "existing customer data");
    assert.equal(ensureWorkingDemoDatabase(working, seed), "existing");
    assert.equal(readFileSync(working, "utf8"), "existing customer data");
    const missing = join(directory, "fresh", "working.db");
    assert.equal(ensureWorkingDemoDatabase(missing, seed), "copied");
    assert.equal(readFileSync(missing, "utf8"), "fresh seed");
    writeFileSync(seed, "a different future seed");
    assert.equal(ensureWorkingDemoDatabase(missing, seed), "existing");
    assert.equal(readFileSync(missing, "utf8"), "fresh seed");
    assert.equal(
      ensureWorkingDemoDatabase(
        join(directory, "no-seed.db"),
        join(directory, "absent.db"),
      ),
      "fresh",
    );
    assert.equal(existsSync(join(directory, "no-seed.db")), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a fresh default demo copies its pristine seed and works through authenticated APIs", () => {
  const directory = mkdtempSync(join(tmpdir(), "mypremiereplus-default-seed-"));
  const demoDirectory = join(directory, "demo-data");
  mkdirSync(demoDirectory);
  const seedPath = join(demoDirectory, "seed.db");
  const store = new Store(join(directory, "runtime-build"), seedPath);
  store.seed();
  populateFictionalDataset(store);
  const identity = store.tenant("demo");
  store.saveTenant("demo", { ...identity, name: "Pristine seeded cinema" });
  store.db.exec("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;");
  store.close();
  const originalSeed = readFileSync(seedPath);
  const root = fileURLToPath(new URL("../", import.meta.url));
  const loader = pathToFileURL(
    resolve(root, "node_modules", "tsx", "dist", "loader.mjs"),
  ).href;
  const appModule = pathToFileURL(resolve(root, "server", "app.ts")).href;
  const script = `
    import {createApplication} from ${JSON.stringify(appModule)};
    import {once} from 'node:events';
    import {existsSync} from 'node:fs';
    const app=createApplication();
    app.server.listen(0,'127.0.0.1');
    await once(app.server,'listening');
    const base='http://127.0.0.1:'+app.server.address().port;
    const directory=await(await fetch(base+'/api/demo/accounts')).json();
    const login=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'demo@example.test',password:'premiere-demo'})});
    const cookie=login.headers.get('set-cookie').split(';')[0];
    const data=await(await fetch(base+'/api/bootstrap',{headers:{cookie}})).json();
    const result={copied:existsSync('demo-data/mypremiereplus.db'),accounts:directory.accounts.length,profiles:data.profiles.length,videos:data.videos.length,stories:data.stories.length,channels:data.channels.length,role:data.account.role,name:data.tenant.name};
    await new Promise(r=>app.server.close(r));
    app.store.saveTenant('demo',{...app.store.tenant('demo'),name:'Existing working cinema'});
    app.store.db.prepare('DELETE FROM channels WHERE tenant_id=? AND id=?').run('demo','demo-channel-summers');
    app.store.db.prepare('DELETE FROM profiles WHERE tenant_id=? AND id=?').run('demo','demo-profile-3');
    app.store.close();
    const reopened=createApplication();
    result.reopenedName=reopened.store.tenant('demo').name;
    result.reopenedChannels=reopened.store.list('demo','channels').length;
    result.reopenedProfiles=reopened.store.list('demo','profiles').length;
    reopened.store.close();
    console.log(JSON.stringify(result));
  `;
  const environment = { ...process.env, DEMO_MODE: "true" };
  delete environment.DB_PATH;
  delete environment.DATA_DIRECTORY;
  try {
    const result = spawnSync(
      process.execPath,
      ["--import", loader, "--input-type=module", "--eval", script],
      { cwd: directory, env: environment, encoding: "utf8", timeout: 30000 },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout.trim()), {
      copied: true,
      accounts: 4,
      profiles: 3,
      videos: 8,
      stories: 1,
      channels: 3,
      role: "owner",
      name: "Pristine seeded cinema",
      reopenedName: "Existing working cinema",
      reopenedChannels: 2,
      reopenedProfiles: 2,
    });
    assert.deepEqual(readFileSync(seedPath), originalSeed);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("custom database paths and configured production do not import the bundled demo seed", () => {
  const directory = mkdtempSync(join(tmpdir(), "mypremiereplus-custom-seed-"));
  mkdirSync(join(directory, "demo-data"));
  writeFileSync(
    join(directory, "demo-data", "seed.db"),
    "a sentinel that is deliberately not SQLite",
  );
  const root = fileURLToPath(new URL("../", import.meta.url));
  const loader = pathToFileURL(
    resolve(root, "node_modules", "tsx", "dist", "loader.mjs"),
  ).href;
  const appModule = pathToFileURL(resolve(root, "server", "app.ts")).href;
  const script = `import {createApplication} from ${JSON.stringify(appModule)};import {existsSync} from 'node:fs';const custom=createApplication({directory:'custom-runtime',databasePath:'custom.sqlite',demo:true});const customAccounts=custom.store.db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n;custom.store.close();const production=createApplication({directory:'production-runtime',databasePath:'production.sqlite',demo:false});const productionAccounts=production.store.db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n;production.store.close();console.log(JSON.stringify({customAccounts,productionAccounts,defaultCreated:existsSync('demo-data/mypremiereplus.db')}));`;
  const environment = { ...process.env, DEMO_MODE: "true" };
  delete environment.DB_PATH;
  delete environment.DATA_DIRECTORY;
  try {
    const result = spawnSync(
      process.execPath,
      ["--import", loader, "--input-type=module", "--eval", script],
      { cwd: directory, env: environment, encoding: "utf8", timeout: 30000 },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout.trim()), {
      customAccounts: 4,
      productionAccounts: 0,
      defaultCreated: false,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
