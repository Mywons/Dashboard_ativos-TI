import { handle, MockError } from './mock'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * "Chamada de API" da demonstração: responde no próprio navegador (src/mock.ts),
 * sem servidor nem banco. Mantém a mesma assinatura para as telas.
 */
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  // Pequena espera para a interface se comportar como uma chamada real
  await new Promise((r) => setTimeout(r, 120))
  try {
    return handle(options.method ?? 'GET', path, (options.body ?? {}) as Record<string, unknown>) as T
  } catch (e) {
    if (e instanceof MockError) throw new ApiError(e.status, e.message)
    throw e
  }
}
