'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useConvexAuth, useQuery } from 'convex/react'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  PenLine,
  Share2,
} from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { Form, FormResponse } from '@/types/form'
import { useStorage } from '@/lib/storage'
import { useShareLink } from '@/lib/useShareLink'
import { docToFormResponse } from '@/lib/mapConvexResponse'
import { breakdown, isEssayConfirmed, isEssayField, isObjectiveField, percentBadge } from '@/lib/results'
import CameraPhoto from '@/components/CameraPhoto'
import EssayMarker from '@/components/EssayMarker'
import LinkStatus from '@/components/LinkStatus'

type Tab = 'objective' | 'marking' | 'essay' | 'final'

export default function AdminDashboard() {
  const { user, isLoaded } = useUser()
  const { isAuthenticated: isConvexAuthed } = useConvexAuth()
  const storage = useStorage()
  const shareLink = useShareLink()

  const ownerFormsRaw = useQuery(api.forms.getAllForms, isConvexAuthed ? {} : 'skip')
  const forms = storage.getAllForms()
  const exams: Form[] = useMemo(
    () => forms.filter((f) => f.isQuiz).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [forms],
  )
  const formsLoading = !!user?.id && (!isConvexAuthed || ownerFormsRaw === undefined)

  const [pickedFormId, setPickedFormId] = useState<string | null>(null)
  const selectedForm = exams.find((f) => f.id === pickedFormId) ?? exams[0] ?? null
  const [tab, setTab] = useState<Tab>('marking')
  const [copied, setCopied] = useState(false)

  const summaries = useQuery(
    api.responses.getSubjectSummaries,
    exams.length > 0 ? { formIds: exams.map((f) => f.id as Id<'forms'>) } : 'skip',
  )
  const summaryById = new Map((summaries ?? []).map((row) => [row.formId, row]))

  const docs = useQuery(
    api.responses.getResponses,
    selectedForm ? { formId: selectedForm.id as Id<'forms'> } : 'skip',
  )
  const responses: FormResponse[] = useMemo(
    () => (docs ?? []).map(docToFormResponse).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)),
    [docs],
  )

  const hasEssays = !!selectedForm?.fields.some(isEssayField)
  const hasObjective = !!selectedForm?.fields.some(isObjectiveField)
  const pendingCount = selectedForm
    ? responses.reduce((n, r) => n + breakdown(selectedForm, r).essaysPending, 0)
    : 0

  const handleShare = async () => {
    if (!selectedForm) return
    await shareLink(selectedForm.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const exportCsv = () => {
    if (!selectedForm) return
    const headers = [
      'Name', 'Matric No.', 'Objective', 'Objective Max', 'Essay (confirmed)', 'Essay Max',
      'Total', 'Total Max', 'Percent', 'Status', 'Submitted At', 'Left Tab', 'Paste Attempts', 'Camera',
    ]
    const rows = responses.map((r) => {
      const b = breakdown(selectedForm, r)
      return [
        r.studentName ?? '', r.studentClass ?? '', b.objectiveScore, b.objectiveMax, b.essayScore, b.essayMax,
        b.total, b.totalMax, `${b.percent}%`, b.complete ? 'Complete' : `${b.essaysPending} essay(s) to mark`,
        new Date(r.submittedAt).toLocaleString(), r.tabSwitchCount ? 'Yes' : 'No', r.pasteAttempts ?? 0,
        r.cameraStatus ?? '',
      ]
    })
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedForm.title.replace(/[^a-z0-9]/gi, '_')}_results.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isLoaded || formsLoading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  const tabs: { id: Tab; label: string; badge?: number; show: boolean }[] = [
    { id: 'objective', label: 'Objective', show: true },
    { id: 'marking', label: 'Essay marking', badge: pendingCount, show: true },
    { id: 'essay', label: 'Essay results', show: true },
    { id: 'final', label: 'Final results', show: true },
  ]
  const visibleTabs = tabs.filter((t) => t.show)
  const activeTab: Tab = visibleTabs.some((t) => t.id === tab) ? tab : visibleTabs[0]?.id ?? 'final'

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <Link href="/prepare" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
        <ArrowLeft className="w-4 h-4" />
        Prepare Exams
      </Link>

      <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">Choose a subject, mark its essays, then review its results.</p>
        </div>
      </div>

      {exams.length === 0 ? (
        <div className="mt-8 bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="font-medium text-gray-900">No exams yet</p>
          <p className="mt-1 text-sm text-gray-600">Create an exam first — its submissions will appear here.</p>
          <Link href="/prepare" className="mt-4 inline-flex px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Prepare Exams
          </Link>
        </div>
      ) : selectedForm && (
        <>
          {/* Subjects: every exam the tutor created, each marked separately */}
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Subjects</h2>
          <div className="mt-2 flex gap-3 overflow-x-auto pb-2 snap-x">
            {exams.map((f) => {
              const summary = summaryById.get(f.id)
              const active = f.id === selectedForm.id
              return (
                <button
                  key={f.id}
                  onClick={() => setPickedFormId(f.id)}
                  className={`snap-start shrink-0 w-56 text-left rounded-xl border-2 p-4 transition ${
                    active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <span className={`block font-semibold break-words ${active ? 'text-blue-900' : 'text-gray-900'}`}>{f.title}</span>
                  <span className="mt-1 block text-sm text-gray-600">
                    {summary?.count ?? 0} submission{(summary?.count ?? 0) !== 1 ? 's' : ''}
                  </span>
                  {!!summary?.essaysToMark && (
                    <span className="mt-2 inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                      {summary.essaysToMark} essay{summary.essaysToMark !== 1 ? 's' : ''} to mark
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl bg-white border border-gray-200 p-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</p>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{selectedForm.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                <span>{responses.length} submission{responses.length !== 1 ? 's' : ''}</span>
                <LinkStatus expiresAt={selectedForm.linkExpiresAt} />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                title="Copy the student link (opens it for 5 minutes)"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copied ? 'Copied' : 'Share link'}
              </button>
              <button
                onClick={exportCsv}
                disabled={responses.length === 0}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 font-medium"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-5 sm:border-b sm:border-gray-200">
            <nav className="grid grid-cols-2 sm:flex sm:gap-1" role="tablist">
              {visibleTabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-5 py-3 sm:-mb-px border-b-2 text-base font-semibold whitespace-nowrap text-center transition-colors ${
                    activeTab === t.id
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t.label}
                  {!!t.badge && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">{t.badge}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-6">
            {docs === undefined ? (
              <div className="py-16 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : responses.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-600">
                No submissions yet. Share the link — it opens for 5 minutes.
              </div>
            ) : activeTab === 'objective' && !hasObjective ? (
              <EmptyTab>This subject has no objective questions — it&apos;s all essays. Use the Essay marking tab.</EmptyTab>
            ) : (activeTab === 'marking' || activeTab === 'essay') && !hasEssays ? (
              <EmptyTab>This subject has no essay questions, so there is nothing to mark. See the Objective tab.</EmptyTab>
            ) : activeTab === 'objective' ? (
              <ObjectiveTab form={selectedForm} responses={responses} />
            ) : activeTab === 'marking' ? (
              <MarkingTab form={selectedForm} responses={responses} onDone={() => setTab('essay')} />
            ) : activeTab === 'essay' ? (
              <EssayResultsTab form={selectedForm} responses={responses} onMark={() => setTab('marking')} />
            ) : (
              <FinalTab form={selectedForm} responses={responses} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

function questionNumbers(form: Form) {
  const map = new Map<string, number>()
  let n = 0
  for (const f of form.fields) if (f.type !== 'textblock') map.set(f.id, ++n)
  return map
}

function StudentName({ r }: { r: FormResponse }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-gray-900 break-words">{r.studentName || 'Unnamed student'}</p>
      <p className="text-sm text-gray-500">Matric No. {r.studentClass || 'N/A'}</p>
    </div>
  )
}

function ScoreBadge({ score, max }: { score: number; max: number }) {
  const percent = max > 0 ? Math.round((score / max) * 100) : 0
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="font-bold text-gray-900">
        {score}
        <span className="font-normal text-gray-500"> / {max}</span>
      </span>
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${percentBadge(percent)}`}>{percent}%</span>
    </span>
  )
}

// ---------- Objective ----------
function ObjectiveTab({ form, responses }: { form: Form; responses: FormResponse[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const fields = form.fields.filter(isObjectiveField)
  const numbers = questionNumbers(form)

  return (
    <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
      {responses.map((r) => {
        const b = breakdown(form, r)
        const isOpen = open === r.id
        return (
          <li key={r.id}>
            <button
              onClick={() => setOpen(isOpen ? null : r.id)}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50"
              aria-expanded={isOpen}
            >
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <StudentName r={r} />
                <ScoreBadge score={b.objectiveScore} max={b.objectiveMax} />
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-2">
                {fields.map((f) => {
                  const given = r.responses[f.id]
                  const correct = r.answers?.[f.id]?.isCorrect
                  return (
                    <div key={f.id} className={`rounded-lg border p-3 text-sm ${correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      <p className="font-medium text-gray-900">
                        <span className="text-gray-400 mr-1">Q{numbers.get(f.id)}.</span>
                        {f.label}
                      </p>
                      <p className="mt-1">
                        <span className={correct ? 'text-green-700' : 'text-red-700'}>
                          {correct ? '✓' : '✗'} {Array.isArray(given) ? given.join(', ') : String(given ?? '—') || '—'}
                        </span>
                        {!correct && !!f.correctAnswers?.length && (
                          <span className="text-gray-600"> · correct: {f.correctAnswers.join(', ')}</span>
                        )}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// ---------- Essay marking ----------
function MarkingTab({ form, responses, onDone }: { form: Form; responses: FormResponse[]; onDone: () => void }) {
  const essayFields = form.fields.filter(isEssayField)
  const numbers = questionNumbers(form)
  const [showMarked, setShowMarked] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const queue = responses.filter((r) => showMarked || breakdown(form, r).essaysPending > 0)
  const selected = queue.find((r) => r.id === selectedId) ?? queue[0] ?? null
  const selectedIndex = selected ? queue.indexOf(selected) : -1
  const next = queue[selectedIndex + 1] ?? null
  const allMarked = responses.every((r) => breakdown(form, r).essaysPending === 0)

  if (queue.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
        <p className="mt-3 font-semibold text-gray-900">All essays are marked</p>
        <p className="mt-1 text-sm text-gray-600">Confirmed marks are in Essay results and Final results.</p>
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={onDone} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">
            View essay results
          </button>
          <button onClick={() => setShowMarked(true)} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium">
            Review marked essays
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      {/* Student list */}
      <aside className="bg-white rounded-xl border border-gray-200 overflow-hidden self-start">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">{showMarked ? 'All students' : 'To mark'}</span>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={showMarked} onChange={(e) => setShowMarked(e.target.checked)} />
            Show marked
          </label>
        </div>
        <ul className="max-h-72 lg:max-h-[32rem] overflow-y-auto divide-y divide-gray-100">
          {queue.map((r) => {
            const pending = breakdown(form, r).essaysPending
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
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">{pending} left</span>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      {/* Essays of the selected student */}
      {selected && (
        <section className="space-y-4 min-w-0">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PenLine className="w-5 h-5 text-blue-600" />
              <StudentName r={selected} />
            </div>
            <span className="text-sm text-gray-500">Submitted {new Date(selected.submittedAt).toLocaleString()}</span>
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

          <div className="flex justify-end">
            {next ? (
              <button
                onClick={() => setSelectedId(next.id)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-medium"
              >
                Next student <ChevronRight className="w-4 h-4" />
              </button>
            ) : allMarked ? (
              <button onClick={onDone} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">
                View essay results
              </button>
            ) : null}
          </div>
        </section>
      )}
    </div>
  )
}

// ---------- Essay results ----------
function EssayResultsTab({ form, responses, onMark }: { form: Form; responses: FormResponse[]; onMark: () => void }) {
  const essayFields = form.fields.filter(isEssayField)
  const numbers = questionNumbers(form)
  const pendingTotal = responses.reduce((n, r) => n + breakdown(form, r).essaysPending, 0)

  return (
    <div className="space-y-4">
      {pendingTotal > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
          <span>{pendingTotal} essay answer{pendingTotal !== 1 ? 's are' : ' is'} still waiting to be marked — they don&apos;t count yet.</span>
          <button onClick={onMark} className="font-medium text-amber-900 underline">Go to marking</button>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3">Student</th>
              {essayFields.map((f) => (
                <th key={f.id} className="px-4 py-3 whitespace-nowrap" title={f.label}>Q{numbers.get(f.id)} ({f.points || 1})</th>
              ))}
              <th className="px-4 py-3 whitespace-nowrap">Essay total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {responses.map((r) => {
              const b = breakdown(form, r)
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3 min-w-[10rem]"><StudentName r={r} /></td>
                  {essayFields.map((f) => {
                    const a = r.answers?.[f.id]
                    return (
                      <td key={f.id} className="px-4 py-3 whitespace-nowrap">
                        {isEssayConfirmed(a) ? (
                          <span className="font-medium text-gray-900">{a?.points ?? 0}</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Not marked</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ScoreBadge score={b.essayScore} max={b.essayMax} />
                    {!b.complete && <span className="block text-xs text-amber-700 mt-0.5">{b.essaysPending} pending</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------- Final results ----------
function FinalTab({ form, responses }: { form: Form; responses: FormResponse[] }) {
  const hasObjective = form.fields.some(isObjectiveField)
  const hasEssays = form.fields.some(isEssayField)

  return (
    <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
      {responses.map((r) => {
        const b = breakdown(form, r)
        const cameraProblem = r.cameraStatus === 'blocked' || r.cameraStatus === 'unavailable'
        const photos = r.cameraPhotos ?? []
        return (
          <li key={r.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="lg:w-60 shrink-0">
              <StudentName r={r} />
              <p className="text-xs text-gray-400 mt-0.5">{new Date(r.submittedAt).toLocaleString()}</p>
            </div>

            <div className="lg:w-56 shrink-0 space-y-1 text-sm">
              <ScoreBadge score={b.total} max={b.totalMax} />
              <p className="text-xs text-gray-500">
                {hasObjective && <>Objective {b.objectiveScore}/{b.objectiveMax}</>}
                {hasObjective && hasEssays && ' · '}
                {hasEssays && <>Essay {b.essayScore}/{b.essayMax}</>}
              </p>
              {b.complete ? (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Complete</span>
              ) : (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {b.essaysPending} essay{b.essaysPending !== 1 ? 's' : ''} to mark
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 flex-1">
              {!!r.tabSwitchCount && <Flag tone="amber">Left the exam tab</Flag>}
              {!!r.pasteAttempts && <Flag tone="amber">Tried to paste {r.pasteAttempts}×</Flag>}
              {cameraProblem && <Flag tone="red">{r.cameraStatus === 'blocked' ? 'Camera blocked' : 'No camera'}</Flag>}
              {!r.tabSwitchCount && !r.pasteAttempts && !cameraProblem && <span className="text-xs text-gray-400">No flags</span>}
            </div>

            <div className="flex gap-2">
              {photos.length > 0 ? (
                photos.map((id, i) => (
                  <CameraPhoto key={id} storageId={id} size="w-20" label={`Snapshot ${i + 1} of ${r.studentName || 'student'}`} />
                ))
              ) : (
                <span className="text-xs text-gray-400">No snapshots</span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Flag({ tone, children }: { tone: 'amber' | 'red'; children: React.ReactNode }) {
  const cls = tone === 'red' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{children}</span>
}

function EmptyTab({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-600">{children}</div>
  )
}
