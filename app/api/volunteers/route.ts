import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const ADMIN_PIN = process.env.ADMIN_PIN || '2304'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .order('name', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin')
  if (pin !== ADMIN_PIN) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const body = await req.json()
  const { name, email, notes } = body
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  const { data, error } = await supabase
    .from('volunteers')
    .insert({ name: name.trim(), email: email || null, notes: notes || null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const pin = req.headers.get('x-admin-pin')
  if (pin !== ADMIN_PIN) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
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
  const pin = req.headers.get('x-admin-pin')
  if (pin !== ADMIN_PIN) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabase.from('volunteers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
