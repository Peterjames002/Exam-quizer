'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Camera, CameraOff, CheckCircle2, ClipboardX, LogOut, XCircle } from 'lucide-react'
import { useSubject } from '@/lib/useSubject'
import { buildRows, isEssayConfirmed, isEssayField, isObjectiveField, ordinal } from '@/lib/results'
import CameraPhoto from '@/components/CameraPhoto'
import AttachmentViewer from '@/components/AttachmentViewer'
import { Chip, EmptyState, GradeBadge, StatCard } from '@/components/admin/ui'

export default function StudentReportPage() {
  const { formId, responseId } = useParams<{ formId: string; responseId: string }>()
  const { form, responses } = useSubject(formId)
  if (!form) return null

  const rows = buildRows(form, responses, 'total')
  const row = rows.find((r) => r.response.id === responseId)
  if (!row) {
    return (
      <EmptyState title="Student not found">
        <Link href={`/admin/${formId}/results`} className="text-blue-700 font-medium">Back to final results</Link>
      </EmptyState>
    )
  }

  const r = row.response
  const { b, integrity } = row
  const numbers = new Map<string, number>()
  let n = 0
  for (const f of form.fields) if (f.type !== 'textblock') numbers.set(f.id, ++n)
  const objectiveFields = form.fields.filter(isObjectiveField)
  const essayFields = form.fields.filter(isEssayField)

  return (
    <div className="space-y-6">
      <Link href={`/admin/${formId}/results`} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Final results
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Student report</p>
          <h1 className="text-2xl font-bold text-gray-900 break-words">{r.studentName || 'Unnamed student'}</h1>
          <p className="text-gray-600">Matric No. {r.studentClass || '—'}</p>
          <p className="text-sm text-gray-500 mt-0.5">Submitted {new Date(r.submittedAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">{row.graded ? `${row.percent}%` : '—'}</p>
            <p className="text-sm text-gray-500">{row.score} / {row.max}</p>
            {row.provisional && <p className="text-xs text-amber-700">on marked questions so far</p>}
          </div>
          <div className="flex flex-col items-start gap-1">
            <GradeBadge grade={row.grade} withRemark />
            {b.complete ? <Chip tone="green">Final</Chip> : <Chip tone="amber">Provisional</Chip>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Position" value={ordinal(row.rank)} hint={`of ${rows.length}`} />
        <StatCard label="Percentile" value={row.percentile} hint={`scored above ${row.percentile}% of the class`} />
        {objectiveFields.length > 0 && <StatCard label="Objective" value={`${b.objectiveScore}/${b.objectiveMax}`} />}
        {essayFields.length > 0 && (
          <StatCard label="Essay" value={`${b.essayScore}/${b.essayMax}`} hint={b.essaysPending ? `${b.essaysPending} not marked yet` : 'all marked'} />
        )}
      </div>

      {/* Integrity */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900">Exam integrity</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          <IntegrityItem
            ok={!integrity.leftTab}
            icon={<LogOut className="w-5 h-5" />}
            title={integrity.leftTab ? 'Left the exam tab' : 'Stayed on the exam'}
            detail={integrity.leftTab ? 'The exam was submitted automatically when they switched away.' : 'Never switched tabs or apps.'}
          />
          <IntegrityItem
            ok={integrity.pasteAttempts === 0}
            icon={<ClipboardX className="w-5 h-5" />}
            title={integrity.pasteAttempts ? `Tried to paste ${integrity.pasteAttempts}×` : 'No paste attempts'}
            detail={integrity.pasteAttempts ? 'Pasting into essays was blocked each time.' : 'All answers were typed.'}
          />
          <IntegrityItem
            ok={integrity.camera === 'on'}
            icon={integrity.camera === 'on' ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
            title={integrity.camera === 'on' ? 'Camera on' : integrity.camera === 'blocked' ? 'Camera blocked' : integrity.camera === 'unavailable' ? 'No camera' : 'Camera not recorded'}
            detail={`${integrity.photos.length} snapshot${integrity.photos.length !== 1 ? 's' : ''} taken`}
          />
        </ul>
        {integrity.photos.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-gray-900">Camera snapshots</h3>
            <div className="mt-2 flex flex-wrap gap-3">
              {integrity.photos.map((id, i) => (
                <CameraPhoto key={id} storageId={id} size="w-40 sm:w-48" label={`Snapshot ${i + 1} of ${r.studentName || 'student'}`} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Objective answers */}
      {objectiveFields.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900">
            Objective answers <span className="font-normal text-gray-500">· {b.objectiveScore}/{b.objectiveMax}</span>
          </h2>
          <ul className="mt-4 divide-y divide-gray-100">
            {objectiveFields.map((f) => {
              const given = r.responses[f.id]
              const correct = !!r.answers?.[f.id]?.isCorrect
              const text = Array.isArray(given) ? given.join(', ') : given === undefined || given === '' ? '' : String(given)
              return (
                <li key={f.id} className="py-3 flex gap-3">
                  {correct ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-900"><span className="text-gray-400 mr-1">Q{numbers.get(f.id)}.</span>{f.label}</p>
                    <p className="mt-0.5 text-sm">
                      <span className={correct ? 'text-green-700' : 'text-red-700'}>{text || 'No answer'}</span>
                      {!correct && !!f.correctAnswers?.length && <span className="text-gray-500"> · correct: {f.correctAnswers.join(', ')}</span>}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 shrink-0">{r.answers?.[f.id]?.points ?? 0}/{f.points || 1}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Essays */}
      {essayFields.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-900">
              Essays <span className="font-normal text-gray-500">· {b.essayScore}/{b.essayMax}</span>
            </h2>
            <Link href={`/admin/${formId}/marking?student=${r.id}`} className="text-sm font-medium text-blue-700 hover:text-blue-900">
              {b.essaysPending ? 'Mark these essays →' : 'Change marks →'}
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {essayFields.map((f) => {
              const a = r.answers?.[f.id]
              const answer = typeof r.responses[f.id] === 'string' ? (r.responses[f.id] as string).trim() : ''
              return (
                <div key={f.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-gray-900"><span className="text-gray-400 mr-1">Q{numbers.get(f.id)}.</span>{f.label}</p>
                    {isEssayConfirmed(a) ? (
                      <span className="shrink-0 font-semibold text-gray-900">{a?.points ?? 0}/{f.points || 1}</span>
                    ) : (
                      <Chip tone="amber">Not marked</Chip>
                    )}
                  </div>
                  <p className="mt-2 text-gray-700 whitespace-pre-wrap break-words">{answer || <span className="italic text-gray-400">No written answer</span>}</p>
                  {r.attachments?.[f.id] && <div className="mt-2"><AttachmentViewer storageId={r.attachments[f.id]} /></div>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function IntegrityItem({ ok, icon, title, detail }: { ok: boolean; icon: React.ReactNode; title: string; detail: string }) {
  return (
    <li className={`rounded-lg border p-3 ${ok ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className={`flex items-center gap-2 font-semibold ${ok ? 'text-green-800' : 'text-amber-900'}`}>
        {icon}
        {title}
      </div>
      <p className={`mt-1 text-sm ${ok ? 'text-green-700' : 'text-amber-800'}`}>{detail}</p>
    </li>
  )
}
