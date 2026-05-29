import { Resend } from 'resend'
import { formatEventDate } from '@/lib/dates'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@manandboy.org'

/** Once the manandboy.org domain is verified in Resend, this sends from noreply@manandboy.org. */
const FROM_EMAIL = process.env.EMAIL_FROM || 'MAN&BOY Volunteers <noreply@manandboy.org>'

export type VolunteerActivity =
  | { type: 'login' }
  | { type: 'signup'; eventTitle: string; eventDateStart: string; eventDateEnd: string | null }
  | { type: 'withdraw'; eventTitle: string; eventDateStart: string; eventDateEnd: string | null }

function activityLabel(activity: VolunteerActivity): string {
  switch (activity.type) {
    case 'login':
      return 'Signed in'
    case 'signup':
      return 'Signed up for event'
    case 'withdraw':
      return 'Removed from event'
  }
}

function subjectLine(volunteerName: string, activity: VolunteerActivity): string {
  switch (activity.type) {
    case 'login':
      return `[MAN&BOY] ${volunteerName} signed in`
    case 'signup':
      return `[MAN&BOY] ${volunteerName} signed up: ${activity.eventTitle}`
    case 'withdraw':
      return `[MAN&BOY] ${volunteerName} withdrew: ${activity.eventTitle}`
  }
}

function buildHtml(
  volunteerName: string,
  volunteerEmail: string | null | undefined,
  volunteerNotes: string | null | undefined,
  activity: VolunteerActivity
): string {
  const rows: string[] = [
    `<tr><td style="padding:0.4rem 0.75rem 0.4rem 0;color:#666;">Action</td><td style="padding:0.4rem 0;"><strong>${activityLabel(activity)}</strong></td></tr>`,
    `<tr><td style="padding:0.4rem 0.75rem 0.4rem 0;color:#666;">Volunteer</td><td style="padding:0.4rem 0;">${escapeHtml(volunteerName)}</td></tr>`,
    `<tr><td style="padding:0.4rem 0.75rem 0.4rem 0;color:#666;">Email</td><td style="padding:0.4rem 0;">${escapeHtml(volunteerEmail || '—')}</td></tr>`,
  ]

  if (volunteerNotes?.trim()) {
    rows.push(
      `<tr><td style="padding:0.4rem 0.75rem 0.4rem 0;color:#666;">Notes</td><td style="padding:0.4rem 0;">${escapeHtml(volunteerNotes.trim())}</td></tr>`
    )
  }

  if (activity.type === 'signup' || activity.type === 'withdraw') {
    const when = formatEventDate(activity.eventDateStart, activity.eventDateEnd)
    rows.push(
      `<tr><td style="padding:0.4rem 0.75rem 0.4rem 0;color:#666;">Event</td><td style="padding:0.4rem 0;">${escapeHtml(activity.eventTitle)}</td></tr>`,
      `<tr><td style="padding:0.4rem 0.75rem 0.4rem 0;color:#666;">Date</td><td style="padding:0.4rem 0;">${escapeHtml(when)}</td></tr>`
    )
  }

  rows.push(
    `<tr><td style="padding:0.4rem 0.75rem 0.4rem 0;color:#666;">Time</td><td style="padding:0.4rem 0;">${escapeHtml(
      new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })
    )}</td></tr>`
  )

  return `
    <div style="font-family:system-ui,sans-serif;max-width:520px;color:#1a1a2e;">
      <h2 style="margin:0 0 1rem;font-size:1.1rem;">Volunteer activity</h2>
      <table style="border-collapse:collapse;font-size:0.95rem;">${rows.join('')}</table>
    </div>
  `.trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Sends admin notification via Resend; logs and swallows errors so callers are not blocked. */
export async function notifyAdmin(
  volunteerName: string,
  activity: VolunteerActivity,
  volunteerDetails?: { email?: string | null; notes?: string | null }
): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY is not set; skipping admin notification')
    return
  }

  const subject = subjectLine(volunteerName, activity)
  const html = buildHtml(
    volunteerName,
    volunteerDetails?.email,
    volunteerDetails?.notes,
    activity
  )

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    replyTo: ADMIN_EMAIL,
    subject,
    html,
  })

  if (error) {
    console.error('[email] Failed to send admin notification:', error)
  }
}
