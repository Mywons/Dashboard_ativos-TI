import type { ReactNode } from 'react'
import {
  Activity,
  Bell,
  ChartLine,
  ChevronRight,
  Lightbulb,
  LayoutGrid,
  LogOut,
  Menu,
  Monitor,
  Plug,
  Plus,
  Search,
  Settings,
  Users,
  Wrench,
} from 'lucide-react'
import { currentUser, org } from '../data'
import { Avatar } from './ui'

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
  overview: 'Você tem 14 garantias vencendo este mês. Planeje as renovações.',
  inventory: 'Use Ctrl+K para buscar qualquer ativo pela etiqueta ou série.',
  people: 'Vincule responsáveis aos 9 ativos em uso sem dono.',
  maintenance: 'Registre peças usadas na OS para calcular o custo real.',
  reports: 'Agende o relatório mensal para receber por e-mail.',
  settings: 'Ative a autenticação em dois fatores para proteger sua conta.',
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
  onLogout,
  open,
}: {
  route: Route
  onNavigate: (r: Route) => void
  onLogout: () => void
  open: boolean
}) {
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
        <Avatar name={currentUser.name} />
        <div className="who">
          <strong>{currentUser.name}</strong>
          <span>{currentUser.access}</span>
        </div>
        <button className="icon-ghost" onClick={onLogout} aria-label="Sair">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}

function Topbar({ onMenu, onNew }: { onMenu: () => void; onNew: () => void }) {
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
      <label className="search">
        <Search size={15} />
        <input placeholder="Buscar ativo, pessoa ou série…" />
        <span className="kbd">⌘K</span>
      </label>
      <button className="bell" aria-label="Notificações">
        <Bell size={16} />
        <span className="dot" />
      </button>
      <button className="btn btn-primary" onClick={onNew}>
        <Plus size={15} />
        <span className="label">Novo ativo</span>
      </button>
    </header>
  )
}

export function Layout({
  route,
  onNavigate,
  onLogout,
  menuOpen,
  setMenuOpen,
  children,
}: {
  route: Route
  onNavigate: (r: Route) => void
  onLogout: () => void
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
  children: ReactNode
}) {
  return (
    <div className="app">
      <Sidebar route={route} onNavigate={onNavigate} onLogout={onLogout} open={menuOpen} />
      <div className="main" onClick={() => menuOpen && setMenuOpen(false)}>
        <Topbar onMenu={() => setMenuOpen(true)} onNew={() => onNavigate('inventory')} />
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
