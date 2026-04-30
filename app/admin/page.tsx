'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { Event, Signup } from '@/lib/supabase'
import { formatEventDate, isMultiDay } from '@/lib/dates'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [myName, setMyName] = useState<string>('')
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [signupModal, setSignupModal] = useState<Event | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  function handleLogout() {
    setAuthed(false)
    setPin('')
    setEvents([])
    router.push('/')
  }

  const fetchEvents = useCallback(async () => {
    const res = await fetch('/api/events', { cache: 'no-store' })
    const data = await res.json()
    setEvents(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEvents()
    const saved = localStorage.getItem('mb_volunteer_name')
    if (saved) {
      setMyName(saved)
    } else {
      setShowNameModal(true)
    }
  }, [fetchEvents])

  // Poll every 10 seconds so the list stays live for all users
  useEffect(() => {
    const interval = setInterval(() => { fetchEvents() }, 10000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  function saveName() {
    if (!nameInput.trim()) return
    const name = nameInput.trim()
    setMyName(name)
    localStorage.setItem('mb_volunteer_name', name)
    setShowNameModal(false)
    setNameInput('')
  }

  function getMySignup(event: Event): Signup | undefined {
    return event.signups?.find(
      s => s.volunteer_name.toLowerCase() === myName.toLowerCase()
    )
  }

  function isFull(event: Event): boolean {
    if (!event.max_volunteers) return false
    return (event.signups?.length ?? 0) >= event.max_volunteers
  }

  async function handleSignup(event: Event) {
    if (!myName) { setShowNameModal(true); return }
    setActionLoading(event.id)
    setErrorMsg('')
    const res = await fetch('/api/signups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: event.id,
        volunteer_name: myName,
        volunteer_email: emailInput || null,
      }),
    })
    const data = await res.json()
    setActionLoading(null)
    if (res.ok) {
      // Optimistically add the new signup immediately so chips appear without waiting for fetch
      setEvents(prev => prev.map(e => {
        if (e.id !== event.id) return e
        const newSignup: Signup = {
          id: data.id,
          event_id: event.id,
          volunteer_name: myName,
          volunteer_email: emailInput || null,
          created_at: new Date().toISOString(),
        }
        return { ...e, signups: [...(e.signups || []), newSignup] }
      }))
      setSignupModal(null)
      setEmailInput('')
      setSuccessMsg(`You're signed up for ${event.title}!`)
      setTimeout(() => setSuccessMsg(''), 4000)
      // Also fetch to confirm server state
      fetchEvents()
    } else {
      setErrorMsg(data.error || 'Something went wrong. Please try again.')
    }
  }

  async function handleWithdraw(event: Event) {
    const signup = getMySignup(event)
    if (!signup) return
    // Optimistically remove immediately
    setEvents(prev => prev.map(e => {
      if (e.id !== event.id) return e
      return { ...e, signups: (e.signups || []).filter(s => s.id !== signup.id) }
    }))
    setActionLoading(event.id)
    await fetch('/api/signups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signup_id: signup.id }),
    })
    setActionLoading(null)
    fetchEvents()
  }

  function getDateParts(event: Event) {
    const d = new Date(event.date_start + 'T12:00:00')
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    }
  }

  return (
    <>
      <Header />

      {/* Name modal */}
      {showNameModal && (
        <div className="overlay">
          <div className="modal">
            <h2>Welcome!</h2>
            <p>Tell us your name so we can show your sign-ups and let you manage them.</p>
            <label className="modal-label">Your name</label>
            <input
              className="modal-input"
              placeholder="e.g. Harry"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              autoFocus
            />
            <button className="btn-primary" onClick={saveName}>
              Let&apos;s go
            </button>
          </div>
        </div>
      )}

      {/* Signup modal */}
      {signupModal && (
        <div className="overlay" onClick={() => { setSignupModal(null); setErrorMsg('') }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Sign up for</h2>
            <p style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '0.25rem' }}>
              {signupModal.title}
            </p>
            <p style={{ marginBottom: '1.2rem' }}>
              {formatEventDate(signupModal.date_start, signupModal.date_end ?? null)}
            </p>
            <label className="modal-label">
              Confirmation email <span className="modal-optional">(optional)</span>
            </label>
            <input
              className="modal-input optional"
              type="email"
              placeholder="your@email.com"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--grey-dark)', marginBottom: '0.5rem' }}>
              We&apos;ll show your email to the admin team only. We won&apos;t send automated emails.
            </p>
            {errorMsg && (
              <div style={{
                background: 'var(--red-pale)', border: '1.5px solid var(--red)',
                borderRadius: '8px', padding: '0.6rem 1rem',
                color: 'var(--red)', fontSize: '0.85rem', marginBottom: '0.5rem'
              }}>
                {errorMsg}
              </div>
            )}
            <button
              className="btn-primary"
              onClick={() => handleSignup(signupModal)}
              disabled={!!actionLoading}
            >
              {actionLoading ? 'Signing up...' : `Add me to this event`}
            </button>
            <button className="btn-secondary" onClick={() => { setSignupModal(null); setErrorMsg('') }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <main className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 className="page-title" style={{ margin: 0 }}>Admin Panel</h1>
          <button className="btn-secondary" onClick={handleLogout} style={{ width: 'auto', marginTop: 0 }}>
            Log out
          </button>
        </div>
        <p className="page-subtitle">Select the events you&apos;d like to volunteer for.</p>

        {myName && (
          <div className="name-banner">
            <div className="name-banner-greeting">
              Signed in as <span>{myName}</span>
            </div>
            <button
              className="name-banner-change"
              onClick={() => { setNameInput(myName); setShowNameModal(true) }}
            >
              Switch volunteer
            </button>
          </div>
        )}

        {successMsg && <div className="success-msg">{successMsg}</div>}

        {loading ? (
          <p style={{ color: 'var(--grey-dark)', marginTop: '2rem' }}>Loading events...</p>
        ) : (
          <div className="events-list" style={{ marginTop: successMsg ? '1rem' : 0 }}>
            {events.map(event => {
              const mySignup = getMySignup(event)
              const full = isFull(event)
              const multi = isMultiDay(event.date_start, event.date_end ?? null)
              const { day, month } = getDateParts(event)
              const signupCount = event.signups?.length ?? 0
              return (
                <div
                  key={event.id}
                  className={`event-card${event.cancelled ? ' cancelled' : ''}${full && !mySignup ? ' full' : ''}`}
                >
                  <div className="event-header">
                    <div className="event-date-block">
                      <div className="event-date-day">{day}</div>
                      <div className="event-date-month">{month}</div>
                      {multi && <div className="event-date-range">multi-day</div>}
                    </div>
                    <div className="event-info">
                      <div className="event-title">{event.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--grey-dark)', marginBottom: '0.4rem' }}>
                        {formatEventDate(event.date_start, event.date_end ?? null)}
                      </div>
                      {event.cancelled && <span className="event-badge cancelled">Cancelled</span>}
                      {!event.cancelled && full && <span className="event-badge full">Full</span>}
                      {!event.cancelled && multi && !full && <span className="event-badge multiday">Weekend</span>}
                      {event.description && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--grey-dark)', marginTop: '0.3rem' }}>
                          {event.description}
                        </p>
                      )}
                      {event.max_volunteers && !event.cancelled && (
                        <div className="volunteer-spots">
                          {signupCount} / {event.max_volunteers} volunteers
                        </div>
                      )}
                      {event.signups && event.signups.length > 0 && (
                        <div className="event-volunteers">
                          {event.signups.map(s => (
                            <span
                              key={s.id}
                              className={`volunteer-chip${s.volunteer_name.toLowerCase() === myName.toLowerCase() ? ' is-me' : ''}`}
                            >
                              {s.volunteer_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {!event.cancelled && (
                    <div className="event-actions">
                      {mySignup ? (
                        <>
                          <span style={{ fontSize: '0.85rem', color: 'var(--green)', fontWeight: 700 }}>
                            ✓ You&apos;re signed up
                          </span>
                          <button
                            className="btn btn-withdraw"
                            onClick={() => handleWithdraw(event)}
                            disabled={actionLoading === event.id}
                          >
                            {actionLoading === event.id ? 'Removing...' : 'Remove me'}
                          </button>
                        </>
                      ) : full ? (
                        <span className="full-message">This event is full. Contact the team if you&apos;d like to be added to the waiting list.</span>
                      ) : (
                        <button
                          className="btn btn-signup"
                          onClick={() => myName ? setSignupModal(event) : setShowNameModal(true)}
                          disabled={actionLoading === event.id}
                        >
                          {actionLoading === event.id ? 'Signing up...' : 'Add me to event'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
