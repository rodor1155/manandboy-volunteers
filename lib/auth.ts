import { NextRequest } from 'next/server'

function adminPin(): string {
  return process.env.ADMIN_PIN || '2304'
}

/** Shared server-side admin check (PIN header; session mechanism is a follow-up PR). */
export function isAdmin(req: NextRequest): boolean {
  const pin = req.headers.get('x-admin-pin')
  return pin !== null && pin === adminPin()
}
