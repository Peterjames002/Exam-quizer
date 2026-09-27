'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'
import { useSubject } from '@/lib/useSubject'
import { buildRows, classStats, isEssayConfirmed, isEssayField } from '@/lib/results'
import {
  Chip,
  EmptyState,
  GradeBadge,
  PageHeader,
  RankCell,
  ResultsTable,
  ScoreCell,
  StatCard,
  StudentCell,
  type Column,
} from '@/components/admin/ui'
import StudentFilters, { applyFilters, type Filter } from '@/components/admin/StudentFilters'

export default function EssayResultsPage() {
  const { formId } = useParams<{ formId: string }>()
  const { form, responses } = useSubject(formId)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  if (!form) return null

  const essayFields = form.fields.filter(isEssayField)
  const numbers = new Map<string, number>()
  let n = 0
  for (const f of form.fields) if (f.type !== 'textblock') numbers.set(f.id, ++n)

  const rows = buildRows(form, responses, 'essay')
  const stats = classStats(rows)
  const pending = rows.reduce((sum, r) => sum + r.b.essaysPending, 0)
  const shown = applyFilters(rows, query, filter)
  const hrefFor = (r: (typeof rows)[number]) => `/admin/${formId}/students/${r.response.id}`

  const columns: Column[] = [
    { header: 'Pos.', cell: (r) => <RankCell row={r} />, className: 'w-14' },
    { header: 'Student', cell: (r) => <StudentCell row={r} href={hrefFor(r)} />, hideOnMobile: true },
    ...essayFields.map<Column>((f) => ({
      header: `Q${numbers.get(f.id)} (/${f.points || 1})`,
      cell: (r) => {
        const a = r.response.answers?.[f.id]
        return isEssayConfirmed(a) ? <span className="font-semibold text-gray-900">{a?.points ?? 0}</span> : <Chip tone="amber">Not marked</Chip>
      },
    })),
    { header: 'Essay total', cell: (r) => <ScoreCell row={r} /> },
    { header: 'Grade', cell: (r) => <GradeBadge grade={r.grade} />, hideOnMobile: true },
    {
      header: 'Status',
      cell: (r) => (r.b.complete ? <Chip tone="green">Marked</Chip> : <Chip tone="amber">{r.b.essaysPending} to mark</Chip>),
    },
  ]

  return (
    <div>
      <PageHeader title="Essay results" description="Confirmed essay marks for each student. Unmarked answers don't count yet." />
      {essayFields.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="w-10 h-10 text-gray-300 mx-auto" />} title="No essay questions">
          This subject is marked automatically — see Objective results.
        </EmptyState>
      ) : responses.length === 0 ? (
        <EmptyState title="No submissions yet" />
      ) : (
        <>
          {pending > 0 && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              <span>{pending} essay answer{pending !== 1 ? 's are' : ' is'} not marked yet.</span>
              <Link href={`/admin/${formId}/marking`} className="font-semibold underline">Go to Essay marking</Link>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Essay average" value={`${stats.average}%`} />
            <StatCard label="Pass rate" value={`${stats.passRate}%`} />
            <StatCard label="Highest" value={`${stats.highest}%`} tone="text-green-700" />
            <StatCard label="Fully marked" value={`${rows.filter((r) => r.b.complete).length}/${rows.length}`} />
          </div>
          <StudentFilters query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} rows={rows} />
          {shown.length === 0 ? <EmptyState title="No students match" /> : <ResultsTable rows={shown} columns={columns} hrefFor={hrefFor} />}
        </>
      )}
    </div>
  )
}
