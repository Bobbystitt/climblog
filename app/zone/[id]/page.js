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

const CLIMB_COLORS = {
  red:    '#C0392B',
  blue:   '#2471A3',
  green:  '#1E8449',
  yellow: '#D4AC0D',
  orange: '#CA6F1E',
  purple: '#7D3C98',
  pink:   '#C0527A',
  white:  '#D5D8DC',
  gray:   '#707B7C',
  black:  '#2C3E50',
  tan:    '#C4A882',
}

function climbColor(color) {
  if (!color) return '#52525b'
  return CLIMB_COLORS[color.toLowerCase()] ?? '#52525b'
}

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

function HeartFilledIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  )
}

function StarIcon({ filled }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
}

// ─── Star rating ─────────────────────────────────────────────────────────────

function StarRating({ value, onChange, color = 'text-yellow-400' }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className={`transition-colors active:scale-90 ${n <= value ? color : 'text-zinc-700'}`}
        >
          <StarIcon filled={n <= value} />
        </button>
      ))}
    </div>
  )
}

// ─── Log Ascent Modal ─────────────────────────────────────────────────────────

function LogAscentModal({ climbId, initialAttempts, currentRepeatCount, onClose, onSaved }) {
  const [attempts, setAttempts] = useState(Math.max(1, initialAttempts))
  const [difficulty, setDifficulty] = useState(0)
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setError('Not logged in.'); return }

    const now = new Date().toISOString()

    const { error: insertError } = await supabase.from('ascents').insert({
      user_id: user.id,
      climb_id: climbId,
      tries: attempts,
      status: 'sent',
      notes: notes.trim() || null,
      climbed_at: now,
      difficulty_rating: difficulty || null,
      rating: rating || null,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    const { error: rpcError } = await supabase.rpc('increment_repeat_count', { climb_id: climbId })
    if (rpcError) {
      await supabase
        .from('climbs')
        .update({ repeat_count: (currentRepeatCount ?? 0) + 1 })
        .eq('id', climbId)
    }

    setSaving(false)
    onSaved()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-800 pb-safe">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        <div className="px-5 pt-3 pb-6 flex flex-col gap-6 overflow-y-auto max-h-[80vh]">
          <h2 className="text-lg font-bold text-zinc-100">Log Ascent</h2>

          {/* Attempts */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Attempts</p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setAttempts(a => Math.max(1, a - 1))}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-xl font-light"
              >
                −
              </button>
              <span className="w-8 text-center text-xl font-bold text-zinc-100">{attempts}</span>
              <button
                type="button"
                onClick={() => setAttempts(a => a + 1)}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-xl font-light"
              >
                +
              </button>
            </div>
          </div>

          {/* Difficulty rating */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Difficulty</p>
            <StarRating value={difficulty} onChange={setDifficulty} color="text-orange-400" />
          </div>

          {/* Overall rating */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rating</p>
            <StarRating value={rating} onChange={setRating} color="text-yellow-400" />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How'd it go? Key moves, beta…"
              rows={3}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 resize-none transition"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3 -mt-2">{error}</p>
          )}

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all text-white font-semibold text-base shadow-lg shadow-indigo-900/40"
          >
            {saving ? 'Saving…' : 'Save Ascent'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Filter drawer ────────────────────────────────────────────────────────────

function FilterDrawer({ open, onClose, onApply, activeGrade, activeTags, activeFavorites }) {
  const [pendingGrade, setPendingGrade] = useState(activeGrade)
  const [pendingTags, setPendingTags] = useState(activeTags)
  const [pendingFavorites, setPendingFavorites] = useState(activeFavorites)

  // Sync pending state from applied filters whenever drawer opens
  useEffect(() => {
    if (open) {
      setPendingGrade(activeGrade)
      setPendingTags(activeTags)
      setPendingFavorites(activeFavorites)
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
    setPendingFavorites(false)
  }

  function handleApply() {
    onApply({ grade: pendingGrade, tags: pendingTags, favorites: pendingFavorites })
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
  const [userRole, setUserRole] = useState(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeGrade, setActiveGrade] = useState('All')
  const [activeTags, setActiveTags] = useState([])
  const [activeFavorites, setActiveFavorites] = useState(false)

  const [favorites, setFavorites] = useState(new Set())
  const [modalClimb, setModalClimb] = useState(null)

  const hasActiveFilters = activeGrade !== 'All' || activeTags.length > 0 || activeFavorites

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile) setUserRole(profile.role)
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    if (id) localStorage.setItem('savedPath', `/zone/${id}`)
  }, [id])

  useEffect(() => {
    async function fetchData() {
      const [{ data: zoneData }, { data: climbData }] = await Promise.all([
        supabase.from('zones').select('*').eq('id', id).single(),
        supabase.from('climbs').select('*').eq('zone_id', id),
      ])
      if (zoneData) setZone(zoneData)
      setClimbs(climbData ?? [])
      setLoading(false)
    }
    if (id) fetchData()
  }, [id])

  // Fetch all favorites for this user on every mount so hearts always
  // reflect true persisted state regardless of navigation history
  useEffect(() => {
    async function fetchFavorites() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('favorites')
        .select('climb_id')
        .eq('user_id', user.id)
      setFavorites(new Set((data ?? []).map(f => f.climb_id)))
    }
    fetchFavorites()
  }, [])

  async function toggleFavorite(climbId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (favorites.has(climbId)) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('climb_id', climbId)
      setFavorites(prev => { const next = new Set(prev); next.delete(climbId); return next })
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, climb_id: climbId })
      setFavorites(prev => new Set([...prev, climbId]))
    }
  }

  function handleApplyFilters({ grade, tags, favorites: favs }) {
    setActiveGrade(grade)
    setActiveTags(tags)
    setActiveFavorites(favs)
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

    // Favorites
    if (activeFavorites && !favorites.has(c.id)) return false

    return true
  })

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push(`/gym/${zone?.gym_id}`)}
            className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-zinc-100 truncate">
              {zone?.name ?? 'Zone'}
            </h1>
            <p className="text-xs text-zinc-600 leading-none mt-0.5">left → right</p>
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
                  {/* Colored shape — primary climb identifier */}
                  <button
                    onClick={() => router.push(`/climb/${climb.id}`)}
                    className="shrink-0"
                    aria-label={`View climb ${climb.grade ?? ''}`}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: climbColor(climb.color) }}
                    >
                      <span className="text-white font-bold text-sm leading-none">{climb.grade || '?'}</span>
                    </div>
                  </button>

                  {/* Tags + repeat count */}
                  <button
                    onClick={() => router.push(`/climb/${climb.id}`)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {Array.isArray(climb.tags) && climb.tags.length > 0
                        ? climb.tags.map((tag) => (
                            <span key={tag} className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))
                        : <span className="text-zinc-600 text-xs">No tags</span>
                      }
                    </div>
                    <p className="text-xs text-zinc-600 mt-1.5">
                      {(climb.repeat_count ?? 0) === 0 ? 'No repeats' : `${climb.repeat_count} ${climb.repeat_count === 1 ? 'repeat' : 'repeats'}`}
                    </p>
                  </button>

                  <div className="shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => setModalClimb(climb)}
                      className="p-2 text-zinc-500 hover:text-zinc-200 active:scale-90 transition-all rounded-lg hover:bg-zinc-800"
                      aria-label="Log ascent"
                    >
                      <PlusIcon />
                    </button>
                    <button
                      onClick={() => toggleFavorite(climb.id)}
                      className={`p-2 active:scale-90 transition-all rounded-lg hover:bg-zinc-800 ${
                        favorites.has(climb.id) ? 'text-rose-500' : 'text-zinc-500 hover:text-rose-400'
                      }`}
                      aria-label={favorites.has(climb.id) ? 'Unfavorite' : 'Favourite'}
                    >
                      {favorites.has(climb.id) ? <HeartFilledIcon /> : <HeartIcon />}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Climb FAB — setters and admins only */}
      {(userRole === 'setter' || userRole === 'admin') && (
        <button
          onClick={() => router.push(`/climb/new?zone_id=${id}`)}
          className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-90 transition-all flex items-center justify-center shadow-lg shadow-indigo-900/50 text-white"
          aria-label="Add climb"
        >
          <PlusIcon />
        </button>
      )}

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApply={handleApplyFilters}
        activeGrade={activeGrade}
        activeTags={activeTags}
        activeFavorites={activeFavorites}
      />

      {/* Log Ascent modal */}
      {modalClimb && (
        <LogAscentModal
          climbId={modalClimb.id}
          initialAttempts={1}
          currentRepeatCount={modalClimb.repeat_count ?? 0}
          onClose={() => setModalClimb(null)}
          onSaved={() => {
            setClimbs(prev => prev.map(c =>
              c.id === modalClimb.id
                ? { ...c, repeat_count: (c.repeat_count ?? 0) + 1 }
                : c
            ))
            setModalClimb(null)
          }}
        />
      )}

      <BottomNav />
    </div>
  )
}
