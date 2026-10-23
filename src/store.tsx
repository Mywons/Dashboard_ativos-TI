import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler } from './api'
import type { User } from './data'

// ---------------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------------

interface AuthState {
  user: User | null
  loading: boolean
  canWrite: boolean
  isAdmin: boolean
  login: (email: string, password: string, remember: boolean) => Promise<void>
  logout: () => Promise<void>
  setUser: (u: User) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    api<{ user: User }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const r = await api<{ user: User }>('/auth/login', { method: 'POST', body: { email, password, remember } })
    setUser(r.user)
  }, [])

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        canWrite: user?.role === 'admin' || user?.role === 'tecnico',
        isAdmin: user?.role === 'admin',
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}

// ---------------------------------------------------------------------------
// Dados: cada mutação incrementa a versão e todas as telas recarregam
// ---------------------------------------------------------------------------

interface Toast {
  id: number
  text: string
  tone: 'ok' | 'error'
}

interface DataState {
  version: number
  /** Executa uma escrita na API, recarrega os dados e mostra um aviso. */
  mutate: <T>(fn: () => Promise<T>, success?: string) => Promise<T>
  toast: (text: string, tone?: Toast['tone']) => void
}

const DataContext = createContext<DataState | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = ++seq.current
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  const mutate = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string) => {
      const out = await fn()
      setVersion((v) => v + 1)
      if (success) toast(success)
      return out
    },
    [toast],
  )

  return (
    <DataContext.Provider value={{ version, mutate, toast }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData fora do DataProvider')
  return ctx
}

/** Busca um recurso da API e refaz a busca sempre que algum dado muda. */
export function useResource<T>(path: string) {
  const { version } = useData()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api<T>(path)
      .then((d) => {
        if (alive) {
          setData(d)
          setError(null)
        }
      })
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [path, version])

  return { data, error, loading: data === null && error === null }
}
