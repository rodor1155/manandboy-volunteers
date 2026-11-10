# Supabase migrations

Migrations in this folder are applied manually (SQL Editor) or via the Supabase CLI. **CI and deploy pipelines must not apply them to production.**

## `20261110120000_tighten_anon_rls_least_privilege.sql`

Replaces permissive RLS on `events` and `signups`, adds `volunteers` with RLS, and tightens anon column grants.

### What the `anon` role can still do after this migration

| Table | Operation | Scope |
|-------|-----------|--------|
| `events` | `SELECT` | All columns (public event list) |
| `signups` | `SELECT` | `id`, `event_id`, `volunteer_name`, `created_at` only (no `volunteer_email`) |
| `volunteers` | `SELECT` | `name` only, rows where `active = true` |

No `INSERT`, `UPDATE`, or `DELETE` for `anon` on any of these tables.

Server-side code using **`SUPABASE_SERVICE_ROLE_KEY`** bypasses RLS and retains full access.

### App behaviour until the API routes PR (service role)

API routes still use `NEXT_PUBLIC_SUPABASE_ANON_KEY` via `lib/supabase.ts`. After this migration is applied to a database, the following break until that PR switches server routes to the service role:

- **`POST` / `DELETE` `/api/signups`** — signup and withdraw (anon insert/delete removed)
- **`POST` / `PATCH` / `DELETE` `/api/admin`** — event CRUD and admin signup removal
- **`POST` / `PATCH` / `DELETE` `/api/volunteers`** — volunteer admin (no anon write)
- **`GET` `/api/volunteers` (admin)** — needs columns beyond `name` (`id`, `email`, `notes`, `active`)
- **`GET` `/api/admin`** — unchanged for events/signups select (still anon-readable)
- **`GET` `/api/events`** — still works for public listing
- **`lib/volunteer-lookup.ts`** (signup/withdraw emails) — needs `email`, `notes` on `volunteers` (blocked for anon)

Direct browser use of the anon key against Supabase (bypassing the app) can no longer mutate data or read volunteer emails/signup emails.
