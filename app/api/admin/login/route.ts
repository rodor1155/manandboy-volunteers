import { NextRequest, NextResponse } from 'next/server'
import {
  attachAdminSessionCookie,
  clearLoginAttempts,
  getClientIp,
  isAdminPinConfigured,
  isLoginRateLimited,
  recordFailedLogin,
  verifyAdminPin,
} from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  if (!isAdminPinConfigured()) {
    return NextResponse.json({ error: 'Admin authentication is not configured' }, { status: 503 })
  }

  const ip = getClientIp(req)
  if (isLoginRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  let body: { pin?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const pin = typeof body.pin === 'string' ? body.pin : ''
  if (!pin) {
    return NextResponse.json({ error: 'PIN is required' }, { status: 400 })
  }

  if (!verifyAdminPin(pin)) {
    recordFailedLogin(ip)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  clearLoginAttempts(ip)
  const response = NextResponse.json({ ok: true })
  return attachAdminSessionCookie(response)
}
