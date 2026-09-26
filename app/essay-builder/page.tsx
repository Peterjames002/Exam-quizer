'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, FormField, FieldType } from '@/types/form'
import { v4 as uuidv4 } from 'uuid'
import FieldEditor from '@/components/FieldEditor'
import { Plus, Save, Eye, ArrowLeft } from 'lucide-react'
import { useStorage } from '@/lib/storage'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'

export default function EssayBuilderPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const storage = useStorage()
  const [formTitle, setFormTitle] = useState('Untitled Essay Exam')
  const [formDescription, setFormDescription] = useState('')
  const [timerMinutes, setTimerMinutes] = useState<number | undefined>(undefined)
  const [fields, setFields] = useState<FormField[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const addField = (type: FieldType = 'essay') => {
    const newField: FormField = {
      id: uuidv4(),
      type,
      label: type === 'textblock' ? '' : 'New Essay Question',
      required: type !== 'textblock',
      isQuiz: type !== 'textblock',
      points: type === 'essay' ? 5 : undefined,
    }
    setFields([...fields, newField])
  }

  const updateField = (updatedField: FormField) => {
    setFields(fields.map(f => f.id === updatedField.id ? updatedField : f))
  }

  const deleteField = (id: string) => {
    setFields(fields.filter(f => f.id !== id))
  }

  const moveField = (id: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(f => f.id === id)
    if (index === -1) return

    if (direction === 'up' && index > 0) {
      const newFields = [...fields]
      ;[newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]]
      setFields(newFields)
    } else if (direction === 'down' && index < fields.length - 1) {
      const newFields = [...fields]
      ;[newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]]
      setFields(newFields)
    }
  }

  const handleSave = async () => {
    if (!user) {
      alert('Please sign in to create quizzes')
      router.push('/sign-in')
      return
    }

    if (!formTitle.trim()) {
      alert('Please enter a quiz title')
      return
    }

    setIsSaving(true)
    const form: Form = {
      id: uuidv4(),
      title: formTitle,
      description: formDescription,
      isQuiz: true,
      timerMinutes,
      fields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      const formId = await storage.saveForm(form)
      setIsSaving(false)
      router.push(`/form/${formId}`)
    } catch (error) {
      setIsSaving(false)
      alert('Please sign in to create quizzes')
      router.push('/sign-in')
    }
  }

  const handlePreview = () => {
    if (!formTitle.trim()) {
      alert('Please enter a quiz title')
      return
    }

    const previewId = 'preview-' + Date.now()
    const form: Form = {
      id: previewId,
      title: formTitle,
      description: formDescription,
      isQuiz: true,
      timerMinutes,
      fields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Preview data never touches the database — handed to the new tab via sessionStorage
    sessionStorage.setItem('quiz-preview', JSON.stringify(form))
    window.open(`/form/${previewId}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/prepare"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Prepare Exams</span>
            </Link>
            <div className="flex w-full sm:w-auto gap-2">
              <button
                onClick={handlePreview}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Exam'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 sm:p-8 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Title *
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl sm:text-2xl font-semibold"
              placeholder="e.g. Physics Term Test - Essay Section"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions for Students
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description or instructions shown before the exam starts"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Timer (minutes) — optional
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
              placeholder="e.g., 45 (leave empty for no timer)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {timerMinutes && (
              <p className="mt-1 text-sm text-gray-600">
                Quiz will auto-submit after {timerMinutes} minute{timerMinutes !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Essay Questions</h2>
            <div className="flex gap-2">
              <button
                onClick={() => addField('essay')}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Add Essay Question
              </button>
            </div>
          </div>

          {fields.length === 0 ? (
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 sm:p-12 text-center">
              <p className="text-gray-500 mb-4">
                No questions yet. Add your first essay question to get started — works for any subject: Physics, Maths, English, History, and more.
              </p>
              <button
                onClick={() => addField('essay')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add First Question
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  onUpdate={updateField}
                  onDelete={deleteField}
                  onMove={moveField}
                  canMoveUp={index > 0}
                  canMoveDown={index < fields.length - 1}
                  questionNumber={
                    field.type === 'textblock'
                      ? undefined
                      : fields.slice(0, index + 1).filter(f => f.type !== 'textblock').length
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Add</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => addField('essay')}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Essay Question
            </button>
            <button
              onClick={() => addField('textblock')}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Instructions / Section Text
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Students type their answer and can also draw calculations/diagrams right in the browser (mouse, trackpad, or touchscreen) or upload a photo of handwritten work. Add marking keywords to have answers marked automatically, or grade them yourself.
          </p>
        </div>
      </div>
    </div>
  )
}
