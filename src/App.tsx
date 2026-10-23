import { useEffect, useState } from 'react'
import { Layout, type Route } from './components/Layout'
import { ModalsProvider } from './components/Modals'
import { AuthProvider, DataProvider } from './store'
import { Overview } from './pages/Overview'
import { Inventory } from './pages/Inventory'
import { People } from './pages/People'
import { Maintenance } from './pages/Maintenance'
import { Reports } from './pages/Reports'
import { Integrations } from './pages/Integrations'
import { Settings } from './pages/Settings'

const routes: Route[] = ['overview', 'inventory', 'people', 'maintenance', 'reports', 'integrations', 'settings']

/** Roteamento simples por hash: #/overview, #/inventory?q=dell… */
function readHash(): { route: Route; params: URLSearchParams } {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  return {
    route: (routes as string[]).includes(path) ? (path as Route) : 'overview',
    params: new URLSearchParams(query),
  }
}

function Shell() {
  const [{ route, params }, setLoc] = useState(readHash)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onHash = () => {
      setLoc(readHash())
      setMenuOpen(false)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (r: Route, query?: Record<string, string>) => {
    const qs = query ? new URLSearchParams(query).toString() : ''
    window.location.hash = `/${r}${qs ? `?${qs}` : ''}`
  }

  return (
    <ModalsProvider>
      <Layout
        route={route}
        onNavigate={(r) => go(r)}
        onSearch={(q) => go('inventory', q ? { q } : undefined)}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      >
        {route === 'overview' && <Overview onNavigate={go} />}
        {route === 'inventory' && <Inventory key={params.toString()} params={params} />}
        {route === 'people' && <People />}
        {route === 'maintenance' && <Maintenance />}
        {route === 'reports' && <Reports />}
        {route === 'integrations' && <Integrations />}
        {route === 'settings' && <Settings />}
      </Layout>
    </ModalsProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Shell />
      </DataProvider>
    </AuthProvider>
  )
}
