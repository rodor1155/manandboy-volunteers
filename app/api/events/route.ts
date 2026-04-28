import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*, signups(*)')
    .order('date_start', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(events)
}
