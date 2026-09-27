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
  essayMarkedMax: number // points available in the essays marked so far
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
  let essayMarkedMax = 0
  let essaysPending = 0

  for (const f of form.fields) {
    const points = f.points || 1
    const answer = response.answers?.[f.id]
    if (isObjectiveField(f)) {
      objectiveMax += points
      objectiveScore += answer?.points ?? 0
    } else if (isEssayField(f)) {
      essayMax += points
      if (isEssayConfirmed(answer)) {
        essayScore += answer?.points ?? 0
        essayMarkedMax += points
      } else essaysPending += 1
    }
  }

  const total = objectiveScore + essayScore
  const totalMax = objectiveMax + essayMax
  return {
    objectiveScore,
    objectiveMax,
    essayScore,
    essayMax,
    essayMarkedMax,
    essaysPending,
    total,
    totalMax,
    percent: totalMax > 0 ? Math.round((total / totalMax) * 100) : 0,
    complete: essaysPending === 0,
  }
}

export const percentBadge = (percent: number) =>
  percent >= 80 ? 'bg-green-100 text-green-800' : percent >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'

// ---- Grading scale ---------------------------------------------------------
// Standard 5-point university scale. Change the bands here to change them
// everywhere in the dashboard.
export const PASS_PERCENT = 40

export type Grade = { letter: string; remark: string; tone: string }

const GRADE_BANDS: { min: number; grade: Grade }[] = [
  { min: 70, grade: { letter: 'A', remark: 'Excellent', tone: 'bg-green-100 text-green-800 ring-green-200' } },
  { min: 60, grade: { letter: 'B', remark: 'Very good', tone: 'bg-teal-100 text-teal-800 ring-teal-200' } },
  { min: 50, grade: { letter: 'C', remark: 'Good', tone: 'bg-blue-100 text-blue-800 ring-blue-200' } },
  { min: 45, grade: { letter: 'D', remark: 'Fair', tone: 'bg-yellow-100 text-yellow-800 ring-yellow-200' } },
  { min: 40, grade: { letter: 'E', remark: 'Pass', tone: 'bg-orange-100 text-orange-800 ring-orange-200' } },
  { min: 0, grade: { letter: 'F', remark: 'Fail', tone: 'bg-red-100 text-red-800 ring-red-200' } },
]
export const GRADES = GRADE_BANDS.map((b) => b.grade)
export const GRADE_LETTERS = GRADES.map((g) => g.letter)

// Shown while nothing in the chosen scope has been marked yet
export const NOT_GRADED: Grade = { letter: '—', remark: 'Not marked', tone: 'bg-gray-100 text-gray-600 ring-gray-200' }

export function gradeFor(percent: number): Grade {
  return (GRADE_BANDS.find((b) => percent >= b.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1]).grade
}

// ---- Per-student rows with rank, percentile and integrity ----------------------
export type Basis = 'objective' | 'essay' | 'total'

export type Integrity = {
  leftTab: boolean
  pasteAttempts: number
  camera: FormResponse['cameraStatus']
  photos: string[]
  issues: number // how many of the above are a concern
}

export type StudentRow = {
  response: FormResponse
  b: ResultBreakdown
  score: number
  max: number
  percent: number
  grade: Grade
  passed: boolean
  graded: boolean // false when nothing in scope is marked yet
  provisional: boolean // some essays in scope still unmarked; percent covers marked work only
  rank: number // 1 = top; ties share a rank
  percentile: number // % of classmates this student scored above
  integrity: Integrity
}

export function integrityOf(r: FormResponse): Integrity {
  const leftTab = !!r.tabSwitchCount
  const pasteAttempts = r.pasteAttempts ?? 0
  const camera = r.cameraStatus
  const cameraIssue = camera === 'blocked' || camera === 'unavailable'
  return {
    leftTab,
    pasteAttempts,
    camera,
    photos: r.cameraPhotos ?? [],
    issues: (leftTab ? 1 : 0) + (pasteAttempts > 0 ? 1 : 0) + (cameraIssue ? 1 : 0),
  }
}

export function buildRows(form: Form, responses: FormResponse[], basis: Basis): StudentRow[] {
  const base = responses.map((response) => {
    const b = breakdown(form, response)
    // Until every essay is marked, grade on the marked questions only, so an
    // unmarked essay doesn't drag a student down to a fail
    const [score, max, provisional] =
      basis === 'objective'
        ? [b.objectiveScore, b.objectiveMax, false]
        : basis === 'essay'
          ? [b.essayScore, b.essayMarkedMax, b.essaysPending > 0]
          : [b.total, b.objectiveMax + b.essayMarkedMax, b.essaysPending > 0]
    const graded = max > 0
    const percent = graded ? Math.round((score / max) * 100) : 0
    return {
      response, b, score, max, percent, graded, provisional,
      grade: graded ? gradeFor(percent) : NOT_GRADED,
      passed: graded && percent >= PASS_PERCENT,
      integrity: integrityOf(response),
    }
  })
  const ranked = base.filter((r) => r.graded)
  const n = ranked.length
  return base
    .map((row) => {
      if (!row.graded) return { ...row, rank: n + 1, percentile: 0 }
      const above = ranked.filter((o) => o.percent > row.percent).length
      const below = ranked.filter((o) => o.percent < row.percent).length
      return { ...row, rank: above + 1, percentile: n <= 1 ? 100 : Math.round((below / (n - 1)) * 100) }
    })
    .sort((a, b) => a.rank - b.rank || (a.response.studentName ?? '').localeCompare(b.response.studentName ?? ''))
}

export type ClassStats = {
  count: number
  average: number
  highest: number
  lowest: number
  passRate: number
  distribution: Record<string, number>
}

export function classStats(allRows: StudentRow[]): ClassStats {
  const rows = allRows.filter((r) => r.graded)
  const distribution: Record<string, number> = Object.fromEntries(GRADE_LETTERS.map((l) => [l, 0]))
  for (const r of rows) distribution[r.grade.letter] += 1
  const percents = rows.map((r) => r.percent)
  return {
    count: rows.length,
    average: rows.length ? Math.round(percents.reduce((a, p) => a + p, 0) / rows.length) : 0,
    highest: rows.length ? Math.max(...percents) : 0,
    lowest: rows.length ? Math.min(...percents) : 0,
    passRate: rows.length ? Math.round((rows.filter((r) => r.passed).length / rows.length) * 100) : 0,
    distribution,
  }
}

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
