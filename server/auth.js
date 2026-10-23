import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEYLEN = 64

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, KEYLEN).toString('hex')
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split(':')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, KEYLEN)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

// ---------------------------------------------------------------------------
// Sessão sem estado: cookie assinado com HMAC. Funciona em várias instâncias
// serverless sem tabela de sessões. Trocar a senha invalida os cookies antigos.
// ---------------------------------------------------------------------------

const sign = (secret, data) => createHmac('sha256', secret).update(data).digest('base64url')

export function createToken(secret, { userId, passwordChangedAt, expiresAt }) {
  const payload = Buffer.from(JSON.stringify({ u: userId, p: passwordChangedAt, e: expiresAt })).toString('base64url')
  return `${payload}.${sign(secret, payload)}`
}

/** Devolve { userId, passwordChangedAt } se o token for válido e não expirado. */
export function readToken(secret, token) {
  const [payload, mac] = String(token).split('.')
  if (!payload || !mac) return null
  const expected = Buffer.from(sign(secret, payload))
  const given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const { u, p, e } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof e !== 'number' || e < Date.now()) return null
    return { userId: u, passwordChangedAt: p }
  } catch {
    return null
  }
}

export function parseCookies(header = '') {
  const out = {}
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export const randomSecret = () => randomBytes(32).toString('base64url')

/** Limite simples de tentativas de login: 5 falhas em 15 min bloqueiam por 15 min. */
const attempts = new Map()
const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILS = 5

export function loginBlocked(key) {
  const a = attempts.get(key)
  if (!a) return false
  if (Date.now() - a.first > WINDOW_MS) {
    attempts.delete(key)
    return false
  }
  return a.count >= MAX_FAILS
}

export function registerFail(key) {
  const a = attempts.get(key)
  if (!a || Date.now() - a.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() })
  else a.count++
}

export function clearFails(key) {
  attempts.delete(key)
}
