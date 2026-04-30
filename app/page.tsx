'use client'
import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { Event, Signup } from '@/lib/supabase'
import { formatEventDate, isMultiDay } from '@/lib/dates'

export default function Home() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [myName, setMyName] = useState<string>('')
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameSelected, setNameSelected] = useState(false)
  const [signupModal, setSignupModal] = useState<Event | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set())
  const [withdrawConfirmEventId, setWithdrawConfirmEventId] = useState<string | null>(null)
  const [lastSignup, setLastSignup] = useState<number>(0)

  const filteredNames = nameInput.trim().length < 1
    ? []
    : ['Harry', 'Jim', 'Olly', 'Ross', 'Clare', 'Sam', 'Tom', 'Dan', 'Pete', 'Mike']
      .filter(n => n.toLowerCase().includes(nameInput.trim().toLowerCase()))

  const fetchEvents = useCallback(async () => {
    const res = await fetch('/api/events', { cache: 'no-store' })
    const data = await res.json()
    setEvents(Array.isArray(data) ? data : [])
    setLoading(false)
    return data
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

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastSignup > 15000) {
        fetchEvents()
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [fetchEvents, lastSignup])

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
    setErrorMsg('')
    setActionLoading(event.id)
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
      // Optimistically update local state immediately
      setEvents(prev => prev.map(e => {
        if (e.id !== event.id) return e
        return {
          ...e,
          signups: [...(e.signups || []), data]
        }
      }))
      setLastSignup(Date.now())
      setSignupModal(null)
      setEmailInput('')
      setSuccessMsg(`You're signed up for ${event.title}!`)
      setTimeout(() => setSuccessMsg(''), 4000)
    } else {
      setErrorMsg(data.error || 'Something went wrong')
    }
  }

  async function handleWithdraw(event: Event) {
    const signup = getMySignup(event)
    if (!signup) return
    setActionLoading(event.id)
    await fetch('/api/signups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signup_id: signup.id }),
    })
    setActionLoading(null)
    setWithdrawConfirmEventId(null)
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
          <div className="modal" style={{ overflow: 'visible' }}>
            <h2>Welcome!</h2>
            <p>Type the first few letters of your name to find yourself.</p>
            <label className="modal-label">Your name</label>
            <div style={{ position: 'relative' }}>
            <input
              className="modal-input"
              placeholder="Start typing..."
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              autoFocus
            />
            {nameInput.length > 0 && (
              <div style={{
                border: '2px solid var(--grey-light)',
                borderRadius: '8px',
                marginBottom: '0.75rem',
                maxHeight: '200px',
                overflowY: 'scroll',
                position: 'absolute',
                width: '100%',
                zIndex: 9999,
                background: 'white',
              }}>
                {[
                  'Clare', 'Dan', 'Harry', 'Jim', 'Mike',
                  'Olly', 'Pete', 'Ross', 'Sam', 'Tom'
                ]
                  .filter(n => n.toLowerCase().startsWith(nameInput.toLowerCase()))
                  .map(name => (
                    <div
                      key={name}
                      onClick={() => setNameInput(name)}
                      style={{
                        padding: '0.65rem 1rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--grey-light)',
                        fontWeight: 600,
                        color: 'var(--navy)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--orange-pale)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {name}
                    </div>
                  ))}
              </div>
            )}
            </div>
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
            <button
              className="btn-primary"
              onClick={() => handleSignup(signupModal)}
              disabled={!!actionLoading}
            >
              {actionLoading ? 'Signing up...' : `Add me to event as ${myName}`}
            </button>
            {errorMsg && (
              <div
                className="success-msg"
                style={{
                  background: 'var(--red-pale)',
                  borderColor: 'var(--red)',
                  color: 'var(--red)',
                }}
              >
                {errorMsg}
              </div>
            )}
            <button className="btn-secondary" onClick={() => { setSignupModal(null); setErrorMsg('') }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <main className="page">
        <h1 className="page-title">Upcoming Events</h1>
        <p className="page-subtitle">Select the events you&apos;d like to volunteer for.</p>

        {myName && (
          <div className="name-banner">
            <div className="name-banner-greeting">
              Signed in as <span>{myName}</span>
            </div>
            <button
              className="name-banner-change"
              onClick={() => { setMyName(''); setNameInput(''); localStorage.removeItem('mb_volunteer_name'); setShowNameModal(true) }}
            >
              Sign Out
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
                      {!!event.description?.trim() && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--grey-dark)', marginTop: '0.3rem' }}>
                          {event.description.trim()}
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
                          {withdrawConfirmEventId === event.id ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--grey-dark)', fontWeight: 600 }}>
                                Remove yourself?
                              </span>
                              <button
                                className="btn btn-withdraw"
                                onClick={() => handleWithdraw(event)}
                                disabled={actionLoading === event.id}
                              >
                                {actionLoading === event.id ? 'Removing...' : 'Confirm'}
                              </button>
                              <button
                                className="btn-secondary"
                                onClick={() => setWithdrawConfirmEventId(null)}
                                disabled={actionLoading === event.id}
                                style={{ width: 'auto', marginTop: 0 }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-withdraw"
                              onClick={() => setWithdrawConfirmEventId(event.id)}
                              disabled={actionLoading === event.id}
                            >
                              Remove me
                            </button>
                          )}
                        </>
                      ) : full ? (
                        <span className="full-message">This event is full. Contact the team if you&apos;d like to be added to the waiting list.</span>
                      ) : (
                        <button
                          className="btn btn-signup"
                          onClick={() => {
                            if (!myName) { setShowNameModal(true); return }
                            setErrorMsg('')
                            setSignupModal(event)
                          }}
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
// cache bust Thu Apr 30 22:14:50 BST 2026
