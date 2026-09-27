'use client'

import { FormField, FieldType } from '@/types/form'
import { X, GripVertical } from 'lucide-react'
import { useState } from 'react'

interface FieldEditorProps {
  field: FormField
  onUpdate: (field: FormField) => void
  onDelete: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  canMoveUp: boolean
  canMoveDown: boolean
  questionNumber?: number // 1-based question number, omitted for text blocks
}

export default function FieldEditor({
  field,
  onUpdate,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown,
  questionNumber,
}: FieldEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localField, setLocalField] = useState(field)
  // Kept as raw text so commas can be typed; split into keywords on save
  const [keywordsText, setKeywordsText] = useState(field.keywords?.join(', ') ?? '')

  const handleSave = () => {
    if (localField.type === 'essay') {
      const keywords = keywordsText.split(',').map((k) => k.trim()).filter(Boolean)
      onUpdate({ ...localField, keywords: keywords.length > 0 ? keywords : undefined })
    } else {
      onUpdate(localField)
    }
    setIsEditing(false)
  }

  const addOption = () => {
    setLocalField({
      ...localField,
      options: [...(localField.options || []), ''],
    })
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(localField.options || [])]
    newOptions[index] = value
    setLocalField({ ...localField, options: newOptions })
  }

  const removeOption = (index: number) => {
    const newOptions = localField.options?.filter((_, i) => i !== index) || []
    setLocalField({ ...localField, options: newOptions.length > 0 ? newOptions : undefined })
  }

  const hasOptions = ['radio', 'checkbox', 'select'].includes(field.type)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-1 mt-1">
          <button
            onClick={() => onMove(field.id, 'up')}
            disabled={!canMoveUp}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMove(field.id, 'down')}
            disabled={!canMoveDown}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <GripVertical className="w-4 h-4 rotate-180" />
          </button>
        </div>

        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Type
                </label>
                <select
                  value={localField.type}
                  onChange={(e) => {
                    const newType = e.target.value as FieldType
                    // Reset quiz-related fields when changing type
                    setLocalField({
                      ...localField,
                      type: newType,
                      isQuiz: newType === 'textblock' ? false : newType === 'essay' ? true : localField.isQuiz,
                      correctAnswers: (newType === 'textblock' || !['radio', 'checkbox', 'select'].includes(newType)) ? undefined : localField.correctAnswers,
                      points: newType === 'essay' ? (localField.points || 5) : localField.points
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Short Text</option>
                  <option value="textarea">Long Text</option>
                  <option value="email">Email</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="radio">Multiple Choice</option>
                  <option value="checkbox">Checkboxes</option>
                  <option value="select">Dropdown</option>
                  <option value="file">File Upload</option>
                  <option value="rating">Rating</option>
                  <option value="essay">Essay / Long Answer</option>
                  <option value="textblock">Text Block (Description)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {localField.type === 'textblock' ? 'Text Content' : 'Question'}
                </label>
                <input
                  type="text"
                  value={localField.label}
                  onChange={(e) => setLocalField({ ...localField, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={localField.type === 'textblock' ? 'Enter descriptive text' : 'Question or field label'}
                />
              </div>

              {localField.type !== 'textblock' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description / Help Text
                  </label>
                  <textarea
                    value={localField.description || ''}
                    onChange={(e) => setLocalField({ ...localField, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description or help text (shown below the question)"
                    rows={2}
                  />
                </div>
              )}

              {localField.type === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={localField.placeholder || ''}
                    onChange={(e) => setLocalField({ ...localField, placeholder: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Placeholder text"
                  />
                </div>
              )}

              {hasOptions && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options
                  </label>
                  <div className="space-y-2">
                    {localField.options?.map((option, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Option ${index + 1}`}
                        />
                        {localField.isQuiz && (
                          <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
                            <input
                              type={localField.type === 'checkbox' ? 'checkbox' : 'radio'}
                              checked={localField.correctAnswers?.includes(option) || false}
                              onChange={(e) => {
                                const currentCorrect = localField.correctAnswers || []
                                let newCorrect: string[]
                                if (localField.type === 'checkbox') {
                                  if (e.target.checked) {
                                    newCorrect = [...currentCorrect, option]
                                  } else {
                                    newCorrect = currentCorrect.filter(a => a !== option)
                                  }
                                } else {
                                  newCorrect = e.target.checked ? [option] : []
                                }
                                setLocalField({ ...localField, correctAnswers: newCorrect })
                              }}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className="text-xs">Correct</span>
                          </label>
                        )}
                        <button
                          onClick={() => removeOption(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addOption}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Add Option
                    </button>
                  </div>
                  
                  {localField.isQuiz && localField.options && localField.options.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Select Correct Answer(s):
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {localField.options.map((option, optIndex) => {
                          const isCorrect = localField.correctAnswers?.includes(option) || false
                          const optionLabel = String.fromCharCode(65 + optIndex) // A, B, C, D
                          return (
                            <label
                              key={optIndex}
                              className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                isCorrect
                                  ? 'bg-green-100 border-green-500'
                                  : 'bg-white border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type={localField.type === 'checkbox' ? 'checkbox' : 'radio'}
                                checked={isCorrect}
                                onChange={(e) => {
                                  const currentCorrect = localField.correctAnswers || []
                                  let newCorrect: string[]
                                  if (localField.type === 'checkbox') {
                                    if (e.target.checked) {
                                      newCorrect = [...currentCorrect, option]
                                    } else {
                                      newCorrect = currentCorrect.filter(a => a !== option)
                                    }
                                  } else {
                                    newCorrect = e.target.checked ? [option] : []
                                  }
                                  setLocalField({ ...localField, correctAnswers: newCorrect })
                                }}
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                              <span className="font-semibold text-gray-900">{optionLabel})</span>
                              <span className="text-sm text-gray-700 truncate flex-1">{option}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {hasOptions && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={localField.isQuiz || false}
                      onChange={(e) => {
                        setLocalField({ 
                          ...localField, 
                          isQuiz: e.target.checked,
                          correctAnswers: e.target.checked ? (localField.correctAnswers || []) : undefined,
                          points: e.target.checked ? (localField.points || 1) : undefined
                        })
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">This is an objective question (quiz/test)</span>
                  </label>
                </div>
              )}

              {localField.isQuiz && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={localField.points || 1}
                    onChange={(e) => setLocalField({ ...localField, points: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {localField.type === 'essay' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marking keywords (optional)
                  </label>
                  <input
                    type="text"
                    value={keywordsText}
                    onChange={(e) => setKeywordsText(e.target.value)}
                    placeholder="e.g. chlorophyll, sunlight, carbon dioxide"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Separate with commas. When you mark this essay, a mark is suggested from how many keywords appear —
                    close forms and small spelling slips count (e.g. &quot;evaporate&quot; matches &quot;evaporation&quot;).
                    Leave empty if you prefer no suggestion. You always confirm the final mark.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={localField.required || false}
                    onChange={(e) => setLocalField({ ...localField, required: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Required</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setLocalField(field)
                    setIsEditing(false)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {questionNumber !== undefined && (
                    <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-1 rounded">
                      Q{questionNumber}
                    </span>
                  )}
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {field.type}
                  </span>
                  {field.required && (
                    <span className="text-xs text-red-600">* Required</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(field.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {field.type === 'textblock' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <p className="text-gray-700 whitespace-pre-wrap">{field.label || 'Text block'}</p>
                </div>
              ) : (
                <>
                  <p className="text-gray-900 font-medium mb-1">{field.label}</p>
                  {field.description && (
                    <p className="text-sm text-gray-500 mb-2">{field.description}</p>
                  )}
                  {hasOptions && field.options && (
                    <div className="mt-2 space-y-1">
                      {field.options.map((option, index) => {
                        const isCorrect = field.isQuiz && field.correctAnswers?.includes(option)
                        return (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600">
                              {field.type === 'radio' && '○'} {field.type === 'checkbox' && '☐'} {field.type === 'select' && '▼'} {option}
                            </span>
                            {isCorrect && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ Correct</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {field.isQuiz && (
                    <div className="mt-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {field.type === 'essay' ? (field.keywords?.length ? `Essay Question (${field.keywords.length} marking keyword${field.keywords.length !== 1 ? 's' : ''})` : 'Essay Question (manually graded)') : 'Quiz Question'} • {field.points || 1} point{(field.points || 1) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
