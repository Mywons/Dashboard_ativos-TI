import { useMemo, useState } from 'react'
import { ArrowUpRight, CircleCheck, Clock, Gauge, Plus, TriangleAlert, Wrench } from 'lucide-react'
import { api } from '../api'
import { daysUntil, fmtDate, fmtMoney, fmtPct, ORDER_STATUS, statusBadge, type OrderStatus, type ServiceOrder, type Stats } from '../data'
import { useAuth, useData, useResource } from '../store'
import { useModals } from '../components/Modals'
import { AlertList, Badge, Chips, Kpi, Meter, PageHead, Pager, paginate, Person, RowActions, TableMessage, type AlertItem } from '../components/ui'

const tabs = ['Todas', ...ORDER_STATUS] as const
const PAGE_SIZE = 10

/** Próximo status no fluxo de atendimento. */
const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  Aberta: 'Em andamento',
  'Em andamento': 'Concluída',
  'Aguardando peça': 'Em andamento',
}

export function Maintenance() {
  const { canWrite } = useAuth()
  const { openOrder, confirm } = useModals()
  const { mutate, toast } = useData()
  const { data: orders, error } = useResource<ServiceOrder[]>('/orders')
  const { data: stats } = useResource<Stats>('/stats')
  const [tab, setTab] = useState<(typeof tabs)[number]>('Todas')
  const [page, setPage] = useState(1)

  const counts = useMemo(() => {
    const c: Partial<Record<(typeof tabs)[number], number>> = { Todas: orders?.length ?? 0 }
    for (const o of orders ?? []) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [orders])

  const filtered = (orders ?? []).filter((o) => tab === 'Todas' || o.status === tab)
  const { pages, current, rows } = paginate(filtered, page, PAGE_SIZE)
  const open = (orders ?? []).filter((o) => o.status !== 'Concluída')
  const upcoming = [...open].sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 4)
  const m = stats?.maintenance

  const alerts: AlertItem[] = []
  if (stats?.alerts.lateOrders) alerts.push({ tone: 'yellow', icon: 'clock', title: 'OS atrasadas', detail: `${stats.alerts.lateOrders} ordem(ns) passaram do prazo` })
  if (stats?.alerts.waitingParts) alerts.push({ tone: 'salmon', icon: 'box', title: 'Peças pendentes', detail: `${stats.alerts.waitingParts} ordem(ns) aguardando peça` })
  if (stats?.alerts.warrantyExpiring90)
    alerts.push({ tone: 'lilac', icon: 'shield', title: 'Garantias a vencer', detail: `${stats.alerts.warrantyExpiring90} ativo(s) em 90 dias` })

  const advance = (o: ServiceOrder, status: OrderStatus) =>
    mutate(() => api(`/orders/${o.id}`, { method: 'PUT', body: { ...o, status } }), `${o.code}: ${status}`).catch((e: Error) => toast(e.message, 'error'))

  const remove = (o: ServiceOrder) =>
    confirm({
      title: 'Excluir ordem de serviço',
      message: (
        <>
          Excluir <b>{o.code}</b> ({o.assetName})? Se for a última OS aberta do ativo, ele sai do status Manutenção.
        </>
      ),
      success: `${o.code} excluída`,
      action: () => api(`/orders/${o.id}`, { method: 'DELETE' }),
    })

  return (
    <>
      <PageHead
        eyebrow="Central de manutenção"
        title="Manutenção em dia, parque em movimento."
        actions={
          canWrite && (
            <button className="btn btn-primary" onClick={() => openOrder()}>
              <Plus size={14} /> Nova OS
            </button>
          )
        }
      />

      <section className="kpis">
        <Kpi tone="salmon" label="Em manutenção" value={stats ? String(stats.byStatus['Manutenção']) : '—'} delta={m ? `${m.byStatus['Aguardando peça']} aguardando peça` : ''} icon={<Wrench size={14} />} />
        <Kpi tone="lime" label="Concluídas no mês" value={m ? String(m.closedThisMonth) : '—'} delta={m ? `${fmtMoney(m.cost)} em custos (total)` : ''} icon={<CircleCheck size={14} />} />
        <Kpi
          tone="blue"
          label="Tempo médio de reparo"
          value={m ? `${m.avgRepairDays.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} d` : '—'}
          delta="Da abertura à conclusão"
          icon={<Clock size={14} />}
          trend={[9, 8, 7, 7, 6, 5, 5, 4]}
        />
        <Kpi tone="lilac" label="SLA cumprido" value={m ? fmtPct(m.sla) : '—'} delta="OS concluídas no prazo" icon={<Gauge size={14} />} />
      </section>

      <section className="grid-3">
        <div className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow">Agenda</span>
              <h3>Próximos prazos</h3>
            </div>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted small">Nenhuma ordem em aberto.</p>
          ) : (
            <ul className="agenda">
              {upcoming.map((o) => {
                const d = daysUntil(o.dueAt)
                const [, mo, day] = o.dueAt.split('-')
                return (
                  <li key={o.id}>
                    <span className="date-chip" style={{ background: o.late ? 'var(--salmon-soft)' : 'var(--cyan-soft)' }}>
                      <b>{day}</b>
                      {fmtDate(`2000-${mo}-01`, false).slice(3)}
                    </span>
                    <div className="what">
                      <strong>{o.assetName}</strong>
                      <span>
                        {o.code} · {o.detail}
                      </span>
                    </div>
                    <span className="when" style={o.late ? { color: 'var(--red)' } : undefined}>
                      {d < 0 ? `${-d}d atrasada` : d === 0 ? 'Hoje' : `em ${d}d`}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="card card-lime">
          <div className="card-head">
            <div>
              <span className="eyebrow">Ordens abertas</span>
              <h3>Fluxo das {m?.open ?? 0} manutenções</h3>
            </div>
            <span className="round-icon dark">
              <Wrench size={14} />
            </span>
          </div>
          {m && (
            <>
              <div className="meters">
                <Meter label="Abertas (triagem)" value={m.byStatus['Aberta']} max={m.open || 1} color="var(--ink)" />
                <Meter label="Em andamento" value={m.byStatus['Em andamento']} max={m.open || 1} color="var(--blue)" />
                <Meter label="Aguardando peça" value={m.byStatus['Aguardando peça']} max={m.open || 1} color="var(--red)" />
              </div>
              <div className="callout-dark bottom">
                <span className="score" style={{ fontSize: 12 }}>
                  {fmtPct(m.sla)}
                </span>
                <div>
                  <strong>{stats.alerts.lateOrders ? 'Atenção ao SLA' : 'SLA sob controle'}</strong>
                  <span>{stats.alerts.lateOrders ? `${stats.alerts.lateOrders} ordem(ns) fora do prazo` : 'Nenhuma ordem atrasada'}</span>
                </div>
                <ArrowUpRight size={18} className="trail" />
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
              <h3>Atenção</h3>
            </div>
            <span className="round-icon red">
              <TriangleAlert size={14} />
            </span>
          </div>
          {alerts.length ? <AlertList items={alerts} /> : <p className="muted small">Nada pendente. 🎉</p>}
        </div>
      </section>

      <section className="stack">
        <div className="section-head">
          <div>
            <span className="eyebrow">Operação técnica</span>
            <h2>Ordens de serviço</h2>
          </div>
        </div>
        <div className="filterbar plain">
          <Chips
            options={tabs}
            value={tab}
            onChange={(v) => {
              setTab(v)
              setPage(1)
            }}
            counts={counts}
          />
        </div>
        <div className="card table-card">
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>OS</th>
                  <th>Ativo</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Técnico</th>
                  <th>Abertura</th>
                  <th>Prazo</th>
                  <th>Custo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {error && <TableMessage cols={9}>{error}</TableMessage>}
                {!orders && !error && <TableMessage cols={9}>Carregando…</TableMessage>}
                {orders && rows.length === 0 && <TableMessage cols={9}>Nenhuma ordem de serviço.</TableMessage>}
                {rows.map((o) => {
                  const next = nextStatus[o.status]
                  return (
                    <tr key={o.id} className={o.late ? 'hl' : ''}>
                      <td className="link-code">{o.code}</td>
                      <td>
                        <div className="cell-main">
                          <div>
                            <strong>{o.assetName}</strong>
                            <small>
                              {o.assetTag} · {o.detail}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{o.type}</td>
                      <td>
                        <Badge className={statusBadge[o.status]}>{o.status}</Badge>
                      </td>
                      <td>
                        <Person name={o.tech || null} />
                      </td>
                      <td className="muted">{fmtDate(o.openedAt)}</td>
                      <td style={o.late ? { color: 'var(--red)', fontWeight: 600 } : undefined} className={o.late ? '' : 'muted'}>
                        {fmtDate(o.dueAt)}
                        {o.late && ' · atrasada'}
                      </td>
                      <td className="muted num">{o.cost ? fmtMoney(o.cost) : '—'}</td>
                      <td>
                        {canWrite && (
                          <RowActions
                            extra={
                              next && (
                                <button className="btn btn-sm" onClick={() => advance(o, next)} title={`Mover para ${next}`}>
                                  {next === 'Concluída' ? 'Concluir' : next === 'Em andamento' && o.status === 'Aberta' ? 'Iniciar' : 'Retomar'}
                                </button>
                              )
                            }
                            onEdit={() => openOrder(o)}
                            onDelete={() => remove(o)}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="table-foot">
            <span>
              {filtered.length} ordem(ns) de serviço · {open.length} em aberto
            </span>
            <Pager page={current} pages={pages} onChange={setPage} />
          </div>
        </div>
      </section>
    </>
  )
}

