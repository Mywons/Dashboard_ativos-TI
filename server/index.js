import express from 'express'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { db, seed } from './db.js'
import { clearFails, hashPassword, loginBlocked, newToken, parseCookies, registerFail, verifyPassword } from './auth.js'

seed()

const app = express()
app.disable('x-powered-by')
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

const wrap = (fn) => (req, res, next) => {
  try {
    const out = fn(req, res)
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

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------

function setSessionCookie(req, res, token, remember) {
  const parts = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax']
  if (remember) parts.push(`Max-Age=${REMEMBER_DAYS * 86400}`)
  if (req.secure || process.env.COOKIE_SECURE === '1') parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

function authenticate(req, _res, next) {
  const token = parseCookies(req.headers.cookie)[COOKIE]
  if (token) {
    const row = db
      .prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > datetime('now')`)
      .get(token)
    if (row) {
      req.user = row
      req.token = token
    }
  }
  next()
}

const requireAuth = (req, _res, next) => next(req.user ? undefined : new HttpError(401, 'Faça login para continuar'))
const requireWrite = (req, _res, next) =>
  next(req.user?.role === 'admin' || req.user?.role === 'tecnico' ? undefined : new HttpError(403, 'Seu perfil é somente leitura'))
const requireAdmin = (req, _res, next) => next(req.user?.role === 'admin' ? undefined : new HttpError(403, 'Apenas administradores'))

app.use('/api', authenticate)

app.post(
  '/api/auth/login',
  wrap((req, res) => {
    const email = str(req.body.email, 'E-mail', { required: true }).toLowerCase()
    const password = String(req.body.password ?? '')
    const key = `${req.ip}|${email}`
    if (loginBlocked(key)) throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos e tente novamente.')

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user || !verifyPassword(password, user.password_hash)) {
      registerFail(key)
      throw new HttpError(401, 'E-mail ou senha incorretos')
    }
    clearFails(key)

    const remember = Boolean(req.body.remember)
    const token = newToken()
    const hours = remember ? REMEMBER_DAYS * 24 : SESSION_HOURS
    db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', ?))`).run(token, user.id, `+${hours} hours`)
    db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(user.id)
    db.prepare(`DELETE FROM sessions WHERE expires_at <= datetime('now')`).run()
    setSessionCookie(req, res, token, remember)
    return { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) }
  }),
)

app.post(
  '/api/auth/logout',
  wrap((req, res) => {
    if (req.token) db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token)
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
    return { ok: true }
  }),
)

app.get(
  '/api/auth/me',
  requireAuth,
  wrap((req) => ({ user: publicUser(req.user) })),
)

app.use('/api', requireAuth)

// ---------------------------------------------------------------------------
// Minha conta
// ---------------------------------------------------------------------------

app.patch(
  '/api/me',
  wrap((req) => {
    const b = req.body
    const u = req.user
    const prefs = b.prefs && typeof b.prefs === 'object' ? JSON.stringify({ ...JSON.parse(u.prefs || '{}'), ...b.prefs }) : u.prefs
    db.prepare('UPDATE users SET name = ?, phone = ?, department = ?, job_title = ?, location = ?, prefs = ? WHERE id = ?').run(
      b.name !== undefined ? str(b.name, 'Nome', { required: true }) : u.name,
      b.phone !== undefined ? str(b.phone, 'Telefone') : u.phone,
      b.department !== undefined ? str(b.department, 'Departamento') : u.department,
      b.jobTitle !== undefined ? str(b.jobTitle, 'Cargo') : u.job_title,
      b.location !== undefined ? str(b.location, 'Local') : u.location,
      prefs,
      u.id,
    )
    return { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(u.id)) }
  }),
)

app.post(
  '/api/me/password',
  wrap((req) => {
    const current = String(req.body.current ?? '')
    const next = String(req.body.next ?? '')
    if (!verifyPassword(current, req.user.password_hash)) throw new HttpError(400, 'Senha atual incorreta')
    if (next.length < 8) throw new HttpError(400, 'A nova senha precisa ter pelo menos 8 caracteres')
    db.prepare(`UPDATE users SET password_hash = ?, password_changed_at = datetime('now') WHERE id = ?`).run(hashPassword(next), req.user.id)
    // Encerra as outras sessões do usuário
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token <> ?').run(req.user.id, req.token)
    return { ok: true }
  }),
)

// ---------------------------------------------------------------------------
// Usuários do sistema (cadastro feito pelo administrador)
// ---------------------------------------------------------------------------

app.get(
  '/api/users',
  requireAdmin,
  wrap(() => db.prepare('SELECT * FROM users ORDER BY name').all().map(publicUser)),
)

app.post(
  '/api/users',
  requireAdmin,
  wrap((req, res) => {
    const b = req.body
    const password = String(b.password ?? '')
    if (password.length < 8) throw new HttpError(400, 'A senha inicial precisa ter pelo menos 8 caracteres')
    const info = db
      .prepare('INSERT INTO users (name, email, password_hash, role, department, job_title) VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        str(b.name, 'Nome', { required: true }),
        str(b.email, 'E-mail', { required: true }).toLowerCase(),
        hashPassword(password),
        oneOf(b.role, ROLES, 'Perfil'),
        str(b.department, 'Departamento'),
        str(b.jobTitle, 'Cargo'),
      )
    res.status(201)
    return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid))
  }),
)

app.patch(
  '/api/users/:id',
  requireAdmin,
  wrap((req) => {
    const id = idParam(req)
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    if (!u) throw new HttpError(404, 'Usuário não encontrado')
    const role = req.body.role !== undefined ? oneOf(req.body.role, ROLES, 'Perfil') : u.role
    if (req.body.password && String(req.body.password).length < 8) throw new HttpError(400, 'A senha precisa ter pelo menos 8 caracteres')
    if (u.role === 'admin' && role !== 'admin') {
      const { n } = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin'`).get()
      if (n <= 1) throw new HttpError(400, 'O sistema precisa de pelo menos um administrador')
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
    if (req.body.password) {
      db.prepare(`UPDATE users SET password_hash = ?, password_changed_at = datetime('now') WHERE id = ?`).run(hashPassword(String(req.body.password)), id)
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id)
    }
    return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id))
  }),
)

app.delete(
  '/api/users/:id',
  requireAdmin,
  wrap((req) => {
    const id = idParam(req)
    if (id === req.user.id) throw new HttpError(400, 'Você não pode excluir o próprio usuário')
    const r = db.prepare('DELETE FROM users WHERE id = ?').run(id)
    if (!r.changes) throw new HttpError(404, 'Usuário não encontrado')
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
    value: a.value,
    notes: a.notes,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  }
}

function nextTag() {
  const row = db.prepare(`SELECT MAX(CAST(SUBSTR(tag, 4) AS INTEGER)) AS n FROM assets WHERE tag LIKE 'GL-%'`).get()
  return `GL-${String((row.n || 0) + 1).padStart(5, '0')}`
}

function assetInput(b) {
  const personId = b.personId ? Number(b.personId) : null
  if (personId && !db.prepare('SELECT 1 FROM people WHERE id = ?').get(personId)) throw new HttpError(400, 'Responsável não encontrado')
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

app.get(
  '/api/assets',
  wrap(() => db.prepare(`${ASSET_SELECT} ORDER BY a.created_at DESC, a.id DESC`).all().map(assetOut)),
)

app.get(
  '/api/assets/next-tag',
  wrap(() => ({ tag: nextTag() })),
)

app.post(
  '/api/assets',
  requireWrite,
  wrap((req, res) => {
    const a = assetInput(req.body)
    const info = db
      .prepare(
        `INSERT INTO assets (tag, name, serial, category, status, person_id, location, acquired_at, warranty_until, value, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(a.tag || nextTag(), a.name, a.serial, a.category, a.status, a.personId, a.location, a.acquiredAt, a.warrantyUntil, a.value, a.notes)
    res.status(201)
    return assetOut(db.prepare(`${ASSET_SELECT} WHERE a.id = ?`).get(info.lastInsertRowid))
  }),
)

app.put(
  '/api/assets/:id',
  requireWrite,
  wrap((req) => {
    const id = idParam(req)
    const a = assetInput(req.body)
    const r = db
      .prepare(
        `UPDATE assets SET tag = ?, name = ?, serial = ?, category = ?, status = ?, person_id = ?, location = ?,
         acquired_at = ?, warranty_until = ?, value = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .run(a.tag || nextTag(), a.name, a.serial, a.category, a.status, a.personId, a.location, a.acquiredAt, a.warrantyUntil, a.value, a.notes, id)
    if (!r.changes) throw new HttpError(404, 'Ativo não encontrado')
    return assetOut(db.prepare(`${ASSET_SELECT} WHERE a.id = ?`).get(id))
  }),
)

app.delete(
  '/api/assets/:id',
  requireWrite,
  wrap((req) => {
    const r = db.prepare('DELETE FROM assets WHERE id = ?').run(idParam(req))
    if (!r.changes) throw new HttpError(404, 'Ativo não encontrado')
    return { ok: true }
  }),
)

app.get('/api/export/assets.csv', (_req, res) => {
  const rows = db.prepare(`${ASSET_SELECT} ORDER BY a.tag`).all()
  const head = ['Etiqueta', 'Nome', 'Série', 'Categoria', 'Status', 'Responsável', 'Localização', 'Aquisição', 'Garantia', 'Valor (R$)', 'Observações']
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [head, ...rows.map((a) => [a.tag, a.name, a.serial, a.category, a.status, a.person_name, a.location, a.acquired_at, a.warranty_until, String(a.value).replace('.', ','), a.notes])]
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="inventario-ativos-${today()}.csv"`)
  res.send('﻿' + lines.map((l) => l.map(esc).join(';')).join('\r\n'))
})

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
  SELECT p.*, (SELECT COUNT(*) FROM assets a WHERE a.person_id = p.id) AS assets FROM people p`

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
  wrap(() => db.prepare(`${PEOPLE_SELECT} ORDER BY p.name`).all().map(personOut)),
)

app.post(
  '/api/people',
  requireWrite,
  wrap((req, res) => {
    const p = personInput(req.body)
    const info = db
      .prepare('INSERT INTO people (name, email, department, job_title, location, since) VALUES (?, ?, ?, ?, ?, ?)')
      .run(p.name, p.email, p.department, p.jobTitle, p.location, p.since)
    res.status(201)
    return personOut(db.prepare(`${PEOPLE_SELECT} WHERE p.id = ?`).get(info.lastInsertRowid))
  }),
)

app.put(
  '/api/people/:id',
  requireWrite,
  wrap((req) => {
    const id = idParam(req)
    const p = personInput(req.body)
    const r = db
      .prepare('UPDATE people SET name = ?, email = ?, department = ?, job_title = ?, location = ?, since = ? WHERE id = ?')
      .run(p.name, p.email, p.department, p.jobTitle, p.location, p.since, id)
    if (!r.changes) throw new HttpError(404, 'Pessoa não encontrada')
    return personOut(db.prepare(`${PEOPLE_SELECT} WHERE p.id = ?`).get(id))
  }),
)

app.delete(
  '/api/people/:id',
  requireWrite,
  wrap((req) => {
    const id = idParam(req)
    // Ativos em uso pela pessoa voltam para o estoque
    db.prepare(`UPDATE assets SET status = 'Disponível', updated_at = datetime('now') WHERE person_id = ? AND status = 'Em uso'`).run(id)
    const r = db.prepare('DELETE FROM people WHERE id = ?').run(id)
    if (!r.changes) throw new HttpError(404, 'Pessoa não encontrada')
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
    cost: o.cost,
    late: o.status !== 'Concluída' && o.due_at < today(),
  }
}

/** Ativo com OS aberta fica em manutenção; ao encerrar a última, volta ao estado anterior. */
function syncAssetMaintenance(assetId) {
  const { n } = db.prepare(`SELECT COUNT(*) AS n FROM service_orders WHERE asset_id = ? AND status <> 'Concluída'`).get(assetId)
  const a = db.prepare('SELECT status, person_id FROM assets WHERE id = ?').get(assetId)
  if (!a || a.status === 'Baixado') return
  if (n > 0 && a.status !== 'Manutenção') {
    db.prepare(`UPDATE assets SET status = 'Manutenção', updated_at = datetime('now') WHERE id = ?`).run(assetId)
  } else if (n === 0 && a.status === 'Manutenção') {
    db.prepare(`UPDATE assets SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(a.person_id ? 'Em uso' : 'Disponível', assetId)
  }
}

function orderInput(b) {
  const assetId = Number(b.assetId)
  if (!db.prepare('SELECT 1 FROM assets WHERE id = ?').get(assetId)) throw new HttpError(400, 'Selecione um ativo válido')
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

app.get(
  '/api/orders',
  wrap(() => db.prepare(`${ORDER_SELECT} ORDER BY o.id DESC`).all().map(orderOut)),
)

app.post(
  '/api/orders',
  requireWrite,
  wrap((req, res) => {
    const o = orderInput(req.body)
    const info = db
      .prepare('INSERT INTO service_orders (asset_id, detail, type, status, tech, opened_at, due_at, closed_at, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(o.assetId, o.detail, o.type, o.status, o.tech, o.openedAt, o.dueAt, o.status === 'Concluída' ? today() : null, o.cost)
    syncAssetMaintenance(o.assetId)
    res.status(201)
    return orderOut(db.prepare(`${ORDER_SELECT} WHERE o.id = ?`).get(info.lastInsertRowid))
  }),
)

app.put(
  '/api/orders/:id',
  requireWrite,
  wrap((req) => {
    const id = idParam(req)
    const prev = db.prepare('SELECT * FROM service_orders WHERE id = ?').get(id)
    if (!prev) throw new HttpError(404, 'Ordem de serviço não encontrada')
    const o = orderInput(req.body)
    const closedAt = o.status === 'Concluída' ? prev.closed_at || today() : null
    db.prepare('UPDATE service_orders SET asset_id = ?, detail = ?, type = ?, status = ?, tech = ?, opened_at = ?, due_at = ?, closed_at = ?, cost = ? WHERE id = ?').run(
      o.assetId, o.detail, o.type, o.status, o.tech, o.openedAt, o.dueAt, closedAt, o.cost, id,
    )
    syncAssetMaintenance(o.assetId)
    if (prev.asset_id !== o.assetId) syncAssetMaintenance(prev.asset_id)
    return orderOut(db.prepare(`${ORDER_SELECT} WHERE o.id = ?`).get(id))
  }),
)

app.delete(
  '/api/orders/:id',
  requireWrite,
  wrap((req) => {
    const id = idParam(req)
    const prev = db.prepare('SELECT asset_id FROM service_orders WHERE id = ?').get(id)
    if (!prev) throw new HttpError(404, 'Ordem de serviço não encontrada')
    db.prepare('DELETE FROM service_orders WHERE id = ?').run(id)
    syncAssetMaintenance(prev.asset_id)
    return { ok: true }
  }),
)

// ---------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------

app.get(
  '/api/stats',
  wrap(() => {
    const assets = db.prepare(ASSET_SELECT).all()
    const orders = db.prepare('SELECT * FROM service_orders').all()
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
    const closedThisMonth = orders.filter((o) => o.closed_at && o.closed_at >= monthStart)
    const closed = orders.filter((o) => o.closed_at)
    const onTime = closed.filter((o) => o.closed_at <= o.due_at).length
    const avgRepairDays = closed.length
      ? closed.reduce((s, o) => s + Math.max(0, (Date.parse(o.closed_at) - Date.parse(o.opened_at)) / 86400000), 0) / closed.length
      : 0

    // Aquisições dos últimos 12 meses
    const months = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      months.push(d.toISOString().slice(0, 7))
    }
    const acquisitions = months.map((m) => ({
      month: m,
      count: assets.filter((a) => a.acquired_at.startsWith(m)).length,
      value: assets.filter((a) => a.acquired_at.startsWith(m)).reduce((s, a) => s + a.value, 0),
    }))

    return {
      total: active.length,
      byStatus,
      byCategory,
      totalValue: active.reduce((s, a) => s + a.value, 0),
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
        closedThisMonth: closedThisMonth.length,
        avgRepairDays,
        sla: closed.length ? onTime / closed.length : 1,
        cost: orders.reduce((s, o) => s + o.cost, 0),
      },
      people: db.prepare(`SELECT COUNT(*) AS total, SUM(EXISTS (SELECT 1 FROM assets a WHERE a.person_id = p.id)) AS withAssets FROM people p`).get(),
      acquisitions,
    }
  }),
)

// ---------------------------------------------------------------------------
// Integrações (apenas preferências salvas)
// ---------------------------------------------------------------------------

app.get(
  '/api/integrations',
  wrap(() => JSON.parse(db.prepare(`SELECT value FROM settings WHERE key = 'integrations'`).get()?.value || '{}')),
)

app.put(
  '/api/integrations',
  requireAdmin,
  wrap((req) => {
    const clean = Object.fromEntries(Object.entries(req.body || {}).map(([k, v]) => [String(k).slice(0, 40), Boolean(v)]))
    db.prepare(`INSERT INTO settings (key, value) VALUES ('integrations', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(JSON.stringify(clean))
    return clean
  }),
)

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Rota não encontrada')))

// ---------------------------------------------------------------------------
// Front-end compilado (produção)
// ---------------------------------------------------------------------------

const dist = resolve('dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')))
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' })
  if (String(err?.message).includes('UNIQUE constraint failed')) {
    const field = err.message.split('.').pop()
    const label = { tag: 'essa etiqueta', email: 'esse e-mail' }[field] || `esse valor (${field})`
    return res.status(409).json({ error: `Já existe um cadastro com ${label}` })
  }
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`))
