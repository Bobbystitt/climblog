'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

// ─── Grade config ────────────────────────────────────────────────────────────

const GRADE_COLORS = {
  V0: 'bg-green-600', V1: 'bg-green-500', V2: 'bg-lime-500',
  V3: 'bg-yellow-500', V4: 'bg-orange-400', V5: 'bg-orange-500',
  V6: 'bg-red-500', V7: 'bg-red-600', V8: 'bg-rose-700',
  V9: 'bg-pink-700', V10: 'bg-purple-600', V11: 'bg-purple-700',
  V12: 'bg-violet-700', V13: 'bg-indigo-700', V14: 'bg-blue-700',
  V15: 'bg-sky-700', V16: 'bg-cyan-700', V17: 'bg-teal-700',
}

const GRADE_RANGES = {
  'All':   null,
  'V0–V2': ['V0', 'V1', 'V2'],
  'V3–V4': ['V3', 'V4'],
  'V5–V6': ['V5', 'V6'],
  'V7+':   ['V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'],
}

const TAG_OPTIONS = ['Crimpy', 'Slopey', 'Juggy', 'Overhang', 'Slab']

function gradeColor(grade) {
  if (!grade) return 'bg-zinc-600'
  const upper = grade.toUpperCase()
  if (GRADE_COLORS[upper]) return GRADE_COLORS[upper]
  if (upper.startsWith('5.5') || upper.startsWith('5.6')) return 'bg-green-600'
  if (upper.startsWith('5.7') || upper.startsWith('5.8')) return 'bg-lime-500'
  if (upper.startsWith('5.9'))  return 'bg-yellow-500'
  if (upper.startsWith('5.10')) return 'bg-orange-400'
  if (upper.startsWith('5.11')) return 'bg-orange-500'
  if (upper.startsWith('5.12')) return 'bg-red-500'
  if (upper.startsWith('5.13')) return 'bg-rose-700'
  if (upper.startsWith('5.14')) return 'bg-purple-600'
  if (upper.startsWith('5.15')) return 'bg-indigo-700'
  return 'bg-zinc-600'
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

// ─── Filter drawer ────────────────────────────────────────────────────────────

function FilterDrawer({ open, onClose, onApply, activeGrade, activeTags }) {
  const [pendingGrade, setPendingGrade] = useState(activeGrade)
  const [pendingTags, setPendingTags] = useState(activeTags)

  // Sync pending state from applied filters whenever drawer opens
  useEffect(() => {
    if (open) {
      setPendingGrade(activeGrade)
      setPendingTags(activeTags)
    }
  }, [open])

  function toggleTag(tag) {
    setPendingTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleClear() {
    setPendingGrade('All')
    setPendingTags([])
  }

  function handleApply() {
    onApply({ grade: pendingGrade, tags: pendingTags })
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        <div className="px-5 pt-3 pb-6">
          <h2 className="text-base font-semibold text-zinc-100 mb-5">Filter Climbs</h2>

          {/* Grade range */}
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Grade</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.keys(GRADE_RANGES).map((label) => (
              <button
                key={label}
                onClick={() => setPendingGrade(label)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  pendingGrade === label
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tags */}
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Style</p>
          <div className="flex flex-wrap gap-2 mb-8">
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ZonePage() {
  const { id } = useParams()
  const router = useRouter()

  const [zone, setZone] = useState(null)
  const [climbs, setClimbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeGrade, setActiveGrade] = useState('All')
  const [activeTags, setActiveTags] = useState([])

  const hasActiveFilters = activeGrade !== 'All' || activeTags.length > 0

  useEffect(() => {
    async function fetchData() {
      const [{ data: zoneData }, { data: climbData }] = await Promise.all([
        supabase.from('zones').select('*').eq('id', id).single(),
        supabase.from('climbs').select('*').eq('zone_id', id).order('name', { ascending: true }),
      ])
      if (zoneData) setZone(zoneData)
      if (climbData) setClimbs(climbData)
      setLoading(false)
    }
    if (id) fetchData()
  }, [id])

  function handleApplyFilters({ grade, tags }) {
    setActiveGrade(grade)
    setActiveTags(tags)
  }

  const filtered = climbs.filter((c) => {
    // Search
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false

    // Grade range
    const gradeList = GRADE_RANGES[activeGrade]
    if (gradeList && c.grade) {
      if (!gradeList.includes(c.grade.toUpperCase())) return false
    }

    // Tags (OR: climb must have at least one selected tag)
    if (activeTags.length > 0) {
      const climbTags = (c.tags ?? []).map((t) => t.toLowerCase())
      const match = activeTags.some((t) => climbTags.includes(t.toLowerCase()))
      if (!match) return false
    }

    return true
  })

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-zinc-100 truncate">
              {zone?.name ?? 'Zone'}
            </h1>
          </div>

          {!loading && (
            <span className="shrink-0 text-xs text-zinc-500 mr-1">
              {climbs.length} {climbs.length === 1 ? 'climb' : 'climbs'}
            </span>
          )}

          {/* Filter button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all rounded-lg hover:bg-zinc-800"
              aria-label="Open filters"
            >
              <FilterIcon />
            </button>
            {/* Active badge dot */}
            {hasActiveFilters && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-zinc-950" />
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <input
            type="text"
            placeholder="Search climbs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600"
          />
        </div>
      </div>

      {/* Climb list */}
      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <p className="text-center text-zinc-500 mt-12 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-zinc-500 mt-12 text-sm">
            {search || hasActiveFilters ? 'No climbs match your filters.' : 'No climbs in this zone.'}
          </p>
        ) : (
          <ul>
            {filtered.map((climb, index) => (
              <li key={climb.id} className={index !== 0 ? 'border-t border-zinc-800/60' : ''}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <button
                    onClick={() => router.push(`/climb/${climb.id}`)}
                    className="flex-1 min-w-0 text-left"
                    aria-label={`View ${climb.name}`}
                  >
                    <p className="font-medium text-zinc-100 truncate">{climb.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {climb.grade && (
                        <span className={`${gradeColor(climb.grade)} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
                          {climb.grade}
                        </span>
                      )}
                      {Array.isArray(climb.tags) && climb.tags.map((tag) => (
                        <span key={tag} className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">0 repeats</p>
                  </button>

                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => {/* TODO: log ascent */}}
                      className="p-2 text-zinc-500 hover:text-zinc-200 active:scale-90 transition-all rounded-lg hover:bg-zinc-800"
                      aria-label={`Log ascent for ${climb.name}`}
                    >
                      <PlusIcon />
                    </button>
                    <button
                      className="p-2 text-zinc-500 hover:text-rose-400 active:scale-90 transition-all rounded-lg hover:bg-zinc-800"
                      aria-label={`Favourite ${climb.name}`}
                    >
                      <HeartIcon />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApply={handleApplyFilters}
        activeGrade={activeGrade}
        activeTags={activeTags}
      />
      <BottomNav />
    </div>
  )
}
