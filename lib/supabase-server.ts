import { createClient, SupabaseClient } from '@supabase/supabase-js'

let serverClient: SupabaseClient | null = null

/** Supabase client for API routes — prefers service role, never exposed to the browser. */
export function getServerSupabase(): SupabaseClient {
  if (serverClient) return serverClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  const key = serviceKey || anonKey
  if (!key) {
    throw new Error('Supabase API key is not configured')
  }

  serverClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return serverClient
}

/** Reset client (tests only). */
export function resetServerSupabaseForTests(): void {
  serverClient = null
}
