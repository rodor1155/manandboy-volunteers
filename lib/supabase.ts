import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Event = {
  id: string
  title: string
  date_start: string
  date_end: string | null
  description: string | null
  address?: string | null
  max_volunteers: number | null
  cancelled: boolean
  created_at: string
  signups?: Signup[]
}

export type Signup = {
  id: string
  event_id: string
  volunteer_name: string
  volunteer_email: string | null
  created_at: string
}
