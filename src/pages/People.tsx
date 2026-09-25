import { useMemo, useState } from 'react'
import { Download, Ellipsis, Laptop, Search, UserCheck, UserPlus, Users, UserX } from 'lucide-react'
import { departmentBadge, people } from '../data'
import { Avatar, Badge, Chips, Kpi, PageHead, Pager } from '../components/ui'

const tabs = ['Todos', 'TI', 'Jurídico', 'Comercial', 'Financeiro', 'Operacional'] as const
const PAGE_SIZE = 8

export function People() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Todos')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return people.filter(
      (p) =>
        (tab === 'Todos' || p.department === tab) &&
        (!term || [p.name, p.email, p.role].some((f) => f.toLowerCase().includes(term))),
    )
  }, [tab, q])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <>
      <PageHead
        eyebrow="Colaboradores"
        title="Pessoas e responsáveis"
        actions={
          <>
            <button className="btn">
              <Download size={14} /> Exportar
            </button>
            <button className="btn btn-dark">
              <UserPlus size={14} /> Adicionar pessoa
            </button>
          </>
        }
      />

      <section className="kpis">
        <Kpi tone="blue" label="Total de pessoas" value="186" delta="↑ 4 este mês" icon={<Users size={14} />} />
        <Kpi tone="lime" label="Com ativos vinculados" value="142" delta="76% do quadro" icon={<UserCheck size={14} />} />
        <Kpi tone="salmon" label="Sem ativos" value="44" delta="Aguardando entrega" icon={<UserX size={14} />} />
        <Kpi tone="lilac" label="Responsáveis de área" value="12" delta="Gestores de inventário" icon={<Laptop size={14} />} />
      </section>

      <div className="filterbar">
        <Chips
          options={tabs}
          value={tab}
          onChange={(v) => {
            setTab(v)
            setPage(1)
          }}
        />
        <span className="spacer" />
        <label className="filter-search">
          <Search size={13} />
          <input
            placeholder="Filtrar por nome, e-mail…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
          />
        </label>
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Departamento</th>
                <th>Cargo</th>
                <th>Ativos vinculados</th>
                <th>Localização</th>
                <th>Desde</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.email}>
                  <td>
                    <div className="cell-main">
                      <Avatar name={p.name} />
                      <div>
                        <strong>{p.name}</strong>
                        <small>{p.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge className={`plain ${departmentBadge[p.department]}`}>{p.department}</Badge>
                  </td>
                  <td>{p.role}</td>
                  <td>
                    <span className="person">
                      <span className="avatar" style={{ background: 'var(--lime-soft)' }}>
                        {p.assets}
                      </span>
                      <span className="muted">dispositivos</span>
                    </span>
                  </td>
                  <td className="muted">{p.location}</td>
                  <td className="muted">{p.since}</td>
                  <td className="row-menu">
                    <Ellipsis size={16} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 32 }}>
                    Nenhuma pessoa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <span>
            Exibindo {rows.length} de {filtered.length} pessoas
          </span>
          <Pager page={current} pages={pages} onChange={setPage} />
        </div>
      </div>
    </>
  )
}
