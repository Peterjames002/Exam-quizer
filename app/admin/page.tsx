'use client'

import { useMemo, useState } from 'react'
import { Form } from '@/types/form'
import { useStorage } from '@/lib/storage'
import { Download, ArrowLeft, Share2, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useConvex, useConvexAuth, usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { docToFormResponse } from '@/lib/mapConvexResponse'
import { useShareLink } from '@/lib/useShareLink'
import CameraPhoto from '@/components/CameraPhoto'

export default function AdminDashboard() {
  const { user, isLoaded } = useUser()
  const { isAuthenticated: isConvexAuthed } = useConvexAuth()
  const storage = useStorage()
  const convex = useConvex()
  const [pickedFormId, setSelectedFormId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const shareLink = useShareLink()
  const handleCopyLink = async () => {
    if (!selectedFormId) return
    await shareLink(selectedFormId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const ownerFormsRaw = useQuery(
    api.forms.getAllForms,
    isConvexAuthed ? {} : 'skip',
  )
  const forms = storage.getAllForms()
  const quizForms: Form[] = forms?.filter((f) => f.isQuiz) || []
  // Show the first exam straight away until the tutor picks another
  const selectedFormId = pickedFormId ?? quizForms[0]?.id ?? null
  const isOwnerFormsLoading = !!user?.id && (!isConvexAuthed || ownerFormsRaw === undefined)
  const selectedForm = selectedFormId ? quizForms.find((f) => f.id === selectedFormId) : null

  const formIdsConvex = useMemo(
    () => quizForms.map((f) => f.id as Id<'forms'>),
    [quizForms],
  )

  const statsForGrid = useQuery(
    api.responses.getResponseStatsForForms,
    user && formIdsConvex.length > 0 ? { formIds: formIdsConvex } : 'skip',
  )

  const countByFormId = useMemo(() => {
    const m = new Map<string, number>()
    if (!statsForGrid) return m
    for (const row of statsForGrid) {
      m.set(row.formId, row.count)
    }
    return m
  }, [statsForGrid])

  const statsSelected = useQuery(
    api.responses.getResponseStats,
    selectedFormId ? { formId: selectedFormId as Id<'forms'> } : 'skip',
  )

  const {
    results: selectedResponseDocs,
    status: pageStatus,
    loadMore,
  } = usePaginatedQuery(
    api.responses.listResponsesByForm,
    selectedFormId ? { formId: selectedFormId as Id<'forms'> } : 'skip',
    { initialNumItems: 50 },
  )

  const responses = selectedResponseDocs.map(docToFormResponse)
  const submissionTotal = statsSelected?.count ?? responses.length

  const exportToCSV = async () => {
    if (!selectedForm || !selectedFormId) return
    setExporting(true)
    try {
      const rows = await convex.query(api.responses.getResponses, {
        formId: selectedFormId as Id<'forms'>,
      })
      const allResponses = rows.map(docToFormResponse)
      if (allResponses.length === 0) return

      const headers = ['Name', 'Matric No.', 'Score', 'Max Score', 'Percentage', 'Submitted At', 'Tab Switches']
      const csvRows = allResponses.map((response) => {
        const percentage =
          response.maxScore && response.maxScore > 0
            ? Math.round(((response.score || 0) / response.maxScore) * 100)
            : 0
        const date = new Date(response.submittedAt).toLocaleString()

        return [
          response.studentName || 'N/A',
          response.studentClass || 'N/A',
          response.score || 0,
          response.maxScore || 0,
          `${percentage}%`,
          date,
          response.tabSwitchCount || 0,
        ]
      })

      const csvContent = [
        headers.join(','),
        ...csvRows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
        ),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedForm?.title || 'quiz'}_results.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-6">
            Please sign in to access your admin dashboard
          </p>
          <Link
            href="/sign-in"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/prepare"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Prepare Exams</span>
          </Link>
          {selectedFormId && (
            <div className="flex w-full sm:w-auto gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                title="Copy shareable link (opens it for 5 minutes)"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copied ? 'Copied — open 5 min' : 'Share link'}
              </button>
              {submissionTotal > 0 && (
                <button
                  onClick={() => void exportToCSV()}
                  disabled={exporting}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting…' : 'Export CSV'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 mb-6 text-gray-600">Pick an exam to see each student&apos;s score, flags and camera snapshots.</p>

        {!isOwnerFormsLoading && quizForms.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <p className="font-medium text-gray-900">No exams yet</p>
            <p className="mt-1 text-sm text-gray-600">Create an exam first — its results will appear here.</p>
            <Link
              href="/prepare"
              className="mt-4 inline-flex items-center px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Prepare Exams
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quizForms.map((form) => {
            const formId = form.id
            const submissionCount = countByFormId.get(String(formId)) ?? 0
            return (
              <button
                key={String(formId)}
                onClick={() => setSelectedFormId(formId)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedFormId === formId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <h3 className="font-semibold text-gray-900 mb-1">{form.title}</h3>
                <p className="text-sm text-gray-600">
                  {submissionCount} submission{submissionCount !== 1 ? 's' : ''}
                </p>
              </button>
            )
          })}
        </div>

        {!selectedFormId && quizForms.length > 0 && (
          <p className="text-center text-gray-500 py-8">Select an exam above to see its results.</p>
        )}

        {selectedFormId && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 border-b border-blue-200 p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Share this exam</h3>
                  <p className="text-xs text-gray-600">Students don&apos;t need an account. Copying opens the link for 5 minutes.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:max-w-md">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/form/${selectedFormId}`}
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
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 break-words">{selectedForm?.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {submissionTotal} submission{submissionTotal !== 1 ? 's' : ''}
                  </p>
                </div>
                <Link
                  href={`/form/${selectedFormId}/responses`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  View answers, photos &amp; essay marking →
                </Link>
              </div>
            </div>

            {isOwnerFormsLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading responses...</p>
              </div>
            ) : pageStatus === 'LoadingFirstPage' && responses.length === 0 ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading responses...</p>
              </div>
            ) : submissionTotal === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-600 mb-4">No submissions yet</p>
                <p className="text-sm text-gray-500 mb-4">
                  Share the exam link with students to start collecting responses
                </p>
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      Copied — open 5 min
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy Share Link
                    </>
                  )}
                </button>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-gray-200">
                  {responses.map((response, index) => {
                    const percentage =
                      response.maxScore && response.maxScore > 0
                        ? Math.round(((response.score || 0) / response.maxScore) * 100)
                        : 0
                    const essaysToGrade = Object.values(response.answers ?? {}).filter((a) => a?.needsGrading).length
                    const cameraProblem =
                      response.cameraStatus === 'blocked' || response.cameraStatus === 'unavailable'
                    const photos = response.cameraPhotos ?? []
                    return (
                      <li key={response.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex items-start gap-3 lg:w-72 shrink-0">
                          <span className="mt-0.5 text-sm text-gray-400 w-6 text-right">{index + 1}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 break-words">{response.studentName || 'Unnamed student'}</p>
                            <p className="text-sm text-gray-500">Matric No. {response.studentClass || 'N/A'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(response.submittedAt).toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 lg:w-40 shrink-0 pl-9 lg:pl-0">
                          <span className="text-lg font-bold text-gray-900">
                            {response.score || 0}
                            <span className="text-sm font-normal text-gray-500"> / {response.maxScore || 0}</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              percentage >= 80
                                ? 'bg-green-100 text-green-800'
                                : percentage >= 60
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {percentage}%
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 flex-1 pl-9 lg:pl-0">
                          {!!response.tabSwitchCount && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Left the exam tab</span>
                          )}
                          {!!response.pasteAttempts && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Tried to paste {response.pasteAttempts}×</span>
                          )}
                          {cameraProblem && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {response.cameraStatus === 'blocked' ? 'Camera blocked' : 'No camera'}
                            </span>
                          )}
                          {essaysToGrade > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {essaysToGrade} essay{essaysToGrade !== 1 ? 's' : ''} to grade
                            </span>
                          )}
                          {!response.tabSwitchCount && !response.pasteAttempts && !cameraProblem && essaysToGrade === 0 && (
                            <span className="text-xs text-gray-400">No flags</span>
                          )}
                        </div>

                        <div className="flex gap-2 pl-9 lg:pl-0">
                          {photos.length > 0 ? (
                            photos.map((photoId, i) => (
                              <CameraPhoto
                                key={photoId}
                                storageId={photoId}
                                size="w-20"
                                label={`Snapshot ${i + 1} of ${response.studentName || 'student'}`}
                              />
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">{cameraProblem ? 'No snapshots' : 'No snapshots yet'}</span>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {pageStatus === 'CanLoadMore' && (
                  <div className="p-4 flex justify-center border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => loadMore(50)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Load more
                    </button>
                  </div>
                )}
                {pageStatus === 'LoadingMore' && (
                  <div className="p-4 text-center text-sm text-gray-600">Loading more…</div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
