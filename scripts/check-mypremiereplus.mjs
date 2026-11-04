// Dependency-free artifact checks; does not rewrite portfolio pages.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const roots = ["mypremiereplus", "assets/mypremiereplus", ...["ios", "ipad", "tvos"].map((p) => `apps/mypremiereplus/${p}`)];
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
const files = ["mypremiereplus.html", ...roots.flatMap(walk)];
const textFiles = files.filter((file) => /\.(?:html|css|js)$/.test(file));
const privatePatterns = [/sourceMappingURL/i, /(?:localhost|127\.0\.0\.1|[A-Z]:[\\/](?!\/)|OneDrive|sk-proj-)/i, /(?:auth\.js|store\.js|\/api\/|\/shared\/)/i, /<input[^>]+type=["'](?:password|file)["']/i];
let references = 0;
function resolveReference(file, ref) {
  if (/^(?:https?:|data:|mailto:|tel:|#)/i.test(ref)) return;
  const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
  if (!clean) return;
  const target = clean.startsWith("/") ? path.join(root, clean.slice(1)) : path.resolve(root, path.dirname(file), clean);
  assert.ok(target.startsWith(root), `${file}: reference escapes repository`);
  assert.ok(fs.existsSync(target), `${file}: missing ${ref}`);
  let relative = path.relative(root, target);
  let cursor = root;
  for (const part of relative.split(path.sep)) { assert.ok(fs.readdirSync(cursor).includes(part), `${file}: filename case mismatch ${ref}`); cursor = path.join(cursor, part); }
  references++;
}
for (const file of files) assert.ok(!/\.(?:map|db|sqlite|env|ts|tsx)$/.test(file), `Unexpected public artifact: ${file}`);
for (const file of textFiles) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const pattern of privatePatterns) assert.ok(!pattern.test(text), `${file}: private/unused implementation reference`);
  if (file.endsWith(".html")) {
    assert.match(text, /name="viewport"/);
    const ids = [...text.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${file}: duplicate IDs`);
    for (const [, reference] of text.matchAll(/\b(?:src|href)="([^"]+)"/g)) resolveReference(file, reference);
  }
  if (file.endsWith(".js")) for (const [, reference] of text.matchAll(/\bfrom\s+["']([^"']+)["']/g)) resolveReference(file, reference);
}
const reference = fs.readFileSync(path.join(root, "lelibrambas-plus.html"), "utf8");
const article = fs.readFileSync(path.join(root, "mypremiereplus.html"), "utf8");
const nav = (html) => html.match(/<header class="project-nav"[\s\S]*?<\/header>/)?.[0];
assert.ok(nav(reference));
assert.equal(nav(article), nav(reference).replace(/ aria-current="page"/g, ""), "Portfolio navbar differs from reference");
assert.doesNotMatch(nav(article), /mypremiereplus/i, "New project unexpectedly added to navbar");
const total = files.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);
console.log(`PASS: ${files.length} public artifacts, ${references} local references with exact casing, matching portfolio navbar, no excluded implementation references.`);
console.log(`Public artifact size: ${(total / 1024 / 1024).toFixed(2)} MiB (including screenshots and local sample).`);
