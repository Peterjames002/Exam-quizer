'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

// Thumbnail of a webcam snapshot taken during an exam; click to open full size
export default function CameraPhoto({
  storageId,
  label,
  size = 'w-32',
}: {
  storageId: string
  label: string
  size?: string // Tailwind width class; height follows a 4:3 ratio
}) {
  const url = useQuery(api.files.getFileUrl, { storageId: storageId as Id<'_storage'> })

  if (!url) {
    return (
      <div className={`${size} aspect-[4/3] rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-xs text-gray-400`}>
        {url === undefined ? '…' : 'N/A'}
      </div>
    )
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={label}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Convex storage URL, not a static asset */}
      <img src={url} alt={label} className={`${size} aspect-[4/3] object-cover rounded border border-gray-200 hover:opacity-90`} />
    </a>
  )
}
