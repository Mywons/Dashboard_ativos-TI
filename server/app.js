import express from 'express'
import { acquireLock, blobMode, blobSave, blobSync, ConflictError, demoMode, init, NOW, one, q, tx } from './db.js'
import { clearFails, createToken, hashPassword, loginBlocked, parseCookies, randomSecret, readToken, registerFail, verifyPassword } from './auth.js'

export const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(express.json({ limit: '100kb' }))

const COOKIE = 'gl_session'
const SESSION_HOURS = 12
const REMEMBER_DAYS = 30

const CATEGORIES = ['Notebook', 'Desktop', 'Monitor', 'Celular', 'Periférico']
const ASSET_STATUS = ['Em uso', 'Disponível', 'Manutenção', 'Baixado']
const ORDER_TYPES = ['Preventiva', 'Corretiva', 'Upgrade']
const ORDER_STATUS = ['Aberta', 'Em andamento', 'Aguardando peça', 'Concluída']
const ROLES = ['admin', 'tecnico', 'leitura']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const wrap = (fn) => async (req, res, next) => {
  try {
    const out = await fn(req, res)
    if (out !== undefined) res.json(out)
  } catch (e) {
    next(e)
  }
}

const today = () => new Date().toISOString().slice(0, 10)

function str(v, field, { required = false, max = 200 } = {}) {
  const s = v === undefined || v === null ? '' : String(v).trim()
  if (required && !s) throw new HttpError(400, `Campo obrigatório: ${field}`)
  if (s.length > max) throw new HttpError(400, `${field} muito longo (máx. ${max})`)
  return s
}

function oneOf(v, list, field) {
  if (!list.includes(v)) throw new HttpError(400, `Valor inválido para ${field}`)
  return v
}

function date(v, field, { required = false } = {}) {
  if (!v) {
    if (required) throw new HttpError(400, `Campo obrigatório: ${field}`)
    return null
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new HttpError(400, `${field} inválida`)
  return v
}

function num(v, field) {
  if (v === undefined || v === null || v === '') return 0
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) throw new HttpError(400, `${field} inválido`)
  return n
}

function idParam(req) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'ID inválido')
  return id
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    department: u.department,
    jobTitle: u.job_title,
    location: u.location,
    prefs: JSON.parse(u.prefs || '{}'),
    passwordChangedAt: u.password_changed_at,
    lastLoginAt: u.last_login_at,
    createdAt: u.created_at,
  }
}

const getUser = (id) => one('SELECT * FROM users WHERE id = $1', [id])

// ---------------------------------------------------------------------------
// Inicialização e autenticação
// ---------------------------------------------------------------------------

let secret
async function sessionSecret() {
  if (secret) return secret
  if (process.env.SESSION_SECRET) return (secret = process.env.SESSION_SECRET)
  // Sem variável de ambiente: gera uma vez e guarda no banco
  await q(`INSERT INTO settings (key, value) VALUES ('session_secret', $1) ON CONFLICT (key) DO NOTHING`, [randomSecret()])
  return (secret = (await one(`SELECT value FROM settings WHERE key = 'session_secret'`)).value)
}

app.use('/api', async (_req, _res, next) => {
  try {
    await init()
    next()
  } catch (e) {
    next(e)
  }
})

// Modo Blob: leituras recarregam os dados se outra instância salvou algo novo;
// escritas rodam uma por vez e só respondem depois de salvar no Blob.
app.use('/api', async (req, res, next) => {
  if (!blobMode) return next()
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !/^\/auth\/(login|logout)$/.test(req.path)
  const release = await acquireLock()
  if (!isWrite) {
    try {
      await blobSync({ force: req.headers['x-fresh'] === '1' })
    } catch (e) {
      console.error('Falha ao sincronizar com o Blob:', e)
    } finally {
      release()
    }
    return next()
  }
  try {
    await blobSync({ force: true })
  } catch (e) {
    release()
    return next(e)
  }
  res.on('close', release)
  const send = res.json.bind(res)
  let finished = false
  res.json = (body) => {
    if (finished) return send(body)
    finished = true
    ;(async () => {
      if (res.statusCode < 400) {
        try {
          await blobSave()
        } catch (e) {
          await blobSync({ force: true }).catch(() => {})
          release()
          if (e instanceof ConflictError) {
            res.setHeader('X-Conflict', '1')
            return res.status(409) && send({ error: 'Outra pessoa alterou os dados ao mesmo tempo. Tente de novo.' })
          }
          console.error('Falha ao salvar no Blob:', e)
          return res.status(503) && send({ error: 'Não foi possível salvar agora. Tente de novo em instantes.' })
        }
      }
      release()
      send(body)
    })()
    return res
  }
  next()
})

function setSessionCookie(req, res, token, maxAgeSec) {
  const parts = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax']
  if (maxAgeSec) parts.push(`Max-Age=${maxAgeSec}`)
  if (req.secure || process.env.COOKIE_SECURE === '1') parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

async function issueSession(req, res, user, remember) {
  const ms = remember ? REMEMBER_DAYS * 86400000 : SESSION_HOURS * 3600000
  const token = createToken(await sessionSecret(), { userId: user.id, passwordChangedAt: user.password_changed_at, expiresAt: Date.now() + ms })
  setSessionCookie(req, res, token, remember ? ms / 1000 : 0)
}

app.use('/api', async (req, _res, next) => {
  try {
    const token = parseCookies(req.headers.cookie)[COOKIE]
    const data = token && readToken(await sessionSecret(), token)
    if (data) {
      const user = await getUser(data.userId)
      // Trocar a senha invalida as sessões emitidas antes
      if (user && user.password_changed_at === data.passwordChangedAt) req.user = user
    }
    next()
  } catch (e) {
    next(e)
  }
})

const requireAuth = (req, _res, next) => next(req.user ? undefined : new HttpError(401, 'Faça login para continuar'))
const requireWrite = (req, _res, next) =>
  next(req.user?.role === 'admin' || req.user?.role === 'tecnico' ? undefined : new HttpError(403, 'Seu perfil é somente leitura'))
const requireAdmin = (req, _res, next) => next(req.user?.role === 'admin' ? undefined : new HttpError(403, 'Apenas administradores'))

app.get('/api/health', wrap(() => ({ ok: true, demo: demoMode })))

app.post(
  '/api/auth/login',
  wrap(async (req, res) => {
    const email = str(req.body.email, 'E-mail', { required: true }).toLowerCase()
    const password = String(req.body.password ?? '')
    const key = `${req.ip}|${email}`
    if (loginBlocked(key)) throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos e tente novamente.')

    const user = await one('SELECT * FROM users WHERE email = $1', [email])
    if (!user || !verifyPassword(password, user.password_hash)) {
      registerFail(key)
      throw new HttpError(401, 'E-mail ou senha incorretos')
    }
    clearFails(key)
    await q(`UPDATE users SET last_login_at = ${NOW} WHERE id = $1`, [user.id])
    await issueSession(req, res, user, Boolean(req.body.remember))
    return { user: publicUser(await getUser(user.id)) }
  }),
)

app.post(
  '/api/auth/logout',
  wrap((_req, res) => {
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
    return { ok: true }
  }),
)

app.get(
  '/api/auth/me',
  requireAuth,
  wrap((req) => ({ user: publicUser(req.user), demo: demoMode })),
)

app.use('/api', requireAuth)

// ---------------------------------------------------------------------------
// Minha conta
// ---------------------------------------------------------------------------

app.patch(
  '/api/me',
  wrap(async (req) => {
    const b = req.body
    const u = req.user
    const prefs = b.prefs && typeof b.prefs === 'object' ? JSON.stringify({ ...JSON.parse(u.prefs || '{}'), ...b.prefs }) : u.prefs
    await q('UPDATE users SET name = $1, phone = $2, department = $3, job_title = $4, location = $5, prefs = $6 WHERE id = $7', [
      b.name !== undefined ? str(b.name, 'Nome', { required: true }) : u.name,
      b.phone !== undefined ? str(b.phone, 'Telefone') : u.phone,
      b.department !== undefined ? str(b.department, 'Departamento') : u.department,
      b.jobTitle !== undefined ? str(b.jobTitle, 'Cargo') : u.job_title,
      b.location !== undefined ? str(b.location, 'Local') : u.location,
      prefs,
      u.id,
    ])
    return { user: publicUser(await getUser(u.id)) }
  }),
)

app.post(
  '/api/me/password',
  wrap(async (req, res) => {
    const current = String(req.body.current ?? '')
    const next = String(req.body.next ?? '')
    if (!verifyPassword(current, req.user.password_hash)) throw new HttpError(400, 'Senha atual incorreta')
    if (next.length < 8) throw new HttpError(400, 'A nova senha precisa ter pelo menos 8 caracteres')
    await q(`UPDATE users SET password_hash = $1, password_changed_at = ${NOW} || '.' || floor(random() * 1e6)::text WHERE id = $2`, [
      hashPassword(next),
      req.user.id,
    ])
    // As outras sessões ficam inválidas; esta recebe um cookie novo
    await issueSession(req, res, await getUser(req.user.id), true)
    return { ok: true }
  }),
)

// ---------------------------------------------------------------------------
// Usuários do sistema (cadastro feito pelo administrador)
// ---------------------------------------------------------------------------

app.get(
  '/api/users',
  requireAdmin,
  wrap(async () => (await q('SELECT * FROM users ORDER BY name')).map(publicUser)),
)

app.post(
  '/api/users',
  requireAdmin,
  wrap(async (req, res) => {
    const b = req.body
    const password = String(b.password ?? '')
    if (password.length < 8) throw new HttpError(400, 'A senha inicial precisa ter pelo menos 8 caracteres')
    const row = await one(
      'INSERT INTO users (name, email, password_hash, role, department, job_title) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        str(b.name, 'Nome', { required: true }),
        str(b.email, 'E-mail', { required: true }).toLowerCase(),
        hashPassword(password),
        oneOf(b.role, ROLES, 'Perfil'),
        str(b.department, 'Departamento'),
        str(b.jobTitle, 'Cargo'),
      ],
    )
    res.status(201)
    return publicUser(row)
  }),
)

app.patch(
  '/api/users/:id',
  requireAdmin,
  wrap(async (req) => {
    const id = idParam(req)
    const u = await getUser(id)
    if (!u) throw new HttpError(404, 'Usuário não encontrado')
    const role = req.body.role !== undefined ? oneOf(req.body.role, ROLES, 'Perfil') : u.role
    if (req.body.password && String(req.body.password).length < 8) throw new HttpError(400, 'A senha precisa ter pelo menos 8 caracteres')
    if (u.role === 'admin' && role !== 'admin') {
      const { n } = await one(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'`)
      if (n <= 1) throw new HttpError(400, 'O sistema precisa de pelo menos um administrador')
    }
    await q('UPDATE users SET role = $1 WHERE id = $2', [role, id])
    if (req.body.password) {
      await q(`UPDATE users SET password_hash = $1, password_changed_at = ${NOW} || '.' || floor(random() * 1e6)::text WHERE id = $2`, [
        hashPassword(String(req.body.password)),
        id,
      ])
    }
    return publicUser(await getUser(id))
  }),
)

app.delete(
  '/api/users/:id',
  requireAdmin,
  wrap(async (req) => {
    const id = idParam(req)
    if (id === req.user.id) throw new HttpError(400, 'Você não pode excluir o próprio usuário')
    const r = await q('DELETE FROM users WHERE id = $1 RETURNING id', [id])
    if (!r.length) throw new HttpError(404, 'Usuário não encontrado')
    return { ok: true }
  }),
)

// ---------------------------------------------------------------------------
// Ativos
// ---------------------------------------------------------------------------

const ASSET_SELECT = `
  SELECT a.*, p.name AS person_name
  FROM assets a LEFT JOIN people p ON p.id = a.person_id`

function assetOut(a) {
  return {
    id: a.id,
    tag: a.tag,
    name: a.name,
    serial: a.serial,
    category: a.category,
    status: a.status,
    personId: a.person_id,
    personName: a.person_name,
    location: a.location,
    acquiredAt: a.acquired_at,
    warrantyUntil: a.warranty_until,
    value: Number(a.value),
    notes: a.notes,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  }
}

async function nextTag() {
  const row = await one(`SELECT MAX(CAST(SUBSTR(tag, 4) AS INTEGER))::int AS n FROM assets WHERE tag ~ '^GL-[0-9]+$'`)
  return `GL-${String((row?.n || 0) + 1).padStart(5, '0')}`
}

async function assetInput(b) {
  const personId = b.personId ? Number(b.personId) : null
  if (personId && !(await one('SELECT 1 FROM people WHERE id = $1', [personId]))) throw new HttpError(400, 'Responsável não encontrado')
  return {
    tag: str(b.tag, 'Etiqueta', { max: 30 }),
    name: str(b.name, 'Nome do ativo', { required: true }),
    serial: str(b.serial, 'Número de série', { max: 80 }),
    category: oneOf(b.category, CATEGORIES, 'Categoria'),
    status: oneOf(b.status, ASSET_STATUS, 'Status'),
    personId,
    location: str(b.location, 'Localização'),
    acquiredAt: date(b.acquiredAt, 'Data de aquisição', { required: true }),
    warrantyUntil: date(b.warrantyUntil, 'Garantia'),
    value: num(b.value, 'Valor'),
    notes: str(b.notes, 'Observações', { max: 2000 }),
  }
}

const getAsset = (id) => one(`${ASSET_SELECT} WHERE a.id = $1`, [id])

app.get(
  '/api/assets',
  wrap(async () => (await q(`${ASSET_SELECT} ORDER BY a.created_at DESC, a.id DESC`)).map(assetOut)),
)

app.get(
  '/api/assets/next-tag',
  wrap(async () => ({ tag: await nextTag() })),
)

app.post(
  '/api/assets',
  requireWrite,
  wrap(async (req, res) => {
    const a = await assetInput(req.body)
    const row = await one(
      `INSERT INTO assets (tag, name, serial, category, status, person_id, location, acquired_at, warranty_until, value, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [a.tag || (await nextTag()), a.name, a.serial, a.category, a.status, a.personId, a.location, a.acquiredAt, a.warrantyUntil, a.value, a.notes],
    )
    res.status(201)
    return assetOut(await getAsset(row.id))
  }),
)

app.put(
  '/api/assets/:id',
  requireWrite,
  wrap(async (req) => {
    const id = idParam(req)
    const a = await assetInput(req.body)
    const r = await q(
      `UPDATE assets SET tag = $1, name = $2, serial = $3, category = $4, status = $5, person_id = $6, location = $7,
       acquired_at = $8, warranty_until = $9, value = $10, notes = $11, updated_at = ${NOW} WHERE id = $12 RETURNING id`,
      [a.tag || (await nextTag()), a.name, a.serial, a.category, a.status, a.personId, a.location, a.acquiredAt, a.warrantyUntil, a.value, a.notes, id],
    )
    if (!r.length) throw new HttpError(404, 'Ativo não encontrado')
    return assetOut(await getAsset(id))
  }),
)

app.delete(
  '/api/assets/:id',
  requireWrite,
  wrap(async (req) => {
    const r = await q('DELETE FROM assets WHERE id = $1 RETURNING id', [idParam(req)])
    if (!r.length) throw new HttpError(404, 'Ativo não encontrado')
    return { ok: true }
  }),
)

app.get(
  '/api/export/assets.csv',
  wrap(async (_req, res) => {
    const rows = await q(`${ASSET_SELECT} ORDER BY a.tag`)
    const head = ['Etiqueta', 'Nome', 'Série', 'Categoria', 'Status', 'Responsável', 'Localização', 'Aquisição', 'Garantia', 'Valor (R$)', 'Observações']
    const esc = (v) => {
      const s = v === null || v === undefined ? '' : String(v)
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [
      head,
      ...rows.map((a) => [a.tag, a.name, a.serial, a.category, a.status, a.person_name, a.location, a.acquired_at, a.warranty_until, String(a.value).replace('.', ','), a.notes]),
    ]
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="inventario-ativos-${today()}.csv"`)
    res.send('﻿' + lines.map((l) => l.map(esc).join(';')).join('\r\n'))
  }),
)

// ---------------------------------------------------------------------------
// Pessoas
// ---------------------------------------------------------------------------

function personOut(p) {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    department: p.department,
    jobTitle: p.job_title,
    location: p.location,
    since: p.since,
    assets: p.assets ?? 0,
  }
}

const PEOPLE_SELECT = `
  SELECT p.*, (SELECT COUNT(*)::int FROM assets a WHERE a.person_id = p.id) AS assets FROM people p`

function personInput(b) {
  return {
    name: str(b.name, 'Nome', { required: true }),
    email: str(b.email, 'E-mail', { required: true }).toLowerCase(),
    department: str(b.department, 'Departamento', { required: true }),
    jobTitle: str(b.jobTitle, 'Cargo'),
    location: str(b.location, 'Localização'),
    since: date(b.since, 'Data de entrada') || today(),
  }
}

app.get(
  '/api/people',
  wrap(async () => (await q(`${PEOPLE_SELECT} ORDER BY p.name`)).map(personOut)),
)

app.post(
  '/api/people',
  requireWrite,
  wrap(async (req, res) => {
    const p = personInput(req.body)
    const row = await one('INSERT INTO people (name, email, department, job_title, location, since) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [
      p.name, p.email, p.department, p.jobTitle, p.location, p.since,
    ])
    res.status(201)
    return personOut(await one(`${PEOPLE_SELECT} WHERE p.id = $1`, [row.id]))
  }),
)

app.put(
  '/api/people/:id',
  requireWrite,
  wrap(async (req) => {
    const id = idParam(req)
    const p = personInput(req.body)
    const r = await q('UPDATE people SET name = $1, email = $2, department = $3, job_title = $4, location = $5, since = $6 WHERE id = $7 RETURNING id', [
      p.name, p.email, p.department, p.jobTitle, p.location, p.since, id,
    ])
    if (!r.length) throw new HttpError(404, 'Pessoa não encontrada')
    return personOut(await one(`${PEOPLE_SELECT} WHERE p.id = $1`, [id]))
  }),
)

app.delete(
  '/api/people/:id',
  requireWrite,
  wrap(async (req) => {
    const id = idParam(req)
    await tx(async (run) => {
      // Ativos em uso pela pessoa voltam para o estoque
      await run(`UPDATE assets SET status = 'Disponível', updated_at = ${NOW} WHERE person_id = $1 AND status = 'Em uso'`, [id])
      const r = await run('DELETE FROM people WHERE id = $1 RETURNING id', [id])
      if (!r.length) throw new HttpError(404, 'Pessoa não encontrada')
    })
    return { ok: true }
  }),
)

// ---------------------------------------------------------------------------
// Ordens de serviço
// ---------------------------------------------------------------------------

const ORDER_SELECT = `
  SELECT o.*, a.name AS asset_name, a.tag AS asset_tag
  FROM service_orders o JOIN assets a ON a.id = o.asset_id`

function orderOut(o) {
  return {
    id: o.id,
    code: `OS-${String(1000 + o.id)}`,
    assetId: o.asset_id,
    assetName: o.asset_name,
    assetTag: o.asset_tag,
    detail: o.detail,
    type: o.type,
    status: o.status,
    tech: o.tech,
    openedAt: o.opened_at,
    dueAt: o.due_at,
    closedAt: o.closed_at,
    cost: Number(o.cost),
    late: o.status !== 'Concluída' && o.due_at < today(),
  }
}

/** Ativo com OS aberta fica em manutenção; ao encerrar a última, volta ao estado anterior. */
async function syncAssetMaintenance(run, assetId) {
  const [{ n }] = await run(`SELECT COUNT(*)::int AS n FROM service_orders WHERE asset_id = $1 AND status <> 'Concluída'`, [assetId])
  const [a] = await run('SELECT status, person_id FROM assets WHERE id = $1', [assetId])
  if (!a || a.status === 'Baixado') return
  if (n > 0 && a.status !== 'Manutenção') {
    await run(`UPDATE assets SET status = 'Manutenção', updated_at = ${NOW} WHERE id = $1`, [assetId])
  } else if (n === 0 && a.status === 'Manutenção') {
    await run(`UPDATE assets SET status = $1, updated_at = ${NOW} WHERE id = $2`, [a.person_id ? 'Em uso' : 'Disponível', assetId])
  }
}

async function orderInput(b) {
  const assetId = Number(b.assetId)
  if (!Number.isInteger(assetId) || !(await one('SELECT 1 FROM assets WHERE id = $1', [assetId]))) throw new HttpError(400, 'Selecione um ativo válido')
  return {
    assetId,
    detail: str(b.detail, 'Descrição', { required: true }),
    type: oneOf(b.type, ORDER_TYPES, 'Tipo'),
    status: oneOf(b.status, ORDER_STATUS, 'Status'),
    tech: str(b.tech, 'Técnico'),
    openedAt: date(b.openedAt, 'Abertura') || today(),
    dueAt: date(b.dueAt, 'Prazo', { required: true }),
    cost: num(b.cost, 'Custo'),
  }
}

const getOrder = (id) => one(`${ORDER_SELECT} WHERE o.id = $1`, [id])

app.get(
  '/api/orders',
  wrap(async () => (await q(`${ORDER_SELECT} ORDER BY o.id DESC`)).map(orderOut)),
)

app.post(
  '/api/orders',
  requireWrite,
  wrap(async (req, res) => {
    const o = await orderInput(req.body)
    const id = await tx(async (run) => {
      const [row] = await run(
        'INSERT INTO service_orders (asset_id, detail, type, status, tech, opened_at, due_at, closed_at, cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
        [o.assetId, o.detail, o.type, o.status, o.tech, o.openedAt, o.dueAt, o.status === 'Concluída' ? today() : null, o.cost],
      )
      await syncAssetMaintenance(run, o.assetId)
      return row.id
    })
    res.status(201)
    return orderOut(await getOrder(id))
  }),
)

app.put(
  '/api/orders/:id',
  requireWrite,
  wrap(async (req) => {
    const id = idParam(req)
    const prev = await one('SELECT * FROM service_orders WHERE id = $1', [id])
    if (!prev) throw new HttpError(404, 'Ordem de serviço não encontrada')
    const o = await orderInput(req.body)
    const closedAt = o.status === 'Concluída' ? prev.closed_at || today() : null
    await tx(async (run) => {
      await run(
        'UPDATE service_orders SET asset_id = $1, detail = $2, type = $3, status = $4, tech = $5, opened_at = $6, due_at = $7, closed_at = $8, cost = $9 WHERE id = $10',
        [o.assetId, o.detail, o.type, o.status, o.tech, o.openedAt, o.dueAt, closedAt, o.cost, id],
      )
      await syncAssetMaintenance(run, o.assetId)
      if (prev.asset_id !== o.assetId) await syncAssetMaintenance(run, prev.asset_id)
    })
    return orderOut(await getOrder(id))
  }),
)

app.delete(
  '/api/orders/:id',
  requireWrite,
  wrap(async (req) => {
    const id = idParam(req)
    const prev = await one('SELECT asset_id FROM service_orders WHERE id = $1', [id])
    if (!prev) throw new HttpError(404, 'Ordem de serviço não encontrada')
    await tx(async (run) => {
      await run('DELETE FROM service_orders WHERE id = $1', [id])
      await syncAssetMaintenance(run, prev.asset_id)
    })
    return { ok: true }
  }),
)

// ---------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------

app.get(
  '/api/stats',
  wrap(async () => {
    const assets = await q(ASSET_SELECT)
    const orders = await q('SELECT * FROM service_orders')
    const now = today()
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    const in90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
    const active = assets.filter((a) => a.status !== 'Baixado')
    const count = (pred) => active.filter(pred).length
    const ageYears = (a) => (Date.now() - Date.parse(a.acquired_at)) / (365.25 * 86400000)

    const byStatus = Object.fromEntries(ASSET_STATUS.map((s) => [s, assets.filter((a) => a.status === s).length]))
    const byCategory = CATEGORIES.map((c) => ({ name: c, value: count((a) => a.category === c) }))

    const openOrders = orders.filter((o) => o.status !== 'Concluída')
    const monthStart = now.slice(0, 8) + '01'
    const closed = orders.filter((o) => o.closed_at)
    const onTime = closed.filter((o) => o.closed_at <= o.due_at).length
    const avgRepairDays = closed.length
      ? closed.reduce((s, o) => s + Math.max(0, (Date.parse(o.closed_at) - Date.parse(o.opened_at)) / 86400000), 0) / closed.length
      : 0

    const months = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      months.push(d.toISOString().slice(0, 7))
    }
    const people = await one(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM assets a WHERE a.person_id = p.id))::int AS "withAssets" FROM people p`,
    )

    return {
      total: active.length,
      byStatus,
      byCategory,
      totalValue: active.reduce((s, a) => s + Number(a.value), 0),
      utilization: active.length ? byStatus['Em uso'] / active.length : 0,
      health: {
        withOwner: count((a) => a.person_id),
        inWarranty: count((a) => a.warranty_until && a.warranty_until >= now),
        withinLifetime: count((a) => ageYears(a) <= 4),
        warrantyExpired: count((a) => !a.warranty_until || a.warranty_until < now),
      },
      lifecycle: {
        upTo2: count((a) => ageYears(a) <= 2),
        from2to4: count((a) => ageYears(a) > 2 && ageYears(a) <= 4),
        over4: count((a) => ageYears(a) > 4),
      },
      alerts: {
        warrantyExpiring: count((a) => a.warranty_until && a.warranty_until >= now && a.warranty_until <= in30),
        warrantyExpiring90: count((a) => a.warranty_until && a.warranty_until >= now && a.warranty_until <= in90),
        inUseWithoutOwner: count((a) => a.status === 'Em uso' && !a.person_id),
        lateOrders: openOrders.filter((o) => o.due_at < now).length,
        waitingParts: openOrders.filter((o) => o.status === 'Aguardando peça').length,
        lowStock: CATEGORIES.filter((c) => count((a) => a.category === c && a.status === 'Disponível') <= 1),
      },
      maintenance: {
        open: openOrders.length,
        byStatus: Object.fromEntries(ORDER_STATUS.map((s) => [s, orders.filter((o) => o.status === s).length])),
        closedThisMonth: closed.filter((o) => o.closed_at >= monthStart).length,
        avgRepairDays,
        sla: closed.length ? onTime / closed.length : 1,
        cost: orders.reduce((s, o) => s + Number(o.cost), 0),
      },
      people,
      acquisitions: months.map((m) => {
        const inMonth = assets.filter((a) => a.acquired_at.startsWith(m))
        return { month: m, count: inMonth.length, value: inMonth.reduce((s, a) => s + Number(a.value), 0) }
      }),
    }
  }),
)

// ---------------------------------------------------------------------------
// Integrações (apenas preferências salvas)
// ---------------------------------------------------------------------------

app.get(
  '/api/integrations',
  wrap(async () => JSON.parse((await one(`SELECT value FROM settings WHERE key = 'integrations'`))?.value || '{}')),
)

app.put(
  '/api/integrations',
  requireAdmin,
  wrap(async (req) => {
    const clean = Object.fromEntries(Object.entries(req.body || {}).map(([k, v]) => [String(k).slice(0, 40), Boolean(v)]))
    await q(`INSERT INTO settings (key, value) VALUES ('integrations', $1) ON CONFLICT (key) DO UPDATE SET value = excluded.value`, [JSON.stringify(clean)])
    return clean
  }),
)

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Rota não encontrada')))

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' })
  if (err?.code === '23505') {
    const label = /tag/.test(err.constraint || err.message) ? 'essa etiqueta' : /email/.test(err.constraint || err.message) ? 'esse e-mail' : 'esse valor'
    return res.status(409).json({ error: `Já existe um cadastro com ${label}` })
  }
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})
