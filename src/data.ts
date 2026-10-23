// Tipos compartilhados com a API e helpers de formatação.

export const CATEGORIES = ['Notebook', 'Desktop', 'Monitor', 'Celular', 'Periférico'] as const
export const ASSET_STATUS = ['Em uso', 'Disponível', 'Manutenção', 'Baixado'] as const
export const ORDER_TYPES = ['Preventiva', 'Corretiva', 'Upgrade'] as const
export const ORDER_STATUS = ['Aberta', 'Em andamento', 'Aguardando peça', 'Concluída'] as const
export const DEPARTMENTS = ['TI', 'Jurídico', 'Comercial', 'Financeiro', 'Marketing', 'Administrativo', 'Operacional'] as const

export type Category = (typeof CATEGORIES)[number]
export type AssetStatus = (typeof ASSET_STATUS)[number]
export type OrderType = (typeof ORDER_TYPES)[number]
export type OrderStatus = (typeof ORDER_STATUS)[number]
export type Role = 'admin' | 'tecnico' | 'leitura'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  phone: string
  department: string
  jobTitle: string
  location: string
  prefs: { emailNotif?: boolean; pushNotif?: boolean; twoFa?: boolean }
  passwordChangedAt: string
  lastLoginAt: string | null
  createdAt: string
}

export interface Asset {
  id: number
  tag: string
  name: string
  serial: string
  category: Category
  status: AssetStatus
  personId: number | null
  personName: string | null
  location: string
  acquiredAt: string
  warrantyUntil: string | null
  value: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Person {
  id: number
  name: string
  email: string
  department: string
  jobTitle: string
  location: string
  since: string
  assets: number
}

export interface ServiceOrder {
  id: number
  code: string
  assetId: number
  assetName: string
  assetTag: string
  detail: string
  type: OrderType
  status: OrderStatus
  tech: string
  openedAt: string
  dueAt: string
  closedAt: string | null
  cost: number
  late: boolean
}

export interface Stats {
  total: number
  byStatus: Record<AssetStatus, number>
  byCategory: { name: Category; value: number }[]
  totalValue: number
  utilization: number
  health: { withOwner: number; inWarranty: number; withinLifetime: number; warrantyExpired: number }
  lifecycle: { upTo2: number; from2to4: number; over4: number }
  alerts: {
    warrantyExpiring: number
    warrantyExpiring90: number
    inUseWithoutOwner: number
    lateOrders: number
    waitingParts: number
    lowStock: Category[]
  }
  maintenance: {
    open: number
    byStatus: Record<OrderStatus, number>
    closedThisMonth: number
    avgRepairDays: number
    sla: number
    cost: number
  }
  people: { total: number; withAssets: number | null }
  acquisitions: { month: string; count: number; value: number }[]
}

export const roleLabel: Record<Role, string> = {
  admin: 'Administrador',
  tecnico: 'Técnico',
  leitura: 'Somente leitura',
}

export const statusBadge: Record<string, string> = {
  'Em uso': 'badge-lime',
  'Disponível': 'badge-lilac',
  'Manutenção': 'badge-salmon',
  'Baixado': 'badge-ink',
  'Aberta': 'badge-cyan',
  'Em andamento': 'badge-lilac',
  'Aguardando peça': 'badge-salmon',
  'Concluída': 'badge-lime',
}

export const categoryThumb: Record<Category, string> = {
  Notebook: '',
  Desktop: 'lilac',
  Monitor: 'lime',
  Celular: 'salmon',
  Periférico: '',
}

export const categoryColor: Record<Category, string> = {
  Notebook: 'var(--blue)',
  Desktop: 'var(--cyan)',
  Monitor: 'var(--lime)',
  Celular: 'var(--salmon)',
  Periférico: 'var(--lilac)',
}

export const departmentBadge: Record<string, string> = {
  TI: 'badge-cyan',
  Jurídico: 'badge-lime',
  Comercial: 'badge-salmon',
  Financeiro: 'badge-lilac',
  Marketing: 'badge-yellow',
  Administrativo: 'badge-lilac',
  Operacional: 'badge-salmon',
}

// ---------- formatação ----------

const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** '2024-03-12' → '12 mar 2024' */
export function fmtDate(iso: string | null | undefined, withYear = true) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d} ${months[Number(m) - 1]}${withYear ? ` ${y}` : ''}`
}

/** '2024-03' → 'Mar' */
export function fmtMonth(ym: string) {
  const m = months[Number(ym.slice(5, 7)) - 1]
  return m.charAt(0).toUpperCase() + m.slice(1)
}

export const fmtInt = (n: number) => n.toLocaleString('pt-BR')
export const fmtMoney = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
export function fmtMoneyShort(n: number) {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (n >= 1_000) return `R$ ${(n / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return fmtMoney(n)
}
export const fmtPct = (r: number) => `${(r * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

export const todayIso = () => new Date().toISOString().slice(0, 10)
export function addDaysIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
export function daysUntil(iso: string) {
  return Math.round((Date.parse(iso) - Date.parse(todayIso())) / 86400000)
}
