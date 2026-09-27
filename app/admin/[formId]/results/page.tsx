'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Camera, Download } from 'lucide-react'
import { useSubject } from '@/lib/useSubject'
import { buildRows, classStats, gradeFor, isEssayField, isObjectiveField } from '@/lib/results'
import { exportResultsCsv } from '@/lib/exportResults'
import {
  Chip,
  EmptyState,
  GradeBadge,
  IntegrityCell,
  PageHeader,
  PercentileCell,
  RankCell,
  ResultsTable,
  ScoreCell,
  StatCard,
  StudentCell,
  type Column,
} from '@/components/admin/ui'
import StudentFilters, { applyFilters, type Filter } from '@/components/admin/StudentFilters'

export default function FinalResultsPage() {
  const { formId } = useParams<{ formId: string }>()
  const { form, responses } = useSubject(formId)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  if (!form) return null

  const hasObjective = form.fields.some(isObjectiveField)
  const hasEssays = form.fields.some(isEssayField)
  const rows = buildRows(form, responses, 'total')
  const stats = classStats(rows)
  const provisional = rows.filter((r) => !r.b.complete).length
  const shown = applyFilters(rows, query, filter)
  const hrefFor = (r: (typeof rows)[number]) => `/admin/${formId}/students/${r.response.id}`

  const columns: Column[] = [
    { header: 'Pos.', cell: (r) => <RankCell row={r} />, className: 'w-14' },
    { header: 'Student', cell: (r) => <StudentCell row={r} href={hrefFor(r)} />, hideOnMobile: true },
    {
      header: 'Breakdown',
      cell: (r) => (
        <div className="text-xs text-gray-600 whitespace-nowrap leading-5">
          {hasObjective && <div>Obj. {r.b.objectiveScore}/{r.b.objectiveMax}</div>}
          {hasEssays && <div>Essay {r.b.essayScore}/{r.b.essayMax}</div>}
        </div>
      ),
    },
    { header: 'Total', cell: (r) => <ScoreCell row={r} /> },
    { header: 'Grade', cell: (r) => <GradeBadge grade={r.grade} />, hideOnMobile: true },
    { header: 'Percentile', cell: (r) => <PercentileCell row={r} /> },
    { header: 'Status', cell: (r) => (r.b.complete ? <Chip tone="green">Final</Chip> : <Chip tone="amber">Provisional</Chip>) },
    { header: 'Integrity', cell: (r) => <IntegrityCell integrity={r.integrity} /> },
    {
      header: 'Photos',
      cell: (r) =>
        r.integrity.photos.length ? (
          <span className="inline-flex items-center gap-1 text-sm text-gray-700 whitespace-nowrap">
            <Camera className="w-4 h-4 text-gray-400" /> {r.integrity.photos.length}
          </span>
        ) : (
          <span className="text-xs text-gray-400">None</span>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Final results"
        description="Objective plus confirmed essay marks, ranked. Select a student for their full report."
        actions={
          <button
            onClick={() => exportResultsCsv(form, responses)}
            disabled={responses.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />
      {responses.length === 0 ? (
        <EmptyState title="No submissions yet">Share the exam link from the menu — it opens for 5 minutes.</EmptyState>
      ) : (
        <>
          {provisional > 0 && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              <span>
                {provisional} result{provisional !== 1 ? 's are' : ' is'} provisional — graded on marked questions until the remaining essays are marked.
              </span>
              <Link href={`/admin/${formId}/marking`} className="font-semibold underline">Go to Essay marking</Link>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Class average" value={`${stats.average}%`} hint={`Grade ${gradeFor(stats.average).letter}`} />
            <StatCard label="Pass rate" value={`${stats.passRate}%`} />
            <StatCard label="Highest" value={`${stats.highest}%`} tone="text-green-700" />
            <StatCard label="Lowest" value={`${stats.lowest}%`} tone="text-red-700" />
          </div>
          <StudentFilters query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} rows={rows} />
          {shown.length === 0 ? <EmptyState title="No students match" /> : <ResultsTable rows={shown} columns={columns} hrefFor={hrefFor} />}
        </>
      )}
    </div>
  )
}
