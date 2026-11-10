import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { notifyAdmin } from '@/lib/email'
import { getVolunteerByName } from '@/lib/volunteer-lookup'
import { getServerSupabase } from '@/lib/supabase-server'
import {
  createWithdrawToken,
  normalizeVolunteerName,
  verifyVolunteerSessionToken,
  verifyWithdrawToken,
} from '@/lib/tokens'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const event_id = body.event_id
  const admin = isAdmin(req)

  if (!event_id || typeof event_id !== 'string') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  let name: string

  if (admin) {
    const volunteer_name = body.volunteer_name
    if (!volunteer_name || typeof volunteer_name !== 'string') {
      return NextResponse.json({ error: 'Missing volunteer name' }, { status: 400 })
    }
    name = normalizeVolunteerName(volunteer_name)
  } else {
    const sessionName = verifyVolunteerSessionToken(req.headers.get('x-volunteer-token'))
    if (!sessionName) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }
    name = sessionName
    if (body.volunteer_name && normalizeVolunteerName(String(body.volunteer_name)).toLowerCase() !== name.toLowerCase()) {
      return NextResponse.json({ error: 'Name does not match session' }, { status: 403 })
    }
  }

  if (!name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = getServerSupabase()

  const { data: volunteerRow } = await supabase
    .from('volunteers')
    .select('name, email, active')
    .ilike('name', name)

  const volunteer = volunteerRow?.find(
    v => typeof v.name === 'string' && v.name.toLowerCase() === name.toLowerCase()
  )
  if (!volunteer || volunteer.active === false) {
    return NextResponse.json({ error: 'Unknown or inactive volunteer' }, { status: 403 })
  }

  const canonicalName = volunteer.name as string

  const { data: event } = await supabase
    .from('events')
    .select('*, signups(*)')
    .eq('id', event_id)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (event.cancelled) return NextResponse.json({ error: 'Event is cancelled' }, { status: 400 })

  const signups = event.signups ?? []
  if (event.max_volunteers && signups.length >= event.max_volunteers) {
    return NextResponse.json({ error: 'Event is full' }, { status: 400 })
  }

  const already = signups.find(
    (s: { volunteer_name: string }) =>
      s.volunteer_name.toLowerCase() === canonicalName.toLowerCase()
  )
  if (already) return NextResponse.json({ error: 'Already signed up' }, { status: 400 })

  const volunteer_email =
    typeof volunteer.email === 'string' && volunteer.email ? volunteer.email : null

  const { data, error } = await supabase
    .from('signups')
    .insert({
      event_id,
      volunteer_name: canonicalName,
      volunteer_email,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const withdraw_token = createWithdrawToken(data.id, canonicalName)

  const details = await getVolunteerByName(canonicalName)
  notifyAdmin(
    canonicalName,
    {
      type: 'signup',
      eventTitle: event.title,
      eventDateStart: event.date_start,
      eventDateEnd: event.date_end ?? null,
    },
    details ?? undefined
  ).catch(err => console.error('[email] signup notification error:', err))

  return NextResponse.json({ ...data, withdraw_token })
}

export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const signup_id = body.signup_id
  const withdraw_token = typeof body.withdraw_token === 'string' ? body.withdraw_token : null

  if (!signup_id || typeof signup_id !== 'string') {
    return NextResponse.json({ error: 'Missing signup_id' }, { status: 400 })
  }

  const supabase = getServerSupabase()
  const admin = isAdmin(req)

  const { data: signup } = await supabase
    .from('signups')
    .select('*, events(title, date_start, date_end)')
    .eq('id', signup_id)
    .single()

  if (!signup) {
    return NextResponse.json({ error: 'Signup not found' }, { status: 404 })
  }

  if (!admin) {
    const name = signup.volunteer_name as string
    if (!verifyWithdrawToken(withdraw_token, signup_id, name)) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }
  }

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
