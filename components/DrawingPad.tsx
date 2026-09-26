'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser, Pencil, RotateCcw, Trash2 } from 'lucide-react'

interface DrawingPadProps {
  onChange: (blob: Blob | null) => void
  height?: number
}

export default function DrawingPad({ onChange, height = 220 }: DrawingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const historyRef = useRef<ImageData[]>([])
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')

  // Match the canvas's backing resolution to the screen so lines stay crisp
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    ctx.scale(ratio, ratio)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
  }, [])

  const getContext = () => canvasRef.current?.getContext('2d') || null

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const pushHistory = () => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    if (historyRef.current.length > 20) historyRef.current.shift()
  }

  const emitChange = () => {
    canvasRef.current?.toBlob((blob) => onChange(blob), 'image/png')
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    pushHistory()
    isDrawingRef.current = true
    lastPointRef.current = getPoint(e)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const ctx = getContext()
    const point = getPoint(e)
    const last = lastPointRef.current
    if (!ctx || !last) return

    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : '#1f2937'
    ctx.lineWidth = tool === 'eraser' ? 18 : 2.5
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()

    lastPointRef.current = point
  }

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastPointRef.current = null
    emitChange()
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = getContext()
    if (!canvas || !ctx) return
    pushHistory()
    const ratio = window.devicePixelRatio || 1
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width / ratio, canvas.height / ratio)
    onChange(null)
  }

  const handleUndo = () => {
    const ctx = getContext()
    const prev = historyRef.current.pop()
    if (!ctx || !prev) return
    ctx.putImageData(prev, 0, 0)
    emitChange()
  }

  const toolButtonClass = (active: boolean) =>
    `flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border ${
      active
        ? 'bg-blue-600 text-white border-blue-600'
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
    }`

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onClick={() => setTool('pen')} className={toolButtonClass(tool === 'pen')}>
          <Pencil className="w-3.5 h-3.5" />
          Pen
        </button>
        <button type="button" onClick={() => setTool('eraser')} className={toolButtonClass(tool === 'eraser')}>
          <Eraser className="w-3.5 h-3.5" />
          Eraser
        </button>
        <button
          type="button"
          onClick={handleUndo}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Undo
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border bg-white text-red-600 border-gray-300 hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        style={{ height, touchAction: 'none' }}
        className="w-full border border-gray-300 rounded-md bg-white cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  )
}
