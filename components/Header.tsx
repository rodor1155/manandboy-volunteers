'use client'
import Link from 'next/link'

export default function Header() {
  return (
    <header className="header">
      <div className="header-title">
        Volunteer<br /><span>Sign-Up</span>
      </div>
      <Link href="/admin" className="header-admin-link">
        Admin
      </Link>
    </header>
  )
}
