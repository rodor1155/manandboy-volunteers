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
  max_volunteers: string
}

const emptyForm: EventForm = {
  title: '',
  date_start: '',
  date_end: '',
  description: '',
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

  const totalSignups = events.reduce((sum, e) => sum + (e.signups?.length ?? 0), 0)
  const activeEvents = events.filter(e => !e.cancelled).length
  const cancelledEvents = events.filter(e => e.cancelled).length
  const uniqueVolunteers = new Set(
    events.flatMap(e => e.signups?.map(s => s.volunteer_name.toLowerCase()) ?? [])
  ).size
  const fullEvents = events.filter(e => e.max_volunteers && (e.signups?.length ?? 0) >= e.max_volunteers).length

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
      </main>
    </>
  )
}
