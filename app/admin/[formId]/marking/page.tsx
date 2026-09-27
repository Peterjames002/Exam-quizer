'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { CheckCircle2, ChevronLeft, ChevronRight, PenLine } from 'lucide-react'
import { useSubject } from '@/lib/useSubject'
import { breakdown, isEssayField } from '@/lib/results'
import EssayMarker from '@/components/EssayMarker'
import { EmptyState, PageHeader } from '@/components/admin/ui'

type Show = 'todo' | 'marked' | 'all'

export default function EssayMarkingPage() {
  const { formId } = useParams<{ formId: string }>()
  const search = useSearchParams()
  const { form, responses } = useSubject(formId)
  const [show, setShow] = useState<Show>('todo')
  const [selectedId, setSelectedId] = useState<string | null>(search.get('student'))
  if (!form) return null

  const essayFields = form.fields.filter(isEssayField)
  const numbers = new Map<string, number>()
  let n = 0
  for (const f of form.fields) if (f.type !== 'textblock') numbers.set(f.id, ++n)

  const withPending = responses.map((r) => ({ r, pending: breakdown(form, r).essaysPending }))
  const total = responses.length * essayFields.length
  const toMark = withPending.reduce((sum, x) => sum + x.pending, 0)
  const marked = total - toMark

  const list = withPending.filter((x) => (show === 'todo' ? x.pending > 0 : show === 'marked' ? x.pending === 0 : true))
  // Keep a student open even after their last essay is marked (they leave the "To mark" list)
  const selected =
    responses.find((r) => r.id === selectedId) ?? list[0]?.r ?? null
  const index = selected ? list.findIndex((x) => x.r.id === selected.id) : -1
  const prev = index > 0 ? list[index - 1].r : null
  const next = index >= 0 ? list[index + 1]?.r ?? null : list.find((x) => x.r.id !== selected?.id)?.r ?? null

  return (
    <div>
      <PageHeader title="Essay marking" description="Read each answer, enter a mark and confirm it. Only confirmed marks count toward results." />

      {essayFields.length === 0 ? (
        <EmptyState icon={<PenLine className="w-10 h-10 text-gray-300 mx-auto" />} title="No essay questions">
          This subject is marked automatically — see Objective results.
        </EmptyState>
      ) : responses.length === 0 ? (
        <EmptyState title="No submissions yet" />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold text-gray-900">
                {marked} of {total} essays marked
              </p>
              <p className="text-sm text-gray-600">{toMark === 0 ? 'All done' : `${toMark} to go`}</p>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${total ? (marked / total) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
            {/* Students */}
            <aside className="bg-white rounded-xl border border-gray-200 overflow-hidden self-start">
              <div className="grid grid-cols-3 border-b border-gray-200 text-sm">
                {(['todo', 'marked', 'all'] as Show[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setShow(s)}
                    className={`py-2.5 font-medium ${show === s ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {s === 'todo' ? 'To mark' : s === 'marked' ? 'Marked' : 'All'}
                  </button>
                ))}
              </div>
              {list.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">
                  {show === 'todo' ? 'Nothing left to mark 🎉' : 'No students here yet.'}
                </p>
              ) : (
                <ul className="max-h-64 lg:max-h-[36rem] overflow-y-auto divide-y divide-gray-100">
                  {list.map(({ r, pending }) => {
                    const active = selected?.id === r.id
                    return (
                      <li key={r.id}>
                        <button
                          onClick={() => setSelectedId(r.id)}
                          className={`w-full px-4 py-3 flex items-center justify-between gap-2 text-left ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                          <span className="min-w-0">
                            <span className={`block truncate font-medium ${active ? 'text-blue-800' : 'text-gray-900'}`}>{r.studentName || 'Unnamed'}</span>
                            <span className="block truncate text-xs text-gray-500">{r.studentClass}</span>
                          </span>
                          {pending > 0 ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">{pending} left</span>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </aside>

            {/* Essays of the selected student */}
            {selected ? (
              <section className="space-y-4 min-w-0">
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{selected.studentName || 'Unnamed student'}</p>
                    <p className="text-sm text-gray-500">Matric No. {selected.studentClass || '—'} · submitted {new Date(selected.submittedAt).toLocaleString()}</p>
                  </div>
                  <Link href={`/admin/${formId}/students/${selected.id}`} className="text-sm font-medium text-blue-700 hover:text-blue-900">
                    Full report →
                  </Link>
                </div>

                {essayFields.map((f) => (
                  <EssayMarker
                    key={`${selected.id}-${f.id}`}
                    responseId={selected.id}
                    field={f}
                    questionNumber={numbers.get(f.id)}
                    studentAnswer={selected.responses[f.id]}
                    answer={selected.answers?.[f.id]}
                    attachmentId={selected.attachments?.[f.id]}
                  />
                ))}

                <div className="flex justify-between gap-3">
                  <button
                    onClick={() => prev && setSelectedId(prev.id)}
                    disabled={!prev}
                    className="inline-flex items-center gap-1 px-4 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  {next ? (
                    <button
                      onClick={() => setSelectedId(next.id)}
                      className="inline-flex items-center gap-1 px-5 py-2.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 font-medium"
                    >
                      Next student <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : toMark === 0 ? (
                    <Link href={`/admin/${formId}/essays`} className="inline-flex items-center gap-1 px-5 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium">
                      All marked — view essay results <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : null}
                </div>
              </section>
            ) : (
              <EmptyState icon={<CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />} title="All essays are marked">
                <Link href={`/admin/${formId}/essays`} className="text-blue-700 font-medium">View essay results →</Link>
              </EmptyState>
            )}
          </div>
        </>
      )}
    </div>
  )
}
