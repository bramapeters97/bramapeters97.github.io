import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

test("the default local demo remains functional when no bundled seed file exists", () => {
  const directory = mkdtempSync(
    join(tmpdir(), "mypremiereplus-seed-fallback-"),
  );
  const root = fileURLToPath(new URL("../", import.meta.url));
  const loader = pathToFileURL(
    resolve(root, "node_modules", "tsx", "dist", "loader.mjs"),
  ).href;
  const appModule = pathToFileURL(resolve(root, "server", "app.ts")).href;
  const script = `import {createApplication} from ${JSON.stringify(appModule)};const app=createApplication();console.log(JSON.stringify({accounts:app.store.db.prepare('SELECT COUNT(*) AS n FROM accounts').get().n,profiles:app.store.list('demo','profiles').length,stories:app.store.list('demo','stories').length,premieres:app.store.list('demo','premieres').length,providers:app.store.list('demo','providerConfigs').length}));app.store.close();`;
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
      accounts: 4,
      profiles: 3,
      stories: 1,
      premieres: 1,
      providers: 4,
    });
    assert.equal(
      existsSync(join(directory, "demo-data", "mypremiereplus.db")),
      true,
    );
    assert.equal(existsSync(join(directory, "demo-data", "seed.db")), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
