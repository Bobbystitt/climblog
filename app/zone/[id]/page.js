'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import ClimbCard from '@/app/components/ClimbCard'
import FilterDrawer from '@/app/components/FilterDrawer'
import { GRADE_SCALE, GRADE_SCALE_MAX } from '@/constants/grades'
import {
  fetchZoneById,
  fetchClimbsByZone,
  fetchUserProfile,
  fetchUserAscentsByClimbs,
  fetchUserFavorites,
  toggleFavorite as dbToggleFavorite,
} from '@/lib/queries'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function gradeToIdx(grade) {
  if (!grade) return -1
  return GRADE_SCALE.indexOf(grade.toUpperCase().trim())
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
    onSaved(attempts)
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

// ─── Ascent status helpers ────────────────────────────────────────────────────

const STATUS_PRIORITY = { flashed: 3, sent: 2, project: 1 }

function rawAscentStatus(a) {
  if (a.status === 'sent') return a.tries === 1 ? 'flashed' : 'sent'
  return 'project'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ZonePage() {
  const { id } = useParams()
  const router = useRouter()

  const [zone, setZone] = useState(null)
  const [climbs, setClimbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeGradeRange, setActiveGradeRange] = useState([0, GRADE_SCALE_MAX])
  const [activeTags, setActiveTags] = useState([])
  const [activeFavorites, setActiveFavorites] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')

  const [favorites, setFavorites] = useState(new Set())
  const [ascents, setAscents] = useState({})
  const [modalClimb, setModalClimb] = useState(null)

  // Cache user id so toggleFavorite doesn't need to re-fetch auth on every tap
  const currentUserId = useRef(null)

  const hasActiveFilters = (activeGradeRange[0] !== 0 || activeGradeRange[1] !== GRADE_SCALE_MAX) || activeTags.length > 0 || activeFavorites || statusFilter !== 'All'

  function getClimbStatus(climbId) {
    return ascents[climbId] ?? 'untouched'
  }

  useEffect(() => {
    if (id) localStorage.setItem('savedPath', `/zone/${id}`)
  }, [id])

  useEffect(() => {
    async function fetchData() {
      const [zoneData, climbData, { data: { user } }] = await Promise.all([
        fetchZoneById(id),
        fetchClimbsByZone(id),
        supabase.auth.getUser(),
      ])
      if (zoneData) setZone(zoneData)
      const climbList = climbData
      setClimbs(climbList)

      if (user) {
        currentUserId.current = user.id

        const climbIds = climbList.map(c => c.id)
        const [profile, ascentData, favData] = await Promise.all([
          fetchUserProfile(user.id),
          climbIds.length > 0 ? fetchUserAscentsByClimbs(user.id, climbIds) : Promise.resolve([]),
          climbIds.length > 0 ? fetchUserFavorites(user.id, climbIds) : Promise.resolve([]),
        ])

        if (profile) setUserRole(profile.role)

        const statusMap = {}
        for (const a of ascentData) {
          const s = rawAscentStatus(a)
          const existing = statusMap[a.climb_id]
          if (!existing || STATUS_PRIORITY[s] > STATUS_PRIORITY[existing]) {
            statusMap[a.climb_id] = s
          }
        }
        setAscents(statusMap)
        setFavorites(new Set(favData.map(f => f.climb_id)))
      }

      setLoading(false)
    }
    if (id) fetchData()
  }, [id])

  async function toggleFavorite(climbId) {
    const userId = currentUserId.current
    if (!userId) return

    const isFav = favorites.has(climbId)

    // Update local Set immediately (optimistic) so UI responds instantly
    setFavorites(prev => {
      const next = new Set(prev)
      if (isFav) next.delete(climbId)
      else next.add(climbId)
      return next
    })

    // Persist to DB in the background
    await dbToggleFavorite(userId, climbId, isFav)
  }

  function handleApplyFilters({ gradeRange, tags, favorites: favs, status }) {
    setActiveGradeRange(gradeRange)
    setActiveTags(tags)
    setActiveFavorites(favs)
    setStatusFilter(status)
  }

  const filtered = climbs.filter((c) => {
    // Grade range — skip if full spectrum
    if (activeGradeRange[0] !== 0 || activeGradeRange[1] !== GRADE_SCALE_MAX) {
      const idx = gradeToIdx(c.grade)
      if (idx === -1) return false
      if (idx < activeGradeRange[0] || idx > activeGradeRange[1]) return false
    }

    // Tags (OR: climb must have at least one selected tag)
    if (activeTags.length > 0) {
      const climbTags = (c.tags ?? []).map((t) => t.toLowerCase())
      const match = activeTags.some((t) => climbTags.includes(t.toLowerCase()))
      if (!match) return false
    }

    // Favorites
    if (activeFavorites && !favorites.has(c.id)) return false

    // Status filter
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

      </div>

      {/* Climb list */}
      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <p className="text-center text-zinc-500 mt-12 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-zinc-500 mt-12 text-sm">
            {hasActiveFilters ? 'No climbs match your filters.' : 'No climbs in this zone.'}
          </p>
        ) : (
          <ul>
            {filtered.map((climb, index) => (
              <ClimbCard
                key={climb.id}
                climb={climb}
                climbStatus={getClimbStatus(climb.id)}
                isFavorited={favorites.has(climb.id)}
                onLogAscent={() => setModalClimb(climb)}
                onToggleFavorite={() => toggleFavorite(climb.id)}
                showBorder={index !== 0}
              />
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
        activeGradeRange={activeGradeRange}
        activeTags={activeTags}
        activeFavorites={activeFavorites}
        activeStatus={statusFilter}
      />

      {/* Log Ascent modal */}
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
