'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Paperclip } from 'lucide-react'

interface AttachmentViewerProps {
  storageId: string
}

export default function AttachmentViewer({ storageId }: AttachmentViewerProps) {
  const url = useQuery(api.files.getFileUrl, { storageId: storageId as Id<'_storage'> })

  if (url === undefined) {
    return <span className="text-xs text-gray-400">Loading attachment…</span>
  }

  if (!url) {
    return <span className="text-xs text-red-500">Attachment unavailable</span>
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
    >
      <Paperclip className="w-4 h-4" />
      View attached photo/file
    </a>
  )
}
