'use client'

import { useEffect, useRef, useState } from 'react'
import { GRADE_SCALE, GRADE_SCALE_MAX } from '@/constants/grades'

// Default status options — zone/discover pages use this unchanged
const DEFAULT_STATUS_OPTIONS = ['All', 'Flashed', 'Sent', 'Projects']

const STATUS_DOT = {
  Flashed:   '#3b82f6',
  Sent:      '#22c55e',
  Projects:  '#eab308',
  Project:   '#eab308',
  Untouched: null,
}

const ZONE_TAG_OPTIONS = ['Crimpy', 'Slopey', 'Juggy', 'Overhang', 'Slab']

const ROUTE_STATUS_OPTIONS = [
  { value: 'new',      label: 'New Routes',    dotColor: '#22c55e' },
  { value: 'expiring', label: 'Expiring Soon', dotColor: '#eab308' },
]

const SORT_BY_OPTIONS = [
  'Most Popular', 'Most Logged', 'Most Unfinished', 'Most Commented',
  'Most Favorited', 'Most Sent', 'Most Flashed',
  'Newest', 'Oldest', 'Hardest', 'Easiest',
]

const DISCIPLINE_OPTIONS = ['Boulder', 'Lead', 'Top Rope', 'Autobelay']

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
    if (dragging.current === 'min') onChange([Math.min(idx, maxIdx), maxIdx])
    else onChange([minIdx, Math.max(idx, minIdx)])
  }

  function onPointerUp() { dragging.current = null }

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

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ value, onChange, activeColor = 'bg-indigo-500' }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${value ? activeColor : 'bg-zinc-700'}`}
      aria-pressed={value}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-zinc-500 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

// ─── Setter selection sheet ───────────────────────────────────────────────────

function SetterSheet({ open, onClose, profiles, selected, onToggle }) {
  if (!open) return null

  function displayName(p) {
    if (p.username) return `@${p.username}`
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
    return name || 'Unknown'
  }

  return (
    <>
      {/* Backdrop above the main drawer */}
      <div
        className="fixed inset-0 z-[55] bg-black/40"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-zinc-900 rounded-t-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>
        <div className="px-5 pt-2 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-100">Select Setters</h3>
            <button
              onClick={onClose}
              className="text-sm font-semibold text-indigo-400 active:opacity-60 transition-opacity"
            >
              Done
            </button>
          </div>
          {profiles.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No setters found</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profiles.map((p) => {
                const isSelected = selected.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => onToggle(p.id)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {displayName(p)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Filter drawer ────────────────────────────────────────────────────────────

export default function FilterDrawer({
  open,
  onClose,
  onApply,
  activeGradeRange,
  activeTags,
  activeFavorites,
  activeStatus,
  activeRouteStatus = [],
  // Gym landing page extras
  activeExcludeRepeats = false,
  activeSetters = [],
  activeGymTags = [],
  activeSort = 'Most Popular',
  activeDisciplines = [],
  setterProfiles = [],
  gymStyleOptions = null,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  showStyle = true,
  showRouteStatus = true,
  showDisciplines = false,
}) {
  const [pendingGradeRange, setPendingGradeRange] = useState(activeGradeRange)
  const [pendingTags, setPendingTags] = useState(activeTags)
  const [pendingFavorites, setPendingFavorites] = useState(activeFavorites)
  const [pendingStatus, setPendingStatus] = useState(activeStatus)
  const [pendingRouteStatus, setPendingRouteStatus] = useState(activeRouteStatus)
  const [pendingExcludeRepeats, setPendingExcludeRepeats] = useState(activeExcludeRepeats)
  const [pendingSetters, setPendingSetters] = useState(activeSetters)
  const [pendingGymTags, setPendingGymTags] = useState(activeGymTags)
  const [pendingSort, setPendingSort] = useState(activeSort)
  const [pendingDisciplines, setPendingDisciplines] = useState(activeDisciplines)
  const [setterSheetOpen, setSetterSheetOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setPendingGradeRange(activeGradeRange)
      setPendingTags(activeTags)
      setPendingFavorites(activeFavorites)
      setPendingStatus(activeStatus)
      setPendingRouteStatus(activeRouteStatus)
      setPendingExcludeRepeats(activeExcludeRepeats)
      setPendingSetters(activeSetters)
      setPendingGymTags(activeGymTags)
      setPendingSort(activeSort)
      setPendingDisciplines(activeDisciplines)
      setSetterSheetOpen(false)
    }
  }, [open])

  function toggleTag(tag) {
    setPendingTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function toggleGymTag(tag) {
    setPendingGymTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function toggleRouteStatus(value) {
    setPendingRouteStatus(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
  }

  function toggleSetter(id) {
    setPendingSetters(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function toggleDiscipline(d) {
    setPendingDisciplines(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function handleClear() {
    setPendingGradeRange([0, GRADE_SCALE_MAX])
    setPendingTags([])
    setPendingFavorites(false)
    setPendingStatus('All')
    setPendingRouteStatus([])
    setPendingExcludeRepeats(false)
    setPendingSetters([])
    setPendingGymTags([])
    setPendingSort('Most Popular')
    setPendingDisciplines([])
  }

  function handleApply() {
    onApply({
      gradeRange: pendingGradeRange,
      tags: pendingTags,
      favorites: pendingFavorites,
      status: pendingStatus,
      routeStatus: pendingRouteStatus,
      excludeRepeats: pendingExcludeRepeats,
      setters: pendingSetters,
      gymTags: pendingGymTags,
      sort: pendingSort,
      disciplines: pendingDisciplines,
    })
    onClose()
  }

  return (
    <>
      {/* Main backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Main drawer — fixed height flex column so content scrolls between header and footer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '88vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Fixed title */}
        <div className="px-5 pb-3 shrink-0">
          <h2 className="text-base font-semibold text-zinc-100">Filter Climbs</h2>
        </div>

        {/* Scrollable filter sections */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">

          {/* ── Discipline (gym page only) ── */}
          {showDisciplines && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Discipline</p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {DISCIPLINE_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDiscipline(d)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      pendingDisciplines.includes(d)
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Grade Scale ── */}
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Grade Scale</p>
          <div className="mb-6">
            <GradeRangeSlider
              minIdx={pendingGradeRange[0]}
              maxIdx={pendingGradeRange[1]}
              onChange={setPendingGradeRange}
            />
          </div>

          {/* ── My Progress ── */}
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">My Progress</p>
          <div className="flex flex-wrap gap-1.5 mb-6">
            {statusOptions.map((opt) => {
              const dotColor = STATUS_DOT[opt] ?? null
              return (
                <button
                  key={opt}
                  onClick={() => setPendingStatus(opt)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    pendingStatus === opt
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {dotColor && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />}
                  {opt}
                </button>
              )
            })}
          </div>

          {/* ── Toggles ── */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Favorites Only</p>
              <Toggle value={pendingFavorites} onChange={setPendingFavorites} activeColor="bg-rose-500" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Exclude Repeats</p>
              <Toggle value={pendingExcludeRepeats} onChange={setPendingExcludeRepeats} activeColor="bg-indigo-500" />
            </div>
          </div>

          {/* ── Setter (gym page only) ── */}
          {setterProfiles.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Setter</p>
              <button
                onClick={() => setSetterSheetOpen(true)}
                className="w-full flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3 active:bg-zinc-700 transition-colors"
              >
                <span className="text-sm font-medium text-zinc-300">
                  {pendingSetters.length === 0
                    ? 'Any setter'
                    : pendingSetters.length === 1
                      ? (() => {
                          const p = setterProfiles.find(s => s.id === pendingSetters[0])
                          return p?.username ? `@${p.username}` : 'Setter selected'
                        })()
                      : `${pendingSetters.length} setters selected`
                  }
                </span>
                <div className="flex items-center gap-2">
                  {pendingSetters.length > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 leading-none">
                      {pendingSetters.length}
                    </span>
                  )}
                  <ChevronRightIcon />
                </div>
              </button>
            </div>
          )}

          {/* ── Style (gym page only) ── */}
          {gymStyleOptions && gymStyleOptions.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Style</p>
              <div className="flex flex-wrap gap-2">
                {gymStyleOptions.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleGymTag(tag)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      pendingGymTags.includes(tag)
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Sort By (gym page only) — horizontally scrollable row ── */}
          {gymStyleOptions !== null && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Sort By</p>
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {SORT_BY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setPendingSort(opt)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      pendingSort === opt
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Style tags (zone / discover only) ── */}
          {showStyle && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Style</p>
              <div className="flex flex-wrap gap-2">
                {ZONE_TAG_OPTIONS.map((tag) => (
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
            </div>
          )}

          {/* ── Route Status ── */}
          {showRouteStatus && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Route Status</p>
              <div className="flex flex-wrap gap-2">
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
            </div>
          )}

        </div>

        {/* Fixed Apply / Clear footer */}
        <div className="px-5 pt-3 pb-6 shrink-0 border-t border-zinc-800">
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

      {/* Setter sub-sheet */}
      <SetterSheet
        open={setterSheetOpen}
        onClose={() => setSetterSheetOpen(false)}
        profiles={setterProfiles}
        selected={pendingSetters}
        onToggle={toggleSetter}
      />
    </>
  )
}
