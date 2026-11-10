import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { pickAllowedFields } from '@/lib/pick-fields'
import { getServerSupabase } from '@/lib/supabase-server'

const EVENT_CREATE_FIELDS = [
  'title',
  'date_start',
  'date_end',
  'description',
  'address',
  'max_volunteers',
] as const

const EVENT_PATCH_FIELDS = [
  'title',
  'date_start',
  'date_end',
  'description',
  'address',
  'max_volunteers',
  'cancelled',
] as const

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('events')
    .select('*, signups(*)')
    .order('date_start', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const fields = pickAllowedFields<Record<string, unknown>>(body, EVENT_CREATE_FIELDS)
  const { title, date_start } = fields

  if (!title || !date_start) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: String(title),
      date_start: String(date_start),
      date_end: fields.date_end ? String(fields.date_end) : null,
      description: fields.description ? String(fields.description) : null,
      address: fields.address ? String(fields.address) : null,
      max_volunteers: fields.max_volunteers
        ? parseInt(String(fields.max_volunteers), 10)
        : null,
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

  const updates = pickAllowedFields<Record<string, unknown>>(body, EVENT_PATCH_FIELDS)

  if (updates.max_volunteers !== undefined) {
    updates.max_volunteers = updates.max_volunteers
      ? parseInt(String(updates.max_volunteers), 10)
      : null
  }
  if (updates.date_end === '') updates.date_end = null

  const supabase = getServerSupabase()
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { id, signup_id } = body

  const supabase = getServerSupabase()

  if (signup_id && typeof signup_id === 'string') {
    const { error } = await supabase.from('signups').delete().eq('id', signup_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (id && typeof id === 'string') {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Missing id' }, { status: 400 })
}
