/* © 2026 Gabriel Mota Silva. Todos os direitos reservados. */
require('./config');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const root = __dirname;

function getDatabasePath() {
  const configured = process.env.DB_PATH || './data/portal.db';
  return path.isAbsolute(configured) ? configured : path.resolve(root, configured);
}
function runMigrations() {
  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  try {
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(fs.readFileSync(path.join(root, 'schema.sql'), 'utf8'));
    const email = String(process.env.ADMIN_EMAIL || 'admin@portal.local').trim().toLowerCase();
    const password = String(process.env.ADMIN_PASSWORD || 'Admin@123');
    const name = String(process.env.ADMIN_NAME || 'Administrador');
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(email);
    if (!exists) {
      const salt = crypto.randomBytes(16).toString('hex');
      const digest = crypto.scryptSync(password, salt, 64).toString('hex');
      db.prepare('INSERT INTO users(username, salt, pass, name) VALUES(?, ?, ?, ?)').run(email, salt, digest, name);
      console.log('[migration] Usuário de demonstração criado:', email);
    }
    const admin = db.prepare('SELECT id FROM users WHERE username = ?').get(email);
    if (process.env.SEED_DEMO_DATA !== 'false' && db.prepare('SELECT COUNT(*) AS n FROM requests').get().n === 0) {
      const insert = db.prepare('INSERT INTO requests(title, description, category, status, user_id) VALUES(?, ?, ?, ?, ?)');
      insert.run('Configuração de acesso ao sistema', 'Solicitação de demonstração para revisar o acesso de um colaborador ao sistema corporativo.', 'TI', 'Aberto', admin.id);
      insert.run('Reposição de materiais de escritório', 'Pedido de demonstração de reposição de materiais para a equipe administrativa.', 'Compras', 'Em Atendimento', admin.id);
      insert.run('Atualização cadastral de colaborador', 'Solicitação de demonstração para atualizar os dados cadastrais no sistema interno.', 'RH', 'Concluído', admin.id);
      console.log('[migration] Dados iniciais de demonstração inseridos.');
    }
    console.log('[migration] Banco pronto:', dbPath);
  } finally {
    db.close();
  }
}
if (require.main === module) {
  try { runMigrations(); } catch (error) { console.error('[migration] Falha:', error.message); process.exitCode = 1; }
}
module.exports = { runMigrations, getDatabasePath };
