import { hashPassword } from './auth.js'

/**
 * Banco Postgres.
 * - Com DATABASE_URL (ou POSTGRES_URL, criada pela integração Neon da Vercel): Postgres de verdade.
 * - Sem ela: PGlite (Postgres embutido). Localmente grava em data/pglite; na Vercel roda em
 *   memória e serve só como demonstração (os dados se perdem quando a função reinicia).
 */
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL
/** Sem Postgres externo, mas com Vercel Blob: os dados ficam salvos no Blob (ver blobSync/blobSave). */
export const blobMode = !DATABASE_URL && Boolean(process.env.BLOB_READ_WRITE_TOKEN)
/** Na Vercel sem banco nenhum: dados só em memória. */
export const demoMode = !DATABASE_URL && !blobMode && Boolean(process.env.VERCEL)

let driver // { query(sql, params) → rows, tx(fn) }

async function connect() {
  if (DATABASE_URL) {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({
      connectionString: DATABASE_URL,
      max: 5,
      ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false },
    })
    return {
      query: async (sql, params) => (await pool.query(sql, params)).rows,
      tx: async (fn) => {
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          const out = await fn(async (sql, params) => (await client.query(sql, params)).rows)
          await client.query('COMMIT')
          return out
        } catch (e) {
          await client.query('ROLLBACK')
          throw e
        } finally {
          client.release()
        }
      },
    }
  }
  const { PGlite } = await import('@electric-sql/pglite')
  const dir = process.env.VERCEL || blobMode ? undefined : process.env.PGLITE_DIR || 'data/pglite'
  const db = new PGlite(dir)
  return {
    query: async (sql, params) => (await db.query(sql, params)).rows,
    tx: (fn) => db.transaction((t) => fn(async (sql, params) => (await t.query(sql, params)).rows)),
  }
}

/** Executa uma consulta e devolve as linhas. */
export const q = (sql, params = []) => driver.query(sql, params)
/** Primeira linha (ou undefined). */
export const one = async (sql, params = []) => (await driver.query(sql, params))[0]
/** Transação: fn recebe uma função de consulta ligada à transação. */
export const tx = (fn) => driver.tx(fn)

const NOW = `to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')`
const TODAY = `to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD')`

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'leitura' CHECK (role IN ('admin', 'tecnico', 'leitura')),
  phone TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  prefs TEXT NOT NULL DEFAULT '{}',
  password_changed_at TEXT NOT NULL DEFAULT ${NOW},
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS people (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  since TEXT NOT NULL DEFAULT ${TODAY},
  created_at TEXT NOT NULL DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  tag TEXT NOT NULL,
  name TEXT NOT NULL,
  serial TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('Notebook', 'Desktop', 'Monitor', 'Celular', 'Periférico')),
  status TEXT NOT NULL CHECK (status IN ('Em uso', 'Disponível', 'Manutenção', 'Baixado')),
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  location TEXT NOT NULL DEFAULT '',
  acquired_at TEXT NOT NULL,
  warranty_until TEXT,
  value DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ${NOW},
  updated_at TEXT NOT NULL DEFAULT ${NOW}
);
CREATE UNIQUE INDEX IF NOT EXISTS assets_tag_key ON assets (lower(tag));

CREATE TABLE IF NOT EXISTS service_orders (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  detail TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Preventiva', 'Corretiva', 'Upgrade')),
  status TEXT NOT NULL CHECK (status IN ('Aberta', 'Em andamento', 'Aguardando peça', 'Concluída')),
  tech TEXT NOT NULL DEFAULT '',
  opened_at TEXT NOT NULL DEFAULT ${TODAY},
  due_at TEXT NOT NULL,
  closed_at TEXT,
  cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

export { NOW, TODAY }

// ---------------------------------------------------------------------------
// Dados iniciais (só na primeira execução, com o banco vazio)
// ---------------------------------------------------------------------------

function isoDaysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function addYears(iso, years) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCFullYear(d.getUTCFullYear() + years)
  return d.toISOString().slice(0, 10)
}

async function seed(run) {
  const { n } = (await run('SELECT COUNT(*)::int AS n FROM users'))[0]
  if (n > 0) return

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@grupolegal.com.br').toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  await run(
    `INSERT INTO users (name, email, password_hash, role, phone, department, job_title, location)
     VALUES ($1, $2, $3, 'admin', $4, $5, $6, $7)`,
    ['Davi Gomes', adminEmail, hashPassword(adminPassword), '(11) 98876-5432', 'Tecnologia da Informação', 'Coordenador de TI', 'São Paulo · Matriz'],
  )
  console.log(`[seed] Usuário administrador criado: ${adminEmail}${process.env.ADMIN_PASSWORD ? '' : ' / admin123'}`)

  await run(`INSERT INTO settings (key, value) VALUES ('integrations', $1) ON CONFLICT (key) DO NOTHING`, [
    JSON.stringify({ entra: true, intune: true, workspace: false, smtp: true, teams: false, agent: true }),
  ])

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
  const personId = {}
  for (const [name, dept, title, loc, since] of people) {
    const email = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(' ', '.') + '@grupolegal.com.br'
    const r = await run('INSERT INTO people (name, email, department, job_title, location, since) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [
      name, email, dept, title, loc, since,
    ])
    personId[name] = r[0].id
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
  // Desloca as datas para que a aquisição mais recente fique cerca de um mês atrás
  const shiftDays = Math.max(0, Math.round((Date.now() - Date.parse('2025-09-20')) / 86400000))
  const shift = (iso) => {
    const d = new Date(iso + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + shiftDays)
    return d.toISOString().slice(0, 10)
  }
  const assetId = []
  for (const [i, [name, serial, cat, status, owner, loc, acqRaw, years, value]] of assets.entries()) {
    const acq = shift(acqRaw)
    const tag = `GL-${String(410 + i).padStart(5, '0')}`
    const r = await run(
      `INSERT INTO assets (tag, name, serial, category, status, person_id, location, acquired_at, warranty_until, value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [tag, name, serial, cat, status, owner ? personId[owner] : null, loc, acq, addYears(acq, years), value],
    )
    assetId.push(r[0].id)
  }

  // Algumas garantias vencendo nos próximos 30 dias para os alertas
  await run('UPDATE assets SET warranty_until = $1 WHERE id = $2', [isoDaysFromNow(12), assetId[2]])
  await run('UPDATE assets SET warranty_until = $1 WHERE id = $2', [isoDaysFromNow(25), assetId[12]])

  // [índice do ativo, detalhe, tipo, status, técnico, aberta há N dias, prazo em N dias, custo]
  const orders = [
    [3, 'Teclado com falhas', 'Corretiva', 'Em andamento', 'Ana Ribeiro', -2, 2, 320],
    [8, 'Troca de bateria', 'Corretiva', 'Aguardando peça', 'Assist. externa', -6, -1, 1150],
    [13, 'Tela trincada', 'Corretiva', 'Aberta', 'Ana Ribeiro', 0, 6, 0],
    [4, 'Upgrade de RAM 16→32 GB', 'Upgrade', 'Concluída', 'Lucas Martins', -9, -5, 480],
    [6, 'Limpeza e pasta térmica', 'Preventiva', 'Concluída', 'Lucas Martins', -14, -12, 90],
  ]
  for (const [ai, detail, type, status, tech, opened, due, cost] of orders) {
    await run(
      `INSERT INTO service_orders (asset_id, detail, type, status, tech, opened_at, due_at, closed_at, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [assetId[ai], detail, type, status, tech, isoDaysFromNow(opened), isoDaysFromNow(due), status === 'Concluída' ? isoDaysFromNow(due) : null, cost],
    )
  }
}

// ---------------------------------------------------------------------------
// Persistência no Vercel Blob
// Cada instância serverless tem um Postgres em memória (PGlite). Os dados ficam
// num JSON no Blob: toda escrita salva o JSON (com controle de concorrência por
// ETag) e as instâncias recarregam quando percebem uma versão mais nova.
// ---------------------------------------------------------------------------

const SNAPSHOT = 'glti/database.json'
const TABLES = ['users', 'people', 'assets', 'service_orders', 'settings']
// BLOB_MODULE permite trocar a biblioteca nos testes locais
const blobLib = () => import(process.env.BLOB_MODULE || '@vercel/blob')
let snapshotEtag = null
let lastCheck = 0

export class ConflictError extends Error {}

async function readSnapshot(run) {
  const data = { version: 1, savedAt: new Date().toISOString() }
  for (const t of TABLES) data[t] = await run(`SELECT * FROM ${t} ORDER BY 1`)
  return data
}

async function restoreSnapshot(run, data) {
  await run(`TRUNCATE ${[...TABLES].reverse().join(', ')} RESTART IDENTITY CASCADE`)
  for (const t of TABLES) {
    for (const row of data[t] ?? []) {
      const cols = Object.keys(row)
      await run(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`, cols.map((c) => row[c]))
    }
    if (t !== 'settings') {
      await run(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1), (SELECT MAX(id) FROM ${t}) IS NOT NULL)`)
    }
  }
}

/**
 * Recarrega os dados do Blob se houver versão mais nova que a desta instância.
 * Sem `force`, consulta o Blob no máximo a cada 3 s. Devolve true se existir snapshot.
 */
export async function blobSync({ force = false } = {}) {
  if (!blobMode) return false
  if (!force && Date.now() - lastCheck < 3000) return true
  const { head, get, BlobNotFoundError } = await blobLib()
  let meta
  try {
    meta = await head(SNAPSHOT)
  } catch (e) {
    if (e instanceof BlobNotFoundError) return false
    throw e
  }
  lastCheck = Date.now()
  if (meta.etag === snapshotEtag) return true
  const res = await get(SNAPSHOT, { access: 'private', useCache: false })
  if (!res) return false
  const data = await new Response(res.stream).json()
  await tx((run) => restoreSnapshot(run, data))
  snapshotEtag = res.blob.etag
  return true
}

/** Salva os dados no Blob. Lança ConflictError se outra instância salvou antes. */
export async function blobSave() {
  if (!blobMode) return
  const { put, BlobPreconditionFailedError } = await blobLib()
  const body = JSON.stringify(await readSnapshot(q))
  try {
    const r = await put(SNAPSHOT, body, {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      cacheControlMaxAge: 60,
      ...(snapshotEtag ? { ifMatch: snapshotEtag } : { allowOverwrite: false }),
    })
    snapshotEtag = r.etag
    lastCheck = Date.now()
  } catch (e) {
    if (e instanceof BlobPreconditionFailedError || /already exists/i.test(e?.message)) throw new ConflictError('conflito')
    throw e
  }
}

/** Fila simples: uma escrita por vez nesta instância. */
let chain = Promise.resolve()
export function acquireLock() {
  let release
  const next = new Promise((r) => (release = r))
  const ready = chain.then(() => {
    let done = false
    return () => {
      if (!done) {
        done = true
        release()
      }
    }
  })
  chain = chain.then(() => next)
  return ready
}

let ready
/** Conecta, cria as tabelas e os dados iniciais (uma vez por processo). */
export function init() {
  ready ??= (async () => {
    driver = await connect()
    await tx(async (run) => {
      // Evita que duas funções frias criem o banco ao mesmo tempo
      if (DATABASE_URL) await run('SELECT pg_advisory_xact_lock(724001)')
      for (const stmt of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) await run(stmt)
      if (!blobMode) await seed(run)
    })
    if (blobMode && !(await blobSync({ force: true }))) {
      // Primeira execução: cria os dados iniciais e publica no Blob
      await tx((run) => seed(run))
      try {
        await blobSave()
      } catch (e) {
        if (!(e instanceof ConflictError)) throw e
        await blobSync({ force: true }) // outra instância criou primeiro: usa a dela
      }
    }
  })().catch((e) => {
    ready = undefined
    throw e
  })
  return ready
}
