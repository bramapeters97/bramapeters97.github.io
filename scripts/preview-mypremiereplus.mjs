// Read-only, loopback preview. Run with Node 24; no dependencies or build.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".mp4": "video/mp4", ".woff2": "font/woff2", ".woff": "font/woff", ".webmanifest": "application/manifest+json" };
const port = Number(process.env.PORT || 5184);
const server = http.createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    const allowed = /^\/(?:mypremiereplus(?:\/|\.html|$)|apps\/mypremiereplus\/(?:ios|ipad|tvos)(?:\/|$)|assets\/|favicon_portfolio\/|favicon\.ico$|[^/]+\.html$)/.test(pathname);
    if (!allowed || pathname.split("/").some((part) => part.startsWith(".") || part.includes("\\"))) throw new Error("Not found");
    let target = path.resolve(root, `.${pathname}`);
    if (!target.startsWith(root)) throw new Error("Not found");
    if ((await stat(target)).isDirectory()) {
      if (!pathname.endsWith("/")) { res.writeHead(301, { Location: `${pathname}/` }); res.end(); return; }
      target = path.join(target, "index.html");
    }
    const type = mime[path.extname(target)];
    if (!type) throw new Error("Not found");
    const data = await readFile(target);
    const headers = { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Accept-Ranges": "bytes" };
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
      if (start > end || start >= data.length) { res.writeHead(416, { "Content-Range": `bytes */${data.length}` }); res.end(); return; }
      res.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${data.length}`, "Content-Length": end - start + 1 });
      res.end(req.method === "HEAD" ? undefined : data.subarray(start, end + 1));
    } else { res.writeHead(200, { ...headers, "Content-Length": data.length }); res.end(req.method === "HEAD" ? undefined : data); }
  } catch { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Preview file not found"); }
});
server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(port, "127.0.0.1", () => console.log(`MyPremiere+ local preview: http://127.0.0.1:${server.address().port}/mypremiereplus/`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
