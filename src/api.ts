export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

/** Logo após uma alteração, pede ao servidor os dados mais recentes (pode haver várias instâncias). */
let lastWrite = 0

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}, attempt = 0): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (Date.now() - lastWrite < 8000) headers['X-Fresh'] = '1'
  if (method !== 'GET') lastWrite = Date.now()
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor')
  }
  const data = await res.json().catch(() => ({}))
  // Conflito de gravação simultânea entre servidores: tenta de novo com os dados atualizados
  if (res.status === 409 && res.headers.get('X-Conflict') && attempt < 2) return api<T>(path, options, attempt + 1)
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.()
    throw new ApiError(res.status, data.error || `Erro ${res.status}`)
  }
  return data as T
}
