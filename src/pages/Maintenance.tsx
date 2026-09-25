import { useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, CalendarDays, Clock, Download, Ellipsis, Gauge, Plus, TriangleAlert, Wrench, CircleCheck } from 'lucide-react'
import { serviceOrders, statusBadge, upcomingMaintenance } from '../data'
import { AlertList, Badge, Chips, Kpi, Meter, PageHead, Pager, Person } from '../components/ui'

const tabs = ['Todas', 'Aberta', 'Em andamento', 'Aguardando peça', 'Concluída'] as const

export function Maintenance() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Todas')
  const counts = useMemo(() => {
    const c: Partial<Record<(typeof tabs)[number], number>> = { Todas: serviceOrders.length }
    for (const o of serviceOrders) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [])
  const rows = tab === 'Todas' ? serviceOrders : serviceOrders.filter((o) => o.status === tab)

  return (
    <>
      <PageHead
        eyebrow="Central de manutenção"
        title="Manutenção em dia, parque em movimento."
        actions={
          <>
            <button className="btn">
              <CalendarDays size={14} /> Todo o período
            </button>
            <button className="btn">
              <Download size={14} /> Exportar
            </button>
          </>
        }
      />

      <section className="kpis">
        <Kpi tone="salmon" label="Em manutenção" value="57" delta="12 aguardando peça" icon={<Wrench size={14} />} />
        <Kpi tone="lime" label="Concluídas no mês" value="34" delta="↑ 18% vs. agosto" icon={<CircleCheck size={14} />} />
        <Kpi tone="blue" label="Tempo médio de reparo" value="18h" delta="Meta: 24h" icon={<Clock size={14} />} trend={[9, 8, 7, 7, 6, 5, 5, 4]} />
        <Kpi tone="lilac" label="SLA cumprido" value="92%" delta="↑ 3 p.p." icon={<Gauge size={14} />} />
      </section>

      <section className="grid-3">
        <div className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow">Agenda preventiva</span>
              <h3>Próximas manutenções</h3>
            </div>
            <button className="btn btn-sm">Esta semana</button>
          </div>
          <ul className="agenda">
            {upcomingMaintenance.map((m) => (
              <li key={m.title}>
                <span className="date-chip" style={{ background: `var(--${m.tone || 'cyan'}-soft)` }}>
                  <b>{m.day}</b>
                  {m.month}
                </span>
                <div className="what">
                  <strong>{m.title}</strong>
                  <span>{m.detail}</span>
                </div>
                <span className="when">{m.when}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card card-lime">
          <div className="card-head">
            <div>
              <span className="eyebrow">Ordens abertas</span>
              <h3>Fluxo das 57 manutenções</h3>
            </div>
            <span className="round-icon dark">
              <Wrench size={14} />
            </span>
          </div>
          <div className="meters">
            <Meter label="Triagem" value={9} max={57} color="var(--ink)" />
            <Meter label="Em execução" value={22} max={57} color="var(--blue)" />
            <Meter label="Aguardando peça" value={12} max={57} color="var(--red)" />
            <Meter label="Pronto p/ entrega" value={14} max={57} color="#7a9400" />
          </div>
          <div className="callout-dark bottom">
            <span className="score">92%</span>
            <div>
              <strong>SLA sob controle</strong>
              <span>Só 2 ordens fora do prazo esta semana</span>
            </div>
            <ArrowUpRight size={18} className="trail" />
          </div>
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
          <AlertList
            items={[
              { tone: 'yellow', title: 'OS atrasadas', detail: '2 ordens passaram do SLA', icon: 'shield' },
              { tone: 'salmon', title: 'Peças pendentes', detail: '12 ordens aguardando fornecedor', icon: 'box' },
              { tone: 'lilac', title: 'Reincidência', detail: '3 ativos com 3+ reparos no ano', icon: 'user' },
            ]}
          />
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }}>
            Ver todos <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <section className="stack">
        <div className="section-head">
          <div>
            <span className="eyebrow">Operação técnica</span>
            <h2>Ordens de serviço</h2>
          </div>
          <div className="page-actions">
            <button className="btn btn-sm">
              <Download size={13} /> Exportar
            </button>
            <button className="btn btn-sm btn-dark">
              <Plus size={13} /> Nova OS
            </button>
          </div>
        </div>
        <div className="filterbar plain">
          <Chips options={tabs} value={tab} onChange={setTab} counts={counts} />
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
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className={o.late ? 'hl' : ''}>
                    <td className="link-code">{o.id}</td>
                    <td>
                      <div className="cell-main">
                        <div>
                          <strong>{o.asset}</strong>
                          <small>{o.detail}</small>
                        </div>
                      </div>
                    </td>
                    <td>{o.type}</td>
                    <td>
                      <Badge className={statusBadge[o.status]}>{o.status}</Badge>
                    </td>
                    <td>
                      <Person name={o.tech} />
                    </td>
                    <td className="muted">{o.opened}</td>
                    <td style={o.late ? { color: 'var(--red)', fontWeight: 600 } : undefined} className={o.late ? '' : 'muted'}>
                      {o.sla}
                      {o.late && ' · atrasada'}
                    </td>
                    <td className="row-menu">
                      <Ellipsis size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-foot">
            <span>{rows.length} ordens de serviço</span>
            <Pager page={1} pages={1} onChange={() => {}} />
          </div>
        </div>
      </section>
    </>
  )
}
