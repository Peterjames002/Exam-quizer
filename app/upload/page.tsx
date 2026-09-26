'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseDocument, parseAnswerKeyFromWord } from '@/lib/wordParser'
import { Form, FormField } from '@/types/form'
import { v4 as uuidv4 } from 'uuid'
import { useStorage } from '@/lib/storage'
import FieldEditor from '@/components/FieldEditor'
import { Upload, FileText, Save, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { agentDebugIngestJson } from '@/lib/agentDebugIngest'

export default function UploadPage() {
  const router = useRouter()
  const { user } = useUser()
  const storage = useStorage()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedFields, setParsedFields] = useState<FormField[]>([])
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [isQuiz, setIsQuiz] = useState(true)
  const [timerMinutes, setTimerMinutes] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [answerFile, setAnswerFile] = useState<File | null>(null)
  const [answerKeyApplied, setAnswerKeyApplied] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const lowerName = selectedFile.name.toLowerCase()

    const isWord =
      selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      selectedFile.type === 'application/msword' ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.doc')

    const isPdf =
      selectedFile.type === 'application/pdf' ||
      lowerName.endsWith('.pdf')

    if (isWord || isPdf) {
      setFile(selectedFile)
      setError(null)
      const nameWithoutExt = lowerName.replace(/\.(docx|doc|pdf)$/i, '')
      setFormTitle(nameWithoutExt)
    } else {
      setError('Please upload a Word or PDF document (.docx, .doc, .pdf)')
      setFile(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // #region agent log
      agentDebugIngestJson({
        location: 'app/upload/page.tsx:handleUpload',
        message: 'Handle upload started',
        data: {
          hasQuestionFile: !!file,
          questionFileName: file?.name,
          hasAnswerFile: !!answerFile,
          answerFileName: answerFile?.name,
        },
        hypothesisId: 'H2',
        runId: 'pre-fix',
      })
      // #endregion

      const fields = await parseDocument(file)
      // Auto-configure fields as quiz questions
      let quizFields = fields.map(field => {
        if (field.options && field.options.length > 0) {
          return {
            ...field,
            isQuiz: true,
            type: field.options.length === 4 ? 'radio' as const : field.type,
            points: field.points || 1
          }
        }
        return field
      })

      // If an answer key file is provided, apply it
      if (answerFile) {
        const answerMap = await parseAnswerKeyFromWord(answerFile)

        if (Object.keys(answerMap).length === 0) {
          setError('Could not read any answers from the answer file. Make sure it has an \"ANSWERS:\" heading and lines like \"1. C\".')
        } else {
          // #region agent log
          agentDebugIngestJson({
            location: 'app/upload/page.tsx:handleUpload',
            message: 'Non-empty answer map received',
            data: {
              answerCount: Object.keys(answerMap).length,
              sample: Object.entries(answerMap).slice(0, 5),
            },
            hypothesisId: 'H3',
            runId: 'pre-fix',
          })
          // #endregion

          quizFields = quizFields.map((field, index) => {
            const qNum = index + 1
            const letter = answerMap[qNum]
            if (!letter || !field.options || field.options.length === 0) return field

            const idx = letter.charCodeAt(0) - 'A'.charCodeAt(0)
            if (idx < 0 || idx >= field.options.length) return field

            const correctOption = field.options[idx]
            return {
              ...field,
              isQuiz: true,
              points: field.points || 1,
              correctAnswers: [correctOption]
            }
          })
          setAnswerKeyApplied(true)
        }
      }

      // #region agent log
      agentDebugIngestJson({
        location: 'app/upload/page.tsx:handleUpload',
        message: 'Quiz fields after processing answer key',
        data: {
          totalFields: quizFields.length,
          withOptions: quizFields.filter(f => (f as any).options && (f as any).options.length > 0).length,
          withCorrectAnswers: quizFields.filter(f => (f as any).correctAnswers && (f as any).correctAnswers.length > 0).length,
        },
        hypothesisId: 'H4',
        runId: 'pre-fix',
      })
      // #endregion

      setParsedFields(quizFields)
      setIsQuiz(true) // Auto-enable quiz mode
      setIsProcessing(false)
    } catch (err) {
      console.error(err)
      const lower = file.name.toLowerCase()
      if (lower.endsWith('.pdf')) {
        setError('Failed to parse PDF. Please make sure it is text-based (not scanned) and formatted with clear questions and options.')
      } else {
        setError('Failed to parse document. Please make sure it\'s a valid Word document.')
      }
      setIsProcessing(false)
    }
  }

  const updateField = (updatedField: FormField) => {
    setParsedFields(parsedFields.map(f => f.id === updatedField.id ? updatedField : f))
  }

  const deleteField = (id: string) => {
    setParsedFields(parsedFields.filter(f => f.id !== id))
  }

  const moveField = (id: string, direction: 'up' | 'down') => {
    const index = parsedFields.findIndex(f => f.id === id)
    if (index === -1) return

    if (direction === 'up' && index > 0) {
      const newFields = [...parsedFields]
      ;[newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]]
      setParsedFields(newFields)
    } else if (direction === 'down' && index < parsedFields.length - 1) {
      const newFields = [...parsedFields]
      ;[newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]]
      setParsedFields(newFields)
    }
  }

  const handleSave = async () => {
    if (!user) {
      setError('Please sign in to create forms')
      router.push('/sign-in')
      return
    }

    if (!formTitle.trim()) {
      setError('Please enter a form title')
      return
    }

    if (parsedFields.length === 0) {
      setError('Please upload and process a document first')
      return
    }

    setIsUploading(true)
    const form: Form = {
      id: uuidv4(),
      title: formTitle,
      description: formDescription,
      isQuiz,
      timerMinutes: isQuiz ? timerMinutes : undefined,
      fields: parsedFields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      const formId = await storage.saveForm(form)
      setIsUploading(false)
      router.push(`/form/${formId}`)
    } catch (error) {
      setIsUploading(false)
      setError('Please sign in to create forms')
      router.push('/sign-in')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            {parsedFields.length > 0 && (
              <button
                onClick={handleSave}
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isUploading ? 'Saving...' : 'Save Quiz'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {parsedFields.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                <Upload className="w-10 h-10 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Upload Quiz Document
              </h1>
              <p className="text-gray-600">
                Upload a Word document with objective (A, B, C, D) and essay questions — answers can be in the same document
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  accept=".docx,.doc,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <FileText className="w-12 h-12 text-gray-400 mb-4" />
                  <span className="text-gray-700 font-medium mb-1">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-sm text-gray-500">
                    Word or PDF documents (.docx, .doc, .pdf)
                  </span>
                </label>
              </div>

              <details className="mt-6 text-left bg-blue-50 border border-blue-200 rounded-lg p-4">
                <summary className="text-sm font-medium text-blue-900 cursor-pointer">
                  Put questions and answers in one document — format guide
                </summary>
                <p className="text-xs text-blue-900 mt-3 mb-2">
                  Write the answer under each question. No separate answer key file needed.
                </p>
                <pre className="text-xs bg-white border border-blue-100 rounded p-3 whitespace-pre-wrap text-gray-800">{`1. What is 2 + 2?
A) 3
B) 4
C) 5
D) 6
Answer: B

2. Explain how plants make their food.
Keywords: photosynthesis, chlorophyll, sunlight
Points: 10`}</pre>
                <ul className="text-xs text-blue-900 mt-2 space-y-1 list-disc list-inside">
                  <li><strong>Answer:</strong> gives the correct option for objective questions.</li>
                  <li><strong>Keywords:</strong> makes it an essay, auto-marked by how many keywords the student uses (close word forms count).</li>
                  <li><strong>Points:</strong> is optional (essays default to 5).</li>
                  <li>An <strong>ANSWER KEY</strong> section at the end (<code>1. B</code>, <code>2. C</code>…) also works.</li>
                </ul>
              </details>

              {/* Answer key upload (optional) */}
              <div className="mt-6 text-left">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Optional: Separate Answer Key (Word) — only if answers aren't in the document above
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Use a Word document with an <code>ANSWERS:</code> heading and lines like <code>1. C</code>, <code>2. A</code>.
                </p>
                <input
                  type="file"
                  id="answer-file-upload"
                  accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  onChange={(e) => setAnswerFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="answer-file-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer mt-1"
                >
                  <FileText className="w-4 h-4 text-gray-500" />
                  {answerFile ? answerFile.name : 'Choose answer key file (optional)'}
                </label>
              </div>

              {file && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || isProcessing}
                className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Process Document
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-semibold"
                  placeholder="Enter quiz title"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quiz Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter quiz description (optional)"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="isQuiz"
                  checked={isQuiz}
                  onChange={(e) => setIsQuiz(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isQuiz" className="text-sm font-semibold text-gray-900 cursor-pointer">
                  ✓ Quiz Mode Enabled (allows setting correct answers and automatic scoring)
                </label>
              </div>
              {isQuiz && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quiz Timer (minutes) - Optional
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={timerMinutes || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      setTimerMinutes(value ? parseInt(value) : undefined)
                    }}
                    placeholder="e.g., 30 (leave empty for no timer)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {timerMinutes && (
                    <p className="mt-1 text-sm text-gray-600">
                      Quiz will auto-submit after {timerMinutes} minute{timerMinutes !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>

            {parsedFields.length > 0 && isQuiz && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiz Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Total Questions</div>
                    <div className="text-2xl font-bold text-blue-600">{parsedFields.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Quiz Questions</div>
                    <div className="text-2xl font-bold text-green-600">
                      {parsedFields.filter(f => f.isQuiz).length}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">With Answers</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {parsedFields.filter(f => f.correctAnswers && f.correctAnswers.length > 0).length}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Points</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {parsedFields.reduce((sum, f) => sum + (f.points || 0), 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {parsedFields.length > 0 && isQuiz && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setParsedFields(parsedFields.map(f => ({
                        ...f,
                        isQuiz: true,
                        type: f.options && f.options.length > 0 ? 'radio' as const : f.type,
                        points: f.points || 1
                      })))
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
                  >
                    Mark All as Quiz Questions
                  </button>
                  <button
                    onClick={() => {
                      setParsedFields(parsedFields.map(f => ({
                        ...f,
                        points: f.isQuiz ? 1 : f.points
                      })))
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm transition-colors"
                  >
                    Set All Points to 1
                  </button>
                  <button
                    onClick={() => {
                      setParsedFields(parsedFields.map(f => ({
                        ...f,
                        type: f.options && f.options.length > 0 ? 'radio' as const : f.type
                      })))
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-colors"
                  >
                    Convert to Radio
                  </button>
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Parsed Fields ({parsedFields.length})
                </h2>
                <button
                  onClick={() => {
                    setParsedFields([])
                    setFile(null)
                    setFormTitle('')
                    setFormDescription('')
                    setIsQuiz(true)
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Upload Another Document
                </button>
              </div>

              <div className="space-y-4">
                {parsedFields.map((field, index) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    onUpdate={updateField}
                    onDelete={deleteField}
                    onMove={moveField}
                    canMoveUp={index > 0}
                    canMoveDown={index < parsedFields.length - 1}
                    questionNumber={
                      field.type === 'textblock'
                        ? undefined
                        : parsedFields.slice(0, index + 1).filter(f => f.type !== 'textblock').length
                    }
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
