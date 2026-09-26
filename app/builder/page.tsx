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

export default function BuilderPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const storage = useStorage()
  const [formTitle, setFormTitle] = useState('Untitled Form')
  const [formDescription, setFormDescription] = useState('')
  const [isQuiz, setIsQuiz] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState<number | undefined>(undefined)
  const [fields, setFields] = useState<FormField[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const addField = (type: FieldType = 'text') => {
    const newField: FormField = {
      id: uuidv4(),
      type,
      label: 'New Question',
      required: false,
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
      alert('Please sign in to create forms')
      router.push('/sign-in')
      return
    }

    if (!formTitle.trim()) {
      alert('Please enter a form title')
      return
    }

    setIsSaving(true)
    const form: Form = {
      id: uuidv4(),
      title: formTitle,
      description: formDescription,
      isQuiz,
      timerMinutes: isQuiz ? timerMinutes : undefined,
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
      alert('Please sign in to create forms')
      router.push('/sign-in')
    }
  }

  const handlePreview = () => {
    if (!formTitle.trim()) {
      alert('Please enter a form title')
      return
    }

    const previewId = 'preview-' + Date.now()
    const form: Form = {
      id: previewId,
      title: formTitle,
      description: formDescription,
      isQuiz,
      timerMinutes: isQuiz ? timerMinutes : undefined,
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
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={handlePreview}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Form'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Form Title *
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-semibold"
              placeholder="Enter form title"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Form Description
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter form description (optional)"
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
            <label htmlFor="isQuiz" className="text-sm font-medium text-gray-700 cursor-pointer">
              This is a Quiz/Test (allows setting correct answers and scoring)
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

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Form Fields</h2>
            <div className="flex gap-2">
              <button
                onClick={() => addField('text')}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Add Field
              </button>
            </div>
          </div>

          {fields.length === 0 ? (
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-500 mb-4">No fields yet. Add your first field to get started!</p>
              <button
                onClick={() => addField('text')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add First Field
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Add Fields</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['text', 'textarea', 'email', 'number', 'date', 'radio', 'checkbox', 'select', 'essay', 'textblock'] as FieldType[]).map((type) => (
              <button
                key={type}
                onClick={() => addField(type)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors capitalize"
              >
                {type === 'textblock' ? 'Text Block' : type}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
