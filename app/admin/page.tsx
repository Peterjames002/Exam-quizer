'use client'

import { useMemo, useState } from 'react'
import { Form } from '@/types/form'
import { useStorage } from '@/lib/storage'
import { Download, ArrowLeft, Share2, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { useConvex, usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { docToFormResponse } from '@/lib/mapConvexResponse'

export default function AdminDashboard() {
  const { user, isLoaded } = useUser()
  const storage = useStorage()
  const convex = useConvex()
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleCopyLink = async () => {
    if (!selectedFormId) return
    const formUrl = `${window.location.origin}/form/${selectedFormId}`
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

  const ownerFormsRaw = useQuery(
    api.forms.getAllForms,
    user?.id ? { userId: user.id } : 'skip',
  )
  const forms = storage.getAllForms()
  const quizForms: Form[] = forms?.filter((f) => f.isQuiz) || []
  const isOwnerFormsLoading = !!user?.id && ownerFormsRaw === undefined
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

      const headers = ['Name', 'Class', 'Score', 'Max Score', 'Percentage', 'Submitted At', 'Tab Switches']
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
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start md:items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Home</span>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Admin Dashboard</h1>
                <p className="text-sm text-gray-600">{user.emailAddresses[0]?.emailAddress}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {selectedFormId && (
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Copy shareable link"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Share Link
                    </>
                  )}
                </button>
              )}
              {selectedFormId && submissionTotal > 0 && (
                <button
                  onClick={() => void exportToCSV()}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting…' : 'Export CSV'}
                </button>
              )}
              <SignOutButton>
                <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Sign Out
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
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

        {selectedFormId && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-blue-50 border-b border-blue-200 p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Share this Quiz</h3>
                  <p className="text-xs text-gray-600">Students can take this quiz without logging in</p>
                </div>
                <div className="flex items-center gap-3 flex-1 min-w-[300px] max-w-md">
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
                        Copied!
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
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedForm?.title} - Results
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {submissionTotal} submission{submissionTotal !== 1 ? 's' : ''}
              </p>
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
                  Share the quiz link with students to start collecting responses
                </p>
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
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Class
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Max Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Percentage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Submitted At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Left Tab?
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {responses.map((response, index) => {
                        const percentage =
                          response.maxScore && response.maxScore > 0
                            ? Math.round(((response.score || 0) / response.maxScore) * 100)
                            : 0
                        const date = new Date(response.submittedAt).toLocaleString()

                        return (
                          <tr key={response.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                              {response.studentName || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                              {response.studentClass || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                              {response.score || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200">
                              {response.maxScore || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm border-r border-gray-200">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  percentage >= 80
                                    ? 'bg-green-100 text-green-800'
                                    : percentage >= 60
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {percentage}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                              {date}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {response.tabSwitchCount ? (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                  Yes — auto-submitted
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
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
