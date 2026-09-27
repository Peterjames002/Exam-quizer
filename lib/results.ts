import type { Form, FormField, FormResponse } from '@/types/form'

export type Answer = NonNullable<FormResponse['answers']>[string]

export const isObjectiveField = (f: FormField) => !!f.isQuiz && f.type !== 'essay' && f.type !== 'textblock'
export const isEssayField = (f: FormField) => !!f.isQuiz && f.type === 'essay'

// An essay mark counts only once the tutor has confirmed it. (Legacy answers
// that were auto-marked from keywords still wait for the tutor.)
export const isEssayConfirmed = (a: Answer | undefined) => !!a && a.needsGrading === false && !a.autoGraded

export type ResultBreakdown = {
  objectiveScore: number
  objectiveMax: number
  essayScore: number // confirmed essay marks only
  essayMax: number
  essaysPending: number
  total: number
  totalMax: number
  percent: number
  complete: boolean // every essay has a confirmed mark
}

export function breakdown(form: Form, response: FormResponse): ResultBreakdown {
  let objectiveScore = 0
  let objectiveMax = 0
  let essayScore = 0
  let essayMax = 0
  let essaysPending = 0

  for (const f of form.fields) {
    const points = f.points || 1
    const answer = response.answers?.[f.id]
    if (isObjectiveField(f)) {
      objectiveMax += points
      objectiveScore += answer?.points ?? 0
    } else if (isEssayField(f)) {
      essayMax += points
      if (isEssayConfirmed(answer)) essayScore += answer?.points ?? 0
      else essaysPending += 1
    }
  }

  const total = objectiveScore + essayScore
  const totalMax = objectiveMax + essayMax
  return {
    objectiveScore,
    objectiveMax,
    essayScore,
    essayMax,
    essaysPending,
    total,
    totalMax,
    percent: totalMax > 0 ? Math.round((total / totalMax) * 100) : 0,
    complete: essaysPending === 0,
  }
}

export const percentBadge = (percent: number) =>
  percent >= 80 ? 'bg-green-100 text-green-800' : percent >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
