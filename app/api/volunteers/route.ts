import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { pickAllowedFields } from '@/lib/pick-fields'
import { getServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const VOLUNTEER_PATCH_FIELDS = ['name', 'email', 'notes', 'active'] as const

export async function GET(req: NextRequest) {
  const supabase = getServerSupabase()
  const admin = isAdmin(req)

  const { data, error } = await supabase
    .from('volunteers')
    .select(admin ? '*' : 'name')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const body = await req.json()
  const { name, email, notes } = body
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('volunteers')
    .insert({
      name: name.trim(),
      email: typeof email === 'string' && email ? email : null,
      notes: typeof notes === 'string' && notes ? notes : null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const body = await req.json()
  const { id } = body
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }
  const updates = pickAllowedFields<Record<string, unknown>>(body, VOLUNTEER_PATCH_FIELDS)
  if (typeof updates.name === 'string') updates.name = updates.name.trim()
  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('volunteers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const supabase = getServerSupabase()
  const { error } = await supabase.from('volunteers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
