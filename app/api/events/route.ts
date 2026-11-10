import { NextResponse } from 'next/server'
import { toPublicSignup } from '@/lib/public-signup'
import { getServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const supabase = getServerSupabase()
  const { data: events, error } = await supabase
    .from('events')
    .select('*, signups(id, volunteer_name)')
    .order('date_start', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const publicEvents = (events ?? []).map(event => ({
    ...event,
    signups: (event.signups ?? []).map(toPublicSignup),
  }))

  return new NextResponse(JSON.stringify(publicEvents), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}
