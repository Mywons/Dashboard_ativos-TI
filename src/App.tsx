import { useEffect, useState } from 'react'
import { Layout, type Route } from './components/Layout'
import { Login } from './pages/Login'
import { Overview } from './pages/Overview'
import { Inventory } from './pages/Inventory'
import { People } from './pages/People'
import { Maintenance } from './pages/Maintenance'
import { Reports } from './pages/Reports'
import { Integrations } from './pages/Integrations'
import { Settings } from './pages/Settings'

const routes: Route[] = ['overview', 'inventory', 'people', 'maintenance', 'reports', 'integrations', 'settings']

/** Roteamento simples por hash: #/login, #/overview, #/inventory… */
function readHash(): Route | 'login' {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (h === 'login') return 'login'
  return (routes as string[]).includes(h) ? (h as Route) : 'overview'
}

export default function App() {
  const [route, setRoute] = useState(readHash)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onHash = () => {
      setRoute(readHash())
      setMenuOpen(false)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (r: Route | 'login') => {
    window.location.hash = `/${r}`
  }

  if (route === 'login') return <Login onLogin={() => go('overview')} />

  return (
    <Layout route={route} onNavigate={go} onLogout={() => go('login')} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {route === 'overview' && <Overview onNavigate={go} />}
      {route === 'inventory' && <Inventory />}
      {route === 'people' && <People />}
      {route === 'maintenance' && <Maintenance />}
      {route === 'reports' && <Reports />}
      {route === 'integrations' && <Integrations />}
      {route === 'settings' && <Settings />}
    </Layout>
  )
}
