import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Run npm run build first.');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer((request, response) => {
  let url;
  try { url = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname); } catch { response.writeHead(400).end(); return; }
  if (url.startsWith('/neo-defender/')) url = url.slice('/neo-defender'.length);
  const file = path.resolve(root, '.' + (url === '/' ? '/index.html' : url));
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-cache'); response.end(data);
  });
}).listen(4173, '127.0.0.1', () => console.log('NEO DEFENDER: http://127.0.0.1:4173/neo-defender/'));
