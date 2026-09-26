'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, NotebookPen, Upload, Lock, Trash2, Eye, Share2, Copy, Check, ShieldCheck, BarChart3, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs'
import { useStorage } from '@/lib/storage'
import { Form } from '@/types/form'
import { agentDebugIngestJson } from '@/lib/agentDebugIngest'
import { useShareLink } from '@/lib/useShareLink'

export default function Home() {
  const router = useRouter()
  const { isSignedIn, user, isLoaded } = useUser()
  const storage = useStorage()
  
  // #region agent log
  useEffect(() => {
    agentDebugIngestJson({location:'app/page.tsx:16',message:'Clerk useUser hook result',data:{isLoaded,isSignedIn,hasUser:!!user,userId:user?.id || 'NONE',userEmail:user?.emailAddresses?.[0]?.emailAddress || 'NONE'},runId:'run1',hypothesisId:'B'})
    
    // Track Clerk script loading errors
    window.addEventListener('error', (event) => {
      if (event.message && event.message.includes('clerk')) {
        agentDebugIngestJson({location:'app/page.tsx:22',message:'Clerk script loading error detected',data:{errorMessage:event.message,errorSource:event.filename || 'NONE',errorLine:event.lineno || 'NONE',errorCol:event.colno || 'NONE'},runId:'run1',hypothesisId:'E'})
      }
    }, true)
  }, [isLoaded, isSignedIn, user])
  // #endregion
  const forms = storage.getAllForms()
  const isLoading = forms === undefined
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this form?')) {
      await storage.deleteForm(id)
    }
  }

  const shareLink = useShareLink()
  const handleShare = async (formId: string) => {
    await shareLink(formId)
    setCopiedFormId(formId)
    setTimeout(() => setCopiedFormId(null), 2000)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header with Auth */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div className="text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2">
              Quiz Builder
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">
              Create objective or essay-based quizzes for any subject. Upload Word documents with 50+ questions or write essay questions manually.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 flex-wrap">
            {isLoaded && (
              isSignedIn ? (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className="text-sm text-gray-600 hidden md:block">
                    {user?.emailAddresses[0]?.emailAddress}
                  </span>
                  <UserButton />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {/* #region agent log */}
                  <Link 
                    href="/sign-in"
                    onClick={() => {
                      agentDebugIngestJson({location:'app/page.tsx:92',message:'Sign-in link clicked',data:{clerkPublishableKey:process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0,20) || 'MISSING',isLoaded,isSignedIn},runId:'run1',hypothesisId:'A'})
                    }}
                  >
                    <button className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium">
                      Sign In
                    </button>
                  </Link>
                  {/* #endregion */}
                  <Link href="/sign-up">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                      Sign Up
                    </button>
                  </Link>
                </div>
              )
            )}
          </div>
        </div>

        {!isLoaded ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : !isSignedIn ? (
          <LandingContent />
        ) : (
        <>
        <div className="w-full max-w-4xl mx-auto grid gap-4 sm:grid-cols-2">
          <Link
            href="/essay-builder"
            className="group bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="flex flex-col items-center text-center">
              <div className="bg-blue-100 rounded-full p-4 mb-4 group-hover:bg-blue-200 transition-colors">
                <NotebookPen className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Essay Builder
              </h2>
              <p className="text-gray-600">
                Write essay/long-answer questions for any subject — Physics, Maths, and more. Students type answers, you grade manually
              </p>
            </div>
          </Link>

          <Link
            href="/upload"
            className="group bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="flex flex-col items-center text-center">
              <div className="bg-green-100 rounded-full p-4 mb-4 group-hover:bg-green-200 transition-colors">
                <Upload className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Upload Quiz Document
              </h2>
              <p className="text-gray-600">
                Upload a Word document with objective questions (A, B, C, D) and we'll automatically build your quiz
              </p>
            </div>
          </Link>
        </div>

        {/* Forms List */}
        <div className="max-w-6xl mx-auto mt-12 px-2 sm:px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Your Forms</h2>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                <Lock className="w-5 h-5" />
                Admin Dashboard
              </Link>
            </div>

            {isLoading ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading forms...</p>
              </div>
            ) : !forms || forms.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No forms yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started by creating your first form using the options above
                </p>
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
                      {form.isQuiz && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          Quiz
                        </span>
                      )}
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
        </>
        )}
      </div>
    </div>
  )
}

function LandingContent() {
  const features = [
    {
      icon: NotebookPen,
      color: 'blue',
      title: 'Essay Questions',
      description:
        'Students type answers, draw calculations/diagrams right in the browser, or attach a photo of handwritten work. You grade each one manually.',
    },
    {
      icon: Upload,
      color: 'green',
      title: 'Import from Word or PDF',
      description:
        'Upload a document with 50+ objective questions (A, B, C, D) and the quiz builds itself — no manual entry.',
    },
    {
      icon: ShieldCheck,
      color: 'purple',
      title: 'Built-in Anti-Cheat',
      description:
        'Copying questions is blocked, and switching tabs during a quiz auto-submits it — no browser extensions required.',
    },
    {
      icon: BarChart3,
      color: 'orange',
      title: 'Instant Grading & Stats',
      description:
        'Objective questions grade themselves the moment a student submits. Export results to CSV anytime.',
    },
  ]

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  }

  return (
    <div className="mt-4">
      {/* Primary CTA */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/sign-up">
            <button className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg transition-colors">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <Link href="/sign-in">
            <button className="px-8 py-3 text-gray-700 hover:text-gray-900 font-medium text-lg">
              Sign In
            </button>
          </Link>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${colorClasses[feature.color]}`}>
              <feature.icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold mb-3">
              1
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Build your quiz</h3>
            <p className="text-sm text-gray-600">Write it manually or upload a Word/PDF document</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold mb-3">
              2
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Share the link</h3>
            <p className="text-sm text-gray-600">Students take it in the browser — no account needed</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold mb-3">
              3
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Review results</h3>
            <p className="text-sm text-gray-600">Objective questions auto-grade; essays you grade yourself</p>
          </div>
        </div>
      </div>

      {/* Closing CTA */}
      <div className="text-center pb-4">
        <p className="text-gray-600 mb-4">Free to use, set up in minutes.</p>
        <Link href="/sign-up">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Create Your First Quiz
          </button>
        </Link>
      </div>
    </div>
  )
}
