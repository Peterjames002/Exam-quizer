'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useConvexAuth, useQuery } from 'convex/react'
import { ArrowRight, BookOpen, Plus } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { useStorage } from '@/lib/storage'
import { gradeFor, isEssayField, isObjectiveField } from '@/lib/results'
import LinkStatus from '@/components/LinkStatus'
import { Chip, EmptyState, GradeBadge, PageHeader, StatCard } from '@/components/admin/ui'

// Dashboard home: every subject (exam) the tutor created, with its headline numbers
export default function DashboardHome() {
  const router = useRouter()
  const { isAuthenticated } = useConvexAuth()
  const storage = useStorage()
  const formsRaw = useQuery(api.forms.getAllForms, isAuthenticated ? {} : 'skip')
  const forms = storage.getAllForms()
  const subjects = useMemo(
    () => forms.filter((f) => f.isQuiz).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [forms],
  )
  const summaries = useQuery(
    api.responses.getSubjectSummaries,
    subjects.length > 0 ? { formIds: subjects.map((f) => f.id as Id<'forms'>) } : 'skip',
  )
  const byId = new Map((summaries ?? []).map((s) => [s.formId, s]))

  if (!isAuthenticated || formsRaw === undefined) {
    return (
      <div className="py-24 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  const totalSubmissions = (summaries ?? []).reduce((n, s) => n + s.count, 0)
  const totalToMark = (summaries ?? []).reduce((n, s) => n + s.essaysToMark, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <PageHeader
        title="Dashboard"
        description="Your subjects. Open one to mark essays and see objective, essay and final results."
        actions={
          <Link href="/prepare" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> New exam
          </Link>
        }
      />

      {subjects.length === 0 ? (
        <EmptyState icon={<BookOpen className="w-10 h-10 text-gray-300 mx-auto" />} title="No subjects yet">
          <Link href="/prepare" className="text-blue-700 font-medium">Prepare your first exam →</Link>
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <StatCard label="Subjects" value={subjects.length} />
            <StatCard label="Submissions" value={totalSubmissions} />
            <StatCard label="Essays to mark" value={totalToMark} tone={totalToMark ? 'text-amber-700' : 'text-green-700'} />
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3">Submissions</th>
                  <th className="px-4 py-3">Class average</th>
                  <th className="px-4 py-3">Marking</th>
                  <th className="px-4 py-3">Exam link</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjects.map((f) => {
                  const s = byId.get(f.id)
                  const objective = f.fields.filter(isObjectiveField).length
                  const essays = f.fields.filter(isEssayField).length
                  return (
                    <tr key={f.id} onClick={() => router.push(`/admin/${f.id}`)} className="hover:bg-blue-50/40 cursor-pointer">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{f.title}</p>
                        <p className="text-xs text-gray-500">
                          Created {new Date(f.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{objective} obj. · {essays} essay</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{s?.count ?? 0}</td>
                      <td className="px-4 py-3">
                        {s?.count && s.averagePercent !== null ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="font-medium text-gray-900">{s.averagePercent}%</span>
                            <GradeBadge grade={gradeFor(s.averagePercent)} />
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {essays === 0 ? <Chip tone="gray">Automatic</Chip> : s?.essaysToMark ? <Chip tone="amber">{s.essaysToMark} to mark</Chip> : <Chip tone="green">Up to date</Chip>}
                      </td>
                      <td className="px-4 py-3"><LinkStatus expiresAt={f.linkExpiresAt} /></td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-blue-700 font-medium">Open <ArrowRight className="w-4 h-4" /></span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Phone cards */}
          <ul className="md:hidden space-y-3">
            {subjects.map((f) => {
              const s = byId.get(f.id)
              const essays = f.fields.filter(isEssayField).length
              return (
                <li key={f.id}>
                  <Link href={`/admin/${f.id}`} className="block bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-gray-900 break-words">{f.title}</p>
                      <ArrowRight className="w-5 h-5 text-blue-600 shrink-0" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div><p className="text-xs text-gray-500">Submissions</p><p className="font-medium">{s?.count ?? 0}</p></div>
                      <div><p className="text-xs text-gray-500">Average</p><p className="font-medium">{s?.count && s.averagePercent !== null ? `${s.averagePercent}%` : '—'}</p></div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {essays === 0 ? <Chip tone="gray">Automatic marking</Chip> : s?.essaysToMark ? <Chip tone="amber">{s.essaysToMark} to mark</Chip> : <Chip tone="green">Marking up to date</Chip>}
                    </div>
                    <div className="mt-2"><LinkStatus expiresAt={f.linkExpiresAt} /></div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
