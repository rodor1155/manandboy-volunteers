import { NextRequest, NextResponse } from 'next/server'
import { createVolunteerSessionToken, normalizeVolunteerName } from '@/lib/tokens'
import { getServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? normalizeVolunteerName(body.name) : ''
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('volunteers')
    .select('name, active')
    .ilike('name', name)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const match = data?.find(
    v => typeof v.name === 'string' && v.name.toLowerCase() === name.toLowerCase()
  )
  if (!match) {
    return NextResponse.json({ error: 'Unknown volunteer' }, { status: 403 })
  }
  if (match.active === false) {
    return NextResponse.json({ error: 'Volunteer is not active' }, { status: 403 })
  }

  const token = createVolunteerSessionToken(match.name as string)
  return NextResponse.json({ token, name: match.name })
}
