'use client'

import { useLayoutEffect, useRef, useState } from 'react'

interface EssayTextareaProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  onPasteBlocked?: () => void // Called on every blocked paste/drop, so attempts can be recorded
}

// Essay answer box: grows with its content (and can be dragged taller), and
// refuses pasted or dropped text so answers have to be typed.
export default function EssayTextarea({
  id,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  onPasteBlocked,
}: EssayTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [showPasteWarning, setShowPasteWarning] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const block = (e: React.SyntheticEvent) => {
    e.preventDefault()
    setShowPasteWarning(true)
    onPasteBlocked?.()
  }

  return (
    <div>
      <textarea
        ref={ref}
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={block}
        onDrop={block}
        // Catches paste from mobile keyboards and browser menus that skip onPaste
        onBeforeInput={(e) => {
          const inputType = (e.nativeEvent as InputEvent).inputType
          if (inputType === 'insertFromPaste' || inputType === 'insertFromDrop') block(e)
        }}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={8}
        className="w-full min-h-[12rem] px-4 py-2 border border-gray-300 rounded-md resize-y overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {showPasteWarning && (
        <p className="mt-1 text-xs text-red-600">
          Pasting is disabled for essay answers — please type your answer.
        </p>
      )}
    </div>
  )
}
