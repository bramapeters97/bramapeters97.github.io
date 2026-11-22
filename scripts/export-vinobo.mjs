import { cp, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const app = fileURLToPath(new URL("../vinobo/", import.meta.url));
const exported = join(app, "out");
// Cached notebook pages still reference earlier content-hashed bundles.
for (const item of await readdir(exported)) {
  await cp(join(exported, item), join(app, item), { recursive: true });
}
