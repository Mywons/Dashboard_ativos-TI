import { useMemo, useState } from 'react'
import { CircleCheck, Download, Package, Plus, Search, Sparkles, Wrench } from 'lucide-react'
import { api } from '../api'
import { downloadInventory } from '../csv'
import { ASSET_STATUS, categoryThumb, fmtDate, fmtInt, fmtMoney, statusBadge, type Asset, type Stats } from '../data'
import { useAuth, useResource } from '../store'
import { useModals } from '../components/Modals'
import { Badge, Chips, Kpi, PageHead, Pager, paginate, Person, RowActions, TableMessage } from '../components/ui'
import { categoryIcon } from './Overview'

const tabs = ['Todos', 'Notebook', 'Desktop', 'Monitor', 'Celular', 'Periférico'] as const
const statuses = ['Todos os status', ...ASSET_STATUS] as const
const PAGE_SIZE = 10

export function Inventory({ params }: { params: URLSearchParams }) {
  const { canWrite } = useAuth()
  const { openAsset, openOrder, confirm } = useModals()
  const { data: assets, error } = useResource<Asset[]>('/assets')
  const { data: stats } = useResource<Stats>('/stats')
  const [tab, setTab] = useState<(typeof tabs)[number]>('Todos')
  const [status, setStatus] = useState<(typeof statuses)[number]>((params.get('status') as (typeof statuses)[number]) || 'Todos os status')
  const [q, setQ] = useState(params.get('q') ?? '')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (assets ?? []).filter(
      (a) =>
        (tab === 'Todos' || a.category === tab) &&
        (status === 'Todos os status' || a.status === status) &&
        (!term || [a.name, a.tag, a.serial, a.personName ?? '', a.location].some((f) => f.toLowerCase().includes(term))),
    )
  }, [assets, tab, status, q])

  const counts = useMemo(() => {
    const c: Partial<Record<(typeof tabs)[number], number>> = { Todos: assets?.length ?? 0 }
    for (const a of assets ?? []) c[a.category] = (c[a.category] ?? 0) + 1
    return c
  }, [assets])

  const { pages, current, rows } = paginate(filtered, page, PAGE_SIZE)
  const reset = () => setPage(1)

  const remove = (a: Asset) =>
    confirm({
      title: 'Excluir ativo',
      message: (
        <>
          Excluir <b>{a.tag} · {a.name}</b> do inventário? As ordens de serviço desse ativo também serão removidas. Essa ação não pode ser desfeita.
        </>
      ),
      success: `${a.tag} excluído`,
      action: () => api(`/assets/${a.id}`, { method: 'DELETE' }),
    })

  return (
    <>
      <PageHead
        eyebrow="Gestão de ativos"
        title="Inventário de Ativos"
        actions={
          <>
            <button className="btn" onClick={downloadInventory}>
              <Download size={14} /> Exportar CSV
            </button>
            {canWrite && (
              <button className="btn btn-primary" onClick={() => openAsset()}>
                <Plus size={14} /> Cadastrar ativo
              </button>
            )}
          </>
        }
      />

      <section className="kpis">
        <Kpi tone="blue" label="Total de ativos" value={stats ? fmtInt(stats.total) : '—'} delta={stats ? `${fmtMoney(stats.totalValue)} em patrimônio` : ''} icon={<Package size={14} />} />
        <Kpi tone="lime" label="Em uso" value={stats ? fmtInt(stats.byStatus['Em uso']) : '—'} delta="Com responsável" icon={<CircleCheck size={14} />} />
        <Kpi tone="salmon" label="Manutenção" value={stats ? fmtInt(stats.byStatus['Manutenção']) : '—'} delta="Em reparo ou revisão" icon={<Wrench size={14} />} />
        <Kpi tone="lilac" label="Disponível" value={stats ? fmtInt(stats.byStatus['Disponível']) : '—'} delta="Em estoque" icon={<Sparkles size={14} />} />
      </section>

      <div className="filterbar">
        <Chips
          options={tabs}
          value={tab}
          counts={counts}
          onChange={(v) => {
            setTab(v)
            reset()
          }}
        />
        <span className="spacer" />
        <select
          className="select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as (typeof statuses)[number])
            reset()
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
            placeholder="Nome, etiqueta, série, pessoa…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              reset()
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
                <th>Garantia</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {error && <TableMessage cols={8}>{error}</TableMessage>}
              {!assets && !error && <TableMessage cols={8}>Carregando…</TableMessage>}
              {assets && rows.length === 0 && (
                <TableMessage cols={8}>
                  {assets.length === 0 ? 'Nenhum ativo cadastrado ainda.' : 'Nenhum ativo encontrado com esses filtros.'}
                </TableMessage>
              )}
              {rows.map((a) => {
                const Icon = categoryIcon[a.category]
                const expired = a.warrantyUntil && a.warrantyUntil < new Date().toISOString().slice(0, 10)
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
                    <td>{a.category}</td>
                    <td>
                      <Badge className={statusBadge[a.status]}>{a.status}</Badge>
                    </td>
                    <td>
                      <Person name={a.personName} />
                    </td>
                    <td className="muted">{a.location || '—'}</td>
                    <td className="muted num">{fmtDate(a.acquiredAt)}</td>
                    <td className="num" style={expired ? { color: 'var(--red)', fontWeight: 600 } : { color: 'var(--ink-3)' }}>
                      {fmtDate(a.warrantyUntil)}
                    </td>
                    <td>
                      {canWrite && (
                        <RowActions
                          extra={
                            a.status !== 'Baixado' && (
                              <button className="icon-btn" onClick={() => openOrder(undefined, a.id)} aria-label="Abrir manutenção" title="Abrir manutenção">
                                <Wrench size={14} />
                              </button>
                            )
                          }
                          onEdit={() => openAsset(a)}
                          onDelete={() => remove(a)}
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
            Exibindo {rows.length} de {filtered.length} ativos
          </span>
          <Pager page={current} pages={pages} onChange={setPage} />
        </div>
      </div>
    </>
  )
}
