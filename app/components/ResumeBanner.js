'use client'

import { useEffect, useState } from 'react'

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function ResumeBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('resumeActive') === '1') {
      setVisible(true)
      localStorage.removeItem('resumeActive')
    }
  }, [])

  function dismiss() {
    localStorage.removeItem('savedPath')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="mx-4 mt-3 mb-1 flex items-center gap-3 bg-indigo-600/10 border border-indigo-500/25 rounded-2xl px-4 py-3">
      <p className="flex-1 text-sm font-medium text-indigo-300">Back to where you left off</p>
      <button
        onClick={dismiss}
        className="shrink-0 text-indigo-400 hover:text-indigo-200 active:scale-90 transition-all p-0.5"
        aria-label="Dismiss"
      >
        <XIcon />
      </button>
    </div>
  )
}
