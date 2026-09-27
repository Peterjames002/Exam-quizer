'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { GraduationCap, Menu, X } from 'lucide-react'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/#about', label: 'About' },
  { href: '/#faq', label: 'FAQ' },
]

// Students taking an exam (/form/<id>) get a distraction-free page
function isExamPage(pathname: string) {
  return /^\/form\/[^/]+\/?$/.test(pathname)
}

export default function SiteHeader() {
  const pathname = usePathname()
  const { isSignedIn, isLoaded } = useUser()
  const [open, setOpen] = useState(false)

  if (isExamPage(pathname)) return null

  // Signed-in tutors also get their results dashboard
  const nav = isSignedIn ? [...NAV, { href: '/admin', label: 'Dashboard' }] : NAV

  const linkClass = 'text-gray-700 hover:text-blue-700 font-medium transition-colors'

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white">
            <GraduationCap className="w-5 h-5" />
          </span>
          <span className="text-lg font-bold text-gray-900">Exam Builder</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/prepare"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Prepare Exams
          </Link>
          {isLoaded &&
            (isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button className="px-3 py-2 text-gray-700 hover:text-blue-700 font-medium">Sign in</button>
              </SignInButton>
            ))}
        </div>

        <div className="flex md:hidden items-center gap-2">
          {isLoaded && isSignedIn && <UserButton />}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-gray-200 bg-white px-4 py-3 flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/prepare"
            onClick={() => setOpen(false)}
            className="mt-2 px-3 py-3 rounded-lg bg-blue-600 text-white text-center font-medium"
          >
            Prepare Exams
          </Link>
          {isLoaded && !isSignedIn && (
            <SignInButton mode="modal">
              <button className="px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Sign in</button>
            </SignInButton>
          )}
        </nav>
      )}
    </header>
  )
}
