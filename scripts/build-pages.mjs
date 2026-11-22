import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = join(root, "dist");
const publicFiles = [
  "ai-plugin.json", "apps", "assets", "favicon.ico", "favicon_portfolio",
  "lelibrambas", "mypremiereplus", "openapi.yaml", "projects", "screenshots",
  "the-gift-chapter", "_redirects", "_routes.json",
];
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".html")) publicFiles.push(entry.name);
  // Include new self-contained portfolio demos without registering each one here.
  if (entry.isDirectory() && !entry.name.startsWith(".")
      && !["dist", "vinobo", "node_modules", ...publicFiles].includes(entry.name)
      && (await stat(join(root, entry.name, "index.html")).catch(() => null))?.isFile()) {
    publicFiles.push(entry.name);
  }
}

await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const file of publicFiles) {
  await cp(join(root, file), join(output, file), {
    recursive: true,
    filter: (path) => {
      const name = relative(root, path).split(/[\\/]/);
      // The original full-resolution film is served by the rule in _redirects.
      return !name.some(part => part.startsWith(".") || part === "node_modules")
        && name.join("/") !== "assets/img/jmeijerbv.mp4";
    },
  });
}
await cp(join(root, "vinobo/out"), join(output, "vinobo"), { recursive: true });
