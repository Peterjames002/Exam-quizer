'use client'

import { useEffect, useState } from 'react'

// Tutor-facing: whether students can still press Start on this quiz link
export default function LinkStatus({ expiresAt }: { expiresAt?: number }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (expiresAt && now <= expiresAt) {
    const secs = Math.floor((expiresAt - now) / 1000)
    return (
      <p className="text-xs text-green-700">
        ● Link open — students can start for {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')} more
      </p>
    )
  }
  return (
    <p className="text-xs text-gray-600">
      ● Link closed — copying it opens it for 5 minutes
    </p>
  )
}
