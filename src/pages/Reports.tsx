import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, Building2, CalendarDays, Download, FileSpreadsheet, Gauge, Layers, Package, Percent, Tag, TriangleAlert, Wallet } from 'lucide-react'
import {
  ASSET_STATUS,
  CATEGORIES,
  categoryColor,
  fmtDate,
  fmtInt,
  fmtMonth,
  fmtMoney,
  fmtMoneyShort,
  fmtPct,
  todayIso,
  type Asset,
  type Person,
  type ServiceOrder,
} from '../data'
import { useResource } from '../store'
import { Badge, Kpi, Meter, PageHead, TableMessage } from '../components/ui'

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { value: number } }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tooltip">
      {label}: <b>{payload[0].value} ativo(s)</b> · {fmtMoney(payload[0].payload.value)}
    </div>
  )
}

/** Gera e baixa um CSV (separado por ; para abrir direto no Excel em pt-BR). */
function downloadCsv(filename: string, head: string[], rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    const s = v === null || v === undefined ? '' : typeof v === 'number' ? String(v).replace('.', ',') : v
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = '﻿' + [head, ...rows].map((r) => r.map(esc).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const ageYears = (a: Asset) => (Date.now() - Date.parse(a.acquiredAt)) / (365.25 * 86400000)

export function Reports() {
  const { data: assets } = useResource<Asset[]>('/assets')
  const { data: orders } = useResource<ServiceOrder[]>('/orders')
  const { data: people } = useResource<Person[]>('/people')
  const [months, setMonths] = useState(12)
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')

  const locations = useMemo(() => [...new Set((assets ?? []).map((a) => a.location).filter(Boolean))].sort(), [assets])

  const list = useMemo(
    () =>
      (assets ?? []).filter(
        (a) => (!location || a.location === location) && (!category || a.category === category) && (!status ? a.status !== 'Baixado' : a.status === status),
      ),
    [assets, location, category, status],
  )
  const ids = new Set(list.map((a) => a.id))
  const ordersInScope = (orders ?? []).filter((o) => ids.has(o.assetId))

  const total = list.length
  const inUse = list.filter((a) => a.status === 'Em uso').length
  const value = list.reduce((s, a) => s + a.value, 0)
  const maintenanceCost = ordersInScope.reduce((s, o) => s + o.cost, 0)
  const closed = ordersInScope.filter((o) => o.closedAt)
  const sla = closed.length ? closed.filter((o) => (o.closedAt ?? '') <= o.dueAt).length / closed.length : 1

  const acquisitions = useMemo(() => {
    const out: { month: string; label: string; count: number; value: number }[] = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const ym = d.toISOString().slice(0, 7)
      const inMonth = list.filter((a) => a.acquiredAt.startsWith(ym))
      out.push({ month: ym, label: months > 12 ? `${fmtMonth(ym)}/${ym.slice(2, 4)}` : fmtMonth(ym), count: inMonth.length, value: inMonth.reduce((s, a) => s + a.value, 0) })
    }
    return out
  }, [list, months])
  const periodCount = acquisitions.reduce((s, m) => s + m.count, 0)
  const periodValue = acquisitions.reduce((s, m) => s + m.value, 0)

  const byCategory = CATEGORIES.map((c) => ({ name: c, value: list.filter((a) => a.category === c).length }))
  const old = list.filter((a) => ageYears(a) > 4)
  const now = todayIso()
  const expiredWarranty = list.filter((a) => !a.warrantyUntil || a.warrantyUntil < now).length

  const exportsList = [
    {
      name: 'Inventário (filtros atuais)',
      detail: `${total} ativo(s)`,
      run: () =>
        downloadCsv(
          `inventario-filtrado-${now}.csv`,
          ['Etiqueta', 'Nome', 'Série', 'Categoria', 'Status', 'Responsável', 'Localização', 'Aquisição', 'Garantia', 'Valor (R$)'],
          list.map((a) => [a.tag, a.name, a.serial, a.category, a.status, a.personName, a.location, a.acquiredAt, a.warrantyUntil, a.value]),
        ),
    },
    {
      name: 'Garantias vencidas ou sem garantia',
      detail: `${expiredWarranty} ativo(s)`,
      run: () =>
        downloadCsv(
          `garantias-${now}.csv`,
          ['Etiqueta', 'Nome', 'Categoria', 'Responsável', 'Garantia'],
          list.filter((a) => !a.warrantyUntil || a.warrantyUntil < now).map((a) => [a.tag, a.name, a.category, a.personName, a.warrantyUntil ?? 'Sem garantia']),
        ),
    },
    {
      name: 'Ordens de serviço e custos',
      detail: `${ordersInScope.length} OS · ${fmtMoney(maintenanceCost)}`,
      run: () =>
        downloadCsv(
          `ordens-servico-${now}.csv`,
          ['OS', 'Etiqueta', 'Ativo', 'Tipo', 'Status', 'Técnico', 'Abertura', 'Prazo', 'Conclusão', 'Custo (R$)'],
          ordersInScope.map((o) => [o.code, o.assetTag, o.assetName, o.type, o.status, o.tech, o.openedAt, o.dueAt, o.closedAt, o.cost]),
        ),
    },
    {
      name: 'Ativos por colaborador',
      detail: `${people?.length ?? 0} pessoa(s)`,
      run: () =>
        downloadCsv(
          `ativos-por-colaborador-${now}.csv`,
          ['Pessoa', 'E-mail', 'Departamento', 'Etiqueta', 'Ativo', 'Categoria', 'Status'],
          (people ?? []).flatMap((p) => {
            const mine = (assets ?? []).filter((a) => a.personId === p.id)
            return mine.length ? mine.map((a) => [p.name, p.email, p.department, a.tag, a.name, a.category, a.status]) : [[p.name, p.email, p.department, '', '', '', '']]
          }),
        ),
    },
  ]

  return (
    <>
      <PageHead
        eyebrow="Inteligência do parque"
        title="Relatórios de ativos"
        actions={
          <a className="btn btn-dark" href="/api/export/assets.csv" download>
            <Download size={14} /> Exportar inventário completo
          </a>
        }
      />

      <div className="report-filters">
        <label className="field-box">
          <CalendarDays size={15} />
          <div style={{ flex: 1 }}>
            <small>Período (aquisições)</small>
            <select value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Últimos 12 meses</option>
              <option value={24}>Últimos 24 meses</option>
            </select>
          </div>
        </label>
        <label className="field-box">
          <Building2 size={15} />
          <div style={{ flex: 1 }}>
            <small>Localização</small>
            <select value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="">Todas</option>
              {locations.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
        </label>
        <label className="field-box">
          <Tag size={15} />
          <div style={{ flex: 1 }}>
            <small>Categoria</small>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </label>
        <label className="field-box">
          <Layers size={15} />
          <div style={{ flex: 1 }}>
            <small>Status</small>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Ativos (sem baixados)</option>
              {ASSET_STATUS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </label>
        <button
          className="btn btn-sm"
          onClick={() => {
            setLocation('')
            setCategory('')
            setStatus('')
            setMonths(12)
          }}
        >
          Limpar
        </button>
      </div>

      <section className="kpis">
        <Kpi tone="blue" label="Ativos no filtro" value={fmtInt(total)} delta={`${fmtMoneyShort(value)} em patrimônio`} icon={<Package size={14} />} />
        <Kpi tone="lime" label="Taxa de utilização" value={total ? fmtPct(inUse / total) : '—'} delta={`${inUse} em uso`} icon={<Percent size={14} />} />
        <Kpi tone="salmon" label="Custo de manutenção" value={fmtMoneyShort(maintenanceCost)} delta={`${ordersInScope.length} ordem(ns) de serviço`} icon={<Wallet size={14} />} trend={[6, 7, 5, 8, 6, 7, 5, 6]} />
        <Kpi tone="lilac" label="SLA de manutenção" value={fmtPct(sla)} delta={`${closed.length} OS concluídas`} icon={<Gauge size={14} />} />
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow">Investimento</span>
              <h3>Aquisições por mês</h3>
            </div>
            <span className="muted small">
              {periodCount} ativo(s) · {fmtMoney(periodValue)}
            </span>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={acquisitions} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--line)' }} tick={{ fontSize: 11, fill: 'var(--ink-3)' }} interval={months > 12 ? 2 : 0} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--ink-3)' }} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(17,19,18,0.05)' }} />
                <Bar dataKey="count" fill="var(--blue)" stroke="var(--ink)" strokeWidth={1.5} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-lime">
          <div className="card-head">
            <div>
              <span className="eyebrow">Composição do parque</span>
              <h3>Distribuição de ativos</h3>
            </div>
            <span className="round-icon dark">
              <Layers size={14} />
            </span>
          </div>
          <div className="meters">
            {byCategory.map((c) => (
              <Meter
                key={c.name}
                label={`${c.name} · ${total ? Math.round((c.value / total) * 100) : 0}%`}
                value={c.value}
                max={total || 1}
                color={c.name === 'Monitor' ? '#7a9400' : categoryColor[c.name]}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="grid-reports-b">
        <div className="cta-blue">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Badge className="badge-lime">Ação recomendada</Badge>
            <h3>{old.length ? `Planeje a renovação de ${old.length} dispositivo(s).` : 'Parque dentro da vida útil.'}</h3>
            <p>
              {old.length
                ? 'Esses equipamentos têm mais de 4 anos de uso e costumam concentrar os chamados corretivos.'
                : 'Nenhum ativo do filtro passou de 4 anos de uso.'}
            </p>
          </div>
          <div className="foot">
            <div>
              <small>Valor de compra desses ativos</small>
              <b>{fmtMoney(old.reduce((s, a) => s + a.value, 0))}</b>
            </div>
            {old.length > 0 && (
              <button
                className="btn btn-sm"
                onClick={() =>
                  downloadCsv(
                    `renovacao-${now}.csv`,
                    ['Etiqueta', 'Nome', 'Categoria', 'Responsável', 'Aquisição', 'Idade (anos)'],
                    old.map((a) => [a.tag, a.name, a.category, a.personName, a.acquiredAt, Number(ageYears(a).toFixed(1))]),
                  )
                }
              >
                Baixar lista <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="card card-lime">
          <div className="card-head">
            <div>
              <span className="eyebrow">Ciclo de vida</span>
              <h3>Idade do parque</h3>
            </div>
            <span className="round-icon dark">
              <CalendarDays size={14} />
            </span>
          </div>
          <div className="meters">
            <Meter label="Até 2 anos" value={list.filter((a) => ageYears(a) <= 2).length} max={total || 1} color="var(--blue)" />
            <Meter label="2 a 4 anos" value={list.filter((a) => ageYears(a) > 2 && ageYears(a) <= 4).length} max={total || 1} color="#7a9400" />
            <Meter label="Acima de 4 anos" value={old.length} max={total || 1} color="var(--red)" />
          </div>
          <div className="callout-dark bottom">
            <TriangleAlert size={16} color="var(--yellow)" />
            <span style={{ opacity: 1 }}>{expiredWarranty} ativo(s) sem garantia vigente</span>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow">Valores</span>
              <h3>Patrimônio por status</h3>
            </div>
          </div>
          <div className="meters">
            {ASSET_STATUS.filter((s) => s !== 'Baixado' || status === 'Baixado').map((s) => {
              const v = list.filter((a) => a.status === s).reduce((sum, a) => sum + a.value, 0)
              return (
                <div key={s}>
                  <div className="meter-row">
                    <span>{s}</span>
                    <span className="num">{fmtMoneyShort(v)}</span>
                  </div>
                  <div className="meter-track">
                    <div className="meter-fill" style={{ width: `${value ? (v / value) * 100 : 0}%`, background: 'var(--ink)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="stack">
        <div className="section-head">
          <div>
            <span className="eyebrow">Exportações</span>
            <h2>Relatórios disponíveis</h2>
          </div>
        </div>
        <div className="card table-card">
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Relatório</th>
                  <th>Conteúdo</th>
                  <th>Gerado em</th>
                  <th>Formato</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {!assets && <TableMessage cols={5}>Carregando…</TableMessage>}
                {assets &&
                  exportsList.map((r, i) => (
                    <tr key={r.name} className={i === 0 ? 'hl' : ''}>
                      <td>
                        <div className="cell-main">
                          <span className="thumb lime">
                            <FileSpreadsheet size={15} />
                          </span>
                          <strong>{r.name}</strong>
                        </div>
                      </td>
                      <td className="muted">{r.detail}</td>
                      <td className="muted">{fmtDate(now)} (na hora)</td>
                      <td>
                        <Badge className="plain badge-lime">CSV</Badge>
                      </td>
                      <td>
                        <button className="btn btn-sm" onClick={r.run}>
                          <Download size={12} /> Baixar
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="table-foot">
            <span>Os relatórios respeitam os filtros selecionados acima.</span>
          </div>
        </div>
      </section>
    </>
  )
}
