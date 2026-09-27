import type { Form, FormResponse } from '@/types/form'
import { buildRows, ordinal } from '@/lib/results'

// Full results sheet for one subject, ranked by total
export function exportResultsCsv(form: Form, responses: FormResponse[]) {
  const headers = [
    'Position', 'Name', 'Matric No.', 'Objective', 'Objective Max', 'Essay', 'Essay Max', 'Total', 'Total Max',
    'Percent', 'Grade', 'Remark', 'Percentile', 'Status', 'Left Tab', 'Paste Attempts', 'Camera', 'Submitted At',
  ]
  const rows = buildRows(form, responses, 'total').map((r) => [
    ordinal(r.rank), r.response.studentName ?? '', r.response.studentClass ?? '',
    r.b.objectiveScore, r.b.objectiveMax, r.b.essayScore, r.b.essayMax, r.b.total, r.b.totalMax,
    r.graded ? `${r.percent}%` : '', r.grade.letter, r.grade.remark, r.graded ? r.percentile : '',
    r.b.complete ? 'Final' : `Provisional — graded on marked questions (${r.b.essaysPending} essay(s) unmarked)`,
    r.integrity.leftTab ? 'Yes' : 'No', r.integrity.pasteAttempts, r.integrity.camera ?? '',
    new Date(r.response.submittedAt).toLocaleString(),
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${form.title.replace(/[^a-z0-9]+/gi, '_')}_results.csv`
  a.click()
  URL.revokeObjectURL(url)
}
