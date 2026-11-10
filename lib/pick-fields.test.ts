import { describe, expect, it } from 'vitest'
import { pickAllowedFields } from '@/lib/pick-fields'

describe('pickAllowedFields', () => {
  it('keeps only allow-listed keys', () => {
    const body = {
      title: 'Event',
      cancelled: true,
      hacker: 'ignore me',
    }
    const picked = pickAllowedFields(body, ['title', 'cancelled'] as const)
    expect(picked).toEqual({ title: 'Event', cancelled: true })
    expect('hacker' in picked).toBe(false)
  })
})
