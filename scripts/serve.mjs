import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Run npm run build first.');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.wav': 'audio/wav' };
http.createServer((request, response) => {
  let url;
  try { url = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname); } catch { response.writeHead(400).end(); return; }
  if (url.startsWith('/neo-defender/')) url = url.slice('/neo-defender'.length);
  const file = path.resolve(root, '.' + (url === '/' ? '/index.html' : url));
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Accept-Ranges', 'bytes');
    let start = 0, end = data.length - 1;
    if (request.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!match || (!match[1] && !match[2])) { response.writeHead(416, { 'Content-Range': `bytes */${data.length}` }).end(); return; }
      start = match[1] ? Number(match[1]) : Math.max(0, data.length - Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
      if (start > end || start >= data.length) { response.writeHead(416, { 'Content-Range': `bytes */${data.length}` }).end(); return; }
      response.statusCode = 206;
      response.setHeader('Content-Range', `bytes ${start}-${end}/${data.length}`);
    }
    response.setHeader('Content-Length', Math.max(0, end - start + 1));
    response.end(request.method === 'HEAD' ? undefined : data.subarray(start, end + 1));
  });
}).listen(Number(process.env.PORT ?? 4173), '127.0.0.1', () => console.log(`NEO DEFENDER: http://127.0.0.1:${process.env.PORT ?? 4173}/neo-defender/`));
