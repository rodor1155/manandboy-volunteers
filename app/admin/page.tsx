'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { Event, Signup } from '@/lib/supabase'
import { formatEventDate } from '@/lib/dates'

type EventForm = {
  title: string
  date_start: string
  date_end: string
  description: string
  address: string
  max_volunteers: string
}

const emptyForm: EventForm = {
  title: '',
  date_start: '',
  date_end: '',
  description: '',
  address: '',
  max_volunteers: '',
}

export default function AdminPage() {
  const [pin, setPin] = useState('')
  const [authed, setAuthed] = useState(false)
  const [pinError, setPinError] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<EventForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const router = useRouter()
  const [volunteers, setVolunteers] = useState<Array<{ id: string; name: string; email: string | null; notes: string | null; active: boolean }>>([])
  const [volunteerForm, setVolunteerForm] = useState({ name: '', email: '', notes: '' })
  const [editingVolunteerId, setEditingVolunteerId] = useState<string | null>(null)

  const fetchEvents = useCallback(async (p: string) => {
    setLoading(true)
    const res = await fetch('/api/admin', {
      headers: { 'x-admin-pin': p }
    })
    if (res.ok) {
      const data = await res.json()
      setEvents(data)
    }
    setLoading(false)
  }, [])

  async function fetchVolunteers(p: string) {
    const res = await fetch('/api/volunteers', {
      headers: { 'x-admin-pin': p },
    })
    if (!res.ok) return
    const data = await res.json()
    if (!Array.isArray(data)) return
    setVolunteers(
      data.map((row: { id: string; name: string; email: string | null; notes: string | null; active?: boolean }) => ({
        id: row.id,
        name: row.name,
        email: row.email ?? null,
        notes: row.notes ?? null,
        active: row.active ?? true,
      }))
    )
  }

  function handleLogout() {
    setAuthed(false)
    setPin('')
    setEvents([])
    router.push('/')
  }

  function handlePinSubmit() {
    if (pin === '2304') {
      setAuthed(true)
      setPinError(false)
      fetchEvents(pin)
      fetchVolunteers(pin)
    } else {
      setPinError(true)
    }
  }

  function adminHeader() {
    return { 'x-admin-pin': pin, 'Content-Type': 'application/json' }
  }

  async function handleSave() {
    if (!form.title || !form.date_start) return alert('Title and start date are required')
    setSaving(true)
    const res = editingId
      ? await fetch('/api/admin', {
        method: 'PATCH',
        headers: adminHeader(),
        body: JSON.stringify({ id: editingId, ...form }),
      })
      : await fetch('/api/admin', {
        method: 'POST',
        headers: adminHeader(),
        body: JSON.stringify(form),
      })
    if (!res.ok) {
      setStatusMsg('Failed to save event. Please try again.')
      setSaving(false)
      return
    }
    setForm(emptyForm)
    setEditingId(null)
    setSaving(false)
    fetchEvents(pin)
  }

  function startEdit(event: Event) {
    setEditingId(event.id)
    setForm({
      title: event.title,
      date_start: event.date_start,
      date_end: event.date_end ?? '',
      description: event.description ?? '',
      address: event.address ?? '',
      max_volunteers: event.max_volunteers?.toString() ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function toggleCancel(event: Event) {
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: adminHeader(),
      body: JSON.stringify({ id: event.id, cancelled: !event.cancelled }),
    })
    fetchEvents(pin)
  }

  async function deleteEvent(event: Event) {
    if (!confirm(`Permanently delete "${event.title}" and all its sign-ups?`)) return
    await fetch('/api/admin', {
      method: 'DELETE',
      headers: adminHeader(),
      body: JSON.stringify({ id: event.id }),
    })
    fetchEvents(pin)
  }

  async function removeSignup(signupId: string) {
    await fetch('/api/admin', {
      method: 'DELETE',
      headers: adminHeader(),
      body: JSON.stringify({ signup_id: signupId }),
    })
    setStatusMsg('Volunteer removed')
    setTimeout(() => setStatusMsg(''), 3000)
    fetchEvents(pin)
  }

  async function handleSaveVolunteer() {
    if (!volunteerForm.name.trim()) return
    if (editingVolunteerId) {
      await fetch('/api/volunteers', {
        method: 'PATCH',
        headers: adminHeader(),
        body: JSON.stringify({
          id: editingVolunteerId,
          name: volunteerForm.name.trim(),
          email: volunteerForm.email || null,
          notes: volunteerForm.notes || null,
        }),
      })
    } else {
      await fetch('/api/volunteers', {
        method: 'POST',
        headers: adminHeader(),
        body: JSON.stringify({
          name: volunteerForm.name.trim(),
          email: volunteerForm.email || null,
          notes: volunteerForm.notes || null,
        }),
      })
    }
    setVolunteerForm({ name: '', email: '', notes: '' })
    setEditingVolunteerId(null)
    fetchVolunteers(pin)
  }

  async function handleDeleteVolunteer(id: string) {
    if (!confirm('Delete this volunteer?')) return
    await fetch('/api/volunteers', {
      method: 'DELETE',
      headers: adminHeader(),
      body: JSON.stringify({ id }),
    })
    fetchVolunteers(pin)
  }

  async function handleToggleActive(v: { id: string; active: boolean }) {
    await fetch('/api/volunteers', {
      method: 'PATCH',
      headers: adminHeader(),
      body: JSON.stringify({ id: v.id, active: !v.active }),
    })
    fetchVolunteers(pin)
  }

  const totalSignups = events.reduce((sum, e) => sum + (e.signups?.length ?? 0), 0)
  const activeEvents = events.filter(e => !e.cancelled).length
  const cancelledEvents = events.filter(e => e.cancelled).length
  const uniqueVolunteers = new Set(
    events.flatMap(e => e.signups?.map(s => s.volunteer_name.toLowerCase()) ?? [])
  ).size
  const fullEvents = events.filter(e => e.max_volunteers && (e.signups?.length ?? 0) >= e.max_volunteers).length

  function exportCSV() {
    const rows: string[][] = [['Event', 'Date', 'Volunteer', 'Signed Up']]
    events.forEach(event => {
      if (event.signups && event.signups.length > 0) {
        event.signups.forEach((s: Signup) => {
          rows.push([
            event.title,
            formatEventDate(event.date_start, event.date_end ?? null),
            s.volunteer_name,
            new Date(s.created_at).toLocaleDateString('en-GB'),
          ])
        })
      }
    })
    const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `manandboy-signups-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const rows = events
      .filter(e => !e.cancelled && e.signups && e.signups.length > 0)
      .map(event => `
      <h3 style="margin: 1.5rem 0 0.5rem; color: #1a1a1a;">${event.title}</h3>
      <p style="color: #666; margin: 0 0 0.5rem; font-size: 0.9rem;">${formatEventDate(event.date_start, event.date_end ?? null)}</p>
      <table style="width:100%; border-collapse: collapse; margin-bottom: 1rem;">
        <thead>
          <tr style="background: #85C441; color: white;">
            <th style="padding: 0.5rem; text-align: left;">Volunteer</th>
            <th style="padding: 0.5rem; text-align: left;">Signed Up</th>
          </tr>
        </thead>
        <tbody>
          ${event.signups!.map((s: Signup, i: number) => `
            <tr style="background: ${i % 2 === 0 ? '#f9f9f9' : 'white'};">
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${s.volunteer_name}</td>
              <td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${new Date(s.created_at).toLocaleDateString('en-GB')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `).join('')
    printWindow.document.write(`
    <html>
      <head>
        <title>MAN&BOY Volunteer Sign-Ups</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 2rem; color: #1a1a1a; }
          h1 { color: #1a1a1a; border-bottom: 3px solid #85C441; padding-bottom: 0.5rem; }
          p.meta { color: #666; font-size: 0.85rem; margin-top: 0; }
        </style>
      </head>
      <body>
        <h1>MAN&BOY Volunteer Sign-Ups</h1>
        <p class="meta">Generated ${new Date().toLocaleDateString('en-GB')}</p>
        ${rows}
        <script>window.onload = () => { window.print(); }</script>
      </body>
    </html>
  `)
    printWindow.document.close()
  }

  if (!authed) {
    return (
      <div className="pin-screen">
        <div className="pin-card">
          <h2 className="pin-title">Admin Access</h2>
          <p className="pin-subtitle">Enter your 4-digit PIN to continue</p>
          {pinError && <p className="pin-error">Incorrect PIN. Please try again.</p>}
          <input
            className="pin-input"
            type="password"
            maxLength={4}
            inputMode="numeric"
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(false) }}
            onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
            autoFocus
            placeholder="••••"
          />
          <button className="btn-primary" onClick={handlePinSubmit}>
            Enter
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header />
      <main className="admin-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <h1 className="page-title" style={{ margin: 0 }}>Admin Panel</h1>
          <button className="btn-sm btn-edit" onClick={handleLogout}>Log out</button>
        </div>
        <p className="page-subtitle" style={{ marginBottom: '2rem' }}>Manage events and view volunteer sign-ups.</p>

        {statusMsg && <div className="success-msg" style={{ marginBottom: '1rem' }}>{statusMsg}</div>}

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button className="btn-sm btn-edit" onClick={exportCSV}>
            Export CSV
          </button>
          <button className="btn-sm btn-edit" onClick={exportPDF}>
            Export PDF
          </button>
        </div>

        <div className="admin-section">
          <div className="admin-section-title">Overview</div>
          <div className="mi-grid">
            <div className="mi-card"><div className="mi-number">{activeEvents}</div><div className="mi-label">Active Events</div></div>
            <div className="mi-card"><div className="mi-number">{totalSignups}</div><div className="mi-label">Total Sign-Ups</div></div>
            <div className="mi-card"><div className="mi-number">{uniqueVolunteers}</div><div className="mi-label">Unique Volunteers</div></div>
            <div className="mi-card"><div className="mi-number">{fullEvents}</div><div className="mi-label">Events at Capacity</div></div>
            <div className="mi-card"><div className="mi-number">{cancelledEvents}</div><div className="mi-label">Cancelled Events</div></div>
          </div>
        </div>

        <div className="admin-section">
          <div className="admin-section-title">{editingId ? 'Edit Event' : 'Add New Event'}</div>
          <div className="event-form-card">
            <div className="event-form-title">{editingId ? 'Update event details below' : 'Fill in the details for the new event'}</div>
            <div className="form-group">
              <label className="form-label">Event title *</label>
              <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Surrey Activity Day" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start date *</label>
                <input className="form-input" type="date" value={form.date_start} onChange={e => setForm(f => ({ ...f, date_start: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">End date <span style={{ fontWeight: 400, color: 'var(--grey-dark)' }}>(if multi-day)</span></label>
                <input className="form-input" type="date" value={form.date_end} onChange={e => setForm(f => ({ ...f, date_end: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Max volunteers <span style={{ fontWeight: 400, color: 'var(--grey-dark)' }}>(leave blank for unlimited)</span></label>
                <input className="form-input" type="number" min="1" value={form.max_volunteers} onChange={e => setForm(f => ({ ...f, max_volunteers: e.target.value }))} placeholder="e.g. 10" />
              </div>
              <div className="form-group">
                <label className="form-label">Description <span style={{ fontWeight: 400, color: 'var(--grey-dark)' }}>(optional)</span></label>
                <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short note for volunteers" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address <span style={{ fontWeight: 400, color: 'var(--grey-dark)' }}>(optional, include postcode)</span></label>
              <input
                className="form-input"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="e.g. Dorking Sports Centre, Dorking, RH4 1NX"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn-primary" style={{ width: 'auto', padding: '0.65rem 2rem' }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Event' : 'Add Event'}
              </button>
              {editingId && (
                <button className="btn btn-withdraw" style={{ padding: '0.65rem 1.5rem' }} onClick={() => { setForm(emptyForm); setEditingId(null) }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="admin-section">
          <div className="admin-section-title">All Events</div>
          {loading ? (
            <p style={{ color: 'var(--grey-dark)' }}>Loading...</p>
          ) : events.length === 0 ? (
            <p style={{ color: 'var(--grey-dark)' }}>No events yet. Add one above.</p>
          ) : (
            events.map(event => {
              const signupCount = event.signups?.length ?? 0
              const expanded = expandedEvent === event.id
              return (
                <div key={event.id}>
                  <div className={`admin-event-row${event.cancelled ? ' cancelled' : ''}`}>
                    <div className="admin-event-info">
                      <div className="admin-event-title">{event.title}</div>
                      <div className="admin-event-date">
                        {formatEventDate(event.date_start, event.date_end ?? null)}
                        {event.max_volunteers ? ` · Max ${event.max_volunteers}` : ''}
                        {event.cancelled ? ' · CANCELLED' : ''}
                      </div>
                    </div>
                    <div className="admin-event-signups">
                      <strong>{signupCount}</strong> signed up
                      {signupCount > 0 && (
                        <div>
                          <button className="accordion-toggle" onClick={() => setExpandedEvent(expanded ? null : event.id)}>
                            {expanded ? 'Hide' : 'View'} names
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="admin-event-actions">
                      <button className="btn-sm btn-edit" onClick={() => startEdit(event)}>Edit</button>
                      <button className={`btn-sm ${event.cancelled ? 'btn-restore' : 'btn-cancel-event'}`} onClick={() => toggleCancel(event)}>
                        {event.cancelled ? 'Restore' : 'Cancel'}
                      </button>
                      <button className="btn-sm btn-delete" onClick={() => deleteEvent(event)}>Delete</button>
                    </div>
                  </div>
                  {expanded && event.signups && event.signups.length > 0 && (
                    <div style={{ background: 'var(--white)', borderRadius: '0 0 12px 12px', padding: '0 1.2rem 1rem', marginTop: '-0.5rem', marginBottom: '0.75rem', boxShadow: '0 4px 8px rgba(26,39,68,0.06)' }}>
                      <div className="signup-list">
                        {event.signups.map((s: Signup) => (
                          <div key={s.id} className="signup-row">
                            <div>
                              <div className="signup-name">{s.volunteer_name}</div>
                              {s.volunteer_email && <div className="signup-email">{s.volunteer_email}</div>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div className="signup-date">{new Date(s.created_at).toLocaleDateString('en-GB')}</div>
                              <button className="btn-remove-signup" onClick={() => removeSignup(s.id)}>Remove</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="admin-section">
          <div className="admin-section-title">Volunteers</div>
          <div className="event-form-card">
            <div className="event-form-title">{editingVolunteerId ? 'Edit volunteer' : 'Add volunteer'}</div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                className="form-input"
                value={volunteerForm.name}
                onChange={e => setVolunteerForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email <span style={{ fontWeight: 400, color: 'var(--grey-dark)' }}>(optional)</span></label>
              <input
                className="form-input"
                type="email"
                value={volunteerForm.email}
                onChange={e => setVolunteerForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes <span style={{ fontWeight: 400, color: 'var(--grey-dark)' }}>(optional)</span></label>
              <input
                className="form-input"
                value={volunteerForm.notes}
                onChange={e => setVolunteerForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Internal notes"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn-primary" style={{ width: 'auto', padding: '0.65rem 2rem' }} type="button" onClick={handleSaveVolunteer}>
                {editingVolunteerId ? 'Update volunteer' : 'Add volunteer'}
              </button>
              {editingVolunteerId && (
                <button
                  className="btn btn-withdraw"
                  style={{ padding: '0.65rem 1.5rem' }}
                  type="button"
                  onClick={() => { setVolunteerForm({ name: '', email: '', notes: '' }); setEditingVolunteerId(null) }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            {volunteers.map(v => (
              <div
                key={v.id}
                style={{
                  opacity: v.active ? 1 : 0.45,
                  padding: '1rem',
                  border: '1px solid var(--grey-light)',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  background: 'var(--white)',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>{v.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--grey-dark)', marginBottom: '0.25rem' }}>
                  <strong>Email:</strong> {v.email || '—'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--grey-dark)', marginBottom: '0.25rem' }}>
                  <strong>Notes:</strong> {v.notes || '—'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--grey-dark)', marginBottom: '0.75rem' }}>
                  <strong>Status:</strong> {v.active ? 'Active' : 'Inactive'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-sm btn-edit"
                    onClick={() => {
                      setEditingVolunteerId(v.id)
                      setVolunteerForm({ name: v.name, email: v.email || '', notes: v.notes || '' })
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="btn-sm btn-cancel-event" onClick={() => handleToggleActive(v)}>
                    {v.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button type="button" className="btn-sm btn-delete" onClick={() => handleDeleteVolunteer(v.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
