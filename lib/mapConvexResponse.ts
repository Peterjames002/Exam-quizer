import type { Doc } from '@/convex/_generated/dataModel'
import type { FormResponse } from '@/types/form'

export function docToFormResponse(doc: Doc<'responses'>): FormResponse {
  return {
    id: doc._id,
    formId: String(doc.formId),
    responses: doc.responses as Record<string, unknown>,
    submittedAt: doc.submittedAt,
    score: doc.score,
    maxScore: doc.maxScore,
    answers: doc.answers,
    studentName: doc.studentName,
    studentClass: doc.studentClass,
    tabSwitchCount: doc.tabSwitchCount,
    pasteAttempts: doc.pasteAttempts,
    attachments: doc.attachments,
    sessionId: doc.sessionId,
    cameraPhotos: doc.cameraPhotos,
    cameraStatus: doc.cameraStatus as FormResponse['cameraStatus'],
  }
}
