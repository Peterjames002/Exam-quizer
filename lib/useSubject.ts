import { useMemo } from 'react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { Form, FormField, FormResponse } from '@/types/form'
import { docToFormResponse } from '@/lib/mapConvexResponse'

// One subject (exam) owned by the signed-in tutor, plus its submissions.
// status: 'loading' | 'missing' (not found or not theirs) | 'ready'
export function useSubject(formId: string) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const args = isAuthenticated && formId ? { id: formId as Id<'forms'> } : 'skip'
  const doc = useQuery(api.forms.getFormByUser, args)
  const docs = useQuery(
    api.responses.getResponses,
    isAuthenticated && formId ? { formId: formId as Id<'forms'> } : 'skip',
  )

  const form: Form | null = useMemo(
    () =>
      doc
        ? {
            id: doc._id,
            title: doc.title,
            description: doc.description,
            isQuiz: doc.isQuiz,
            timerMinutes: doc.timerMinutes,
            linkExpiresAt: doc.linkExpiresAt,
            fields: doc.fields as FormField[],
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          }
        : null,
    [doc],
  )

  const responses: FormResponse[] = useMemo(
    () => (docs ?? []).map(docToFormResponse).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)),
    [docs],
  )

  const status: 'loading' | 'missing' | 'ready' =
    authLoading || doc === undefined || docs === undefined ? 'loading' : !form ? 'missing' : 'ready'

  return { status, form, responses }
}
