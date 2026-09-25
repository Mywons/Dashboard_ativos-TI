import { useMemo, useState } from 'react'
import { CircleCheck, Download, Ellipsis, Filter, Package, Search, Sparkles, Wrench } from 'lucide-react'
import { assets, categoryThumb, statusBadge } from '../data'
import { Badge, Chips, Kpi, PageHead, Pager, Person } from '../components/ui'
import { categoryIcon } from './Overview'

const tabs = ['Todos', 'Notebook', 'Desktop', 'Monitor', 'Celular', 'Periférico'] as const
const statuses = ['Todos os status', 'Em uso', 'Disponível', 'Manutenção', 'Baixado'] as const
const PAGE_SIZE = 8

export function Inventory() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Todos')
  const [status, setStatus] = useState<(typeof statuses)[number]>('Todos os status')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return assets.filter(
      (a) =>
        (tab === 'Todos' || a.category === tab) &&
        (status === 'Todos os status' || a.status === status) &&
        (!term || [a.name, a.tag, a.serial, a.owner ?? ''].some((f) => f.toLowerCase().includes(term))),
    )
  }, [tab, status, q])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <>
      <PageHead
        eyebrow="Gestão de ativos"
        title="Inventário de Ativos"
        actions={
          <>
            <button className="btn">
              <Filter size={14} /> Filtros
            </button>
            <button className="btn">
              <Download size={14} /> Exportar CSV
            </button>
          </>
        }
      />

      <section className="kpis">
        <Kpi tone="blue" label="Total de ativos" value="1.284" delta="Cadastrados" icon={<Package size={14} />} />
        <Kpi tone="lime" label="Em uso" value="942" delta="Com responsável" icon={<CircleCheck size={14} />} />
        <Kpi tone="salmon" label="Manutenção" value="57" delta="Em reparo ou revisão" icon={<Wrench size={14} />} />
        <Kpi tone="lilac" label="Disponível" value="285" delta="Em estoque" icon={<Sparkles size={14} />} />
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
        <select
          className="select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as (typeof statuses)[number])
            setPage(1)
          }}
          aria-label="Status"
        >
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className="filter-search">
          <Search size={13} />
          <input
            placeholder="Filtrar etiqueta, série…"
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
                <th>Ativo / Série</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Localização</th>
                <th>Aquisição</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const Icon = categoryIcon[a.category]
                return (
                  <tr key={a.tag}>
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
                    <td className="muted num">{a.acquired}</td>
                    <td className="row-menu">
                      <Ellipsis size={16} />
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 32 }}>
                    Nenhum ativo encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <span>
            Exibindo {rows.length} de {filtered.length} ativos
          </span>
          <Pager page={current} pages={pages} onChange={setPage} />
        </div>
      </div>
    </>
  )
}
