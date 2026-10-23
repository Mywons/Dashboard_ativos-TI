import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import {
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  Laptop,
  Monitor,
  Mouse,
  Package,
  Smartphone,
  Sparkles,
  TriangleAlert,
  UserPlus,
  Wrench,
} from 'lucide-react'
import { categoryColor, categoryThumb, daysUntil, fmtDate, fmtInt, fmtPct, statusBadge, type Asset, type Category, type Stats } from '../data'
import { api } from '../api'
import { useAuth, useResource } from '../store'
import { AlertList, Badge, Kpi, Meter, Person, RowActions, TableMessage, type AlertItem } from '../components/ui'
import { useModals } from '../components/Modals'
import type { Route } from '../components/Layout'

export const categoryIcon: Record<Category, typeof Laptop> = {
  Notebook: Laptop,
  Desktop: Monitor,
  Monitor: Monitor,
  Celular: Smartphone,
  Periférico: Mouse,
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="tooltip">
      {p.name}: <b>{fmtInt(p.value)}</b>
    </div>
  )
}

export function CategoryDonut({ data }: { data: Stats['byCategory'] }) {
  const total = data.reduce((s, c) => s + c.value, 0)
  const slices = data.filter((c) => c.value > 0)
  return (
    <div className="donut-wrap">
      <div className="donut">
        <PieChart width={170} height={170}>
          <Pie
            data={slices.length ? slices : [{ name: 'Sem ativos', value: 1 }]}
            dataKey="value"
            nameKey="name"
            innerRadius={54}
            outerRadius={80}
            paddingAngle={slices.length > 1 ? 2 : 0}
            stroke="var(--ink)"
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
          >
            {slices.length ? slices.map((c) => <Cell key={c.name} fill={categoryColor[c.name]} />) : <Cell fill="var(--line)" />}
          </Pie>
          {slices.length > 0 && <Tooltip content={<ChartTooltip />} />}
        </PieChart>
        <div className="donut-center">
          <div>
            <strong className="num">{fmtInt(total)}</strong>
            <span>ativos</span>
          </div>
        </div>
      </div>
      <ul className="legend">
        {data.map((c) => (
          <li key={c.name}>
            <span className="swatch" style={{ background: categoryColor[c.name] }} />
            {c.name}
            <span className="val num">{c.value}</span>
            <span className="pct num">{total ? Math.round((c.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function buildAlerts(s: Stats): AlertItem[] {
  const items: AlertItem[] = []
  if (s.alerts.warrantyExpiring)
    items.push({ tone: 'yellow', icon: 'shield', title: 'Garantias vencendo', detail: `${s.alerts.warrantyExpiring} ativo(s) nos próximos 30 dias` })
  if (s.alerts.lateOrders)
    items.push({ tone: 'salmon', icon: 'clock', title: 'OS atrasadas', detail: `${s.alerts.lateOrders} ordem(ns) passaram do prazo` })
  if (s.alerts.inUseWithoutOwner)
    items.push({ tone: 'salmon', icon: 'user', title: 'Ativos sem responsável', detail: `${s.alerts.inUseWithoutOwner} em uso sem vínculo` })
  if (s.alerts.lowStock.length)
    items.push({ tone: 'lilac', icon: 'box', title: 'Estoque baixo', detail: `${s.alerts.lowStock.join(', ')}: 1 ou nenhum disponível` })
  return items
}

/** Ativos que exigem ação: em manutenção, garantia vencendo, em uso sem responsável. */
function needsAttention(a: Asset) {
  if (a.status === 'Baixado') return null
  if (a.status === 'Manutenção') return 'Em manutenção'
  if (a.status === 'Em uso' && !a.personId) return 'Sem responsável'
  if (a.warrantyUntil) {
    const d = daysUntil(a.warrantyUntil)
    if (d >= 0 && d <= 30) return `Garantia vence em ${d} dia(s)`
  }
  return null
}

export function Overview({ onNavigate }: { onNavigate: (r: Route, q?: Record<string, string>) => void }) {
  const { user, canWrite } = useAuth()
  const { openAsset, openPerson, openOrder, confirm } = useModals()
  const { data: stats } = useResource<Stats>('/stats')
  const { data: assets } = useResource<Asset[]>('/assets')

  const attention = (assets ?? [])
    .map((a) => ({ a, reason: needsAttention(a) }))
    .filter((x) => x.reason)
    .slice(0, 6)

  const alerts = stats ? buildAlerts(stats) : []
  const s = stats

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Olá, {user?.name.split(' ')[0]} 👋</span>
          <h1>Seu inventário está em movimento.</h1>
        </div>
      </div>

      <section className="kpis">
        <Kpi tone="blue" label="Total de ativos" value={s ? fmtInt(s.total) : '—'} delta="Ativos (sem baixados)" icon={<Package size={14} />} />
        <Kpi
          tone="lime"
          label="Em uso"
          value={s ? fmtInt(s.byStatus['Em uso']) : '—'}
          delta={s ? `${fmtPct(s.utilization)} do parque` : ''}
          icon={<CircleCheck size={14} />}
          trend={[5, 6, 6, 7, 7, 8, 9, 9]}
        />
        <Kpi
          tone="salmon"
          label="Manutenção"
          value={s ? fmtInt(s.byStatus['Manutenção']) : '—'}
          delta={s ? `${s.maintenance.open} OS abertas` : ''}
          icon={<Wrench size={14} />}
          trend={[9, 8, 8, 7, 6, 6, 5, 4]}
        />
        <Kpi tone="lilac" label="Disponível" value={s ? fmtInt(s.byStatus['Disponível']) : '—'} delta="Pronto para entrega" icon={<Sparkles size={14} />} trend={[4, 5, 4, 6, 5, 6, 7, 6]} />
      </section>

      <section className="grid-3">
        <div className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow">Inventário</span>
              <h3>Distribuição por categoria</h3>
            </div>
            <button className="btn btn-sm" onClick={() => onNavigate('inventory')}>
              Detalhes
            </button>
          </div>
          {s && <CategoryDonut data={s.byCategory} />}
          {s && s.total > 0 && (
            <div className="note">
              <TriangleAlert size={14} />
              {(() => {
                const top = [...s.byCategory].sort((a, b) => b.value - a.value)[0]
                return `${top.name}s representam ${Math.round((top.value / s.total) * 100)}% do parque.`
              })()}
              <button className="link" onClick={() => onNavigate('reports')}>
                Ver relatório
              </button>
            </div>
          )}
        </div>

        <div className="card card-lime">
          <div className="card-head">
            <div>
              <span className="eyebrow">Monitoramento</span>
              <h3>Saúde do parque</h3>
            </div>
          </div>
          {s && (
            <>
              <div className="callout-dark">
                <span className="score">{s.total ? Math.round(((s.health.inWarranty + s.health.withinLifetime) / (2 * s.total)) * 100) : 0}</span>
                <div>
                  <strong>Índice de saúde</strong>
                  <span>Média de garantia vigente e vida útil</span>
                </div>
                <ArrowUpRight size={18} className="trail" />
              </div>
              <div className="meters">
                <Meter label="Com garantia vigente" value={s.health.inWarranty} max={s.total || 1} color="var(--blue)" />
                <Meter label="Dentro da vida útil (≤ 4 anos)" value={s.health.withinLifetime} max={s.total || 1} color="var(--ink)" />
                <Meter label="Com responsável" value={s.health.withOwner} max={s.total || 1} color="#7a9400" />
                <Meter label="Garantia vencida" value={s.health.warrantyExpired} max={s.total || 1} color="var(--red)" />
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow" style={{ color: 'var(--red)' }}>
                Atenção
              </span>
              <h3>Alertas</h3>
            </div>
            <span className="round-icon red">
              <TriangleAlert size={14} />
            </span>
          </div>
          {alerts.length ? <AlertList items={alerts} /> : <p className="muted small">Nenhum alerta no momento. 🎉</p>}
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={() => onNavigate('maintenance')}>
            Ver manutenções <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <section className="stack">
        <div className="section-head">
          <div>
            <span className="eyebrow">Acompanhamento</span>
            <h2>Ativos que pedem atenção</h2>
          </div>
          <div className="page-actions">
            <button className="btn btn-sm btn-dark" onClick={() => onNavigate('inventory')}>
              Ver inventário completo <ArrowRight size={13} />
            </button>
          </div>
        </div>
        <div className="card table-card">
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th>Motivo</th>
                  <th>Status</th>
                  <th>Responsável</th>
                  <th>Local</th>
                  <th>Garantia</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {!assets && <TableMessage cols={7}>Carregando…</TableMessage>}
                {assets && attention.length === 0 && <TableMessage cols={7}>Nenhum ativo precisa de atenção agora.</TableMessage>}
                {attention.map(({ a, reason }) => {
                  const Icon = categoryIcon[a.category]
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="cell-main">
                          <span className={`thumb ${categoryThumb[a.category]}`}>
                            <Icon size={15} />
                          </span>
                          <div>
                            <strong>{a.name}</strong>
                            <small>
                              {a.tag} · {a.serial || 'sem série'}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{reason}</td>
                      <td>
                        <Badge className={statusBadge[a.status]}>{a.status}</Badge>
                      </td>
                      <td>
                        <Person name={a.personName} />
                      </td>
                      <td className="muted">{a.location || '—'}</td>
                      <td className="muted num">{fmtDate(a.warrantyUntil)}</td>
                      <td>
                        {canWrite && (
                          <RowActions
                            onEdit={() => openAsset(a)}
                            onDelete={() =>
                              confirm({
                                title: 'Excluir ativo',
                                message: (
                                  <>
                                    Excluir <b>{a.tag} · {a.name}</b>? As ordens de serviço dele também serão removidas.
                                  </>
                                ),
                                success: 'Ativo excluído',
                                action: () => api(`/assets/${a.id}`, { method: 'DELETE' }),
                              })
                            }
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {canWrite && (
        <section className="stack">
          <div className="section-head">
            <div>
              <span className="eyebrow">Ações rápidas</span>
              <h2>Atalhos operacionais</h2>
            </div>
          </div>
          <div className="grid-shortcuts">
            <button className="shortcut" style={{ background: 'var(--cyan)' }} onClick={() => openAsset()}>
              <span className="round-icon">
                <Package size={15} />
              </span>
              <div>
                <strong>Cadastrar ativo</strong>
                <span>Novo item no parque</span>
              </div>
              <span className="go">
                <ArrowRight size={13} />
              </span>
            </button>
            <button className="shortcut" style={{ background: 'var(--lime)' }} onClick={() => openPerson()}>
              <span className="round-icon">
                <UserPlus size={15} />
              </span>
              <div>
                <strong>Adicionar pessoa</strong>
                <span>Novo colaborador responsável</span>
              </div>
              <span className="go">
                <ArrowRight size={13} />
              </span>
            </button>
            <button className="shortcut" style={{ background: 'var(--salmon)' }} onClick={() => openOrder()}>
              <span className="round-icon">
                <Wrench size={15} />
              </span>
              <div>
                <strong>Abrir manutenção</strong>
                <span>Preventiva ou corretiva</span>
              </div>
              <span className="go">
                <ArrowRight size={13} />
              </span>
            </button>
            <div className="promo">
              <div style={{ position: 'relative', zIndex: 1 }}>
                <Badge className="badge-lime">Gestão de ativos</Badge>
                <h3>
                  Tudo ligado.
                  <br />
                  Tudo sob controle.
                </h3>
                <p>Acompanhe cada dispositivo do cadastro ao descarte.</p>
                <button className="btn btn-sm" onClick={() => onNavigate('reports')}>
                  Ver relatórios <ArrowRight size={13} />
                </button>
              </div>
              <div className="promo-art" aria-hidden>
                <Laptop size={64} strokeWidth={1.4} color="var(--lime)" />
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
