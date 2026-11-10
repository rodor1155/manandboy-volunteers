import assert from 'node:assert/strict'
import { describe, it, beforeEach, afterEach } from 'node:test'
import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  attachAdminSessionCookie,
  isAdmin,
  isAdminPinConfigured,
  isLoginRateLimited,
  recordFailedLogin,
  verifyAdminPin,
} from './admin-auth'

describe('admin-auth', () => {
  const originalPin = process.env.ADMIN_PIN

  beforeEach(() => {
    delete process.env.ADMIN_PIN
  })

  afterEach(() => {
    if (originalPin === undefined) {
      delete process.env.ADMIN_PIN
    } else {
      process.env.ADMIN_PIN = originalPin
    }
  })

  it('fails closed when ADMIN_PIN is missing', () => {
    assert.equal(isAdminPinConfigured(), false)
    assert.equal(verifyAdminPin('1234'), false)
    const req = new NextRequest('http://localhost/api/admin')
    assert.equal(isAdmin(req), false)
  })

  it('verifies PIN with constant-time hashed compare', () => {
    process.env.ADMIN_PIN = '5678'
    assert.equal(verifyAdminPin('5678'), true)
    assert.equal(verifyAdminPin('0000'), false)
  })

  it('issues a session cookie and isAdmin accepts it', () => {
    process.env.ADMIN_PIN = '4321'
    const response = attachAdminSessionCookie(NextResponse.json({ ok: true }))
    const setCookie = response.headers.get('set-cookie')
    assert.ok(setCookie?.includes(ADMIN_SESSION_COOKIE))

    const token = setCookie?.split(';')[0]?.split('=').slice(1).join('=')
    assert.ok(token)
    const req = new NextRequest('http://localhost/api/admin', {
      headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
    })
    assert.equal(isAdmin(req), true)
  })

  it('rate limits repeated failed logins by IP', () => {
    const ip = '203.0.113.10'
    assert.equal(isLoginRateLimited(ip), false)
    for (let i = 0; i < 5; i++) recordFailedLogin(ip)
    assert.equal(isLoginRateLimited(ip), true)
  })
})
