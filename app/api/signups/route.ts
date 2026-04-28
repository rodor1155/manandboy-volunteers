import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { event_id, volunteer_name, volunteer_email } = await req.json()

  if (!event_id || !volunteer_name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Check event exists and not cancelled
  const { data: event } = await supabase
    .from('events')
    .select('*, signups(*)')
    .eq('id', event_id)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (event.cancelled) return NextResponse.json({ error: 'Event is cancelled' }, { status: 400 })

  // Check capacity
  if (event.max_volunteers && event.signups.length >= event.max_volunteers) {
    return NextResponse.json({ error: 'Event is full' }, { status: 400 })
  }

  // Check not already signed up
  const already = event.signups.find(
    (s: { volunteer_name: string }) => s.volunteer_name.toLowerCase() === volunteer_name.toLowerCase()
  )
  if (already) return NextResponse.json({ error: 'Already signed up' }, { status: 400 })

  const { data, error } = await supabase
    .from('signups')
    .insert({ event_id, volunteer_name: volunteer_name.trim(), volunteer_email: volunteer_email || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { signup_id } = await req.json()

  const { error } = await supabase.from('signups').delete().eq('id', signup_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
