import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

// Copying a share link also opens the quiz for students for a few minutes
// (exams.LINK_OPEN_MINUTES); copying it again reopens it for latecomers.
export function useShareLink() {
  const openLink = useMutation(api.exams.openLink)

  return async (formId: string) => {
    try {
      await openLink({ id: formId as Id<'forms'> })
    } catch (err) {
      console.error('Failed to open the exam link', err)
    }

    const formUrl = `${window.location.origin}/form/${formId}`
    try {
      await navigator.clipboard.writeText(formUrl)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = formUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }
}
