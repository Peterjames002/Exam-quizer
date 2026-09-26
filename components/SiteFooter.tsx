'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SiteFooter() {
  const pathname = usePathname()
  // No footer on the student exam page
  if (/^\/form\/[^/]+\/?$/.test(pathname)) return null

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Exam Builder</p>
        <nav className="flex gap-6">
          <Link href="/#about" className="hover:text-gray-800">About</Link>
          <Link href="/#faq" className="hover:text-gray-800">FAQ</Link>
          <Link href="/prepare" className="hover:text-gray-800">Prepare Exams</Link>
        </nav>
      </div>
    </footer>
  )
}
