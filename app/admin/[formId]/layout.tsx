'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  ClipboardCheck,
  Download,
  LayoutDashboard,
  ListChecks,
  PenLine,
  Share2,
  Trophy,
} from 'lucide-react'
import { useSubject } from '@/lib/useSubject'
import { breakdown } from '@/lib/results'
import { useShareLink } from '@/lib/useShareLink'
import { exportResultsCsv } from '@/lib/exportResults'
import LinkStatus from '@/components/LinkStatus'

// Workspace for one subject: sidebar (desktop) / button grid (phone) linking
// its pages, each of which handles a single task.
export default function SubjectLayout({ children }: { children: ReactNode }) {
  const { formId } = useParams<{ formId: string }>()
  const pathname = usePathname()
  const { status, form, responses } = useSubject(formId)
  const shareLink = useShareLink()
  const [copied, setCopied] = useState(false)

  if (status === 'loading') {
    return (
      <div className="py-24 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }
  if (status === 'missing' || !form) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-gray-900">Subject not found</h1>
        <p className="mt-2 text-gray-600">It may have been deleted, or it belongs to another account.</p>
        <Link href="/admin" className="mt-6 inline-flex px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          Back to all subjects
        </Link>
      </div>
    )
  }

  const essaysToMark = responses.reduce((n, r) => n + breakdown(form, r).essaysPending, 0)
  const base = `/admin/${formId}`
  const nav = [
    { href: base, label: 'Overview', short: 'Overview', icon: LayoutDashboard },
    { href: `${base}/objective`, label: 'Objective results', short: 'Objective', icon: ListChecks },
    { href: `${base}/marking`, label: 'Essay marking', short: 'Marking', icon: PenLine, badge: essaysToMark },
    { href: `${base}/essays`, label: 'Essay results', short: 'Essays', icon: ClipboardCheck },
    { href: `${base}/results`, label: 'Final results', short: 'Final', icon: Trophy },
  ]
  const isActive = (href: string) => (href === base ? pathname === base : pathname.startsWith(href))

  const share = async () => {
    await shareLink(form.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const actions = (
    <>
      <button
        onClick={share}
        className="flex-1 lg:w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
        title="Copy the student link — opens it for 5 minutes"
      >
        {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
        {copied ? 'Link copied' : 'Share exam link'}
      </button>
      <button
        onClick={() => exportResultsCsv(form, responses)}
        disabled={responses.length === 0}
        className="flex-1 lg:w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-40 text-sm font-medium"
      >
        <Download className="w-4 h-4" />
        Export CSV
      </button>
    </>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-8">
      {/* Sidebar (desktop) / header (phone) */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          All subjects
        </Link>
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</p>
          <h2 className="text-lg font-bold text-gray-900 break-words">{form.title}</h2>
          <p className="text-sm text-gray-600">{responses.length} submission{responses.length !== 1 ? 's' : ''}</p>
          <div className="mt-1"><LinkStatus expiresAt={form.linkExpiresAt} /></div>
        </div>

        <nav className="mt-4 grid grid-cols-3 gap-1.5 lg:flex lg:flex-col lg:gap-1">
          {nav.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col lg:flex-row items-center lg:justify-start gap-1 lg:gap-3 px-2 lg:px-3 py-2 lg:py-2.5 rounded-lg text-xs lg:text-sm font-medium text-center lg:text-left transition-colors ${
                  active ? 'bg-blue-600 text-white' : 'bg-white lg:bg-transparent border border-gray-200 lg:border-0 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="lg:hidden">{item.short}</span>
                <span className="hidden lg:inline flex-1">{item.label}</span>
                {!!item.badge && (
                  <span className={`px-1.5 rounded-full text-[11px] font-semibold ${active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="mt-4 flex gap-2 lg:flex-col">{actions}</div>
      </aside>

      <section className="mt-8 lg:mt-0 min-w-0">{children}</section>
    </div>
  )
}
