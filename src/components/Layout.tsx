import { useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity,
  Bell,
  ChartLine,
  ChevronRight,
  Lightbulb,
  LayoutGrid,
  Menu,
  Monitor,
  Plug,
  Plus,
  Search,
  Settings,
  Users,
  Wrench,
} from 'lucide-react'
import { roleLabel } from '../data'
import { useAuth } from '../store'
import { useModals } from './Modals'
import { Avatar } from './ui'

export const org = { name: 'Grupo Legal', unit: 'Tecnologia da Informação' }

export type Route = 'overview' | 'inventory' | 'people' | 'maintenance' | 'reports' | 'integrations' | 'settings'

const mainNav: { id: Route; label: string; icon: typeof Monitor }[] = [
  { id: 'overview', label: 'Visão geral', icon: LayoutGrid },
  { id: 'inventory', label: 'Inventário', icon: Monitor },
  { id: 'people', label: 'Pessoas', icon: Users },
  { id: 'maintenance', label: 'Manutenção', icon: Wrench },
  { id: 'reports', label: 'Relatórios', icon: ChartLine },
]
const systemNav: typeof mainNav = [
  { id: 'integrations', label: 'Integrações', icon: Plug },
  { id: 'settings', label: 'Configurações', icon: Settings },
]

const tips: Partial<Record<Route, string>> = {
  overview: 'Clique nos alertas para ver quais ativos precisam de atenção.',
  inventory: 'Use a busca do topo para achar qualquer ativo pela etiqueta ou série.',
  people: 'Ao excluir uma pessoa, os ativos dela voltam para o estoque.',
  maintenance: 'Ao abrir uma OS o ativo entra em manutenção; ao concluir, ele volta ao status anterior.',
  reports: 'Exporte o inventário completo em CSV para abrir no Excel.',
  settings: 'Os dados ficam salvos neste navegador. Use "Restaurar dados" para voltar ao exemplo.',
}

export function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <span className="brand-mark">
      <Activity size={size} strokeWidth={2.5} />
    </span>
  )
}

function Sidebar({
  route,
  onNavigate,
  open,
}: {
  route: Route
  onNavigate: (r: Route) => void
  open: boolean
}) {
  const { user } = useAuth()
  const item = (n: (typeof mainNav)[number]) => {
    const Icon = n.icon
    const active = n.id === route
    return (
      <button key={n.id} className={`nav-item ${active ? 'active' : ''}`} onClick={() => onNavigate(n.id)}>
        <Icon size={16} />
        {n.label}
        {active && <ChevronRight size={14} className="chev" />}
      </button>
    )
  }
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">
        <BrandMark />
        <div>
          <div className="brand-name">GL·TI</div>
          <div className="brand-sub">{org.name}</div>
        </div>
      </div>
      <div className="nav-section">Gestão de ativos</div>
      <nav className="nav">{mainNav.map(item)}</nav>
      <div className="nav-section">Sistema</div>
      <nav className="nav">{systemNav.map(item)}</nav>

      <div className="sidebar-tip">
        <div className="sidebar-tip-head">
          <Lightbulb size={14} />
          <span className="tag">Dica rápida</span>
        </div>
        {tips[route] ?? tips.overview}
      </div>
      <div className="sidebar-user">
        <Avatar name={user.name} />
        <div className="who">
          <strong>{user.name}</strong>
          <span>{roleLabel[user.role]} · demonstração</span>
        </div>
      </div>
    </aside>
  )
}

function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: (q: string) => void }) {
  const { canWrite } = useAuth()
  const { openAsset } = useModals()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(q.trim())
  }
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <header className="topbar">
      <button className="icon-ghost menu-btn" onClick={onMenu} aria-label="Abrir menu">
        <Menu size={20} />
      </button>
      <div className="topbar-crumb">
        <span className="eyebrow">{org.name}</span>
        <span className="date">{today}</span>
      </div>
      <form className="search" onSubmit={submit} role="search">
        <Search size={15} />
        <input placeholder="Buscar ativo, etiqueta ou série…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        <span className="kbd">Enter</span>
      </form>
      <a className="bell" href="#/overview" aria-label="Alertas">
        <Bell size={16} />
      </a>
      {canWrite && (
        <button className="btn btn-primary" onClick={() => openAsset()}>
          <Plus size={15} />
          <span className="label">Novo ativo</span>
        </button>
      )}
    </header>
  )
}

export function Layout({
  route,
  onNavigate,
  onSearch,
  menuOpen,
  setMenuOpen,
  children,
}: {
  route: Route
  onNavigate: (r: Route) => void
  onSearch: (q: string) => void
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
  children: ReactNode
}) {
  return (
    <div className="app">
      <Sidebar route={route} onNavigate={onNavigate} open={menuOpen} />
      <div className="main" onClick={() => menuOpen && setMenuOpen(false)}>
        <Topbar onMenu={() => setMenuOpen(true)} onSearch={onSearch} />
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
