'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { FormField } from '@/types/form'
import { isEssayConfirmed, type Answer } from '@/lib/results'
import AttachmentViewer from './AttachmentViewer'
import { CheckCircle2, Lightbulb } from 'lucide-react'

interface EssayMarkerProps {
  responseId: string
  field: FormField
  questionNumber?: number
  studentAnswer: unknown
  answer: Answer | undefined
  attachmentId?: string
}

// One student's answer to one essay question: read it, enter a mark, confirm.
// Only confirmed marks count toward the student's results.
export default function EssayMarker({
  responseId,
  field,
  questionNumber,
  studentAnswer,
  answer,
  attachmentId,
}: EssayMarkerProps) {
  const grade = useMutation(api.responses.gradeEssayAnswer)
  const maxPoints = field.points || 1
  const confirmed = isEssayConfirmed(answer)
  const [editing, setEditing] = useState(!confirmed)
  const [points, setPoints] = useState<string>(confirmed ? String(answer?.points ?? 0) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const text = typeof studentAnswer === 'string' ? studentAnswer.trim() : ''

  const confirm = async () => {
    const value = Number(points)
    if (points === '' || Number.isNaN(value) || value < 0 || value > maxPoints) {
      setError(`Enter a mark between 0 and ${maxPoints}`)
      return
    }
    setError(null)
    setSaving(true)
    try {
      await grade({ responseId: responseId as Id<'responses'>, fieldId: field.id, points: value })
      setEditing(false)
    } catch {
      setError('Could not save the mark. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${confirmed && !editing ? 'border-green-200 bg-green-50/40' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold text-gray-900">
          {questionNumber !== undefined && <span className="text-gray-400 mr-1">Q{questionNumber}.</span>}
          {field.label}
        </h4>
        <span className="shrink-0 text-xs font-medium text-gray-500">{maxPoints} mark{maxPoints !== 1 ? 's' : ''}</span>
      </div>

      <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3 text-gray-800 whitespace-pre-wrap break-words max-h-80 overflow-y-auto">
        {text || <span className="italic text-gray-400">No written answer</span>}
      </div>
      {attachmentId && (
        <div className="mt-2">
          <AttachmentViewer storageId={attachmentId} />
        </div>
      )}

      {answer?.suggestedPoints !== undefined && (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 text-sm rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
          <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="flex-1 text-blue-900">
            Keyword suggestion: <strong>{answer.suggestedPoints}/{maxPoints}</strong>
            {!!answer.matchedKeywords?.length && <span className="text-green-700"> · found {answer.matchedKeywords.join(', ')}</span>}
            {!!answer.missedKeywords?.length && <span className="text-red-700"> · missing {answer.missedKeywords.join(', ')}</span>}
          </div>
          {editing && (
            <button
              type="button"
              onClick={() => setPoints(String(answer.suggestedPoints))}
              className="self-start sm:self-auto px-3 py-2 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 font-semibold"
            >
              Use suggestion
            </button>
          )}
        </div>
      )}

      {editing ? (
        <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex items-center gap-3 text-base font-medium text-gray-800">
            Mark
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={maxPoints}
              step={0.5}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirm()}
              placeholder="0"
              className="w-28 px-4 py-3 text-xl font-semibold text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-lg text-gray-500">/ {maxPoints}</span>
          </label>
          <button
            type="button"
            onClick={confirm}
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 text-base font-semibold shadow-sm"
          >
            <CheckCircle2 className="w-5 h-5" />
            {saving ? 'Saving…' : 'Confirm mark'}
          </button>
          {confirmed && (
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-3 text-gray-600 hover:text-gray-900">
              Cancel
            </button>
          )}
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="mt-5 pt-4 border-t border-green-200 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-lg text-green-700 font-bold">
            <CheckCircle2 className="w-6 h-6" />
            Marked {answer?.points ?? 0} / {maxPoints}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
          >
            Change mark
          </button>
        </div>
      )}
    </div>
  )
}
