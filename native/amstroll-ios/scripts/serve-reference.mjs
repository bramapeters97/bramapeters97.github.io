import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../References/web-prototype.html', import.meta.url));
const server = http.createServer((request, response) => {
  if (request.url !== '/' && request.url !== '/index.html') { response.writeHead(404); response.end('Not found'); return; }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(response);
});
server.listen(8766, '127.0.0.1', () => console.log('Reference only: http://127.0.0.1:8766 — not the native app.'));
