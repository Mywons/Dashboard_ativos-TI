// API de demonstração que roda inteira no navegador.
// Os dados ficam no localStorage deste navegador: não há servidor, banco nem login.

import {
  ASSET_STATUS,
  CATEGORIES,
  ORDER_STATUS,
  ORDER_TYPES,
  type Asset,
  type AssetStatus,
  type Category,
  type OrderStatus,
  type OrderType,
  type Person,
  type ServiceOrder,
  type Stats,
  type User,
} from './data'

export class MockError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// Modelo armazenado
// ---------------------------------------------------------------------------

interface StoredAsset {
  id: number
  tag: string
  name: string
  serial: string
  category: Category
  status: AssetStatus
  personId: number | null
  location: string
  acquiredAt: string
  warrantyUntil: string | null
  value: number
  notes: string
  createdAt: string
  updatedAt: string
}

interface StoredPerson {
  id: number
  name: string
  email: string
  department: string
  jobTitle: string
  location: string
  since: string
}

interface StoredOrder {
  id: number
  assetId: number
  detail: string
  type: OrderType
  status: OrderStatus
  tech: string
  openedAt: string
  dueAt: string
  closedAt: string | null
  cost: number
}

interface Db {
  version: 1
  user: User
  people: StoredPerson[]
  assets: StoredAsset[]
  orders: StoredOrder[]
  integrations: Record<string, boolean>
  seq: { people: number; assets: number; orders: number }
}

const STORAGE_KEY = 'glti-demo-v1'

const today = () => new Date().toISOString().slice(0, 10)
const nowStamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
function isoDaysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
function addYears(iso: string, years: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCFullYear(d.getUTCFullYear() + years)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Dados iniciais
// ---------------------------------------------------------------------------

function seed(): Db {
  const stamp = nowStamp()
  const peopleRaw: [string, string, string, string, string][] = [
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
  const people: StoredPerson[] = peopleRaw.map(([name, department, jobTitle, location, since], i) => ({
    id: i + 1,
    name,
    email: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(' ', '.') + '@grupolegal.com.br',
    department,
    jobTitle,
    location,
    since,
  }))
  const pid = (name: string | null) => (name ? people.find((p) => p.name === name)!.id : null)

  // [nome, série, categoria, status, responsável, local, aquisição, anos de garantia, valor]
  const assetsRaw: [string, string, Category, AssetStatus, string | null, string, string, number, number][] = [
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
  const shift = (iso: string) => {
    const d = new Date(iso + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + shiftDays)
    return d.toISOString().slice(0, 10)
  }
  const assets: StoredAsset[] = assetsRaw.map(([name, serial, category, status, owner, location, acqRaw, years, value], i) => {
    const acquiredAt = shift(acqRaw)
    return {
      id: i + 1,
      tag: `GL-${String(410 + i).padStart(5, '0')}`,
      name,
      serial,
      category,
      status,
      personId: pid(owner),
      location,
      acquiredAt,
      warrantyUntil: addYears(acquiredAt, years),
      value,
      notes: '',
      createdAt: stamp,
      updatedAt: stamp,
    }
  })
  // Algumas garantias vencendo nos próximos 30 dias para os alertas
  assets[2].warrantyUntil = isoDaysFromNow(12)
  assets[12].warrantyUntil = isoDaysFromNow(25)

  // [índice do ativo, detalhe, tipo, status, técnico, aberta há N dias, prazo em N dias, custo]
  const ordersRaw: [number, string, OrderType, OrderStatus, string, number, number, number][] = [
    [3, 'Teclado com falhas', 'Corretiva', 'Em andamento', 'Ana Ribeiro', -2, 2, 320],
    [8, 'Troca de bateria', 'Corretiva', 'Aguardando peça', 'Assist. externa', -6, -1, 1150],
    [13, 'Tela trincada', 'Corretiva', 'Aberta', 'Ana Ribeiro', 0, 6, 0],
    [4, 'Upgrade de RAM 16→32 GB', 'Upgrade', 'Concluída', 'Lucas Martins', -9, -5, 480],
    [6, 'Limpeza e pasta térmica', 'Preventiva', 'Concluída', 'Lucas Martins', -14, -12, 90],
  ]
  const orders: StoredOrder[] = ordersRaw.map(([ai, detail, type, status, tech, opened, due, cost], i) => ({
    id: i + 1,
    assetId: assets[ai].id,
    detail,
    type,
    status,
    tech,
    openedAt: isoDaysFromNow(opened),
    dueAt: isoDaysFromNow(due),
    closedAt: status === 'Concluída' ? isoDaysFromNow(due) : null,
    cost,
  }))

  return {
    version: 1,
    user: {
      id: 1,
      name: 'Davi Gomes',
      email: 'davi.gomes@grupolegal.com.br',
      role: 'admin',
      phone: '(11) 98876-5432',
      department: 'Tecnologia da Informação',
      jobTitle: 'Coordenador de TI',
      location: 'São Paulo · Matriz',
      prefs: {},
      passwordChangedAt: stamp,
      lastLoginAt: stamp,
      createdAt: stamp,
    },
    people,
    assets,
    orders,
    integrations: { entra: true, intune: true, workspace: false, smtp: true, teams: false, agent: true },
    seq: { people: people.length, assets: assets.length, orders: orders.length },
  }
}

// ---------------------------------------------------------------------------
// Persistência no navegador
// ---------------------------------------------------------------------------

let db: Db | null = null

function load(): Db {
  if (db) return db
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Db
      if (parsed?.version === 1) return (db = parsed)
    }
  } catch {
    // localStorage indisponível ou dado corrompido: começa do zero
  }
  db = seed()
  save()
  return db
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Sem localStorage (ex.: navegação privada restrita): os dados ficam só nesta aba
  }
}

/** Volta aos dados de exemplo. */
export function resetDemo() {
  db = seed()
  save()
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

type Body = Record<string, unknown>

function str(v: unknown, field: string, { required = false, max = 200 } = {}) {
  const s = v === undefined || v === null ? '' : String(v).trim()
  if (required && !s) throw new MockError(400, `Campo obrigatório: ${field}`)
  if (s.length > max) throw new MockError(400, `${field} muito longo (máx. ${max})`)
  return s
}

function oneOf<T extends string>(v: unknown, list: readonly T[], field: string): T {
  if (!list.includes(v as T)) throw new MockError(400, `Valor inválido para ${field}`)
  return v as T
}

function date(v: unknown, field: string, { required = false } = {}) {
  if (!v) {
    if (required) throw new MockError(400, `Campo obrigatório: ${field}`)
    return null
  }
  const s = String(v)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) throw new MockError(400, `${field} inválida`)
  return s
}

function num(v: unknown, field: string) {
  if (v === undefined || v === null || v === '') return 0
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) throw new MockError(400, `${field} inválido`)
  return n
}

// ---------------------------------------------------------------------------
// Conversões para o formato que as telas usam
// ---------------------------------------------------------------------------

function assetOut(d: Db, a: StoredAsset): Asset {
  return { ...a, personName: d.people.find((p) => p.id === a.personId)?.name ?? null }
}

function personOut(d: Db, p: StoredPerson): Person {
  return { ...p, assets: d.assets.filter((a) => a.personId === p.id).length }
}

function orderOut(d: Db, o: StoredOrder): ServiceOrder {
  const a = d.assets.find((x) => x.id === o.assetId)
  return {
    ...o,
    code: `OS-${1000 + o.id}`,
    assetName: a?.name ?? '—',
    assetTag: a?.tag ?? '—',
    late: o.status !== 'Concluída' && o.dueAt < today(),
  }
}

function nextTag(d: Db) {
  const max = d.assets.reduce((m, a) => {
    const n = /^GL-(\d+)$/i.exec(a.tag)
    return n ? Math.max(m, Number(n[1])) : m
  }, 0)
  return `GL-${String(max + 1).padStart(5, '0')}`
}

function assetInput(d: Db, b: Body, selfId?: number) {
  const personId = b.personId ? Number(b.personId) : null
  if (personId && !d.people.some((p) => p.id === personId)) throw new MockError(400, 'Responsável não encontrado')
  const tag = str(b.tag, 'Etiqueta', { max: 30 }) || nextTag(d)
  if (d.assets.some((a) => a.id !== selfId && a.tag.toLowerCase() === tag.toLowerCase())) throw new MockError(409, 'Já existe um cadastro com essa etiqueta')
  return {
    tag,
    name: str(b.name, 'Nome do ativo', { required: true }),
    serial: str(b.serial, 'Número de série', { max: 80 }),
    category: oneOf(b.category, CATEGORIES, 'Categoria'),
    status: oneOf(b.status, ASSET_STATUS, 'Status'),
    personId,
    location: str(b.location, 'Localização'),
    acquiredAt: date(b.acquiredAt, 'Data de aquisição', { required: true })!,
    warrantyUntil: date(b.warrantyUntil, 'Garantia'),
    value: num(b.value, 'Valor'),
    notes: str(b.notes, 'Observações', { max: 2000 }),
  }
}

function personInput(d: Db, b: Body, selfId?: number) {
  const email = str(b.email, 'E-mail', { required: true }).toLowerCase()
  if (d.people.some((p) => p.id !== selfId && p.email === email)) throw new MockError(409, 'Já existe um cadastro com esse e-mail')
  return {
    name: str(b.name, 'Nome', { required: true }),
    email,
    department: str(b.department, 'Departamento', { required: true }),
    jobTitle: str(b.jobTitle, 'Cargo'),
    location: str(b.location, 'Localização'),
    since: date(b.since, 'Data de entrada') || today(),
  }
}

function orderInput(d: Db, b: Body) {
  const assetId = Number(b.assetId)
  if (!d.assets.some((a) => a.id === assetId)) throw new MockError(400, 'Selecione um ativo válido')
  return {
    assetId,
    detail: str(b.detail, 'Descrição', { required: true }),
    type: oneOf(b.type, ORDER_TYPES, 'Tipo'),
    status: oneOf(b.status, ORDER_STATUS, 'Status'),
    tech: str(b.tech, 'Técnico'),
    openedAt: date(b.openedAt, 'Abertura') || today(),
    dueAt: date(b.dueAt, 'Prazo', { required: true })!,
    cost: num(b.cost, 'Custo'),
  }
}

/** Ativo com OS aberta fica em manutenção; ao encerrar a última, volta ao estado anterior. */
function syncAssetMaintenance(d: Db, assetId: number) {
  const a = d.assets.find((x) => x.id === assetId)
  if (!a || a.status === 'Baixado') return
  const open = d.orders.some((o) => o.assetId === assetId && o.status !== 'Concluída')
  if (open && a.status !== 'Manutenção') a.status = 'Manutenção'
  else if (!open && a.status === 'Manutenção') a.status = a.personId ? 'Em uso' : 'Disponível'
  else return
  a.updatedAt = nowStamp()
}

function findIndex<T extends { id: number }>(list: T[], id: number, what: string) {
  const i = list.findIndex((x) => x.id === id)
  if (i < 0) throw new MockError(404, `${what} não encontrado(a)`)
  return i
}

// ---------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------

function stats(d: Db): Stats {
  const now = today()
  const in30 = isoDaysFromNow(30)
  const in90 = isoDaysFromNow(90)
  const active = d.assets.filter((a) => a.status !== 'Baixado')
  const count = (pred: (a: StoredAsset) => unknown) => active.filter(pred).length
  const ageYears = (a: StoredAsset) => (Date.now() - Date.parse(a.acquiredAt)) / (365.25 * 86400000)

  const byStatus = Object.fromEntries(ASSET_STATUS.map((s) => [s, d.assets.filter((a) => a.status === s).length])) as Stats['byStatus']
  const openOrders = d.orders.filter((o) => o.status !== 'Concluída')
  const closed = d.orders.filter((o) => o.closedAt)
  const monthStart = now.slice(0, 8) + '01'

  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    const x = new Date()
    x.setDate(1)
    x.setMonth(x.getMonth() - i)
    months.push(x.toISOString().slice(0, 7))
  }

  return {
    total: active.length,
    byStatus,
    byCategory: CATEGORIES.map((c) => ({ name: c, value: count((a) => a.category === c) })),
    totalValue: active.reduce((s, a) => s + a.value, 0),
    utilization: active.length ? byStatus['Em uso'] / active.length : 0,
    health: {
      withOwner: count((a) => a.personId),
      inWarranty: count((a) => a.warrantyUntil && a.warrantyUntil >= now),
      withinLifetime: count((a) => ageYears(a) <= 4),
      warrantyExpired: count((a) => !a.warrantyUntil || a.warrantyUntil < now),
    },
    lifecycle: {
      upTo2: count((a) => ageYears(a) <= 2),
      from2to4: count((a) => ageYears(a) > 2 && ageYears(a) <= 4),
      over4: count((a) => ageYears(a) > 4),
    },
    alerts: {
      warrantyExpiring: count((a) => a.warrantyUntil && a.warrantyUntil >= now && a.warrantyUntil <= in30),
      warrantyExpiring90: count((a) => a.warrantyUntil && a.warrantyUntil >= now && a.warrantyUntil <= in90),
      inUseWithoutOwner: count((a) => a.status === 'Em uso' && !a.personId),
      lateOrders: openOrders.filter((o) => o.dueAt < now).length,
      waitingParts: openOrders.filter((o) => o.status === 'Aguardando peça').length,
      lowStock: CATEGORIES.filter((c) => count((a) => a.category === c && a.status === 'Disponível') <= 1),
    },
    maintenance: {
      open: openOrders.length,
      byStatus: Object.fromEntries(ORDER_STATUS.map((s) => [s, d.orders.filter((o) => o.status === s).length])) as Stats['maintenance']['byStatus'],
      closedThisMonth: closed.filter((o) => (o.closedAt ?? '') >= monthStart).length,
      avgRepairDays: closed.length
        ? closed.reduce((s, o) => s + Math.max(0, (Date.parse(o.closedAt!) - Date.parse(o.openedAt)) / 86400000), 0) / closed.length
        : 0,
      sla: closed.length ? closed.filter((o) => o.closedAt! <= o.dueAt).length / closed.length : 1,
      cost: d.orders.reduce((s, o) => s + o.cost, 0),
    },
    people: { total: d.people.length, withAssets: d.people.filter((p) => d.assets.some((a) => a.personId === p.id)).length },
    acquisitions: months.map((m) => {
      const inMonth = d.assets.filter((a) => a.acquiredAt.startsWith(m))
      return { month: m, count: inMonth.length, value: inMonth.reduce((s, a) => s + a.value, 0) }
    }),
  }
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------

/** Atende uma "requisição" como se fosse o servidor. Escritas são salvas no navegador. */
export function handle(method: string, path: string, body: Body = {}): unknown {
  const d = load()
  const [, resource, idOrSub] = path.split('?')[0].split('/')
  const id = Number(idOrSub)
  const write = method !== 'GET'
  const out = route()
  if (write) save()
  return structuredClone(out)

  function route(): unknown {
    switch (resource) {
      case 'me':
        if (method === 'GET') return { user: d.user }
        d.user = {
          ...d.user,
          name: body.name !== undefined ? str(body.name, 'Nome', { required: true }) : d.user.name,
          phone: body.phone !== undefined ? str(body.phone, 'Telefone') : d.user.phone,
          department: body.department !== undefined ? str(body.department, 'Departamento') : d.user.department,
          jobTitle: body.jobTitle !== undefined ? str(body.jobTitle, 'Cargo') : d.user.jobTitle,
          location: body.location !== undefined ? str(body.location, 'Local') : d.user.location,
        }
        return { user: d.user }

      case 'stats':
        return stats(d)

      case 'integrations':
        if (method === 'PUT') d.integrations = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, Boolean(v)]))
        return d.integrations

      case 'assets': {
        if (idOrSub === 'next-tag') return { tag: nextTag(d) }
        if (method === 'GET') return [...d.assets].sort((a, b) => b.id - a.id).map((a) => assetOut(d, a))
        if (method === 'POST') {
          const a: StoredAsset = { id: ++d.seq.assets, ...assetInput(d, body), createdAt: nowStamp(), updatedAt: nowStamp() }
          d.assets.push(a)
          return assetOut(d, a)
        }
        const i = findIndex(d.assets, id, 'Ativo')
        if (method === 'PUT') {
          d.assets[i] = { ...d.assets[i], ...assetInput(d, body, id), updatedAt: nowStamp() }
          return assetOut(d, d.assets[i])
        }
        if (method === 'DELETE') {
          d.assets.splice(i, 1)
          d.orders = d.orders.filter((o) => o.assetId !== id)
          return { ok: true }
        }
        break
      }

      case 'people': {
        if (method === 'GET') return [...d.people].sort((a, b) => a.name.localeCompare(b.name)).map((p) => personOut(d, p))
        if (method === 'POST') {
          const p: StoredPerson = { id: ++d.seq.people, ...personInput(d, body) }
          d.people.push(p)
          return personOut(d, p)
        }
        const i = findIndex(d.people, id, 'Pessoa')
        if (method === 'PUT') {
          d.people[i] = { ...d.people[i], ...personInput(d, body, id) }
          return personOut(d, d.people[i])
        }
        if (method === 'DELETE') {
          // Ativos da pessoa ficam sem responsável; os que estavam em uso voltam ao estoque
          for (const a of d.assets) {
            if (a.personId !== id) continue
            if (a.status === 'Em uso') a.status = 'Disponível'
            a.personId = null
            a.updatedAt = nowStamp()
          }
          d.people.splice(i, 1)
          return { ok: true }
        }
        break
      }

      case 'orders': {
        if (method === 'GET') return [...d.orders].sort((a, b) => b.id - a.id).map((o) => orderOut(d, o))
        if (method === 'POST') {
          const input = orderInput(d, body)
          const o: StoredOrder = { id: ++d.seq.orders, ...input, closedAt: input.status === 'Concluída' ? today() : null }
          d.orders.push(o)
          syncAssetMaintenance(d, o.assetId)
          return orderOut(d, o)
        }
        const i = findIndex(d.orders, id, 'Ordem de serviço')
        if (method === 'PUT') {
          const prev = d.orders[i]
          const input = orderInput(d, body)
          d.orders[i] = { ...prev, ...input, closedAt: input.status === 'Concluída' ? prev.closedAt || today() : null }
          syncAssetMaintenance(d, input.assetId)
          if (prev.assetId !== input.assetId) syncAssetMaintenance(d, prev.assetId)
          return orderOut(d, d.orders[i])
        }
        if (method === 'DELETE') {
          const [removed] = d.orders.splice(i, 1)
          syncAssetMaintenance(d, removed.assetId)
          return { ok: true }
        }
        break
      }
    }
    throw new MockError(404, 'Rota não encontrada')
  }
}

/** CSV do inventário completo (mesmo formato da antiga API). */
export function inventoryCsv() {
  const d = load()
  const rows = [...d.assets].sort((a, b) => a.tag.localeCompare(b.tag)).map((a) => assetOut(d, a))
  return {
    filename: `inventario-ativos-${today()}.csv`,
    head: ['Etiqueta', 'Nome', 'Série', 'Categoria', 'Status', 'Responsável', 'Localização', 'Aquisição', 'Garantia', 'Valor (R$)', 'Observações'],
    rows: rows.map((a) => [a.tag, a.name, a.serial, a.category, a.status, a.personName, a.location, a.acquiredAt, a.warrantyUntil, a.value, a.notes]),
  }
}
