import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const migration = readFileSync(
  join(root, 'supabase/migrations/20261110120000_tighten_anon_rls_least_privilege.sql'),
  'utf8'
)

test('migration removes anon write policies', () => {
  assert.match(migration, /drop policy if exists "Public insert signups"/)
  assert.match(migration, /drop policy if exists "Public delete signups"/)
  assert.match(migration, /drop policy if exists "Service manage events"/)
  assert.doesNotMatch(migration, /for insert[\s\S]*to anon/i)
  assert.doesNotMatch(migration, /for delete[\s\S]*to anon/i)
})

test('migration enables volunteers RLS and limits anon column grants', () => {
  assert.match(migration, /create table if not exists public\.volunteers/)
  assert.match(migration, /alter table public\.volunteers enable row level security/)
  assert.match(migration, /grant select \(name\) on table public\.volunteers to anon/)
  assert.match(migration, /grant select \(id, event_id, volunteer_name, created_at\) on table public\.signups to anon/)
})
