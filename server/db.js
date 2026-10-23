import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { hashPassword } from './auth.js'

const DB_PATH = process.env.DB_PATH || 'data/ativos.db'

if (DB_PATH !== ':memory:') mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new DatabaseSync(DB_PATH)
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'leitura' CHECK (role IN ('admin', 'tecnico', 'leitura')),
  phone TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  prefs TEXT NOT NULL DEFAULT '{}',
  password_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  since TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  serial TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('Notebook', 'Desktop', 'Monitor', 'Celular', 'Periférico')),
  status TEXT NOT NULL CHECK (status IN ('Em uso', 'Disponível', 'Manutenção', 'Baixado')),
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  location TEXT NOT NULL DEFAULT '',
  acquired_at TEXT NOT NULL,
  warranty_until TEXT,
  value REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  detail TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Preventiva', 'Corretiva', 'Upgrade')),
  status TEXT NOT NULL CHECK (status IN ('Aberta', 'Em andamento', 'Aguardando peça', 'Concluída')),
  tech TEXT NOT NULL DEFAULT '',
  opened_at TEXT NOT NULL DEFAULT (date('now')),
  due_at TEXT NOT NULL,
  closed_at TEXT,
  cost REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`)

// ---------------------------------------------------------------------------
// Dados iniciais (só na primeira execução, com o banco vazio)
// ---------------------------------------------------------------------------

function isoDaysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function addYears(iso, years) {
  const d = new Date(iso + 'T00:00:00')
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

export function seed() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get()
  if (n > 0) return

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@grupolegal.com.br'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  db.prepare(
    `INSERT INTO users (name, email, password_hash, role, phone, department, job_title, location)
     VALUES (?, ?, ?, 'admin', ?, ?, ?, ?)`,
  ).run('Davi Gomes', adminEmail, hashPassword(adminPassword), '(11) 98876-5432', 'Tecnologia da Informação', 'Coordenador de TI', 'São Paulo · Matriz')
  console.log(`[seed] Usuário administrador criado: ${adminEmail} / ${adminPassword}`)

  if (process.env.SEED_DEMO === '0') return

  const people = [
    ['Mariana Costa', 'TI', 'Product Manager', 'São Paulo · 3º andar', '2021-02-01'],
    ['Tiago Alves', 'Jurídico', 'Advogado Sênior', 'Rio de Janeiro', '2019-05-01'],
    ['Ana Ribeiro', 'TI', 'Suporte Técnico', 'São Paulo · 1º andar', '2022-01-10'],
    ['Rafael Nunes', 'Comercial', 'Gerente Comercial', 'Campinas', '2020-08-03'],
    ['Felipe Santos', 'Financeiro', 'Analista Financeiro', 'São Paulo · 2º andar', '2022-06-15'],
    ['Juliana Prado', 'Marketing', 'Designer', 'São Paulo · 2º andar', '2021-08-02'],
    ['Carla Menezes', 'Administrativo', 'Coordenadora de RH', 'São Paulo · 3º andar', '2024-08-19'],
    ['Bruno Lima', 'Operacional', 'Coordenador de Logística', 'Curitiba', '2023-07-03'],
    ['Marcos Vieira', 'Jurídico', 'Paralegal', 'Rio de Janeiro', '2023-11-20'],
    ['Patrícia Rocha', 'Comercial', 'Executiva de Contas', 'Campinas', '2023-09-04'],
    ['Lucas Martins', 'TI', 'Técnico de Campo', 'São Paulo · 1º andar', '2022-03-14'],
    ['Renata Duarte', 'Jurídico', 'Advogada Pleno', 'São Paulo · 4º andar', '2024-02-05'],
  ]
  const insPerson = db.prepare('INSERT INTO people (name, email, department, job_title, location, since) VALUES (?, ?, ?, ?, ?, ?)')
  const personId = {}
  for (const [name, dept, title, loc, since] of people) {
    const email = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(' ', '.') + '@grupolegal.com.br'
    personId[name] = insPerson.run(name, email, dept, title, loc, since).lastInsertRowid
  }

  // [nome, série, categoria, status, responsável, local, aquisição, anos de garantia, valor]
  const assets = [
    ['Dell Latitude 5440', 'SN 7HX2K93', 'Notebook', 'Em uso', 'Mariana Costa', 'São Paulo · 3º andar', '2024-03-12', 3, 7890],
    ['Dell UltraSharp U2723QE', 'SN CN0-4F2', 'Monitor', 'Disponível', null, 'Estoque · Central', '2024-04-02', 3, 3990],
    ['iPhone 14', 'IMEI 358890112', 'Celular', 'Em uso', 'Rafael Nunes', 'Campinas', '2023-09-21', 2, 5490],
    ['ThinkPad E14 Gen 4', 'SN PF3Z81', 'Notebook', 'Manutenção', 'Ana Ribeiro', 'Lab · TI', '2022-01-17', 3, 5200],
    ['Lenovo ThinkCentre M70q', 'SN MJ0K22', 'Desktop', 'Em uso', 'Tiago Alves', 'Rio de Janeiro', '2024-05-08', 3, 4300],
    ['Galaxy S23 FE', 'IMEI 351204455', 'Celular', 'Disponível', null, 'Estoque · Central', '2024-02-14', 2, 3299],
    ['Dell Latitude 3420', 'SN 4GD7L12', 'Notebook', 'Em uso', 'Felipe Santos', 'São Paulo · 2º andar', '2022-06-30', 3, 4590],
    ['Logitech MX Master 3S', 'SN 2213LZ', 'Periférico', 'Disponível', null, 'Estoque · Central', '2024-07-11', 2, 649],
    ['MacBook Air M1', 'SN C02FX1', 'Notebook', 'Manutenção', 'Juliana Prado', 'Assistência externa', '2021-08-09', 3, 8999],
    ['LG 27UL500', 'SN 309NT77', 'Monitor', 'Em uso', 'Bruno Lima', 'Curitiba', '2024-08-03', 3, 1899],
    ['HP ProDesk 400 G6', 'SN BRJ9301', 'Desktop', 'Baixado', null, 'Descarte', '2019-10-15', 3, 3800],
    ['Dell Latitude 5440', 'SN 9KQ4L20', 'Notebook', 'Em uso', 'Carla Menezes', 'São Paulo · 3º andar', '2024-08-19', 3, 7890],
    ['Headset Jabra Evolve2 40', 'SN JB8812', 'Periférico', 'Em uso', 'Marcos Vieira', 'Rio de Janeiro', '2023-11-22', 2, 899],
    ['iPhone 13', 'IMEI 354022871', 'Celular', 'Manutenção', 'Patrícia Rocha', 'Lab · TI', '2023-09-05', 2, 4299],
    ['ThinkPad T14 Gen 4', 'SN PF4R02', 'Notebook', 'Disponível', null, 'Estoque · Central', '2024-09-02', 3, 9100],
    ['Dell P2422H', 'SN CN0-7X1', 'Monitor', 'Em uso', 'Ana Ribeiro', 'São Paulo · 1º andar', '2021-12-28', 3, 1490],
    ['Dell Latitude 5450', 'SN 2LM8Q01', 'Notebook', 'Em uso', 'Renata Duarte', 'São Paulo · 4º andar', '2025-02-10', 3, 8290],
    ['Dell P2723D', 'SN CN0-9Q3', 'Monitor', 'Em uso', 'Renata Duarte', 'São Paulo · 4º andar', '2025-02-10', 3, 2190],
    ['Galaxy A55', 'IMEI 352211874', 'Celular', 'Em uso', 'Lucas Martins', 'São Paulo · 1º andar', '2025-04-22', 2, 2499],
    ['ThinkPad E14 Gen 5', 'SN PF5A19', 'Notebook', 'Em uso', 'Lucas Martins', 'São Paulo · 1º andar', '2025-06-03', 3, 5890],
    ['Teclado Logitech MX Keys', 'SN 2309KX', 'Periférico', 'Em uso', 'Mariana Costa', 'São Paulo · 3º andar', '2025-01-15', 2, 799],
    ['Lenovo ThinkCentre M75q', 'SN MJ1B44', 'Desktop', 'Em uso', 'Marcos Vieira', 'Rio de Janeiro', '2023-03-14', 3, 3990],
    ['LG 24MP400', 'SN 401KR22', 'Monitor', 'Disponível', null, 'Estoque · Central', '2025-07-07', 3, 899],
    ['Dell Latitude 3440', 'SN 6PT2N88', 'Notebook', 'Em uso', 'Tiago Alves', 'Rio de Janeiro', '2025-08-18', 3, 5190],
    ['Headset Jabra Evolve2 40', 'SN JB9034', 'Periférico', 'Disponível', null, 'Estoque · Central', '2025-03-30', 2, 899],
    ['iPhone 15', 'IMEI 356781230', 'Celular', 'Em uso', 'Carla Menezes', 'São Paulo · 3º andar', '2025-05-12', 2, 6299],
  ]
  const insAsset = db.prepare(
    `INSERT INTO assets (tag, name, serial, category, status, person_id, location, acquired_at, warranty_until, value)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  // Desloca as datas para que a aquisição mais recente fique cerca de um mês atrás
  const shiftDays = Math.max(0, Math.round((Date.now() - Date.parse('2025-09-20')) / 86400000))
  const shift = (iso) => {
    const d = new Date(iso + 'T00:00:00')
    d.setDate(d.getDate() + shiftDays)
    return d.toISOString().slice(0, 10)
  }
  const assetId = []
  assets.forEach(([name, serial, cat, status, owner, loc, acqRaw, years, value], i) => {
    const acq = shift(acqRaw)
    const tag = `GL-${String(410 + i).padStart(5, '0')}`
    assetId.push(insAsset.run(tag, name, serial, cat, status, owner ? personId[owner] : null, loc, acq, addYears(acq, years), value).lastInsertRowid)
  })

  // Algumas garantias vencendo nos próximos 30 dias para os alertas
  db.prepare('UPDATE assets SET warranty_until = ? WHERE id = ?').run(isoDaysFromNow(12), assetId[2])
  db.prepare('UPDATE assets SET warranty_until = ? WHERE id = ?').run(isoDaysFromNow(25), assetId[12])

  // [índice do ativo, detalhe, tipo, status, técnico, aberta há N dias, prazo em N dias, custo]
  const orders = [
    [3, 'Teclado com falhas', 'Corretiva', 'Em andamento', 'Ana Ribeiro', -2, 2, 320],
    [8, 'Troca de bateria', 'Corretiva', 'Aguardando peça', 'Assist. externa', -6, -1, 1150],
    [13, 'Tela trincada', 'Corretiva', 'Aberta', 'Ana Ribeiro', 0, 6, 0],
    [4, 'Upgrade de RAM 16→32 GB', 'Upgrade', 'Concluída', 'Lucas Martins', -9, -5, 480],
    [6, 'Limpeza e pasta térmica', 'Preventiva', 'Concluída', 'Lucas Martins', -14, -12, 90],
  ]
  const insOrder = db.prepare(
    `INSERT INTO service_orders (asset_id, detail, type, status, tech, opened_at, due_at, closed_at, cost)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const [ai, detail, type, status, tech, opened, due, cost] of orders) {
    insOrder.run(assetId[ai], detail, type, status, tech, isoDaysFromNow(opened), isoDaysFromNow(due), status === 'Concluída' ? isoDaysFromNow(due) : null, cost)
  }

  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(
    'integrations',
    JSON.stringify({ entra: true, intune: true, workspace: false, smtp: true, teams: false, agent: true }),
  )
}
