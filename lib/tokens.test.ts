import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  createVolunteerSessionToken,
  createWithdrawToken,
  verifyVolunteerSessionToken,
  verifyWithdrawToken,
} from '@/lib/tokens'

describe('volunteer session tokens', () => {
  const secret = process.env.SIGNING_SECRET

  beforeEach(() => {
    process.env.SIGNING_SECRET = 'test-signing-secret'
  })

  afterEach(() => {
    process.env.SIGNING_SECRET = secret
  })

  it('round-trips a volunteer session', () => {
    const token = createVolunteerSessionToken('Jane Doe')
    expect(verifyVolunteerSessionToken(token)).toBe('Jane Doe')
  })

  it('rejects tampered tokens', () => {
    const token = createVolunteerSessionToken('Jane Doe')
    expect(verifyVolunteerSessionToken(token + 'x')).toBeNull()
  })
})

describe('withdraw tokens', () => {
  const secret = process.env.SIGNING_SECRET

  beforeEach(() => {
    process.env.SIGNING_SECRET = 'test-signing-secret'
  })

  afterEach(() => {
    process.env.SIGNING_SECRET = secret
  })

  it('validates signup owner', () => {
    const signupId = '11111111-1111-1111-1111-111111111111'
    const token = createWithdrawToken(signupId, 'Jane Doe')
    expect(verifyWithdrawToken(token, signupId, 'Jane Doe')).toBe(true)
    expect(verifyWithdrawToken(token, signupId, 'Other Person')).toBe(false)
    expect(verifyWithdrawToken(token, 'other-id', 'Jane Doe')).toBe(false)
  })
})
