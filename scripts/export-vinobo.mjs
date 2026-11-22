import { cp, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const app = fileURLToPath(new URL("../vinobo/", import.meta.url));
const exported = join(app, "out");
// Only replace the generated Next build. Keep the source and its public assets.
await rm(join(app, "_next"), { recursive: true, force: true });
for (const item of await readdir(exported)) {
  await cp(join(exported, item), join(app, item), { recursive: true });
}
