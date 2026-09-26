'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Form, FormResponse } from '@/types/form'
import { useStorage } from '@/lib/storage'
import FieldRenderer from '@/components/FieldRenderer'
import { ArrowLeft, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { v4 as uuidv4 } from 'uuid'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { agentDebugIngestJson } from '@/lib/agentDebugIngest'

export default function FormViewPage() {
  const params = useParams()
  const router = useRouter()
  const formId = params.id as string
  const storage = useStorage()
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [attachments, setAttachments] = useState<Record<string, File>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [showQuiz, setShowQuiz] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null) // in seconds
  const [timerStarted, setTimerStarted] = useState(false)
  const [isTimerExpired, setIsTimerExpired] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [autoSubmitReason, setAutoSubmitReason] = useState<'timer' | 'tab-switch' | null>(null)
  const hasAutoSubmittedRef = useRef(false)

  // "Preview" opens a form/[id] tab without ever saving to the database — the
  // in-progress fields are handed over via sessionStorage instead of a real ID
  const isPreview = formId?.startsWith('preview-') ?? false
  const [previewForm, setPreviewForm] = useState<Form | null>(null)

  useEffect(() => {
    if (!isPreview) return
    try {
      const raw = sessionStorage.getItem('quiz-preview')
      if (raw) setPreviewForm(JSON.parse(raw))
    } catch (err) {
      console.error('Failed to load preview form', err)
    }
  }, [isPreview])

  // Try to get form from user's forms first (if signed in)
  const userForm = storage.getForm(formId)

  // Use public form query as fallback (for public viewing)
  // Only query if formId looks like a valid Convex ID and we don't have it from user's forms
  const shouldQueryPublic = !userForm && !isPreview && formId && formId.length > 10
  const convexForm = useQuery(
    api.forms.getForm,
    shouldQueryPublic ? { id: formId as Id<"forms"> } : "skip"
  )

  const form = userForm || previewForm || (convexForm ? {
    id: convexForm._id,
    title: convexForm.title,
    description: convexForm.description,
    isQuiz: convexForm.isQuiz,
    timerMinutes: convexForm.timerMinutes,
    fields: convexForm.fields,
    createdAt: convexForm.createdAt,
    updatedAt: convexForm.updatedAt,
  } : null)

  const isLoading = isPreview ? !previewForm : (!userForm && convexForm === undefined)

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

  useEffect(() => {
    // #region agent log
    agentDebugIngestJson({location:'app/form/[id]/page.tsx:51',message:'useEffect triggered',data:{hasForm:!!form,formIsQuiz:form?.isQuiz,showQuiz,studentName,studentClass},runId:'run1',hypothesisId:'A'});
    // #endregion
    if (form) {
      // If it's a quiz, don't show it until name/class are entered
      // Only set to false if showQuiz hasn't been explicitly set to true by user
      if (form.isQuiz && !showQuiz) {
        // #region agent log
        agentDebugIngestJson({location:'app/form/[id]/page.tsx:55',message:'Setting showQuiz to false (isQuiz, initial)',data:{formIsQuiz:form.isQuiz,showQuiz},runId:'run1',hypothesisId:'A'});
        // #endregion
        setShowQuiz(false)
      } else if (!form.isQuiz) {
        // #region agent log
        agentDebugIngestJson({location:'app/form/[id]/page.tsx:58',message:'Setting showQuiz to true (not quiz)',data:{formIsQuiz:form.isQuiz},runId:'run1',hypothesisId:'A'});
        // #endregion
        setShowQuiz(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  // Timer initialization - start timer when quiz begins
  useEffect(() => {
    if (!form?.isQuiz || !form?.timerMinutes || !showQuiz || timerStarted || isTimerExpired) {
      return
    }

    // Initialize timer when quiz starts
    if (!timerStarted && showQuiz) {
      const totalSeconds = form.timerMinutes * 60
      setTimeRemaining(totalSeconds)
      setTimerStarted(true)
    }
  }, [form, showQuiz, timerStarted, isTimerExpired])

  // Timer countdown logic
  useEffect(() => {
    if (!timerStarted || timeRemaining === null || timeRemaining <= 0 || isTimerExpired) {
      return
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          setIsTimerExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timerStarted, timeRemaining, isTimerExpired])

  // Uploads any staged essay attachments to Convex storage and returns a
  // fieldId -> storageId map to save alongside the response.
  const uploadStagedAttachments = async (): Promise<Record<string, string>> => {
    const result: Record<string, string> = {}
    for (const [fieldId, file] of Object.entries(attachments)) {
      try {
        result[fieldId] = await storage.uploadFile(file)
      } catch (err) {
        console.error('Failed to upload attachment for field', fieldId, err)
      }
    }
    return result
  }

  // Shared auto-submit path used by both the timer and the tab-switch guard below.
  // Guarded with a ref (not state) so a second trigger firing before state updates
  // land can't cause a double submission.
  const submitQuiz = async (reason: 'timer' | 'tab-switch', finalTabSwitchCount: number) => {
    if (!form || hasAutoSubmittedRef.current) return
    hasAutoSubmittedRef.current = true
    setAutoSubmitReason(reason)
    setIsSubmitting(true)

    const uploadedAttachments = isPreview ? {} : await uploadStagedAttachments()

    const formResponse: FormResponse = {
      id: uuidv4(),
      formId: form.id,
      responses,
      submittedAt: new Date().toISOString(),
      studentName: form.isQuiz ? studentName.trim() : undefined,
      studentClass: form.isQuiz ? studentClass.trim() : undefined,
      tabSwitchCount: form.isQuiz ? finalTabSwitchCount : undefined,
      attachments: Object.keys(uploadedAttachments).length > 0 ? uploadedAttachments : undefined,
    }

    // Preview submissions are never persisted — nothing real to save them against
    if (!isPreview) {
      await storage.saveResponse(formResponse)
    }
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  // Leaving the quiz tab (switching tabs, minimizing, switching apps) immediately
  // auto-submits the quiz as-is. Browsers have no API to actually block a new tab
  // from opening — this is detection-and-react, not prevention.
  useEffect(() => {
    if (!form?.isQuiz || !showQuiz || isSubmitted) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newCount = tabSwitchCount + 1
        setTabSwitchCount(newCount)
        submitQuiz('tab-switch', newCount)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, showQuiz, isSubmitted, tabSwitchCount, responses, studentName, studentClass, attachments])

  // Auto-submit when timer expires
  useEffect(() => {
    if (isTimerExpired && !isSubmitted && !isSubmitting && form && showQuiz) {
      submitQuiz('timer', tabSwitchCount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerExpired, isSubmitted, isSubmitting, form, showQuiz, responses, studentName, studentClass, tabSwitchCount, attachments])

  // Helper function to format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleFieldChange = (fieldId: string, value: any) => {
    setResponses({ ...responses, [fieldId]: value })
  }

  const handleAttachmentChange = (fieldId: string, file: File | null) => {
    setAttachments((prev) => {
      const next = { ...prev }
      if (file) {
        next[fieldId] = file
      } else {
        delete next[fieldId]
      }
      return next
    })
  }

  // Deter (not prevent — browsers offer no way to truly block this) copying
  // quiz questions while the quiz is in progress
  const blockCopyDuringQuiz = (e: React.ClipboardEvent | React.MouseEvent) => {
    if (form?.isQuiz) {
      e.preventDefault()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form || hasAutoSubmittedRef.current) return

    // Validate required fields
    const missingFields = form.fields
      .filter(field => field.required && !responses[field.id])
      .map(field => field.label)

    if (missingFields.length > 0) {
      alert(`Please fill in the following required fields:\n${missingFields.join('\n')}`)
      return
    }

    hasAutoSubmittedRef.current = true
    setIsSubmitting(true)

    const uploadedAttachments = isPreview ? {} : await uploadStagedAttachments()

    const formResponse: FormResponse = {
      id: uuidv4(),
      formId: form.id,
      responses,
      submittedAt: new Date().toISOString(),
      studentName: form.isQuiz ? studentName.trim() : undefined,
      studentClass: form.isQuiz ? studentClass.trim() : undefined,
      tabSwitchCount: form.isQuiz ? tabSwitchCount : undefined,
      attachments: Object.keys(uploadedAttachments).length > 0 ? uploadedAttachments : undefined,
    }

    // Preview submissions are never persisted — nothing real to save them against
    if (!isPreview) {
      await storage.saveResponse(formResponse)
    }
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600 mb-4">The form you're looking for doesn't exist.</p>
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

  if (isSubmitted && form) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Link
              href="/forms"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Forms</span>
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 mb-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Form Submitted Successfully!
              </h1>
              {autoSubmitReason === 'tab-switch' && (
                <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm mb-2">
                  This quiz was automatically submitted because you left the quiz tab.
                </p>
              )}
              {autoSubmitReason === 'timer' && (
                <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm mb-2">
                  Time&apos;s up! This quiz was automatically submitted.
                </p>
              )}
              {form.isQuiz && (
                <p className="text-gray-600 mt-2">
                  Your answers have been sent to your tutor. Results will be shared by your tutor.
                </p>
              )}
            </div>
            {!form.isQuiz && (
              <p className="text-gray-600 text-center mb-6">
                Thank you for your response. Your submission has been recorded.
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Home
              </Link>
            </div>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/forms"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Forms</span>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {isPreview && (
          <div className="mb-6 px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 text-sm rounded-lg text-center">
            Preview mode — nothing you submit here is saved
          </div>
        )}
        {!showQuiz && form.isQuiz && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="student-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  id="student-name"
                  name="student-name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <label htmlFor="student-class" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Class *
                </label>
                <input
                  type="text"
                  id="student-class"
                  name="student-class"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your class"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  // #region agent log
                  agentDebugIngestJson({location:'app/form/[id]/page.tsx:329',message:'Start Quiz button clicked',data:{studentName:studentName.trim(),studentClass:studentClass.trim(),hasName:!!studentName.trim(),hasClass:!!studentClass.trim(),formIsQuiz:form?.isQuiz,showQuiz},runId:'run1',hypothesisId:'A'});
                  // #endregion
                  if (studentName.trim() && studentClass.trim()) {
                    // #region agent log
                    agentDebugIngestJson({location:'app/form/[id]/page.tsx:332',message:'Setting showQuiz to true',data:{studentName:studentName.trim(),studentClass:studentClass.trim()},runId:'run1',hypothesisId:'A'});
                    // #endregion
                    setShowQuiz(true)
                  } else {
                    alert('Please enter your name and class')
                  }
                }}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start Quiz
              </button>
            </div>
          </div>
        )}

        {showQuiz && (
          <form
            onSubmit={handleSubmit}
            onCopy={blockCopyDuringQuiz}
            onCut={blockCopyDuringQuiz}
            onContextMenu={blockCopyDuringQuiz}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 p-8 ${
              form.isQuiz ? 'select-none' : ''
            }`}
          >
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  {form.title}
                </h1>
                {form.isQuiz && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    Quiz
                  </span>
                )}
              </div>
              {form.description && (
                <p className="text-gray-600 text-lg">
                  {form.description}
                </p>
              )}
            </div>

            {form.timerMinutes && showQuiz && timeRemaining !== null && (
              <div className={`mb-6 p-4 rounded-lg border-2 ${
                timeRemaining <= 60 
                  ? 'bg-red-50 border-red-300' 
                  : timeRemaining <= 300 
                  ? 'bg-yellow-50 border-yellow-300' 
                  : 'bg-blue-50 border-blue-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-5 h-5 ${
                      timeRemaining <= 60 
                        ? 'text-red-600' 
                        : timeRemaining <= 300 
                        ? 'text-yellow-600' 
                        : 'text-blue-600'
                    }`} />
                    <span className={`font-semibold ${
                      timeRemaining <= 60 
                        ? 'text-red-700' 
                        : timeRemaining <= 300 
                        ? 'text-yellow-700' 
                        : 'text-blue-700'
                    }`}>
                      Time Remaining: {formatTime(timeRemaining)}
                    </span>
                  </div>
                  {timeRemaining <= 60 && (
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Less than 1 minute left!</span>
                    </div>
                  )}
                </div>
                {isTimerExpired && (
                  <div className="mt-2 text-sm text-red-700 font-medium">
                    Time's up! Submitting your quiz...
                  </div>
                )}
              </div>
            )}

            <div className="space-y-6">
              {form.fields.map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={responses[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                  questionNumber={questionNumbers.get(field.id)}
                  onAttachmentSelect={(file) => handleAttachmentChange(field.id, file)}
                  attachmentFileName={attachments[field.id]?.name}
                />
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Form
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
