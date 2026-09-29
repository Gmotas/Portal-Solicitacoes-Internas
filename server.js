/* © 2026 Gabriel Mota Silva. Todos os direitos reservados.
 * Portal de Solicitações Internas — backend Node.js.
 * Consulte COPYRIGHT.md e LICENSE.
 */
require('./config');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { runMigrations, getDatabasePath } = require('./migrate');

const root = __dirname;
const pub = path.join(root, 'public');
const dbPath = getDatabasePath();
runMigrations();
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');
const sessions = new Map();
const cats = ['TI', 'RH', 'Compras', 'Financeiro', 'Infraestrutura'];
const states = ['Aberto', 'Em Atendimento', 'Concluído'];
const hash = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
const send = (res, code, data) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
};
const sid = req => (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('sid='))?.slice(4);
const user = req => sessions.get(sid(req));
async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error('Corpo muito grande');
  }
  return JSON.parse(raw || '{}');
}
const select = 'SELECT r.*, u.name AS requester FROM requests r JOIN users u ON u.id = r.user_id';
const clean = r => ({ id: r.id, title: r.title, description: r.description, category: r.category, status: r.status, userId: r.user_id, requester: r.requester, createdAt: r.created_at, updatedAt: r.updated_at });

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, service: 'portal-backend' });

  if (req.method === 'POST' && url.pathname === '/api/login') {
    let body;
    try { body = await readBody(req); } catch { return send(res, 400, { error: 'Dados inválidos.' }); }
    const login = String(body.email || body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    const account = db.prepare('SELECT * FROM users WHERE username = ?').get(login);
    if (!account || hash(password, account.salt) !== account.pass) return send(res, 401, { error: 'E-mail ou senha inválidos.' });
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { id: account.id, username: account.username, email: account.username, name: account.name });
    res.setHeader('Set-Cookie', 'sid=' + token + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800');
    return send(res, 200, { id: account.id, username: account.username, email: account.username, name: account.name });
  }

  if (url.pathname.startsWith('/api/')) {
    const me = user(req);
    if (req.method === 'POST' && url.pathname === '/api/logout') {
      if (sid(req)) sessions.delete(sid(req));
      res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
      return send(res, 200, { ok: true });
    }
    if (!me) return send(res, 401, { error: 'Faça login para continuar.' });
    if (req.method === 'GET' && url.pathname === '/api/me') return send(res, 200, me);

    if (req.method === 'GET' && url.pathname === '/api/dashboard') {
      const grouped = db.prepare('SELECT status, COUNT(*) AS n FROM requests GROUP BY status').all();
      const counts = Object.fromEntries(grouped.map(x => [x.status, x.n]));
      return send(res, 200, {
        total: db.prepare('SELECT COUNT(*) AS n FROM requests').get().n,
        abertas: counts['Aberto'] || 0,
        atendimento: counts['Em Atendimento'] || 0,
        concluidas: counts['Concluído'] || 0
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/requests') {
      const where = [], args = [];
      for (const [key, expression] of [['from', 'date(r.created_at) >= date(?)'], ['to', 'date(r.created_at) <= date(?)]]) {
        const value = url.searchParams.get(key);
        if (value) { where.push(expression); args.push(value); }
      }
      for (const [key, column, valid] of [['category', 'r.category = ?', cats], ['status', 'r.status = ?', states]]) {
        const value = url.searchParams.get(key);
        if (valid.includes(value)) { where.push(column); args.push(value); }
      }
      const query = url.searchParams.get('q');
      if (query) { where.push('r.title LIKE ?'); args.push('%' + query.slice(0, 100) + '%'); }
      const rows = db.prepare(select + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY r.id DESC').all(...args);
      return send(res, 200, rows.map(clean));
    }

    if (req.method === 'POST' && url.pathname === '/api/requests') {
      let body;
      try { body = await readBody(req); } catch { return send(res, 400, { error: 'JSON inválido.' }); }
      const title = String(body.title || '').trim(), description = String(body.description || '').trim();
      if (title.length < 3 || title.length > 120 || description.length < 3 || description.length > 5000 || !cats.includes(body.category)) {
        return send(res, 400, { error: 'Confira título, descrição e categoria.' });
      }
      const inserted = db.prepare('INSERT INTO requests(title, description, category, user_id) VALUES(?, ?, ?, ?)').run(title, description, body.category, me.id);
      return send(res, 201, clean(db.prepare(select + ' WHERE r.id = ?').get(Number(inserted.lastInsertRowid))));
    }

    const match = url.pathname.match(/^\/api\/requests\/(\d+)(?:\/(status))?$/);
    if (match) {
      const id = Number(match[1]);
      const row = db.prepare(select + ' WHERE r.id = ?').get(id);
      if (!row) return send(res, 404, { error: 'Solicitação não encontrada.' });
      if (req.method === 'GET' && !match[2]) return send(res, 200, clean(row));

      if (req.method === 'PATCH' && !match[2]) {
        if (row.status !== 'Aberto' || row.user_id !== me.id) return send(res, 403, { error: 'Somente o solicitante pode editar uma solicitação aberta.' });
        let body;
        try { body = await readBody(req); } catch { return send(res, 400, { error: 'JSON inválido.' }); }
        const title = String(body.title || '').trim(), description = String(body.description || '').trim();
        if (title.length < 3 || title.length > 120 || description.length < 3 || description.length > 5000 || !cats.includes(body.category)) {
          return send(res, 400, { error: 'Confira os campos.' });
        }
        db.prepare('UPDATE requests SET title = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(title, description, body.category, id);
        return send(res, 200, clean(db.prepare(select + ' WHERE r.id = ?').get(id)));
      }

      if (req.method === 'DELETE' && !match[2]) {
        if (row.status !== 'Aberto' || row.user_id !== me.id) return send(res, 403, { error: 'Somente o solicitante pode excluir uma solicitação aberta.' });
        db.prepare('DELETE FROM requests WHERE id = ?').run(id);
        return send(res, 200, { ok: true });
      }

      if (req.method === 'PUT' && match[2]) {
        let body;
        try { body = await readBody(req); } catch { return send(res, 400, { error: 'JSON inválido.' }); }
        if (!states.includes(body.status)) return send(res, 400, { error: 'Status inválido.' });
        db.prepare('UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(body.status, id);
        return send(res, 200, clean(db.prepare(select + ' WHERE r.id = ?').get(id)));
      }
    }
    return send(res, 404, { error: 'Rota não encontrada.' });
  }

  const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const full = path.resolve(pub, relative);
  if (full !== pub && !full.startsWith(pub + path.sep)) return send(res, 403, { error: 'Acesso negado.' });
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return send(res, 404, { error: 'Arquivo não encontrado.' });
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': types[path.extname(full)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(full).pipe(res);
}

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
http.createServer((req, res) => handle(req, res).catch(error => {
  console.error('[request-error]', error);
  if (!res.headersSent) send(res, 500, { error: 'Erro interno.' });
})).listen(port, host, () => console.log('Backend disponível em http://' + host + ':' + port));
