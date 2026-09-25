import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChartLine,
  Download,
  Ellipsis,
  FileSpreadsheet,
  FileText,
  Gauge,
  Layers,
  Package,
  Percent,
  Plus,
  RefreshCw,
  Tag,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { availability, reports } from '../data'
import { AlertList, Badge, Kpi, Meter, PageHead, Toggle } from '../components/ui'

function LineTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tooltip">
      {label}: <b>{payload[0].value.toFixed(1).replace('.', ',')}%</b>
    </div>
  )
}

const formatThumb: Record<string, string> = { PDF: 'salmon', XLSX: 'lime', CSV: 'lilac' }

export function Reports() {
  const [compare, setCompare] = useState(true)

  return (
    <>
      <PageHead
        eyebrow="Inteligência do parque"
        title="Relatórios de ativos"
        actions={
          <>
            <button className="btn">
              <RefreshCw size={14} /> Atualizar
            </button>
            <button className="btn btn-dark">
              <Download size={14} /> Exportar relatório
            </button>
          </>
        }
      />

      <div className="report-filters">
        {[
          { icon: CalendarDays, label: 'Período', options: ['Últimos 9 meses', 'Últimos 30 dias', 'Este ano'] },
          { icon: Building2, label: 'Unidade', options: ['Todas as unidades', 'São Paulo', 'Rio de Janeiro', 'Campinas', 'Curitiba'] },
          { icon: Tag, label: 'Categoria', options: ['Todas as categorias', 'Notebooks', 'Monitores', 'Celulares', 'Periféricos'] },
          { icon: Layers, label: 'Status', options: ['Todos os status', 'Em uso', 'Disponível', 'Manutenção'] },
        ].map((f) => (
          <label key={f.label} className="field-box">
            <f.icon size={15} />
            <div style={{ flex: 1 }}>
              <small>{f.label}</small>
              <select>
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          </label>
        ))}
        <span className="person small" style={{ fontWeight: 600 }}>
          <Toggle on={compare} onChange={setCompare} label="Comparar com período anterior" />
          Comparar período
        </span>
      </div>

      <section className="kpis">
        <Kpi tone="blue" label="Ativos monitorados" value="1.284" delta="↑ 2,5% no período" icon={<Package size={14} />} />
        <Kpi tone="lime" label="Taxa de utilização" value="73,4%" delta="↑ 1,8 p.p." icon={<Percent size={14} />} />
        <Kpi tone="salmon" label="Custo de manutenção" value="R$ 46,8 mil" delta="No trimestre" icon={<Wallet size={14} />} trend={[6, 7, 5, 8, 6, 7, 5, 6]} />
        <Kpi tone="lilac" label="SLA de suporte" value="92%" delta="Meta: 90%" icon={<Gauge size={14} />} />
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow">Performance</span>
              <h3>Disponibilidade do parque em alta</h3>
            </div>
            <div className="chart-legend">
              <span>
                <i style={{ background: 'var(--blue)' }} />
                2026
              </span>
              {compare && (
                <span>
                  <i style={{ background: 'var(--ink-3)' }} />
                  Meta 90%
                </span>
              )}
            </div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={availability} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: 'var(--line)' }} tick={{ fontSize: 11, fill: 'var(--ink-3)' }} />
                <YAxis domain={[86, 95]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--ink-3)' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<LineTooltip />} cursor={{ stroke: 'var(--ink)', strokeDasharray: '3 3' }} />
                {compare && (
                  <Line dataKey={() => 90} stroke="var(--ink-3)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} activeDot={false} isAnimationActive={false} />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--blue)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: 'var(--lime)', stroke: 'var(--ink)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="note">
            <ChartLine size={14} /> Disponibilidade subiu 5,2 p.p. desde janeiro.
            <button className="link">Detalhar</button>
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
            <Meter label="Notebooks · 40%" value={512} max={1284} color="var(--blue)" />
            <Meter label="Monitores · 28%" value={356} max={1284} color="#7a9400" />
            <Meter label="Celulares · 19%" value={248} max={1284} color="var(--red)" />
            <Meter label="Periféricos · 13%" value={168} max={1284} color="var(--ink)" />
          </div>
          <div className="callout-dark bottom">
            <span className="score">
              <ArrowUpRight size={18} />
            </span>
            <div>
              <strong>Notebooks lideram o crescimento</strong>
              <span>+24 unidades nos últimos 90 dias</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-reports-b">
        <div className="cta-blue">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Badge className="badge-lime">Ação recomendada</Badge>
            <h3>Antecipe a renovação de 67 dispositivos.</h3>
            <p>Equipamentos com mais de 4 anos concentram 61% dos chamados corretivos do trimestre.</p>
          </div>
          <div className="foot">
            <div>
              <small>Economia estimada</small>
              <b>R$ 12,4 mil / ano</b>
            </div>
            <button className="btn btn-sm">
              Ver plano <ArrowRight size={13} />
            </button>
          </div>
        </div>

        <div className="card card-lime">
          <div className="card-head">
            <div>
              <span className="eyebrow">Ciclo de vida</span>
              <h3>Ciclo de vida do parque</h3>
            </div>
            <span className="round-icon dark">
              <CalendarDays size={14} />
            </span>
          </div>
          <div className="meters">
            <Meter label="Até 2 anos" value={598} max={1284} color="var(--blue)" />
            <Meter label="2 a 4 anos" value={619} max={1284} color="#7a9400" />
            <Meter label="Acima de 4 anos" value={67} max={1284} color="var(--red)" />
          </div>
          <div className="callout-dark bottom">
            <TriangleAlert size={16} color="var(--yellow)" />
            <span style={{ opacity: 1 }}>67 ativos já passaram da vida útil</span>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <span className="eyebrow" style={{ color: 'var(--red)' }}>
                Riscos
              </span>
              <h3>Pontos de atenção</h3>
            </div>
            <span className="round-icon red">
              <TriangleAlert size={14} />
            </span>
          </div>
          <AlertList />
        </div>
      </section>

      <section className="stack">
        <div className="section-head">
          <div>
            <span className="eyebrow">Histórico de exportações</span>
            <h2>Relatórios recentes</h2>
          </div>
          <div className="page-actions">
            <button className="btn btn-sm">
              <CalendarDays size={13} /> Agendamentos
            </button>
            <button className="btn btn-sm btn-dark">
              <Plus size={13} /> Novo relatório
            </button>
          </div>
        </div>
        <div className="card table-card">
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Relatório</th>
                  <th>Período</th>
                  <th>Gerado em</th>
                  <th>Responsável</th>
                  <th>Formato</th>
                  <th>Ação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={r.name} className={i === 0 ? 'hl' : ''}>
                    <td>
                      <div className="cell-main">
                        <span className={`thumb ${formatThumb[r.format]}`}>
                          {r.format === 'PDF' ? <FileText size={15} /> : <FileSpreadsheet size={15} />}
                        </span>
                        <div>
                          <strong>{r.name}</strong>
                          <small>{r.detail}</small>
                        </div>
                      </div>
                    </td>
                    <td>{r.period}</td>
                    <td className="muted">{r.created}</td>
                    <td>{r.owner}</td>
                    <td>
                      <Badge className={`plain badge-${formatThumb[r.format]}`}>{r.format}</Badge>
                    </td>
                    <td>
                      <button className="btn btn-sm">
                        <Download size={12} /> Baixar
                      </button>
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
            <span>{reports.length} relatórios gerados neste mês</span>
            <button className="note link" style={{ margin: 0, background: 'none', border: 0, color: 'var(--blue)', fontWeight: 600 }}>
              Ver todos <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
