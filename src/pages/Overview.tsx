import { useState } from 'react'
import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import {
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  Ellipsis,
  Filter,
  Laptop,
  Package,
  Sparkles,
  TriangleAlert,
  UserPlus,
  Wrench,
  CalendarDays,
  Monitor,
  Smartphone,
  Mouse,
} from 'lucide-react'
import { attentionAssets, categoryDistribution, categoryThumb, currentUser, statusBadge } from '../data'
import type { Category } from '../data'
import { AlertList, Badge, Kpi, Meter, Person } from '../components/ui'
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
      {p.name}: <b>{p.value.toLocaleString('pt-BR')}</b>
    </div>
  )
}

export function CategoryDonut() {
  const total = categoryDistribution.reduce((s, c) => s + c.value, 0)
  return (
    <div className="donut-wrap">
      <div className="donut">
        <PieChart width={170} height={170}>
            <Pie
              data={categoryDistribution}
              dataKey="value"
              nameKey="name"
              innerRadius={54}
              outerRadius={80}
              paddingAngle={2}
              stroke="var(--ink)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
            >
              {categoryDistribution.map((c) => (
                <Cell key={c.name} fill={c.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
        </PieChart>
        <div className="donut-center">
          <div>
            <strong className="num">{total.toLocaleString('pt-BR')}</strong>
            <span>ativos</span>
          </div>
        </div>
      </div>
      <ul className="legend">
        {categoryDistribution.map((c) => (
          <li key={c.name}>
            <span className="swatch" style={{ background: c.color }} />
            {c.name}
            <span className="val num">{c.value}</span>
            <span className="pct num">{Math.round((c.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Overview({ onNavigate }: { onNavigate: (r: Route) => void }) {
  const [filter, setFilter] = useState<'Todos' | 'Manutenção'>('Todos')
  const rows = filter === 'Todos' ? attentionAssets : attentionAssets.filter((a) => a.status === 'Manutenção')

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Olá, {currentUser.name.split(' ')[0]} 👋</span>
          <h1>Seu inventário está em movimento.</h1>
        </div>
        <div className="page-actions">
          <button className="btn">
            <CalendarDays size={14} /> Últimos 30 dias
          </button>
        </div>
      </div>

      <section className="kpis">
        <Kpi tone="blue" label="Total de ativos" value="1.284" delta="↑ 32 este mês" icon={<Package size={14} />} />
        <Kpi tone="lime" label="Em uso" value="942" delta="73% do parque" icon={<CircleCheck size={14} />} trend={[5, 6, 6, 7, 7, 8, 9, 9]} />
        <Kpi tone="salmon" label="Manutenção" value="57" delta="↓ 8 vs. mês anterior" icon={<Wrench size={14} />} trend={[9, 8, 8, 7, 6, 6, 5, 4]} />
        <Kpi tone="lilac" label="Disponível" value="285" delta="Pronto para entrega" icon={<Sparkles size={14} />} trend={[4, 5, 4, 6, 5, 6, 7, 6]} />
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
          <CategoryDonut />
          <div className="note">
            <TriangleAlert size={14} /> Notebooks representam 40% do parque.
            <button className="link" onClick={() => onNavigate('reports')}>
              Ver relatório
            </button>
          </div>
        </div>

        <div className="card card-lime">
          <div className="card-head">
            <div>
              <span className="eyebrow">Monitoramento</span>
              <h3>Saúde dos dispositivos</h3>
            </div>
          </div>
          <div className="callout-dark">
            <span className="score">87</span>
            <div>
              <strong>Parque saudável</strong>
              <span>Índice geral de saúde do parque</span>
            </div>
            <ArrowUpRight size={18} className="trail" />
          </div>
          <div className="meters">
            <Meter label="Antivírus atualizado" value={1198} max={1284} color="var(--blue)" />
            <Meter label="Sistema atualizado" value={1086} max={1284} color="var(--ink)" />
            <Meter label="Criptografia ativa" value={1142} max={1284} color="#7a9400" />
            <Meter label="Garantia vencida" value={96} max={1284} color="var(--red)" />
          </div>
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
          <AlertList />
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }}>
            Ver todos <ArrowRight size={14} />
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
            <button className="btn btn-sm" onClick={() => setFilter(filter === 'Todos' ? 'Manutenção' : 'Todos')}>
              <Filter size={13} /> {filter === 'Todos' ? 'Filtrar' : 'Só manutenção'}
            </button>
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
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Responsável</th>
                  <th>Local</th>
                  <th>Garantia</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const Icon = categoryIcon[a.category]
                  return (
                    <tr key={a.tag} className={a.status === 'Manutenção' && a.tag === 'GL-00291' ? 'hl' : ''}>
                      <td>
                        <div className="cell-main">
                          <span className={`thumb ${categoryThumb[a.category]}`}>
                            <Icon size={15} />
                          </span>
                          <div>
                            <strong>{a.name}</strong>
                            <small>
                              {a.tag} · {a.serial}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{a.category}</td>
                      <td>
                        <Badge className={statusBadge[a.status]}>{a.status}</Badge>
                      </td>
                      <td>
                        <Person name={a.owner} />
                      </td>
                      <td className="muted">{a.location}</td>
                      <td className="muted num">{a.warranty}</td>
                      <td className="row-menu">
                        <Ellipsis size={16} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="stack">
        <div className="section-head">
          <div>
            <span className="eyebrow">Ações rápidas</span>
            <h2>Atalhos operacionais</h2>
          </div>
        </div>
        <div className="grid-shortcuts">
          <button className="shortcut" style={{ background: 'var(--cyan)' }} onClick={() => onNavigate('inventory')}>
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
          <button className="shortcut" style={{ background: 'var(--lime)' }} onClick={() => onNavigate('people')}>
            <span className="round-icon">
              <UserPlus size={15} />
            </span>
            <div>
              <strong>Registrar entrega</strong>
              <span>Vincular a um colaborador</span>
            </div>
            <span className="go">
              <ArrowRight size={13} />
            </span>
          </button>
          <button className="shortcut" style={{ background: 'var(--salmon)' }} onClick={() => onNavigate('maintenance')}>
            <span className="round-icon">
              <Wrench size={15} />
            </span>
            <div>
              <strong>Agendar manutenção</strong>
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
    </>
  )
}
