'use client'

import { useEffect, useRef, useState } from 'react'

export type CameraStatus = 'on' | 'blocked' | 'unavailable'

const PHOTO_COUNT = 3
const DEFAULT_WINDOW_MINUTES = 10 // photo window when the quiz has no timer

interface ExamCameraProps {
  active: boolean // true while the student is answering
  durationMinutes?: number // quiz timer; photos are spread across it
  upload: (photo: Blob) => Promise<string> // returns the stored photo's id
  onPhoto: (storageId: string) => void
  onStatus: (status: CameraStatus) => void
}

// Turns the webcam on for the exam, shows the student a live preview with a
// monitoring notice, and takes PHOTO_COUNT snapshots at random moments — one in
// each equal slice of the exam, so they're spread out rather than bunched.
export default function ExamCamera({ active, durationMinutes, upload, onPhoto, onStatus }: ExamCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<CameraStatus | 'pending'>('pending')
  // Latest callbacks, so the photo timers don't capture stale ones
  const callbacks = useRef({ upload, onPhoto, onStatus })
  useEffect(() => {
    callbacks.current = { upload, onPhoto, onStatus }
  })

  useEffect(() => {
    if (!active) return
    let stream: MediaStream | null = null
    const timers: ReturnType<typeof setTimeout>[] = []
    let cancelled = false

    const report = (s: CameraStatus) => {
      setStatus(s)
      callbacks.current.onStatus(s)
    }

    const takePhoto = async () => {
      const video = videoRef.current
      if (!video || !video.videoWidth) return
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = Math.round((320 * video.videoHeight) / video.videoWidth)
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.7))
      if (!blob || cancelled) return
      try {
        callbacks.current.onPhoto(await callbacks.current.upload(blob))
      } catch (err) {
        console.error('Failed to upload exam photo', err)
      }
    }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        // No camera API: old browser, or the site isn't served over HTTPS
        report('unavailable')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      } catch (err) {
        const name = (err as DOMException)?.name
        report(name === 'NotAllowedError' || name === 'SecurityError' ? 'blocked' : 'unavailable')
        return
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      report('on')

      const windowMs = (durationMinutes || DEFAULT_WINDOW_MINUTES) * 60 * 1000
      const slice = windowMs / PHOTO_COUNT
      for (let i = 0; i < PHOTO_COUNT; i++) {
        // Random point in the middle 80% of each slice
        const at = slice * i + slice * (0.1 + Math.random() * 0.8)
        timers.push(setTimeout(takePhoto, at))
      }
    }

    start()
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [active, durationMinutes])

  if (!active) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-44 rounded-lg overflow-hidden shadow-lg border border-gray-300 bg-gray-900 text-white">
      <video
        ref={videoRef}
        muted
        playsInline
        className={`w-full aspect-[4/3] object-cover -scale-x-100 ${status === 'on' ? '' : 'hidden'}`}
      />
      <div className="px-2 py-1.5 text-[11px] leading-tight">
        {status === 'on' && <>📷 Your camera is on — this exam is being monitored</>}
        {status === 'pending' && <>📷 Allow camera access to continue being monitored</>}
        {status === 'blocked' && <>⚠ Camera blocked — your tutor will be notified</>}
        {status === 'unavailable' && <>⚠ No camera available — your tutor will be notified</>}
      </div>
    </div>
  )
}
