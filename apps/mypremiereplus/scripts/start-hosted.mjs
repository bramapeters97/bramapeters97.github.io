import { constants, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Copy only the fictional fixture, only for demo mode, and never overwrite data.
const databasePath = resolve(process.env.DB_PATH || "/data/archive.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });
if (process.env.DEMO_MODE !== "false" && !existsSync(databasePath)) {
  try {
    copyFileSync("demo-data/seed.db", databasePath, constants.COPYFILE_EXCL);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}
await import("../server/index.ts");
