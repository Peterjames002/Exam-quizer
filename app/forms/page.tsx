'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form } from '@/types/form'
import { useStorage } from '@/lib/storage'
import { FileText, Plus, Trash2, Eye, ArrowLeft, Share2, Check } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'

export default function FormsPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const storage = useStorage()
  const forms = storage.getAllForms()
  const isLoading = forms === undefined
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null)

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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Sign In Required
          </h1>
          <p className="text-gray-600 mb-6">
            Please sign in to view your forms
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

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this form?')) {
      await storage.deleteForm(id)
    }
  }

  const handleShare = async (formId: string) => {
    const formUrl = `${window.location.origin}/form/${formId}`
    try {
      await navigator.clipboard.writeText(formUrl)
      setCopiedFormId(formId)
      setTimeout(() => setCopiedFormId(null), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = formUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedFormId(formId)
      setTimeout(() => setCopiedFormId(null), 2000)
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading forms...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/builder"
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create New Form
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Forms</h1>
          <p className="text-gray-600">
            Manage and view all your created forms
          </p>
        </div>

        {forms.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No forms yet
            </h2>
            <p className="text-gray-600 mb-6">
              Get started by creating your first form
            </p>
            <Link
              href="/builder"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Form
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div
                key={form.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {form.title}
                    </h3>
                    {form.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {form.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <FileText className="w-4 h-4" />
                  <span>{form.fields.length} field{form.fields.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  Created: {formatDate(form.createdAt)}
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/form/${form.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Link>
                  <button
                    onClick={() => handleShare(form.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    title="Copy shareable link"
                  >
                    {copiedFormId === form.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>
                  <Link
                    href={`/form/${form.id}/responses`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Responses
                  </Link>
                  <button
                    onClick={() => handleDelete(form.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
