'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

interface EssayGraderProps {
  responseId: Id<'responses'>
  fieldId: string
  maxPoints: number
  currentPoints: number
  needsGrading: boolean
  userId: string
}

export default function EssayGrader({
  responseId,
  fieldId,
  maxPoints,
  currentPoints,
  needsGrading,
  userId,
}: EssayGraderProps) {
  const gradeEssayAnswer = useMutation(api.responses.gradeEssayAnswer)
  const [points, setPoints] = useState(currentPoints)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await gradeEssayAnswer({ responseId, fieldId, points, userId })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-300 flex items-center gap-3 flex-wrap">
      {needsGrading ? (
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-200 text-yellow-800">
          NEEDS GRADING
        </span>
      ) : (
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-200 text-green-800">
          GRADED
        </span>
      )}
      <label className="text-sm text-gray-700 flex items-center gap-2">
        Points:
        <input
          type="number"
          min={0}
          max={maxPoints}
          value={points}
          onChange={(e) =>
            setPoints(Math.max(0, Math.min(maxPoints, Number(e.target.value) || 0)))
          }
          className="w-20 px-2 py-1 border border-gray-300 rounded-md"
        />
        / {maxPoints}
      </label>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Grade'}
      </button>
    </div>
  )
}
