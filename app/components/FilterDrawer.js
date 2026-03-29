'use client'

import { useEffect, useRef, useState } from 'react'
import { GRADE_SCALE, GRADE_SCALE_MAX } from '@/constants/grades'

const TAG_OPTIONS = ['Crimpy', 'Slopey', 'Juggy', 'Overhang', 'Slab']

const STATUS_FILTER_OPTIONS = ['All', 'Flashed', 'Sent', 'Projects']

// ─── Grade range slider ───────────────────────────────────────────────────────

function GradeRangeSlider({ minIdx, maxIdx, onChange }) {
  const trackRef = useRef(null)
  const dragging = useRef(null)

  function idxFromX(clientX) {
    const rect = trackRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(pct * GRADE_SCALE_MAX)
  }

  function onPointerDown(handle, e) {
    e.preventDefault()
    dragging.current = handle
    trackRef.current.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (!dragging.current) return
    const idx = idxFromX(e.clientX)
    if (dragging.current === 'min') {
      onChange([Math.min(idx, maxIdx), maxIdx])
    } else {
      onChange([minIdx, Math.max(idx, minIdx)])
    }
  }

  function onPointerUp() {
    dragging.current = null
  }

  const minPct = (minIdx / GRADE_SCALE_MAX) * 100
  const maxPct = (maxIdx / GRADE_SCALE_MAX) * 100
  const isFullRange = minIdx === 0 && maxIdx === GRADE_SCALE_MAX

  return (
    <div className="select-none">
      <p className={`text-sm font-semibold mb-4 text-center ${isFullRange ? 'text-zinc-500' : 'text-zinc-100'}`}>
        {isFullRange ? 'All grades' : `${GRADE_SCALE[minIdx]} — ${GRADE_SCALE[maxIdx]}`}
      </p>
      <div
        ref={trackRef}
        className="relative h-1.5 bg-zinc-700 rounded-full mx-3 cursor-pointer"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute top-0 h-full bg-indigo-500 rounded-full pointer-events-none"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white shadow border-2 border-indigo-500 touch-none"
          style={{ left: `${minPct}%` }}
          onPointerDown={(e) => onPointerDown('min', e)}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white shadow border-2 border-indigo-500 touch-none"
          style={{ left: `${maxPct}%` }}
          onPointerDown={(e) => onPointerDown('max', e)}
        />
      </div>
      <div className="flex justify-between mt-3 px-2">
        <span className="text-xs text-zinc-600">VB</span>
        <span className="text-xs text-zinc-600">V10</span>
      </div>
    </div>
  )
}

// ─── Filter drawer ────────────────────────────────────────────────────────────

const ROUTE_STATUS_OPTIONS = [
  { value: 'new',      label: 'New Routes',    dotColor: '#22c55e' },
  { value: 'expiring', label: 'Expiring Soon', dotColor: '#eab308' },
]

export default function FilterDrawer({ open, onClose, onApply, activeGradeRange, activeTags, activeFavorites, activeStatus, activeRouteStatus = [] }) {
  const [pendingGradeRange, setPendingGradeRange] = useState(activeGradeRange)
  const [pendingTags, setPendingTags] = useState(activeTags)
  const [pendingFavorites, setPendingFavorites] = useState(activeFavorites)
  const [pendingStatus, setPendingStatus] = useState(activeStatus)
  const [pendingRouteStatus, setPendingRouteStatus] = useState(activeRouteStatus)

  useEffect(() => {
    if (open) {
      setPendingGradeRange(activeGradeRange)
      setPendingTags(activeTags)
      setPendingFavorites(activeFavorites)
      setPendingStatus(activeStatus)
      setPendingRouteStatus(activeRouteStatus)
    }
  }, [open])

  function toggleTag(tag) {
    setPendingTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function toggleRouteStatus(value) {
    setPendingRouteStatus((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function handleClear() {
    setPendingGradeRange([0, GRADE_SCALE_MAX])
    setPendingTags([])
    setPendingFavorites(false)
    setPendingStatus('All')
    setPendingRouteStatus([])
  }

  function handleApply() {
    onApply({ gradeRange: pendingGradeRange, tags: pendingTags, favorites: pendingFavorites, status: pendingStatus, routeStatus: pendingRouteStatus })
    onClose()
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        <div className="px-5 pt-3 pb-6">
          <h2 className="text-base font-semibold text-zinc-100 mb-5">Filter Climbs</h2>

          {/* My Progress */}
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">My Progress</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {STATUS_FILTER_OPTIONS.map((opt) => {
              const dotColor = opt === 'Flashed' ? '#3b82f6' : opt === 'Sent' ? '#22c55e' : opt === 'Projects' ? '#eab308' : null
              return (
                <button
                  key={opt}
                  onClick={() => setPendingStatus(opt)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    pendingStatus === opt
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {dotColor && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                  )}
                  {opt}
                </button>
              )
            })}
          </div>

          {/* Favorites toggle */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Favorites only</p>
            <button
              onClick={() => setPendingFavorites(f => !f)}
              className={`w-11 h-6 rounded-full transition-colors relative ${pendingFavorites ? 'bg-rose-500' : 'bg-zinc-700'}`}
              aria-pressed={pendingFavorites}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${pendingFavorites ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Grade range */}
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Grade</p>
          <div className="mb-6">
            <GradeRangeSlider
              minIdx={pendingGradeRange[0]}
              maxIdx={pendingGradeRange[1]}
              onChange={setPendingGradeRange}
            />
          </div>

          {/* Tags */}
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Style</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  pendingTags.includes(tag)
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Route Status */}
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Route Status</p>
          <div className="flex flex-wrap gap-2 mb-8">
            {ROUTE_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleRouteStatus(opt.value)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  pendingRouteStatus.includes(opt.value)
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.dotColor }} />
                {opt.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-900 text-sm font-semibold hover:bg-white transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
