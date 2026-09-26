'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Form } from '@/types/form'
import { useStorage } from '@/lib/storage'
import { ArrowLeft, Download, FileText, Share2, Copy, Check, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useConvex, useConvexAuth, usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { docToFormResponse } from '@/lib/mapConvexResponse'
import EssayGrader from '@/components/EssayGrader'
import AttachmentViewer from '@/components/AttachmentViewer'

export default function ResponsesPage() {
  const params = useParams()
  const formIdParam = params.id as string
  const convexFormId = formIdParam as Id<'forms'>
  const { user, isLoaded: userLoaded } = useUser()
  const { isAuthenticated: isConvexAuthed } = useConvexAuth()
  const storage = useStorage()
  const convex = useConvex()
  // Answers are collapsed by default; tutors open the ones they need
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const ownerForms = useQuery(
    api.forms.getAllForms,
    isConvexAuthed ? {} : 'skip',
  )
  const isFormsLoading = !!user?.id && (!isConvexAuthed || ownerForms === undefined)

  const form: Form | undefined = storage.getForm(formIdParam)
  const formReady = !!form

  // Sequential question numbers, skipping text blocks (which aren't questions)
  const questionNumbers = useMemo(() => {
    const map = new Map<string, number>()
    let counter = 0
    form?.fields.forEach((f) => {
      if (f.type !== 'textblock') {
        counter += 1
        map.set(f.id, counter)
      }
    })
    return map
  }, [form])

  const stats = useQuery(
    api.responses.getResponseStats,
    formReady ? { formId: convexFormId } : 'skip',
  )

  const {
    results: responseDocs,
    status: pageStatus,
    loadMore,
  } = usePaginatedQuery(
    api.responses.listResponsesByForm,
    formReady ? { formId: convexFormId } : 'skip',
    { initialNumItems: 25 },
  )

  const responses = responseDocs.map(docToFormResponse)

  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    const formUrl = `${window.location.origin}/form/${formIdParam}`
    try {
      await navigator.clipboard.writeText(formUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = formUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const exportToCSV = async () => {
    if (!form) return
    setExporting(true)
    try {
      const rows = await convex.query(api.responses.getResponses, {
        formId: convexFormId,
      })
      const allResponses = rows.map(docToFormResponse)
      if (allResponses.length === 0) return

      const headers = ['Submission Date', ...form.fields.map((f) => f.label)]
      const rowsCsv = allResponses.map((response) => {
        const date = formatDate(response.submittedAt)
        const values = form.fields.map((field) => {
          const value = response.responses[field.id]
          if (Array.isArray(value)) {
            return value.join('; ')
          }
          if (value instanceof File) {
            return value.name
          }
          return value || ''
        })
        return [date, ...values]
      })

      const csvContent = [
        headers.join(','),
        ...rowsCsv.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
        ),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${form.title}_responses.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const quizMaxPoints = form
    ? form.fields
        .filter((f) => f.isQuiz)
        .reduce((sum, f) => sum + (f.points || 1), 0)
    : 0

  if (!userLoaded || isFormsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading responses...</p>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600 mb-4">
            The form you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const totalCount = stats?.count ?? 0
  const showQuizStats =
    form.isQuiz && stats && stats.count > 0 && quizMaxPoints > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/form/${formIdParam}`}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Form</span>
            </Link>
            <div className="flex items-center gap-3">
              {totalCount > 0 && (
                <button
                  onClick={() => void exportToCSV()}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting…' : 'Export CSV'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Share this Quiz</h3>
              <p className="text-xs text-gray-600">Students can take this quiz without logging in</p>
            </div>
            <div className="flex items-center gap-3 flex-1 min-w-[300px] max-w-md">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/form/${formIdParam}`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {form.title} - Responses
          </h1>
          <p className="text-gray-600 mb-4">
            {totalCount} response{totalCount !== 1 ? 's' : ''}
          </p>
          {showQuizStats && stats && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Quiz Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Average Score</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.averageScore}/{quizMaxPoints}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Average %</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.averagePercent}%</div>
                </div>
                <div>
                  <div className="text-gray-600">Highest Score</div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.highestScore}/{quizMaxPoints}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Lowest Score</div>
                  <div className="text-2xl font-bold text-red-600">
                    {stats.lowestScore}/{quizMaxPoints}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {pageStatus === 'LoadingFirstPage' && responses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading responses...</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No responses yet</h2>
            <p className="text-gray-600 mb-6">
              Share your form link with students to start collecting responses. Students can take the quiz without logging in.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy Share Link
                  </>
                )}
              </button>
              <Link
                href={`/form/${formIdParam}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Form
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {responses.map((response, index) => {
                const isExpanded = expandedIds.has(response.id)
                const essaysToGrade = Object.values(response.answers ?? {}).filter(
                  (a) => a?.needsGrading,
                ).length
                return (
                <div
                  key={response.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className={`flex items-start justify-between gap-4 ${isExpanded ? 'mb-4 pb-4 border-b border-gray-200' : ''}`}>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {response.studentName?.trim() || `Response #${index + 1}`}
                        {response.studentClass?.trim() && (
                          <span className="ml-2 text-sm font-normal text-gray-500">
                            {response.studentClass}
                          </span>
                        )}
                      </h3>
                      {form.isQuiz && response.score !== undefined && (
                        <div className="mt-1 text-sm">
                          <span className="font-medium text-gray-700">
                            Score: {response.score} / {response.maxScore || 0}
                          </span>
                          {response.maxScore && response.maxScore > 0 && (
                            <span className="text-gray-500 ml-2">
                              ({Math.round((response.score / response.maxScore) * 100)}%)
                            </span>
                          )}
                        </div>
                      )}
                      {form.isQuiz && !!response.tabSwitchCount && (
                        <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 inline-block">
                          ⚠ Auto-submitted — student left the quiz tab
                        </div>
                      )}
                      {form.isQuiz && !!response.pasteAttempts && (
                        <div className="mt-1 ml-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 inline-block">
                          ⚠ Tried to paste into an essay {response.pasteAttempts}×
                        </div>
                      )}
                      {essaysToGrade > 0 && (
                        <div className="mt-1 ml-1 text-xs text-yellow-800 bg-yellow-100 border border-yellow-300 rounded px-2 py-0.5 inline-block">
                          {essaysToGrade} essay{essaysToGrade !== 1 ? 's' : ''} to grade
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-sm text-gray-500">
                        {formatDate(response.submittedAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(response.id)}
                        aria-expanded={isExpanded}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        {isExpanded ? 'Hide answers' : 'Show answers'}
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                  <div className="space-y-4">
                    {form.fields.map((field) => {
                      if (field.type === 'textblock') return null

                      const value = response.responses[field.id]
                      const answerResult = response.answers?.[field.id]
                      const isCorrect = answerResult?.isCorrect

                      return (
                        <div
                          key={field.id}
                          className={`p-4 rounded-lg border-2 ${
                            field.type === 'essay'
                              ? answerResult?.needsGrading
                                ? 'bg-yellow-50 border-yellow-300'
                                : 'bg-green-50 border-green-300'
                              : field.isQuiz && answerResult
                                ? isCorrect
                                  ? 'bg-green-50 border-green-300'
                                  : 'bg-red-50 border-red-300'
                                : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <label className="block text-sm font-semibold text-gray-900">
                              <span className="text-gray-500 mr-1">{questionNumbers.get(field.id)}.</span>
                              {field.label}
                            </label>
                            {field.isQuiz && field.type !== 'essay' && answerResult && (
                              <span
                                className={`text-xs font-bold px-3 py-1 rounded-full ${
                                  isCorrect
                                    ? 'bg-green-200 text-green-800'
                                    : 'bg-red-200 text-red-800'
                                }`}
                              >
                                {isCorrect ? '✓ CORRECT' : '✗ INCORRECT'}
                                {answerResult.points !== undefined &&
                                  ` (${answerResult.points}/${field.points || 1} pts)`}
                              </span>
                            )}
                          </div>

                          <div className="mb-2">
                            <div className="text-sm text-gray-600 mb-1">Student&apos;s Answer:</div>
                            <div className="text-gray-900 font-medium">
                              {value === undefined || value === null || value === '' ? (
                                <span className="text-gray-400 italic">No response</span>
                              ) : field.type === 'essay' ? (
                                <p className="whitespace-pre-wrap font-normal">{String(value)}</p>
                              ) : Array.isArray(value) ? (
                                <ul className="list-disc list-inside space-y-1">
                                  {value.map((item, i) => {
                                    const isCorrectOption =
                                      field.isQuiz && field.correctAnswers?.includes(item)
                                    return (
                                      <li
                                        key={i}
                                        className={
                                          isCorrectOption ? 'text-green-700 font-bold' : 'text-red-700'
                                        }
                                      >
                                        {item}
                                        {isCorrectOption && ' ✓'}
                                      </li>
                                    )
                                  })}
                                </ul>
                              ) : value instanceof File ? (
                                <span className="text-blue-600">{value.name}</span>
                              ) : (
                                <span className={field.isQuiz && !isCorrect ? 'text-red-700' : ''}>
                                  {String(value)}
                                </span>
                              )}
                            </div>
                          </div>

                          {field.isQuiz &&
                            field.correctAnswers &&
                            field.correctAnswers.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-300">
                                <div className="text-sm font-semibold text-gray-700 mb-1">
                                  Correct Answer{field.correctAnswers.length > 1 ? 's' : ''}:
                                </div>
                                <div className="text-green-700 font-medium">
                                  {field.correctAnswers.join(', ')}
                                </div>
                              </div>
                            )}

                          {field.type === 'essay' && answerResult?.autoGraded && (
                            <div className="mt-3 pt-3 border-t border-gray-300 text-sm">
                              <div className="text-gray-700">
                                Keyword marking: {answerResult.points}/{field.points || 1} pts
                              </div>
                              {!!answerResult.matchedKeywords?.length && (
                                <div className="text-green-700">✓ Found: {answerResult.matchedKeywords.join(', ')}</div>
                              )}
                              {!!answerResult.missedKeywords?.length && (
                                <div className="text-red-700">✗ Missing: {answerResult.missedKeywords.join(', ')}</div>
                              )}
                            </div>
                          )}

                          {field.type === 'essay' && response.attachments?.[field.id] && (
                            <div className="mt-3 pt-3 border-t border-gray-300">
                              <AttachmentViewer storageId={response.attachments[field.id]} />
                            </div>
                          )}

                          {field.type === 'essay' && field.isQuiz && user?.id && (
                            <EssayGrader
                              responseId={response.id as Id<'responses'>}
                              fieldId={field.id}
                              maxPoints={field.points || 1}
                              currentPoints={answerResult?.points || 0}
                              needsGrading={answerResult ? !!answerResult.needsGrading : true}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  )}
                </div>
                )
              })}
            </div>

            {pageStatus === 'CanLoadMore' && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => loadMore(25)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Load more
                </button>
              </div>
            )}
            {pageStatus === 'LoadingMore' && (
              <div className="mt-4 text-center text-sm text-gray-600">Loading more…</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
