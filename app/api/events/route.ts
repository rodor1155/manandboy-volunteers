import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*, signups(*)')
    .order('date_start', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(JSON.stringify(events), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
