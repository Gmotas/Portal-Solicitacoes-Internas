/* © 2026 Gabriel Mota Silva. Todos os direitos reservados.
 * Servidor de desenvolvimento do frontend sem dependências externas.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
require('./config');
const root = path.join(__dirname, 'public');
const port = Number(process.env.FRONTEND_PORT || 5173);
const backend = process.env.BACKEND_URL || 'http://127.0.0.1:' + (process.env.PORT || 3000);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const target = new URL(url.pathname + url.search, backend);
    const proxy = http.request(target, { method: req.method, headers: { ...req.headers, host: target.host } }, upstream => {
      res.writeHead(upstream.statusCode || 502, upstream.headers);
      upstream.pipe(res);
    });
    proxy.on('error', () => { if (!res.headersSent) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Backend indisponível. Inicie o servidor backend.' })); } });
    req.pipe(proxy);
    return;
  }
  const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const full = path.resolve(root, relative);
  if (full !== root && !full.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Acesso negado.'); }
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) { res.writeHead(404); return res.end('Arquivo não encontrado.'); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(full)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(full).pipe(res);
}).listen(port, '0.0.0.0', () => console.log('Frontend disponível em http://localhost:' + port));
