'use client'

import { Search } from 'lucide-react'
import type { StudentRow } from '@/lib/results'

export type Filter = 'all' | 'passed' | 'failed' | 'flagged'

export function applyFilters(rows: StudentRow[], query: string, filter: Filter) {
  const q = query.trim().toLowerCase()
  return rows.filter((r) => {
    const matches =
      !q ||
      (r.response.studentName ?? '').toLowerCase().includes(q) ||
      (r.response.studentClass ?? '').toLowerCase().includes(q)
    const kept =
      filter === 'all' ||
      (filter === 'passed' && r.passed) ||
      (filter === 'failed' && !r.passed) ||
      (filter === 'flagged' && r.integrity.issues > 0)
    return matches && kept
  })
}

// Search by name/matric number plus quick filters
export default function StudentFilters({
  query,
  onQuery,
  filter,
  onFilter,
  rows,
}: {
  query: string
  onQuery: (q: string) => void
  filter: Filter
  onFilter: (f: Filter) => void
  rows: StudentRow[]
}) {
  const counts: Record<Filter, number> = {
    all: rows.length,
    passed: rows.filter((r) => r.passed).length,
    failed: rows.filter((r) => !r.passed).length,
    flagged: rows.filter((r) => r.integrity.issues > 0).length,
  }
  const labels: Record<Filter, string> = { all: 'All', passed: 'Passed', failed: 'Failed', flagged: 'Flagged' }

  return (
    <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <div className="relative sm:w-72">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search name or matric no."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {(Object.keys(labels) as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => onFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
              filter === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {labels[f]} <span className="opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
