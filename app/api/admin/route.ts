import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const ADMIN_PIN = process.env.ADMIN_PIN || '2304'

function checkPin(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin')
  return pin === ADMIN_PIN
}

export async function GET(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('events')
    .select('*, signups(*)')
    .order('date_start', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { title, date_start, date_end, description, max_volunteers } = body

  if (!title || !date_start) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await supabase
    .from('events')
    .insert({
      title,
      date_start,
      date_end: date_end || null,
      description: description || null,
      max_volunteers: max_volunteers ? parseInt(max_volunteers) : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!checkPin(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  if (updates.max_volunteers !== undefined) {
    updates.max_volunteers = updates.max_volunteers ? parseInt(updates.max_volunteers) : null
  }
  if (updates.date_end === '') updates.date_end = null

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
  if (!checkPin(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id, signup_id } = await req.json()

  if (signup_id) {
    // Delete a specific signup (admin override)
    const { error } = await supabase.from('signups').delete().eq('id', signup_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (id) {
    // Delete entire event (cascades signups)
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Missing id' }, { status: 400 })
}
