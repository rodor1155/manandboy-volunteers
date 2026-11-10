import { getServerSupabase } from '@/lib/supabase-server'

export async function getVolunteerByName(name: string): Promise<{
  email: string | null
  notes: string | null
} | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('volunteers')
    .select('email, notes, name')
    .ilike('name', trimmed)

  if (error || !data?.length) return null

  const match = data.find(v => v.name.toLowerCase() === trimmed.toLowerCase())
  if (!match) return null

  return { email: match.email ?? null, notes: match.notes ?? null }
}

export async function isActiveVolunteerName(name: string): Promise<boolean> {
  const trimmed = name.trim()
  if (!trimmed) return false

  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('volunteers')
    .select('name, active')
    .ilike('name', trimmed)

  if (error || !data?.length) return false
  const match = data.find(v => v.name.toLowerCase() === trimmed.toLowerCase())
  if (!match) return false
  return match.active !== false
}
