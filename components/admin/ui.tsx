'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CameraOff, CheckCircle2, ClipboardX, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Grade, Integrity, StudentRow } from '@/lib/results'
import { ordinal } from '@/lib/results'
import CameraPhoto from '@/components/CameraPhoto'

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-gray-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, hint, tone = 'text-gray-900' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

export function GradeBadge({ grade, withRemark = false }: { grade: Grade; withRemark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ring-1 text-sm font-bold whitespace-nowrap ${grade.tone}`} title={grade.remark}>
      {grade.letter}
      {withRemark && <span className="font-medium">· {grade.remark}</span>}
    </span>
  )
}

export function StudentCell({ row, href }: { row: StudentRow; href?: string }) {
  const name = row.response.studentName || 'Unnamed student'
  return (
    <div className="min-w-0">
      {href ? (
        <Link href={href} className="font-semibold text-gray-900 hover:text-blue-700 break-words" onClick={(e) => e.stopPropagation()}>
          {name}
        </Link>
      ) : (
        <p className="font-semibold text-gray-900 break-words">{name}</p>
      )}
      <p className="text-xs text-gray-500">{row.response.studentClass || 'No matric no.'}</p>
    </div>
  )
}

export function ScoreCell({ row }: { row: StudentRow }) {
  if (!row.graded) return <span className="text-sm text-gray-400">Not marked yet</span>
  return (
    <div className="whitespace-nowrap">
      <span className="font-semibold text-gray-900">{row.score}</span>
      <span className="text-gray-400"> / {row.max}</span>
      <span className="ml-2 text-gray-600">{row.percent}%</span>
      {row.provisional && <span className="block text-[11px] text-amber-700">on marked questions</span>}
    </div>
  )
}

export const RankCell = ({ row }: { row: StudentRow }) => (
  <span className="font-semibold text-gray-700">{ordinal(row.rank)}</span>
)

export const PercentileCell = ({ row }: { row: StudentRow }) => (
  <span className="text-gray-700 whitespace-nowrap">
    {row.percentile}
    <span className="text-gray-400 text-xs"> pct</span>
  </span>
)

// Compact integrity report: tab, paste and camera
export function IntegrityCell({ integrity }: { integrity: Integrity }) {
  if (integrity.issues === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-700 whitespace-nowrap">
        <CheckCircle2 className="w-4 h-4" /> No issues
      </span>
    )
  }
  return (
    <div className="flex flex-wrap gap-1">
      {integrity.leftTab && <Chip tone="amber" icon={<LogOut className="w-3 h-3" />}>Left tab</Chip>}
      {integrity.pasteAttempts > 0 && (
        <Chip tone="amber" icon={<ClipboardX className="w-3 h-3" />}>Paste ×{integrity.pasteAttempts}</Chip>
      )}
      {(integrity.camera === 'blocked' || integrity.camera === 'unavailable') && (
        <Chip tone="red" icon={<CameraOff className="w-3 h-3" />}>{integrity.camera === 'blocked' ? 'Camera blocked' : 'No camera'}</Chip>
      )}
    </div>
  )
}

export function Chip({ tone, icon, children }: { tone: 'amber' | 'red' | 'green' | 'gray' | 'blue'; icon?: ReactNode; children: ReactNode }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    red: 'bg-red-50 text-red-800 ring-red-200',
    green: 'bg-green-50 text-green-800 ring-green-200',
    gray: 'bg-gray-100 text-gray-700 ring-gray-200',
    blue: 'bg-blue-50 text-blue-800 ring-blue-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 text-xs font-medium whitespace-nowrap ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  )
}

export function SnapshotStrip({ photos, size = 'w-12' }: { photos: string[]; size?: string }) {
  if (photos.length === 0) return <span className="text-xs text-gray-400">None</span>
  return (
    <div className="flex gap-1">
      {photos.map((id, i) => (
        <CameraPhoto key={id} storageId={id} size={size} label={`Snapshot ${i + 1}`} />
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
      {icon ?? <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto" />}
      <p className="mt-3 font-semibold text-gray-900">{title}</p>
      {children && <div className="mt-1 text-sm text-gray-600">{children}</div>}
    </div>
  )
}

export type Column = {
  header: string
  cell: (row: StudentRow) => ReactNode
  className?: string
  hideOnMobile?: boolean
}

// Table on larger screens, stacked cards on phones. Each row opens the
// student's report.
export function ResultsTable({ rows, columns, hrefFor }: { rows: StudentRow[]; columns: Column[]; hrefFor: (row: StudentRow) => string }) {
  const router = useRouter()
  return (
    <>
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              {columns.map((c) => (
                <th key={c.header} className={`px-3 py-3 ${c.className ?? ''}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr
                key={row.response.id}
                onClick={() => router.push(hrefFor(row))}
                className="hover:bg-blue-50/40 cursor-pointer"
              >
                {columns.map((c) => (
                  <td key={c.header} className={`px-3 py-3 align-middle ${c.className ?? ''}`}>{c.cell(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden space-y-3">
        {rows.map((row) => (
          <li
            key={row.response.id}
            onClick={() => router.push(hrefFor(row))}
            className="bg-white rounded-xl border border-gray-200 p-4 active:bg-gray-50 cursor-pointer"
          >
              <div className="flex items-start justify-between gap-3">
                <StudentCell row={row} />
                <GradeBadge grade={row.grade} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {columns
                  .filter((c) => !c.hideOnMobile)
                  .map((c) => (
                    <div key={c.header} className="min-w-0">
                      <dt className="text-xs text-gray-500">{c.header}</dt>
                      <dd className="mt-0.5">{c.cell(row)}</dd>
                    </div>
                  ))}
              </dl>
              <p className="mt-3 text-sm font-medium text-blue-700">View report →</p>
          </li>
        ))}
      </ul>
    </>
  )
}
