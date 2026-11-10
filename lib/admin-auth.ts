import { createHash, createHmac, timingSafeEqual } from 'crypto'
import type { NextRequest, NextResponse } from 'next/server'

export const ADMIN_SESSION_COOKIE = 'admin_session'
const SESSION_MAX_AGE_SEC = 60 * 60 * 8

function getAdminPin(): string | null {
  const pin = process.env.ADMIN_PIN
  if (pin === undefined || pin === '') return null
  return pin
}

/** Returns false when ADMIN_PIN is unset (fail closed). */
export function isAdminPinConfigured(): boolean {
  return getAdminPin() !== null
}

function secureCompare(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest()
  const hb = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(ha, hb)
}

export function verifyAdminPin(candidate: string): boolean {
  const pin = getAdminPin()
  if (!pin) return false
  return secureCompare(candidate, pin)
}

function sessionSecret(): string | null {
  return getAdminPin()
}

function signSessionValue(): string | null {
  const secret = sessionSecret()
  if (!secret) return null
  const exp = Date.now() + SESSION_MAX_AGE_SEC * 1000
  const payload = String(exp)
  const sig = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifySessionToken(token: string): boolean {
  const secret = sessionSecret()
  if (!secret) return false
  const dot = token.lastIndexOf('.')
  if (dot === -1) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const exp = Number(payload)
  if (!Number.isFinite(exp) || Date.now() > exp) return false
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  return secureCompare(sig, expected)
}

export function isAdmin(request: NextRequest): boolean {
  if (!getAdminPin()) return false
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  if (!token) return false
  return verifySessionToken(token)
}

function cookieBaseOptions() {
  const secure = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true as const,
    secure,
    sameSite: 'lax' as const,
    path: '/',
  }
}

export function attachAdminSessionCookie(response: NextResponse): NextResponse {
  const value = signSessionValue()
  if (!value) {
    return response
  }
  response.cookies.set(ADMIN_SESSION_COOKIE, value, {
    ...cookieBaseOptions(),
    maxAge: SESSION_MAX_AGE_SEC,
  })
  return response
}

export function clearAdminSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...cookieBaseOptions(),
    maxAge: 0,
  })
  return response
}

type RateBucket = { count: number; resetAt: number }

const loginAttempts = new Map<string, RateBucket>()
const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export function isLoginRateLimited(ip: string): boolean {
  const now = Date.now()
  const bucket = loginAttempts.get(ip)
  if (!bucket || now > bucket.resetAt) return false
  return bucket.count >= LOGIN_MAX_ATTEMPTS
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now()
  const bucket = loginAttempts.get(ip)
  if (!bucket || now > bucket.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    return
  }
  bucket.count += 1
}

export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip)
}
