'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import {
  BarChart3,
  Check,
  Eye,
  FileText,
  ListChecks,
  NotebookPen,
  Share2,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { useStorage } from '@/lib/storage'
import { useShareLink } from '@/lib/useShareLink'

const ACTIONS = [
  {
    href: '/upload',
    icon: Upload,
    color: 'bg-green-100 text-green-700',
    title: 'Upload a document',
    body: 'Word or PDF with questions and answers — objective and essay.',
  },
  {
    href: '/essay-builder',
    icon: NotebookPen,
    color: 'bg-blue-100 text-blue-700',
    title: 'Build an essay exam',
    body: 'Write long-answer questions and set marking keywords.',
  },
  {
    href: '/builder',
    icon: ListChecks,
    color: 'bg-purple-100 text-purple-700',
    title: 'Build an objective quiz',
    body: 'Multiple choice, checkboxes, short answers and more.',
  },
]

// Tutor hub: /prepare is sign-in only (see middleware.ts)
export default function PreparePage() {
  const { user } = useUser()
  const storage = useStorage()
  const forms = storage.getAllForms()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const shareLink = useShareLink()

  const handleShare = async (formId: string) => {
    await shareLink(formId)
    setCopiedId(formId)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Delete "${title}" and all its responses? This can't be undone.`)) {
      await storage.deleteForm(id)
    }
  }

  const sorted = [...forms].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Prepare exams{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="mt-1 text-gray-600">Create a new exam, or share and review the ones you have.</p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 font-medium"
        >
          <BarChart3 className="w-4 h-4" />
          Results dashboard
        </Link>
      </div>

      {/* Create */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex gap-4 items-start bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition"
          >
            <span className={`shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg ${a.color}`}>
              <a.icon className="w-6 h-6" />
            </span>
            <span>
              <span className="block font-semibold text-gray-900 group-hover:text-blue-700">{a.title}</span>
              <span className="block mt-1 text-sm text-gray-600">{a.body}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* Existing exams */}
      <h2 className="mt-12 text-2xl font-bold text-gray-900">Your exams</h2>
      <p className="mt-1 text-sm text-gray-600">
        Sharing a link opens it for students for 5 minutes. Share again to reopen it.
      </p>

      {sorted.length === 0 ? (
        <div className="mt-6 bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto" />
          <p className="mt-3 font-medium text-gray-900">No exams yet</p>
          <p className="mt-1 text-sm text-gray-600">Start with one of the options above.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((form) => {
            const questionCount = form.fields.filter((f) => f.type !== 'textblock').length
            return (
              <div key={form.id} className="flex flex-col bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-900 break-words">{form.title}</h3>
                  {form.isQuiz && (
                    <span className="shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      Exam
                    </span>
                  )}
                </div>
                {form.description && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{form.description}</p>
                )}
                <p className="mt-3 text-xs text-gray-500">
                  {questionCount} question{questionCount !== 1 ? 's' : ''}
                  {form.timerMinutes ? ` · ${form.timerMinutes} min` : ''}
                  {' · '}
                  {new Date(form.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleShare(form.id)}
                    className="col-span-2 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium"
                  >
                    {copiedId === form.id ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    {copiedId === form.id ? 'Link copied — open for 5 min' : 'Share link'}
                  </button>
                  <Link
                    href={`/form/${form.id}/responses`}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                  >
                    <Users className="w-4 h-4" />
                    Responses
                  </Link>
                  <Link
                    href={`/form/${form.id}`}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(form.id, form.title)}
                    className="col-span-2 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
