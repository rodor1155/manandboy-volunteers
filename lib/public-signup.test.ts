import { describe, expect, it } from 'vitest'
import { toPublicSignup } from '@/lib/public-signup'

describe('toPublicSignup', () => {
  it('strips non-public signup fields', () => {
    expect(
      toPublicSignup({
        id: 'abc',
        volunteer_name: 'Sam',
        volunteer_email: 'sam@example.com',
        created_at: '2025-01-01T00:00:00Z',
        event_id: 'evt',
      })
    ).toEqual({ id: 'abc', volunteer_name: 'Sam' })
  })
})
