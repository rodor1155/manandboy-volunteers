export type PublicSignup = {
  id: string
  volunteer_name: string
}

export function toPublicSignup(row: {
  id: string
  volunteer_name: string
  volunteer_email?: string | null
  created_at?: string
  event_id?: string
}): PublicSignup {
  return {
    id: row.id,
    volunteer_name: row.volunteer_name,
  }
}
