'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowRight, ShieldAlert, Users } from 'lucide-react'
import { useSubject } from '@/lib/useSubject'
import { buildRows, classStats, GRADES, gradeFor, isEssayField, isObjectiveField, ordinal, PASS_PERCENT } from '@/lib/results'
import { EmptyState, GradeBadge, IntegrityCell, PageHeader, StatCard, StudentCell } from '@/components/admin/ui'

export default function SubjectOverviewPage() {
  const { formId } = useParams<{ formId: string }>()
  const { form, responses } = useSubject(formId)
  if (!form) return null

  const base = `/admin/${formId}`
  const rows = buildRows(form, responses, 'total')
  const stats = classStats(rows)
  const essayCount = form.fields.filter(isEssayField).length
  const objectiveCount = form.fields.filter(isObjectiveField).length
  const essaysTotal = responses.length * essayCount
  const essaysToMark = rows.reduce((n, r) => n + r.b.essaysPending, 0)
  const marked = essaysTotal - essaysToMark
  const flagged = rows.filter((r) => r.integrity.issues > 0)
  const maxBar = Math.max(1, ...Object.values(stats.distribution))
  const provisional = essaysToMark > 0 ? ' · provisional' : ''

  return (
    <div>
      <PageHeader
        title="Overview"
        description={`${objectiveCount} objective and ${essayCount} essay question${essayCount !== 1 ? 's' : ''} · pass mark ${PASS_PERCENT}%`}
      />

      {responses.length === 0 ? (
        <EmptyState icon={<Users className="w-10 h-10 text-gray-300 mx-auto" />} title="No submissions yet">
          Share the exam link from the menu — it opens for 5 minutes.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Submissions" value={stats.count} />
            <StatCard label="Class average" value={`${stats.average}%`} hint={<>Grade {gradeFor(stats.average).letter}{provisional}</>} />
            <StatCard label="Pass rate" value={`${stats.passRate}%`} hint={`${rows.filter((r) => r.passed).length} of ${stats.count} passed${provisional}`} />
            <StatCard label="Highest · Lowest" value={`${stats.highest}% · ${stats.lowest}%`} />
          </div>

          {essaysToMark > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-amber-900">
                <strong>{essaysToMark}</strong> essay answer{essaysToMark !== 1 ? 's' : ''} still to mark. Grades are provisional (based on marked questions) until they are.
              </p>
              <Link href={`${base}/marking`} className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 font-medium">
                Start marking <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900">
                Grade distribution{provisional && <span className="ml-2 text-xs font-medium text-amber-700">provisional</span>}
              </h2>
              <div className="mt-4 space-y-2">
                {GRADES.map((grade) => {
                  const count = stats.distribution[grade.letter]
                  return (
                    <div key={grade.letter} className="flex items-center gap-3">
                      <GradeBadge grade={grade} />
                      <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${(count / maxBar) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right text-sm font-medium text-gray-700">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900">Marking progress</h2>
              {essaysTotal === 0 ? (
                <p className="mt-4 text-sm text-gray-600">No essay questions — everything is marked automatically.</p>
              ) : (
                <>
                  <p className="mt-4 text-3xl font-bold text-gray-900">
                    {marked}<span className="text-lg font-normal text-gray-500"> / {essaysTotal} essays marked</span>
                  </p>
                  <div className="mt-3 h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${(marked / essaysTotal) * 100}%` }} />
                  </div>
                </>
              )}
              <h3 className="mt-6 text-sm font-semibold text-gray-900">Top students</h3>
              <ol className="mt-2 space-y-2">
                {rows.slice(0, 3).map((r) => (
                  <li key={r.response.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 text-sm font-semibold text-gray-500">{ordinal(r.rank)}</span>
                      <StudentCell row={r} href={`${base}/students/${r.response.id}`} />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{r.percent}%</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Needs attention
            </h2>
            {flagged.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">No integrity issues — nobody left the exam tab, pasted, or blocked the camera.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {flagged.map((r) => (
                  <li key={r.response.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <StudentCell row={r} href={`${base}/students/${r.response.id}`} />
                    <IntegrityCell integrity={r.integrity} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
