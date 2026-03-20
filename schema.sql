PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS ticket_photos;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS service_types;
DROP TABLE IF EXISTS sectors;
DROP TABLE IF EXISTS companies;

CREATE TABLE sectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  email TEXT
);

CREATE TABLE service_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sector_id INTEGER,
  FOREIGN KEY (sector_id) REFERENCES sectors (id)
);

CREATE TABLE companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clerk_id TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'client', 'provider', 'admin'
  email TEXT UNIQUE NOT NULL,
  company TEXT
);

CREATE TABLE tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  priority TEXT NOT NULL,
  type TEXT NOT NULL,
  sector TEXT,
  company TEXT,
  status TEXT NOT NULL DEFAULT 'Em Aberto',
  client_id INTEGER NOT NULL,
  provider_id INTEGER,
  nps_score INTEGER,
  requestor_name TEXT,
  phone TEXT,
  sub_type TEXT,
  preferred_time TEXT,
  reopen_reason TEXT,
  final_report TEXT,
  external_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users (id),
  FOREIGN KEY (provider_id) REFERENCES users (id)
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'info', 'success', 'warning'
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE ticket_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  photo_data TEXT NOT NULL,
  photo_type TEXT DEFAULT 'opening',
  FOREIGN KEY (ticket_id) REFERENCES tickets (id)
);

-- Inserir dados iniciais (Seed Data)
INSERT INTO sectors (name, email) VALUES 
('Manutenção', 'manutencao@operarum.com'), 
('TI', 'suporte.ti@operarum.com'), 
('Limpeza', 'limpeza@operarum.com'), 
('Segurança', 'seguranca@operarum.com');
INSERT INTO service_types (name, sector_id) VALUES 
('Civil', 1), ('Elétrica', 1), ('Hidráulica', 1), ('Ar Condicionado', 1), ('Pintura', 1),
('Software', 2), ('Hardware', 2), ('Redes', 2),
('Limpeza Geral', 3), ('Resíduos', 3),
('Portaria', 4), ('Vigilância', 4);
INSERT INTO companies (name) VALUES 
('SECRETARIA DE EDUCAÇÃO DO DISTRITO FEDERAL'),
('REPRESENTAÇÃO DO ESTADO DO MARANHÃO'),
('SUPERINTENDENCIA NACIONAL DE PREVIDENCIA COMPLEMENTAR - PREVIC'),
('AGENCIA NACIONAL DE PROTEÇÃO DE DADOS -ANPD'),
('COMPANHIA DE DESENVOLVIMENTO DE MARICÁ -CODEMAR'),
('FORD COMPANY'),
('ANTONIO VENÃNCIO DA SILVA EMPREENDIMENTOS IMOBILIÁRIOS LTDA'),
('CONSELHO NACIONAL DE SECRETARIAS DE SAUDE');

INSERT INTO users (name, role, email, company) VALUES ('Condômino', 'client', 'cliente@operarum.com', 'FORD COMPANY');
INSERT INTO users (name, role, email, company) VALUES ('Operarum', 'provider', 'tecnico@operarum.com', 'ANTONIO VENÃNCIO DA SILVA EMPREENDIMENTOS IMOBILIÁRIOS LTDA');
INSERT INTO users (name, role, email, company) VALUES ('Administrador', 'admin', 'admin@operarum.com', 'SECRETARIA DE EDUCAÇÃO DO DISTRITO FEDERAL');
INSERT INTO users (name, role, email, company) VALUES ('Arlei', 'admin', 'arlei.bsb@gmail.com', 'SECRETARIA DE EDUCAÇÃO DO DISTRITO FEDERAL');

-- Clean state: No initial tickets inserted.

PRAGMA foreign_keys = ON;
