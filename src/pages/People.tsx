import { useMemo, useState } from 'react'
import { Building2, Search, UserCheck, UserPlus, Users, UserX } from 'lucide-react'
import { api } from '../api'
import { departmentBadge, DEPARTMENTS, fmtDate, type Person } from '../data'
import { useAuth, useResource } from '../store'
import { useModals } from '../components/Modals'
import { Avatar, Badge, Chips, Kpi, PageHead, Pager, paginate, RowActions, TableMessage } from '../components/ui'

const tabs = ['Todos', ...DEPARTMENTS] as const
const PAGE_SIZE = 10

export function People() {
  const { canWrite } = useAuth()
  const { openPerson, confirm } = useModals()
  const { data: people, error } = useResource<Person[]>('/people')
  const [tab, setTab] = useState<(typeof tabs)[number]>('Todos')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (people ?? []).filter(
      (p) => (tab === 'Todos' || p.department === tab) && (!term || [p.name, p.email, p.jobTitle].some((f) => f.toLowerCase().includes(term))),
    )
  }, [people, tab, q])

  const { pages, current, rows } = paginate(filtered, page, PAGE_SIZE)
  const total = people?.length ?? 0
  const withAssets = people?.filter((p) => p.assets > 0).length ?? 0
  const departments = new Set(people?.map((p) => p.department)).size

  const remove = (p: Person) =>
    confirm({
      title: 'Excluir pessoa',
      message: (
        <>
          Excluir <b>{p.name}</b>?{' '}
          {p.assets > 0 ? `Os ${p.assets} ativo(s) vinculados ficarão sem responsável e os que estavam em uso voltam para o estoque.` : 'Essa pessoa não tem ativos vinculados.'}
        </>
      ),
      success: 'Pessoa excluída',
      action: () => api(`/people/${p.id}`, { method: 'DELETE' }),
    })

  return (
    <>
      <PageHead
        eyebrow="Colaboradores"
        title="Pessoas e responsáveis"
        actions={
          canWrite && (
            <button className="btn btn-primary" onClick={() => openPerson()}>
              <UserPlus size={14} /> Adicionar pessoa
            </button>
          )
        }
      />

      <section className="kpis">
        <Kpi tone="blue" label="Total de pessoas" value={String(total)} delta="Cadastradas" icon={<Users size={14} />} />
        <Kpi tone="lime" label="Com ativos vinculados" value={String(withAssets)} delta={total ? `${Math.round((withAssets / total) * 100)}% do quadro` : ''} icon={<UserCheck size={14} />} />
        <Kpi tone="salmon" label="Sem ativos" value={String(total - withAssets)} delta="Aguardando entrega" icon={<UserX size={14} />} />
        <Kpi tone="lilac" label="Departamentos" value={String(departments)} delta="Com pessoas cadastradas" icon={<Building2 size={14} />} />
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
              {error && <TableMessage cols={7}>{error}</TableMessage>}
              {!people && !error && <TableMessage cols={7}>Carregando…</TableMessage>}
              {people && rows.length === 0 && <TableMessage cols={7}>Nenhuma pessoa encontrada.</TableMessage>}
              {rows.map((p) => (
                <tr key={p.id}>
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
                    <Badge className={`plain ${departmentBadge[p.department] ?? 'badge-cyan'}`}>{p.department}</Badge>
                  </td>
                  <td>{p.jobTitle || '—'}</td>
                  <td>
                    <a className="person" href={`#/inventory?q=${encodeURIComponent(p.name)}`} style={{ textDecoration: 'none' }}>
                      <span className="avatar" style={{ background: 'var(--lime-soft)' }}>
                        {p.assets}
                      </span>
                      <span className="muted">dispositivo(s)</span>
                    </a>
                  </td>
                  <td className="muted">{p.location || '—'}</td>
                  <td className="muted">{fmtDate(p.since)}</td>
                  <td>{canWrite && <RowActions onEdit={() => openPerson(p)} onDelete={() => remove(p)} />}</td>
                </tr>
              ))}
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
