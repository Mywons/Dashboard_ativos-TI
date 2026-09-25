import type { ReactNode } from 'react'
import { Box, ChevronLeft, ChevronRight, ShieldAlert, UserX } from 'lucide-react'
import { alerts as defaultAlerts, type AlertItem } from '../data'

export type Tone = 'blue' | 'lime' | 'salmon' | 'lilac'

/** Mini-histograma decorativo usado nos cards de KPI. */
function KpiBars({ values }: { values: number[] }) {
  const max = Math.max(...values)
  return (
    <div className="kpi-bars" aria-hidden>
      {values.map((v, i) => (
        <span key={i} style={{ height: `${(v / max) * 100}%` }} />
      ))}
    </div>
  )
}

export function Kpi({
  tone,
  label,
  value,
  delta,
  icon,
  trend = [3, 4, 5, 4, 6, 7, 8, 9],
}: {
  tone: Tone
  label: string
  value: string
  delta: string
  icon: ReactNode
  trend?: number[]
}) {
  return (
    <div className={`kpi kpi-${tone}`}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon">{icon}</span>
      </div>
      <div className="kpi-body">
        <div>
          <div className="kpi-value num">{value}</div>
          <div className="kpi-delta">{delta}</div>
        </div>
        <KpiBars values={trend} />
      </div>
    </div>
  )
}

export function Badge({ className = '', children }: { className?: string; children: ReactNode }) {
  return <span className={`badge ${className}`}>{children}</span>
}

const avatarTones = ['var(--salmon)', 'var(--lime)', 'var(--lilac)', 'var(--cyan)']

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function Avatar({ name, size }: { name: string; size?: 'lg' }) {
  const tone = avatarTones[name.length % avatarTones.length]
  return (
    <span className={`avatar ${size ?? ''}`} style={{ background: tone }}>
      {initials(name)}
    </span>
  )
}

export function Person({ name }: { name: string | null }) {
  if (!name) return <span className="muted small">Sem responsável</span>
  return (
    <span className="person">
      <Avatar name={name} />
      {name}
    </span>
  )
}

export function Meter({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="meter-row">
        <span>{label}</span>
        <span className="num">{value.toLocaleString('pt-BR')}</span>
      </div>
      <div className="meter-track" role="meter" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
        <div className="meter-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  )
}

const alertIcons = { shield: ShieldAlert, user: UserX, box: Box }

export function AlertList({ items = defaultAlerts }: { items?: AlertItem[] }) {
  return (
    <div className="alerts">
      {items.map((a) => {
        const Icon = alertIcons[a.icon]
        return (
          <div key={a.title} className={`alert alert-${a.tone}`}>
            <span className="round-icon">
              <Icon size={14} />
            </span>
            <div>
              <strong>{a.title}</strong>
              <span>{a.detail}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  return (
    <div className="pager">
      <button className="btn btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={14} /> Anterior
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button key={p} className={`pg ${p === page ? 'active' : ''}`} onClick={() => onChange(p)}>
          {p}
        </button>
      ))}
      <button className="btn btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Próxima <ChevronRight size={14} />
      </button>
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`toggle ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
    />
  )
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  counts,
}: {
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  counts?: Partial<Record<T, number>>
}) {
  return (
    <>
      {options.map((o) => (
        <button key={o} className={`chip ${o === value ? 'active' : ''}`} onClick={() => onChange(o)}>
          {o}
          {counts?.[o] !== undefined && <span className="count">{counts[o]}</span>}
        </button>
      ))}
    </>
  )
}

export function PageHead({ eyebrow, title, actions }: { eyebrow: string; title: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
