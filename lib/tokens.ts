import { createHmac, timingSafeEqual } from 'crypto'

const DEFAULT_DEV_SECRET = 'dev-only-signing-secret-change-me'

function signingSecret(): string {
  return (
    process.env.SIGNING_SECRET ||
    process.env.VOLUNTEER_TOKEN_SECRET ||
    DEFAULT_DEV_SECRET
  )
}

function b64urlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function b64urlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(payloadB64: string): string {
  return createHmac('sha256', signingSecret()).update(payloadB64).digest('base64url')
}

function verifySignedToken(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, signature] = parts
  const expected = signPayload(payloadB64)
  try {
    const sigBuf = Buffer.from(signature, 'base64url')
    const expBuf = Buffer.from(expected, 'base64url')
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null
    }
  } catch {
    return null
  }
  try {
    const parsed = JSON.parse(b64urlDecode(payloadB64)) as Record<string, unknown>
    const exp = parsed.exp
    if (typeof exp === 'number' && exp < Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

function createSignedToken(payload: Record<string, unknown>): string {
  const payloadB64 = b64urlEncode(JSON.stringify(payload))
  return `${payloadB64}.${signPayload(payloadB64)}`
}

const VOLUNTEER_SESSION_MS = 30 * 24 * 60 * 60 * 1000
const WITHDRAW_TOKEN_MS = 365 * 24 * 60 * 60 * 1000

export function normalizeVolunteerName(name: string): string {
  return name.trim()
}

export function createVolunteerSessionToken(name: string): string {
  const normalized = normalizeVolunteerName(name)
  return createSignedToken({
    kind: 'volunteer_session',
    name: normalized,
    exp: Date.now() + VOLUNTEER_SESSION_MS,
  })
}

export function verifyVolunteerSessionToken(
  token: string | null | undefined
): string | null {
  if (!token) return null
  const payload = verifySignedToken(token)
  if (!payload || payload.kind !== 'volunteer_session') return null
  const name = payload.name
  if (typeof name !== 'string' || !name.trim()) return null
  return normalizeVolunteerName(name)
}

export function createWithdrawToken(signupId: string, volunteerName: string): string {
  return createSignedToken({
    kind: 'withdraw',
    signupId,
    name: normalizeVolunteerName(volunteerName),
    exp: Date.now() + WITHDRAW_TOKEN_MS,
  })
}

export function verifyWithdrawToken(
  token: string | null | undefined,
  signupId: string,
  volunteerName: string
): boolean {
  if (!token) return false
  const payload = verifySignedToken(token)
  if (!payload || payload.kind !== 'withdraw') return false
  return (
    payload.signupId === signupId &&
    typeof payload.name === 'string' &&
    payload.name.toLowerCase() === normalizeVolunteerName(volunteerName).toLowerCase()
  )
}
