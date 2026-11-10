import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { isAdmin } from '@/lib/auth'

describe('isAdmin', () => {
  const previous = process.env.ADMIN_PIN

  beforeEach(() => {
    process.env.ADMIN_PIN = '4242'
  })

  afterEach(() => {
    process.env.ADMIN_PIN = previous
  })

  it('returns true when x-admin-pin matches ADMIN_PIN', () => {
    const req = new NextRequest('http://localhost/api/admin', {
      headers: { 'x-admin-pin': '4242' },
    })
    expect(isAdmin(req)).toBe(true)
  })

  it('returns false when pin is missing or wrong', () => {
    const missing = new NextRequest('http://localhost/api/admin')
    expect(isAdmin(missing)).toBe(false)

    const wrong = new NextRequest('http://localhost/api/admin', {
      headers: { 'x-admin-pin': '0000' },
    })
    expect(isAdmin(wrong)).toBe(false)
  })
})
