'use client'

import { FormField } from '@/types/form'
import { Star } from 'lucide-react'
import DrawingPad from './DrawingPad'

interface FieldRendererProps {
  field: FormField
  value?: any
  onChange?: (value: any) => void
  showResults?: boolean // Show quiz results
  isCorrect?: boolean // Whether the answer is correct (for quiz mode)
  questionNumber?: number // 1-based question number, omitted for text blocks
  onAttachmentSelect?: (file: File | null) => void // Essay questions only: optional photo/file attachment
  attachmentFileName?: string // Name of the currently staged attachment, if any
}

export default function FieldRenderer({
  field,
  value,
  onChange,
  showResults,
  isCorrect,
  questionNumber,
  onAttachmentSelect,
  attachmentFileName,
}: FieldRendererProps) {
  const handleChange = (newValue: any) => {
    if (onChange) {
      onChange(newValue)
    }
  }

  // Text block - just display text
  if (field.type === 'textblock') {
    return (
      <div className="mb-6">
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <p className="text-gray-700 whitespace-pre-wrap">{field.label}</p>
        </div>
      </div>
    )
  }

  switch (field.type) {
    case 'text':
    case 'email':
    case 'date':
    case 'number':
      return (
        <div className="mb-6">
          <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-2">
            {questionNumber !== undefined && (
              <span className="text-gray-500 font-semibold mr-1">{questionNumber}.</span>
            )}
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.description && (
            <p className="text-sm text-gray-500 mb-2">{field.description}</p>
          )}
          <input
            type={field.type}
            id={field.id}
            name={field.id}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={showResults}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              showResults 
                ? isCorrect 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {showResults && field.isQuiz && (
            <div className={`mt-2 text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
              {field.points && ` • ${isCorrect ? field.points : 0}/${field.points} points`}
            </div>
          )}
        </div>
      )

    case 'textarea':
      return (
        <div className="mb-6">
          <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-2">
            {questionNumber !== undefined && (
              <span className="text-gray-500 font-semibold mr-1">{questionNumber}.</span>
            )}
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.description && (
            <p className="text-sm text-gray-500 mb-2">{field.description}</p>
          )}
          <textarea
            id={field.id}
            name={field.id}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            disabled={showResults}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              showResults 
                ? isCorrect 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          {showResults && field.isQuiz && (
            <div className={`mt-2 text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
              {field.points && ` • ${isCorrect ? field.points : 0}/${field.points} points`}
            </div>
          )}
        </div>
      )

    case 'radio':
      return (
        <div className="mb-6">
          <div className="block text-sm font-medium text-gray-700 mb-2">
            {questionNumber !== undefined && (
              <span className="text-gray-500 font-semibold mr-1">{questionNumber}.</span>
            )}
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </div>
          {field.description && (
            <p className="text-sm text-gray-500 mb-2">{field.description}</p>
          )}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex flex-col gap-0">
              {field.options?.map((option, index) => {
                const isSelected = value === option
                const isCorrectAnswer = field.isQuiz && field.correctAnswers?.includes(option)
                const showCorrect = showResults && isCorrectAnswer
                const showIncorrect = showResults && isSelected && !isCorrectAnswer
                
                return (
                  <div 
                    key={index}
                    className={`block w-full ${
                      index < (field.options?.length || 0) - 1 ? 'border-b border-gray-300' : ''
                    }`}
                  >
                    <label 
                      htmlFor={`${field.id}-${index}`}
                      className={`flex items-center gap-3 cursor-pointer py-3 px-2 w-full ${
                        showCorrect 
                          ? 'bg-green-50' 
                          : showIncorrect 
                            ? 'bg-red-50' 
                            : isSelected
                              ? 'bg-blue-50'
                              : 'hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="radio"
                        id={`${field.id}-${index}`}
                        name={field.id}
                        value={option}
                        checked={isSelected}
                        onChange={(e) => handleChange(e.target.value)}
                        required={field.required}
                        disabled={showResults}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                      />
                      <span className="text-gray-900 text-base flex-1">{option}</span>
                      {showCorrect && (
                        <span className="text-green-700 text-sm font-medium">
                          ✓ Correct
                        </span>
                      )}
                      {showIncorrect && (
                        <span className="text-red-700 text-sm font-medium">
                          ✗ Your answer
                        </span>
                      )}
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
          {showResults && field.isQuiz && (
            <div className={`mt-2 text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
              {field.points && ` • ${isCorrect ? field.points : 0}/${field.points} points`}
            </div>
          )}
        </div>
      )

    case 'checkbox':
      return (
        <div className="mb-6">
          <div className="block text-sm font-medium text-gray-700 mb-2">
            {questionNumber !== undefined && (
              <span className="text-gray-500 font-semibold mr-1">{questionNumber}.</span>
            )}
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </div>
          {field.description && (
            <p className="text-sm text-gray-500 mb-2">{field.description}</p>
          )}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex flex-col gap-0">
              {field.options?.map((option, index) => {
                const isSelected = Array.isArray(value) && value.includes(option)
                const isCorrectAnswer = field.isQuiz && field.correctAnswers?.includes(option)
                const showCorrect = showResults && isCorrectAnswer
                const showIncorrect = showResults && isSelected && !isCorrectAnswer
                
                return (
                  <div 
                    key={index}
                    className={`block w-full ${
                      index < (field.options?.length || 0) - 1 ? 'border-b border-gray-300' : ''
                    }`}
                  >
                    <label 
                      htmlFor={`${field.id}-${index}`}
                      className={`flex items-center gap-3 cursor-pointer py-3 px-2 w-full ${
                        showCorrect 
                          ? 'bg-green-50' 
                          : showIncorrect 
                            ? 'bg-red-50' 
                            : isSelected
                              ? 'bg-blue-50'
                              : 'hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        id={`${field.id}-${index}`}
                        name={`${field.id}[]`}
                        value={option}
                        checked={isSelected}
                        onChange={(e) => {
                          const currentValues = Array.isArray(value) ? value : []
                          if (e.target.checked) {
                            handleChange([...currentValues, option])
                          } else {
                            handleChange(currentValues.filter(v => v !== option))
                          }
                        }}
                        disabled={showResults}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                      />
                      <span className="text-gray-900 text-base flex-1">{option}</span>
                      {showCorrect && (
                        <span className="text-green-700 text-sm font-medium">
                          ✓ Correct
                        </span>
                      )}
                      {showIncorrect && (
                        <span className="text-red-700 text-sm font-medium">
                          ✗ Your answer
                        </span>
                      )}
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
          {showResults && field.isQuiz && (
            <div className={`mt-2 text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
              {field.points && ` • ${isCorrect ? field.points : 0}/${field.points} points`}
            </div>
          )}
        </div>
      )

    case 'select':
      return (
        <div className="mb-6">
          <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-2">
            {questionNumber !== undefined && (
              <span className="text-gray-500 font-semibold mr-1">{questionNumber}.</span>
            )}
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.description && (
            <p className="text-sm text-gray-500 mb-2">{field.description}</p>
          )}
          <select
            id={field.id}
            name={field.id}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            required={field.required}
            disabled={showResults}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              showResults 
                ? isCorrect 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          >
            <option value="">Select an option</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
          {showResults && field.isQuiz && (
            <div className={`mt-2 text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
              {field.points && ` • ${isCorrect ? field.points : 0}/${field.points} points`}
            </div>
          )}
        </div>
      )

    case 'essay':
      return (
        <div className="mb-6">
          <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-2">
            {questionNumber !== undefined && (
              <span className="text-gray-500 font-semibold mr-1">{questionNumber}.</span>
            )}
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.description && (
            <p className="text-sm text-gray-500 mb-2">{field.description}</p>
          )}
          <textarea
            id={field.id}
            name={field.id}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder || 'Write your answer...'}
            required={field.required}
            rows={8}
            disabled={showResults}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {!showResults && onAttachmentSelect && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Show your working — draw directly below (great for calculations, equations, diagrams)
                </label>
                <DrawingPad
                  onChange={(blob) => {
                    onAttachmentSelect(
                      blob ? new File([blob], `drawing-${field.id}.png`, { type: 'image/png' }) : null
                    )
                  }}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Or upload a photo/file instead
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => onAttachmentSelect(e.target.files?.[0] || null)}
                  className="text-sm text-gray-700 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {attachmentFileName && (
                  <p className="mt-1 text-xs text-gray-500">Selected: {attachmentFileName}</p>
                )}
              </div>
            </div>
          )}
          {showResults && field.isQuiz && (
            <div className="mt-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
              Submitted — pending grading by your teacher
              {field.points ? ` (out of ${field.points} point${field.points !== 1 ? 's' : ''})` : ''}
            </div>
          )}
        </div>
      )

    case 'file':
      return (
        <div className="mb-6">
          <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-2">
            {questionNumber !== undefined && (
              <span className="text-gray-500 font-semibold mr-1">{questionNumber}.</span>
            )}
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.description && (
            <p className="text-sm text-gray-500 mb-2">{field.description}</p>
          )}
          <input
            type="file"
            id={field.id}
            name={field.id}
            onChange={(e) => handleChange(e.target.files?.[0])}
            required={field.required}
            disabled={showResults}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
      )

    case 'rating':
      return (
        <div className="mb-6">
          <div className="block text-sm font-medium text-gray-700 mb-2">
            {questionNumber !== undefined && (
              <span className="text-gray-500 font-semibold mr-1">{questionNumber}.</span>
            )}
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </div>
          {field.description && (
            <p className="text-sm text-gray-500 mb-2">{field.description}</p>
          )}
          <div className="flex gap-2" role="group" aria-label={field.label}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                id={`${field.id}-rating-${rating}`}
                name={`${field.id}-rating`}
                onClick={() => handleChange(rating)}
                disabled={showResults}
                className={`${
                  value >= rating
                    ? 'text-yellow-400'
                    : 'text-gray-300'
                } hover:text-yellow-400 transition-colors disabled:opacity-50`}
              >
                <Star className="w-8 h-8 fill-current" />
              </button>
            ))}
          </div>
          {showResults && field.isQuiz && (
            <div className={`mt-2 text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
              {field.points && ` • ${isCorrect ? field.points : 0}/${field.points} points`}
            </div>
          )}
        </div>
      )

    default:
      return null
  }
}
