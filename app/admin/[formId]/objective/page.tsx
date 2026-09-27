'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ListChecks } from 'lucide-react'
import { useSubject } from '@/lib/useSubject'
import { buildRows, classStats, gradeFor, isObjectiveField } from '@/lib/results'
import {
  Chip,
  EmptyState,
  GradeBadge,
  PageHeader,
  PercentileCell,
  RankCell,
  ResultsTable,
  ScoreCell,
  SnapshotStrip,
  StatCard,
  StudentCell,
  type Column,
} from '@/components/admin/ui'
import StudentFilters, { applyFilters, type Filter } from '@/components/admin/StudentFilters'

export default function ObjectiveResultsPage() {
  const { formId } = useParams<{ formId: string }>()
  const { form, responses } = useSubject(formId)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  if (!form) return null

  const questionCount = form.fields.filter(isObjectiveField).length
  const rows = buildRows(form, responses, 'objective')
  const stats = classStats(rows)
  const shown = applyFilters(rows, query, filter)
  const hrefFor = (r: (typeof rows)[number]) => `/admin/${formId}/students/${r.response.id}`

  const columns: Column[] = [
    { header: 'Pos.', cell: (r) => <RankCell row={r} />, className: 'w-14' },
    { header: 'Student', cell: (r) => <StudentCell row={r} href={hrefFor(r)} />, hideOnMobile: true },
    { header: 'Score', cell: (r) => <ScoreCell row={r} /> },
    { header: 'Grade', cell: (r) => <GradeBadge grade={r.grade} />, hideOnMobile: true },
    { header: 'Percentile', cell: (r) => <PercentileCell row={r} /> },
    {
      header: 'Tab report',
      cell: (r) =>
        r.integrity.leftTab ? <Chip tone="amber">Left tab · auto-submitted</Chip> : <Chip tone="green">Stayed on exam</Chip>,
    },
    {
      header: 'Paste / camera',
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.integrity.pasteAttempts > 0 ? <Chip tone="amber">Paste ×{r.integrity.pasteAttempts}</Chip> : <Chip tone="gray">No paste</Chip>}
          {r.integrity.camera === 'on' ? (
            <Chip tone="green">Camera on</Chip>
          ) : r.integrity.camera ? (
            <Chip tone="red">{r.integrity.camera === 'blocked' ? 'Camera blocked' : 'No camera'}</Chip>
          ) : (
            <Chip tone="gray">Camera —</Chip>
          )}
        </div>
      ),
    },
    { header: 'Snapshots', cell: (r) => <SnapshotStrip photos={r.integrity.photos} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Objective results"
        description={`${questionCount} objective question${questionCount !== 1 ? 's' : ''}, marked automatically. Select a student for their answer-by-answer report.`}
      />
      {questionCount === 0 ? (
        <EmptyState icon={<ListChecks className="w-10 h-10 text-gray-300 mx-auto" />} title="No objective questions">
          This subject is all essays — see Essay marking and Essay results.
        </EmptyState>
      ) : responses.length === 0 ? (
        <EmptyState title="No submissions yet" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Average" value={`${stats.average}%`} hint={`Grade ${gradeFor(stats.average).letter}`} />
            <StatCard label="Pass rate" value={`${stats.passRate}%`} />
            <StatCard label="Highest" value={`${stats.highest}%`} tone="text-green-700" />
            <StatCard label="Left the tab" value={rows.filter((r) => r.integrity.leftTab).length} tone="text-amber-700" hint="auto-submitted" />
          </div>
          <StudentFilters query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} rows={rows} />
          {shown.length === 0 ? <EmptyState title="No students match" /> : <ResultsTable rows={shown} columns={columns} hrefFor={hrefFor} />}
        </>
      )}
    </div>
  )
}
