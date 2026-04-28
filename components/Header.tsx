'use client'
import Link from 'next/link'

export default function Header() {
  return (
    <header className="header">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://www.manandboy.org/images/elements/logo.png"
        alt="MAN&BOY"
        className="header-logo"
      />
      <div className="header-title">
        Volunteer<br /><span>Sign-Up</span>
      </div>
      <Link href="/admin" className="header-admin-link">
        Admin
      </Link>
    </header>
  )
}
