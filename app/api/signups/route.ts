import { NextRequest, NextResponse } from 'next/server'
import { notifyAdmin } from '@/lib/email'
import { getVolunteerByName } from '@/lib/volunteer-lookup'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { event_id, volunteer_name, volunteer_email } = await req.json()

  if (!event_id || !volunteer_name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const name = volunteer_name.trim()

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
    (s: { volunteer_name: string }) => s.volunteer_name.toLowerCase() === name.toLowerCase()
  )
  if (already) return NextResponse.json({ error: 'Already signed up' }, { status: 400 })

  const { data, error } = await supabase
    .from('signups')
    .insert({ event_id, volunteer_name: name, volunteer_email: volunteer_email || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const details = await getVolunteerByName(name)
  notifyAdmin(
    name,
    {
      type: 'signup',
      eventTitle: event.title,
      eventDateStart: event.date_start,
      eventDateEnd: event.date_end ?? null,
    },
    details ?? undefined
  ).catch(err => console.error('[email] signup notification error:', err))

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { signup_id } = await req.json()

  if (!signup_id) {
    return NextResponse.json({ error: 'Missing signup_id' }, { status: 400 })
  }

  const { data: signup } = await supabase
    .from('signups')
    .select('*, events(title, date_start, date_end)')
    .eq('id', signup_id)
    .single()

  const { error } = await supabase.from('signups').delete().eq('id', signup_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (signup) {
    const event = signup.events as {
      title: string
      date_start: string
      date_end: string | null
    } | null
    const name = signup.volunteer_name as string
    const details = await getVolunteerByName(name)

    if (event) {
      notifyAdmin(
        name,
        {
          type: 'withdraw',
          eventTitle: event.title,
          eventDateStart: event.date_start,
          eventDateEnd: event.date_end ?? null,
        },
        details ?? undefined
      ).catch(err => console.error('[email] withdraw notification error:', err))
    }
  }

  return NextResponse.json({ success: true })
}
