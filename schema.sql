-- © 2026 Gabriel Mota Silva. Todos os direitos reservados.
-- Portal de Solicitações Internas. Consulte COPYRIGHT.md e LICENSE.
PRAGMA foreign_keys = ON;
CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, pass TEXT NOT NULL, name TEXT NOT NULL);
CREATE TABLE requests (id INTEGER PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL CHECK(category IN ('TI','RH','Compras','Financeiro','Infraestrutura')), status TEXT NOT NULL DEFAULT 'Aberto' CHECK(status IN ('Aberto','Em Atendimento','Concluído')), user_id INTEGER NOT NULL REFERENCES users(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_category ON requests(category);
