'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

// ─── Grade config ─────────────────────────────────────────────────────────────

const GRADE_COLORS = {
  V0: 'bg-green-600', V1: 'bg-green-500', V2: 'bg-lime-500',
  V3: 'bg-yellow-500', V4: 'bg-orange-400', V5: 'bg-orange-500',
  V6: 'bg-red-500', V7: 'bg-red-600', V8: 'bg-rose-700',
  V9: 'bg-pink-700', V10: 'bg-purple-600', V11: 'bg-purple-700',
  V12: 'bg-violet-700', V13: 'bg-indigo-700', V14: 'bg-blue-700',
  V15: 'bg-sky-700', V16: 'bg-cyan-700', V17: 'bg-teal-700',
}

const GRADE_SCALE = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10']
const GRADE_SCALE_MAX = GRADE_SCALE.length - 1

function gradeToIdx(grade) {
  if (!grade) return -1
  return GRADE_SCALE.indexOf(grade.toUpperCase().trim())
}


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

const TAG_OPTIONS = ['Crimpy', 'Slopey', 'Juggy', 'Overhang', 'Slab']

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_PRIORITY = { flashed: 3, sent: 2, project: 1 }

const STATUS_BG = {
  flashed:   'rgba(59, 130, 246, 0.10)',
  sent:      'rgba(34, 197, 94, 0.10)',
  project:   'rgba(234, 179, 8, 0.10)',
  untouched: 'transparent',
}

const STATUS_FILTER_OPTIONS = ['All', 'Flashed', 'Sent', 'Projects']

function rawAscentStatus(a) {
  if (a.status === 'sent') return a.tries === 1 ? 'flashed' : 'sent'
  return 'project'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

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

// ─── Star rating ──────────────────────────────────────────────────────────────

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
    onSaved(attempts)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-800 pb-safe">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>
        <div className="px-5 pt-3 pb-6 flex flex-col gap-6 overflow-y-auto max-h-[80vh]">
          <h2 className="text-lg font-bold text-zinc-100">Log Ascent</h2>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Attempts</p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setAttempts(a => Math.max(1, a - 1))}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-xl font-light"
              >−</button>
              <span className="w-8 text-center text-xl font-bold text-zinc-100">{attempts}</span>
              <button
                type="button"
                onClick={() => setAttempts(a => a + 1)}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-xl font-light"
              >+</button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Difficulty</p>
            <StarRating value={difficulty} onChange={setDifficulty} color="text-orange-400" />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rating</p>
            <StarRating value={rating} onChange={setRating} color="text-yellow-400" />
          </div>

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

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3 -mt-2">{error}</p>
          )}

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

function FilterDrawer({ open, onClose, onApply, activeGradeRange, activeTags, activeFavorites, activeStatus }) {
  const [pendingGradeRange, setPendingGradeRange] = useState(activeGradeRange)
  const [pendingTags, setPendingTags] = useState(activeTags)
  const [pendingFavorites, setPendingFavorites] = useState(activeFavorites)
  const [pendingStatus, setPendingStatus] = useState(activeStatus)

  useEffect(() => {
    if (open) {
      setPendingGradeRange(activeGradeRange)
      setPendingTags(activeTags)
      setPendingFavorites(activeFavorites)
      setPendingStatus(activeStatus)
    }
  }, [open])

  function toggleTag(tag) {
    setPendingTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleClear() {
    setPendingGradeRange([0, GRADE_SCALE_MAX])
    setPendingTags([])
    setPendingFavorites(false)
    setPendingStatus('All')
  }

  function handleApply() {
    onApply({ gradeRange: pendingGradeRange, tags: pendingTags, favorites: pendingFavorites, status: pendingStatus })
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

export default function DiscoverPage() {
  const { id } = useParams()
  const router = useRouter()

  const [climbs, setClimbs] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter drawer opens automatically on first load only
  const [drawerOpen, setDrawerOpen] = useState(true)

  const [activeGradeRange, setActiveGradeRange] = useState([0, GRADE_SCALE_MAX])
  const [activeTags, setActiveTags] = useState([])
  const [activeFavorites, setActiveFavorites] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')

  const [favorites, setFavorites] = useState(new Set())
  const [ascents, setAscents] = useState({})
  const [modalClimb, setModalClimb] = useState(null)

  const currentUserId = useRef(null)

  const hasActiveFilters =
    (activeGradeRange[0] !== 0 || activeGradeRange[1] !== GRADE_SCALE_MAX) ||
    activeTags.length > 0 ||
    activeFavorites ||
    statusFilter !== 'All'

  function getClimbStatus(climbId) {
    return ascents[climbId] ?? 'untouched'
  }

  useEffect(() => {
    if (!id) return

    async function fetchData() {
      // Fetch zones for this gym
      const { data: zoneData } = await supabase
        .from('zones')
        .select('id, name')
        .eq('gym_id', id)

      const zones = zoneData ?? []
      if (zones.length === 0) {
        setLoading(false)
        return
      }

      const zoneIds = zones.map(z => z.id)
      const zoneMap = Object.fromEntries(zones.map(z => [z.id, z.name]))

      // Fetch all climbs across all zones + current user in parallel
      const [{ data: climbData }, { data: { user } }] = await Promise.all([
        supabase
          .from('climbs')
          .select('*')
          .in('zone_id', zoneIds),
        supabase.auth.getUser(),
      ])

      // Attach zone name and sort by repeat_count descending
      const allClimbs = (climbData ?? [])
        .map(c => ({ ...c, zoneName: zoneMap[c.zone_id] ?? '' }))
        .sort((a, b) => (b.repeat_count ?? 0) - (a.repeat_count ?? 0))

      setClimbs(allClimbs)

      if (user) {
        currentUserId.current = user.id
        const climbIds = allClimbs.map(c => c.id)

        if (climbIds.length > 0) {
          const [ascentRes, favRes] = await Promise.all([
            supabase.from('ascents').select('climb_id, status, tries')
              .eq('user_id', user.id).in('climb_id', climbIds),
            supabase.from('favorites').select('climb_id')
              .eq('user_id', user.id).in('climb_id', climbIds),
          ])

          if (ascentRes?.data) {
            const statusMap = {}
            for (const a of ascentRes.data) {
              const s = rawAscentStatus(a)
              const existing = statusMap[a.climb_id]
              if (!existing || STATUS_PRIORITY[s] > STATUS_PRIORITY[existing]) {
                statusMap[a.climb_id] = s
              }
            }
            setAscents(statusMap)
          }

          if (favRes?.data) {
            setFavorites(new Set(favRes.data.map(f => f.climb_id)))
          }
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [id])

  async function toggleFavorite(climbId) {
    const userId = currentUserId.current
    if (!userId) return

    const isFav = favorites.has(climbId)
    setFavorites(prev => {
      const next = new Set(prev)
      if (isFav) next.delete(climbId)
      else next.add(climbId)
      return next
    })

    if (isFav) {
      await supabase.from('favorites').delete()
        .eq('user_id', userId).eq('climb_id', climbId)
    } else {
      await supabase.from('favorites').insert({ user_id: userId, climb_id: climbId })
    }
  }

  function handleApplyFilters({ gradeRange, tags, favorites: favs, status }) {
    setActiveGradeRange(gradeRange)
    setActiveTags(tags)
    setActiveFavorites(favs)
    setStatusFilter(status)
  }

  const filtered = climbs.filter((c) => {
    if (activeGradeRange[0] !== 0 || activeGradeRange[1] !== GRADE_SCALE_MAX) {
      const idx = gradeToIdx(c.grade)
      if (idx === -1) return false
      if (idx < activeGradeRange[0] || idx > activeGradeRange[1]) return false
    }

    if (activeTags.length > 0) {
      const climbTags = (c.tags ?? []).map((t) => t.toLowerCase())
      const match = activeTags.some((t) => climbTags.includes(t.toLowerCase()))
      if (!match) return false
    }

    if (activeFavorites && !favorites.has(c.id)) return false

    if (statusFilter !== 'All') {
      const s = getClimbStatus(c.id)
      if (statusFilter === 'Flashed' && s !== 'flashed') return false
      if (statusFilter === 'Sent' && s !== 'sent') return false
      if (statusFilter === 'Projects' && s !== 'project') return false
    }

    return true
  })

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push(`/gym/${id}`)}
            className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <h1 className="flex-1 text-base font-semibold text-zinc-100">Find a Climb</h1>

          {!loading && (
            <span className="shrink-0 text-xs text-zinc-500 mr-1">
              {filtered.length} {filtered.length === 1 ? 'climb' : 'climbs'}
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
            {hasActiveFilters && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-zinc-950" />
            )}
          </div>
        </div>
      </div>

      {/* Climb list */}
      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <p className="text-center text-zinc-500 mt-12 text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-zinc-500 mt-12 text-sm">
            {hasActiveFilters ? 'No climbs match your filters.' : 'No climbs found.'}
          </p>
        ) : (
          <ul>
            {filtered.map((climb, index) => {
              const climbStatus = getClimbStatus(climb.id)
              return (
                <li
                  key={climb.id}
                  className={index !== 0 ? 'border-t border-zinc-800/60' : ''}
                  style={{ backgroundColor: STATUS_BG[climbStatus] }}
                >
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    {/* Grade badge */}
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

                    {/* Tags + zone name */}
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
                      {climb.zoneName ? (
                        <p className="text-xs text-zinc-500 mt-1.5 truncate">{climb.zoneName}</p>
                      ) : (
                        <p className="text-xs text-zinc-600 mt-1.5">
                          {(climb.repeat_count ?? 0) === 0 ? 'No repeats' : `${climb.repeat_count} ${climb.repeat_count === 1 ? 'repeat' : 'repeats'}`}
                        </p>
                      )}
                    </button>

                    {/* Actions */}
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
              )
            })}
          </ul>
        )}
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApply={handleApplyFilters}
        activeGradeRange={activeGradeRange}
        activeTags={activeTags}
        activeFavorites={activeFavorites}
        activeStatus={statusFilter}
      />

      {modalClimb && (
        <LogAscentModal
          climbId={modalClimb.id}
          initialAttempts={1}
          currentRepeatCount={modalClimb.repeat_count ?? 0}
          onClose={() => setModalClimb(null)}
          onSaved={(tries) => {
            const newStatus = tries === 1 ? 'flashed' : 'sent'
            setAscents(prev => {
              const existing = prev[modalClimb.id]
              if (!existing || STATUS_PRIORITY[newStatus] > STATUS_PRIORITY[existing]) {
                return { ...prev, [modalClimb.id]: newStatus }
              }
              return prev
            })
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
