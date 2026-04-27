'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import ClimbCard from '@/app/components/ClimbCard'
import FilterDrawer from '@/app/components/FilterDrawer'
import { GRADE_SCALE, GRADE_SCALE_MAX, ROPE_GRADES } from '@/constants/grades'
import {
  fetchGymById,
  fetchZonesByGym,
  fetchClimbsByZones,
  fetchUserAscentsByClimbs,
  fetchUserFavorites,
  fetchUserProfile,
  fetchClimbCommentCounts,
  fetchClimbVideoCounts,
  fetchSetterProfiles,
  fetchClimbFavoriteCounts,
  fetchClimbUserAggregates,
  toggleFavorite as dbToggleFavorite,
} from '@/lib/queries'

const GYM_STYLE_OPTIONS = ['Crimpy', 'Slopey', 'Juggy', 'Overhang', 'Slab', 'Pinchy', 'Powerful', 'Balancy']

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

if (typeof window !== 'undefined') {
  window.history.scrollRestoration = 'manual'
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const DISCIPLINE_BADGE = {
  Boulder:    'bg-orange-500/10 text-orange-400',
  Lead:       'bg-blue-500/10 text-blue-400',
  'Top Rope': 'bg-green-500/10 text-green-400',
  Autobelay:  'bg-purple-500/10 text-purple-400',
}

function gradeToIdx(grade) {
  if (!grade) return -1
  return GRADE_SCALE.indexOf(grade.toUpperCase().trim())
}

function gradeRankForSort(grade) {
  if (!grade) return -1
  const g = grade.toUpperCase().trim()
  if (g === 'VB') return 0
  const vm = g.match(/^V(\d+)$/)
  if (vm) return parseInt(vm[1]) + 1
  const rIdx = ROPE_GRADES.indexOf(grade)
  if (rIdx !== -1) return 100 + rIdx
  return -1
}

function computeRotationStatus(climb) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let isNewRoute = false
  let expiryStatus = null
  let daysUntilReset = null
  if (climb.set_date) {
    const set = new Date(climb.set_date)
    set.setHours(0, 0, 0, 0)
    const daysSinceSet = Math.floor((today - set) / (1000 * 60 * 60 * 24))
    if (daysSinceSet >= 0 && daysSinceSet <= 7) isNewRoute = true
  }
  if (climb.planned_reset_date) {
    const reset = new Date(climb.planned_reset_date)
    reset.setHours(0, 0, 0, 0)
    const diff = Math.floor((reset - today) / (1000 * 60 * 60 * 24))
    if (diff < 0) { expiryStatus = 'overdue'; daysUntilReset = diff }
    else if (diff <= 7) { expiryStatus = 'expiring'; daysUntilReset = diff }
  }
  return { isNewRoute, expiryStatus, daysUntilReset }
}

function computeClimbStatus(climbId, ascentsMap) {
  // ascentsMap values are sorted ascending by climbed_at (from fetchUserAscentsByClimbs)
  const ascents = ascentsMap[climbId] ?? []
  if (ascents.length === 0) return 'untouched'
  const hasSent = ascents.some(a => a.status === 'sent')
  if (!hasSent) return 'project'
  // Flash only if the very first ever ascent was a send with 1 try
  const first = ascents[0]
  return (first.status === 'sent' && first.tries === 1) ? 'flashed' : 'sent'
}

function applyFilters(climbs, { gradeRange, tags, favorites, status, excludeRepeats, setters, gymTags, routeStatus }, ascentsMap, favoritedIds) {
  return climbs
    .filter(c => {
      if (gradeRange[0] !== 0 || gradeRange[1] !== GRADE_SCALE_MAX) {
        const idx = gradeToIdx(c.grade)
        if (idx === -1 || idx < gradeRange[0] || idx > gradeRange[1]) return false
      }
      if (tags.length > 0) {
        const ct = (c.tags ?? []).map(t => t.toLowerCase())
        if (!tags.some(t => ct.includes(t.toLowerCase()))) return false
      }
      if (gymTags.length > 0) {
        const ct = (c.tags ?? []).map(t => t.toLowerCase())
        if (!gymTags.some(t => ct.includes(t.toLowerCase()))) return false
      }
      if (favorites && !favoritedIds.has(c.id)) return false
      if (setters.length > 0 && !setters.includes(c.setter_id)) return false
      if (status !== 'All') {
        const s = computeClimbStatus(c.id, ascentsMap)
        if (status === 'Flashed'   && s !== 'flashed')  return false
        if (status === 'Sent'      && s !== 'sent')      return false
        if (status === 'Project'   && s !== 'project')   return false
        if (status === 'Untouched' && s !== 'untouched') return false
      }
      if (excludeRepeats) {
        const s = computeClimbStatus(c.id, ascentsMap)
        if (s === 'sent' || s === 'flashed') return false
      }
      if (routeStatus && routeStatus.length > 0) {
        const match = routeStatus.some(f => {
          if (f === 'new') return c.isNewRoute === true
          if (f === 'expiring') return c.expiryStatus === 'expiring' || c.expiryStatus === 'overdue'
          return false
        })
        if (!match) return false
      }
      return true
    })
    .sort((a, b) => (b.repeat_count ?? 0) - (a.repeat_count ?? 0))
}

function applySortToClimbs(climbs, sort, gymFavCountMap, gymAggMap, gymCommentCountMapAll) {
  const c = [...climbs]
  switch (sort) {
    case 'Most Logged':
      return c.sort((a, b) => (gymAggMap[b.id]?.total ?? 0) - (gymAggMap[a.id]?.total ?? 0))
    case 'Most Unfinished':
      return c.sort((a, b) => (gymAggMap[b.id]?.project ?? 0) - (gymAggMap[a.id]?.project ?? 0))
    case 'Most Commented':
      return c.sort((a, b) => (gymCommentCountMapAll[b.id] ?? 0) - (gymCommentCountMapAll[a.id] ?? 0))
    case 'Most Favorited':
      return c.sort((a, b) => (gymFavCountMap[b.id] ?? 0) - (gymFavCountMap[a.id] ?? 0))
    case 'Most Sent':
      return c.sort((a, b) => (gymAggMap[b.id]?.sent ?? 0) - (gymAggMap[a.id]?.sent ?? 0))
    case 'Most Flashed':
      return c.sort((a, b) => (gymAggMap[b.id]?.flashed ?? 0) - (gymAggMap[a.id]?.flashed ?? 0))
    case 'Newest':
      return c.sort((a, b) => (b.set_date ?? '') > (a.set_date ?? '') ? 1 : -1)
    case 'Oldest':
      return c.sort((a, b) => (a.set_date ?? '') > (b.set_date ?? '') ? 1 : -1)
    case 'Hardest':
      return c.sort((a, b) => gradeRankForSort(b.grade ?? b.rope_grade) - gradeRankForSort(a.grade ?? a.rope_grade))
    case 'Easiest':
      return c.sort((a, b) => gradeRankForSort(a.grade ?? a.rope_grade) - gradeRankForSort(b.grade ?? b.rope_grade))
    default: // 'Most Popular'
      return c.sort((a, b) => (b.repeat_count ?? 0) - (a.repeat_count ?? 0))
  }
}

// ── Icons ──────────────────────────────────────────────────────────────────────

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

function StarRating({ value, onChange, color = 'text-yellow-400' }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n === value ? 0 : n)}
          className={`transition-colors active:scale-90 ${n <= value ? color : 'text-zinc-700'}`}>
          <StarIcon filled={n <= value} />
        </button>
      ))}
    </div>
  )
}

function LogAscentModal({ climbId, currentRepeatCount, onClose, onSaved }) {
  const [attempts, setAttempts] = useState(1)
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

    const { error: insertError } = await supabase.from('ascents').insert({
      user_id: user.id, climb_id: climbId, tries: attempts, status: 'sent',
      notes: notes.trim() || null, climbed_at: new Date().toISOString(),
      difficulty_rating: difficulty || null, rating: rating || null,
    })
    if (insertError) { setError(insertError.message); setSaving(false); return }

    const { error: rpcError } = await supabase.rpc('increment_repeat_count', { climb_id: climbId })
    if (rpcError) { await supabase.from('climbs').update({ repeat_count: (currentRepeatCount ?? 0) + 1 }).eq('id', climbId) }

    setSaving(false)
    onSaved(attempts)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-800 pb-safe">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-zinc-700" /></div>
        <div className="px-5 pt-3 pb-6 flex flex-col gap-6 overflow-y-auto max-h-[80vh]">
          <h2 className="text-lg font-bold text-zinc-100">Log Ascent</h2>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Attempts</p>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setAttempts(a => Math.max(1, a - 1))}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-xl font-light">−</button>
              <span className="w-8 text-center text-xl font-bold text-zinc-100">{attempts}</span>
              <button type="button" onClick={() => setAttempts(a => a + 1)}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-xl font-light">+</button>
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
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How'd it go? Key moves, beta…" rows={3}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 resize-none transition" />
          </div>
          {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3 -mt-2">{error}</p>}
          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all text-white font-semibold text-base shadow-lg shadow-indigo-900/40">
            {saving ? 'Saving…' : 'Save Ascent'}
          </button>
        </div>
      </div>
    </>
  )
}

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
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

function ChevronIcon({ open }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
      className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function GymPage() {
  const { id } = useParams()
  const router = useRouter()
  const heroInputRef = useRef(null)
  const heroRef     = useRef(null)

  // Stable refs used inside async callbacks to avoid stale closures.
  const userIdRef       = useRef(null)
  const allClimbsRef    = useRef([])       // mirror of allClimbs state
  const zonesRef        = useRef([])       // mirror of zones for use in loadClimbsForDisciplines
  const zoneRequestedRef = useRef(new Set()) // zones whose data has been requested
  const pendingRestoreRef = useRef(null)   // { tab, expandedZoneId?, climbId? }

  // ── Core state ──
  const [gym, setGym]               = useState(null)
  const [zones, setZones]           = useState([])
  const [allClimbs, setAllClimbs]   = useState([])
  const [zoneClimbCount, setZoneClimbCount] = useState({})
  const [zoneHasNew, setZoneHasNew] = useState({})
  const [loading, setLoading]       = useState(true)
  const [heroUrl, setHeroUrl]       = useState(null)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [showStickyHeader, setShowStickyHeader] = useState(false)
  const [userId, setUserId]         = useState(null)
  const [isAdmin, setIsAdmin]       = useState(false)

  // ── Tab ──
  const [activeTab, setActiveTab] = useState('zones')

  // ── Accordion ──
  const [expandedZoneId, setExpandedZoneId] = useState(null)
  // { [zoneId]: { commentCounts: {climbId: n}, videoCounts: {climbId: n} } }
  const [zoneDataCache, setZoneDataCache]   = useState({})
  const [zoneLoadingSet, setZoneLoadingSet] = useState(new Set())
  const [highlightClimbId, setHighlightClimbId] = useState(null)

  // ── Log ascent modal ──
  const [logModalClimb, setLogModalClimb] = useState(null)
  const [toast, setToast]               = useState(false)

  // ── Shared user data ──
  const [ascentsMap, setAscentsMap]     = useState({})
  const [favoritedIds, setFavoritedIds] = useState(new Set())

  // ── Filter state ──
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [activeGradeRange, setActiveGradeRange] = useState([0, GRADE_SCALE_MAX])
  const [activeTags, setActiveTags]       = useState([])
  const [activeFavorites, setActiveFavorites] = useState(false)
  const [activeStatus, setActiveStatus]   = useState('All')
  const [activeExcludeRepeats, setActiveExcludeRepeats] = useState(false)
  const [activeSetters, setActiveSetters] = useState([])
  const [activeGymTags, setActiveGymTags] = useState([])
  const [activeSort, setActiveSort] = useState('Most Popular')
  const [activeRouteStatus, setActiveRouteStatus] = useState([])
  const [activeDisciplines, setActiveDisciplines] = useState([])
  const [setterProfiles, setSetterProfiles] = useState([])

  // ── Sort By data maps ──
  const [gymFavCountMap, setGymFavCountMap] = useState({})
  const [gymAggMap, setGymAggMap] = useState({})
  const [gymCommentCountMapAll, setGymCommentCountMapAll] = useState({})

  // ── Read saved state from sessionStorage on mount ──────────────────────────
  useEffect(() => {
    if (!id) return

    try {
      const raw = sessionStorage.getItem(`gymPageState_${id}`)
      if (raw) {
        const state = JSON.parse(raw)
        sessionStorage.removeItem(`gymPageState_${id}`)
        pendingRestoreRef.current = state
        if (state.tab) setActiveTab(state.tab)
        if (state.expandedZoneId) setExpandedZoneId(state.expandedZoneId)
      }
    } catch {}

    try {
      const rawFilters = sessionStorage.getItem(`gymFilters_${id}`)
      if (rawFilters) {
        const saved = JSON.parse(rawFilters)
        if (Array.isArray(saved.gradeRange) && saved.gradeRange.length === 2) setActiveGradeRange(saved.gradeRange)
        if (Array.isArray(saved.tags)) setActiveTags(saved.tags)
        if (typeof saved.favorites === 'boolean') setActiveFavorites(saved.favorites)
        if (typeof saved.status === 'string') setActiveStatus(saved.status)
        if (typeof saved.excludeRepeats === 'boolean') setActiveExcludeRepeats(saved.excludeRepeats)
        if (Array.isArray(saved.setters)) setActiveSetters(saved.setters)
        if (Array.isArray(saved.gymTags)) setActiveGymTags(saved.gymTags)
        if (Array.isArray(saved.routeStatus)) setActiveRouteStatus(saved.routeStatus)
        if (typeof saved.sort === 'string') setActiveSort(saved.sort)
        if (Array.isArray(saved.disciplines)) setActiveDisciplines(saved.disciplines)
      }
    } catch {}
  }, [id])

  // ── Scroll restore: Climbs tab — fires when allClimbs arrives ──────────────
  useEffect(() => {
    const pending = pendingRestoreRef.current
    if (!pending || pending.tab !== 'climbs' || !pending.climbId) return
    if (allClimbs.length === 0) return

    pendingRestoreRef.current = null

    requestAnimationFrame(() => {
      const el = document.getElementById(`climb-${pending.climbId}`)
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 110
        window.history.scrollRestoration = 'manual'
        window.scrollTo({ top, behavior: 'instant' })
        requestAnimationFrame(() => window.scrollTo({ top, behavior: 'instant' }))
      }
      setHighlightClimbId(pending.climbId)
      setTimeout(() => setHighlightClimbId(null), 1200)
    })
  }, [allClimbs])

  // ── Scroll restore: Zones tab — fires when accordion zone data arrives ─────
  useEffect(() => {
    const pending = pendingRestoreRef.current
    if (!pending || pending.tab !== 'zones' || !pending.climbId) return
    if (!zoneDataCache[pending.expandedZoneId]) return

    pendingRestoreRef.current = null

    requestAnimationFrame(() => {
      const el = document.getElementById(`climb-${pending.climbId}`)
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 110
        window.history.scrollRestoration = 'manual'
        window.scrollTo({ top, behavior: 'instant' })
        requestAnimationFrame(() => window.scrollTo({ top, behavior: 'instant' }))
      }
      setHighlightClimbId(pending.climbId)
      setTimeout(() => setHighlightClimbId(null), 1200)
    })
  }, [zoneDataCache])

  // ── IntersectionObserver on hero ───────────────────────────────────────────
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyHeader(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [gym])

  // ── Initial data fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    localStorage.setItem('savedPath', `/gym/${id}`)

    async function fetchData() {
      const [{ data: { user } }, gymData, zonesArr] = await Promise.all([
        supabase.auth.getUser(),
        fetchGymById(id),
        fetchZonesByGym(id),
      ])

      setGym(gymData)
      setHeroUrl(gymData?.hero_image_url ?? null)
      setZones(zonesArr)
      zonesRef.current = zonesArr

      if (user) {
        userIdRef.current = user.id
        setUserId(user.id)
        const profile = await fetchUserProfile(user.id)
        if (profile?.role === 'admin') setIsAdmin(true)
      }

      await loadClimbsForDisciplines([])
      setLoading(false)
    }

    fetchData()
    // Fetch setter/admin profiles for the filter drawer (independent of main load)
    fetchSetterProfiles().then(profiles => setSetterProfiles(profiles))
  }, [id])

  // ── Trigger accordion data load when a zone is expanded ───────────────────
  // Climbs are already in allClimbs; this only fetches comment & video counts.
  useEffect(() => {
    if (!expandedZoneId || loading) return
    if (zoneRequestedRef.current.has(expandedZoneId)) return
    loadZoneData(expandedZoneId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedZoneId, loading])

  async function loadZoneData(zoneId) {
    if (zoneRequestedRef.current.has(zoneId)) return
    zoneRequestedRef.current.add(zoneId)

    const zoneClimbs = allClimbsRef.current.filter(c => c.zone_id === zoneId)
    const climbIds = zoneClimbs.map(c => c.id)

    if (climbIds.length === 0) {
      setZoneDataCache(prev => ({ ...prev, [zoneId]: { commentCounts: {}, videoCounts: {} } }))
      return
    }

    setZoneLoadingSet(prev => new Set([...prev, zoneId]))

    const [commentRows, videoRows] = await Promise.all([
      fetchClimbCommentCounts(climbIds),
      fetchClimbVideoCounts(climbIds),
    ])

    const commentCounts = {}
    commentRows.forEach(r => { commentCounts[r.climb_id] = (commentCounts[r.climb_id] ?? 0) + 1 })

    const videoCounts = {}
    videoRows.forEach(r => { videoCounts[r.climb_id] = (videoCounts[r.climb_id] ?? 0) + 1 })

    setZoneDataCache(prev => ({ ...prev, [zoneId]: { commentCounts, videoCounts } }))
    setZoneLoadingSet(prev => { const next = new Set(prev); next.delete(zoneId); return next })
  }

  // ── Climb loader — called on initial load and every Apply press ───────────

  async function loadClimbsForDisciplines(disciplinesFilter) {
    const allZones = zonesRef.current
    if (allZones.length === 0) return

    const matchingZones = disciplinesFilter.length > 0
      ? allZones.filter(z => disciplinesFilter.includes(z.discipline))
      : allZones

    const zoneIds = matchingZones.map(z => z.id)
    const zoneNameMap = {}
    allZones.forEach(z => { zoneNameMap[z.id] = z.name ?? '' })

    const rawClimbs = zoneIds.length > 0 ? await fetchClimbsByZones(zoneIds) : []
    const climbs = rawClimbs.map(c => ({ ...c, zoneName: zoneNameMap[c.zone_id] ?? '', ...computeRotationStatus(c) }))

    allClimbsRef.current = climbs
    setAllClimbs(climbs)

    // Reset zone-level caches so expanded zones re-fetch counts for the new set
    zoneRequestedRef.current = new Set()
    setZoneDataCache({})

    const cutoff = new Date(Date.now() - SEVEN_DAYS_MS)
    const counts = {}
    const hasNew = {}
    climbs.forEach(c => {
      counts[c.zone_id] = (counts[c.zone_id] ?? 0) + 1
      if (c.set_date && new Date(c.set_date) >= cutoff) hasNew[c.zone_id] = true
    })
    setZoneClimbCount(counts)
    setZoneHasNew(hasNew)

    const climbIds = climbs.map(c => c.id)

    if (climbIds.length > 0) {
      fetchClimbFavoriteCounts(climbIds).then(favRows => {
        const favMap = {}
        favRows.forEach(r => { favMap[r.climb_id] = (favMap[r.climb_id] ?? 0) + 1 })
        setGymFavCountMap(favMap)
      })
      fetchClimbUserAggregates(climbIds).then(aggRows => {
        const aggMap = {}
        aggRows.forEach(r => {
          if (!aggMap[r.climb_id]) aggMap[r.climb_id] = { total: 0, sent: 0, flashed: 0, project: 0 }
          aggMap[r.climb_id].total += 1
          if (r.best_status === 'sent' || r.best_status === 'flashed') aggMap[r.climb_id].sent += 1
          if (r.is_flash) aggMap[r.climb_id].flashed += 1
          if (r.best_status === 'project') aggMap[r.climb_id].project += 1
        })
        setGymAggMap(aggMap)
      })
      fetchClimbCommentCounts(climbIds).then(commentRows => {
        const commentMap = {}
        commentRows.forEach(r => { commentMap[r.climb_id] = (commentMap[r.climb_id] ?? 0) + 1 })
        setGymCommentCountMapAll(commentMap)
      })
    } else {
      setGymFavCountMap({})
      setGymAggMap({})
      setGymCommentCountMapAll({})
    }

    const uid = userIdRef.current
    if (uid && climbIds.length > 0) {
      const [ascentsArr, favsArr] = await Promise.all([
        fetchUserAscentsByClimbs(uid, climbIds),
        fetchUserFavorites(uid, climbIds),
      ])
      const aMap = {}
      ascentsArr.forEach(a => {
        if (!aMap[a.climb_id]) aMap[a.climb_id] = []
        aMap[a.climb_id].push(a)
      })
      setAscentsMap(aMap)
      setFavoritedIds(new Set(favsArr.map(f => f.climb_id)))
    } else {
      setAscentsMap({})
      setFavoritedIds(new Set())
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleZoneToggle(zoneId) {
    setExpandedZoneId(prev => (prev === zoneId ? null : zoneId))
  }

  async function handleToggleFavorite(climbId) {
    if (!userId) return
    const isFav = favoritedIds.has(climbId)
    setFavoritedIds(prev => {
      const next = new Set(prev)
      isFav ? next.delete(climbId) : next.add(climbId)
      return next
    })
    await dbToggleFavorite(userId, climbId, isFav)
  }

  async function handleHeroUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploadingHero(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('gym-images').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('gym-images').getPublicUrl(path)
      await supabase.from('gyms').update({ hero_image_url: publicUrl }).eq('id', id)
      setHeroUrl(publicUrl)
    } finally {
      setUploadingHero(false)
    }
  }

  function handleApplyFilters({ gradeRange, tags, favorites, status, excludeRepeats, setters, gymTags, routeStatus, sort, disciplines }) {
    setActiveGradeRange(gradeRange)
    setActiveTags(tags)
    setActiveFavorites(favorites)
    setActiveStatus(status)
    setActiveExcludeRepeats(excludeRepeats)
    setActiveSetters(setters)
    setActiveGymTags(gymTags)
    setActiveRouteStatus(routeStatus ?? [])
    setActiveSort(sort ?? 'Most Popular')
    setActiveDisciplines(disciplines ?? [])
    try {
      sessionStorage.setItem(`gymFilters_${id}`, JSON.stringify({ gradeRange, tags, favorites, status, excludeRepeats, setters, gymTags, routeStatus: routeStatus ?? [], sort: sort ?? 'Most Popular', disciplines: disciplines ?? [] }))
    } catch {}
    // Always run a fresh DB query — discipline filtering happens at the query level.
    // After the reload, re-trigger zone data for any currently-expanded zone.
    loadClimbsForDisciplines(disciplines ?? []).then(() => {
      if (expandedZoneId) loadZoneData(expandedZoneId)
    })
  }

  function handleLogAscentSaved(climb, tries) {
    setAscentsMap(prev => {
      const existing = prev[climb.id] ?? []
      // Append at end — new ascent is the latest, so ascending order is preserved
      return { ...prev, [climb.id]: [...existing, { status: 'sent', tries, climb_id: climb.id, climbed_at: new Date().toISOString() }] }
    })
    setAllClimbs(prev => prev.map(c =>
      c.id === climb.id ? { ...c, repeat_count: (c.repeat_count ?? 0) + 1 } : c
    ))
    setLogModalClimb(null)
    setToast(true)
    setTimeout(() => setToast(false), 2500)
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const hasActiveFilters = activeGradeRange[0] !== 0 || activeGradeRange[1] !== GRADE_SCALE_MAX
    || activeTags.length > 0 || activeFavorites || activeStatus !== 'All' || activeExcludeRepeats
    || activeSetters.length > 0 || activeGymTags.length > 0
    || activeRouteStatus.length > 0 || activeSort !== 'Most Popular'
    || activeDisciplines.length > 0

  const filters = { gradeRange: activeGradeRange, tags: activeTags, favorites: activeFavorites, status: activeStatus, excludeRepeats: activeExcludeRepeats, setters: activeSetters, gymTags: activeGymTags, routeStatus: activeRouteStatus }

  const filteredClimbs = applySortToClimbs(
    applyFilters(allClimbs, filters, ascentsMap, favoritedIds),
    activeSort,
    gymFavCountMap,
    gymAggMap,
    gymCommentCountMapAll,
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading && !gym) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100`}>

      <style>{`
        @keyframes gym-card-highlight {
          0%   { box-shadow: none; }
          15%  { box-shadow: 0 0 0 2px rgba(129,140,248,0.75); }
          75%  { box-shadow: 0 0 0 2px rgba(129,140,248,0.75); }
          100% { box-shadow: none; }
        }
        .gym-card-highlight { animation: gym-card-highlight 1.2s ease forwards; }
      `}</style>

      {/* ── Sliding sticky header ── */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
          transform: showStickyHeader ? 'translateY(0)' : 'translateY(-100%)',
          opacity: showStickyHeader ? 1 : 0,
          pointerEvents: showStickyHeader ? 'auto' : 'none',
          transition: 'transform 200ms ease, opacity 200ms ease',
        }}
        className="bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800"
      >
        <div className="flex items-center gap-2 px-4 h-14">
          <h2 className="font-bold text-base text-zinc-100 truncate flex-1 min-w-0">
            {gym?.name ?? '…'}
          </h2>
          <button
            onClick={() => router.push(`/gym/${id}/details`)}
            className="shrink-0 text-blue-400 text-sm font-medium active:opacity-60 transition-opacity"
          >
            Gym Details
          </button>
          <div className="relative shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all rounded-lg hover:bg-zinc-800"
              aria-label="Open filters"
            >
              <FilterIcon />
            </button>
            {hasActiveFilters && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-zinc-950" />
            )}
          </div>
        </div>
      </div>

      {/* ── Hero image ── */}
      <div ref={heroRef} className="relative w-full" style={{ aspectRatio: '16/9', minHeight: 200 }}>
        {heroUrl
          ? <img src={heroUrl} alt={gym?.name} className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 bg-zinc-900" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

        {isAdmin && (
          <>
            <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
            <button
              onClick={() => heroInputRef.current?.click()}
              disabled={uploadingHero}
              className="absolute top-4 right-4 z-10 bg-black/40 backdrop-blur-sm text-white rounded-full p-2 active:scale-90 transition-all disabled:opacity-50"
              aria-label="Upload hero image"
            >
              {uploadingHero
                ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <CameraIcon />
              }
            </button>
          </>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex items-end justify-between gap-3">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">{gym?.name ?? '…'}</h1>
          <button
            onClick={() => router.push(`/gym/${id}/details`)}
            className="shrink-0 text-blue-400 text-sm font-medium pb-1 active:opacity-60 transition-opacity drop-shadow"
          >
            Gym Details
          </button>
        </div>
      </div>

      {/* ── Tab toggle ── */}
      <div
        className="sticky z-20 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 px-4 py-3 transition-all duration-200"
        style={{ top: showStickyHeader ? 56 : 0 }}
      >
        <div className="flex rounded-xl bg-zinc-800 p-1 gap-1">
          {[['zones', 'Zones'], ['climbs', 'Climbs']].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === key ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="pb-28">

        {/* ── Zones tab: accordion ── */}
        {activeTab === 'zones' && (
          loading ? (
            <div className="flex flex-col gap-2 px-4 pt-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[68px] rounded-2xl bg-zinc-900 animate-pulse" />
              ))}
            </div>
          ) : zones.length === 0 ? (
            <p className="text-center text-zinc-600 text-sm py-12">No zones yet.</p>
          ) : (
            <div className="flex flex-col gap-2 px-4 pt-3">
              {zones.map(zone => {
                const isOpen         = expandedZoneId === zone.id
                const isLoadingCounts = zoneLoadingSet.has(zone.id)
                const zoneData       = zoneDataCache[zone.id]
                const totalCount     = zoneClimbCount[zone.id] ?? 0

                // Climbs for this zone come from the already-fetched allClimbs.
                const zoneClimbs    = allClimbs.filter(c => c.zone_id === zone.id)
                const filteredZone  = zoneData
                  ? applyFilters(zoneClimbs, filters, ascentsMap, favoritedIds)
                  : []

                return (
                  <div key={zone.id} id={`zone-${zone.id}`} className="rounded-2xl overflow-hidden bg-zinc-900">

                    {/* Zone header */}
                    <button
                      type="button"
                      onClick={() => handleZoneToggle(zone.id)}
                      className={`w-full flex items-center gap-3 px-4 py-4 text-left transition-colors ${
                        isOpen ? 'bg-zinc-800' : 'hover:bg-zinc-800/60 active:bg-zinc-800'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-zinc-100 truncate">{zone.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {isOpen && zoneData && hasActiveFilters
                            ? `${filteredZone.length} of ${totalCount} climbs`
                            : `${totalCount} ${totalCount === 1 ? 'climb' : 'climbs'}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {zone.discipline && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DISCIPLINE_BADGE[zone.discipline] ?? 'bg-zinc-700/50 text-zinc-400'}`}>
                            {zone.discipline}
                          </span>
                        )}
                        {zoneHasNew[zone.id] && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
                            New
                          </span>
                        )}
                        <ChevronIcon open={isOpen} />
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isOpen && (
                      <div className="border-t border-zinc-800">
                        {isLoadingCounts ? (
                          <div className="flex flex-col gap-2 px-4 py-3">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="h-14 rounded-xl bg-zinc-800 animate-pulse" />
                            ))}
                          </div>
                        ) : filteredZone.length === 0 ? (
                          <p className="text-center text-zinc-600 text-sm py-8">
                            {hasActiveFilters ? 'No climbs match your filters.' : 'No climbs in this zone.'}
                          </p>
                        ) : (
                          <ul>
                            {filteredZone.map((climb, i) => (
                              <div
                                key={climb.id}
                                id={`climb-${climb.id}`}
                                className={highlightClimbId === climb.id ? 'gym-card-highlight' : ''}
                                onClickCapture={() => {
                                  sessionStorage.setItem(
                                    `gymPageState_${id}`,
                                    JSON.stringify({ tab: 'zones', expandedZoneId: zone.id, climbId: climb.id })
                                  )
                                }}
                              >
                                <ClimbCard
                                  climb={climb}
                                  climbStatus={computeClimbStatus(climb.id, ascentsMap)}
                                  isFavorited={favoritedIds.has(climb.id)}
                                  onLogAscent={c => setLogModalClimb(c)}
                                  onToggleFavorite={handleToggleFavorite}
                                  showBorder={i !== 0}
                                  videoCount={zoneData?.videoCounts[climb.id] ?? 0}
                                  commentCount={zoneData?.commentCounts[climb.id] ?? 0}
                                />
                              </div>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── Climbs tab: flat list ── */}
        {activeTab === 'climbs' && (
          loading ? (
            <div className="flex flex-col gap-0 pt-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-zinc-900 animate-pulse mx-4 rounded-xl mb-2" />
              ))}
            </div>
          ) : filteredClimbs.length === 0 ? (
            <p className="text-center text-zinc-600 text-sm py-12">
              {hasActiveFilters ? 'No climbs match your filters.' : 'No climbs yet.'}
            </p>
          ) : (
            <div className="pt-1">
              {filteredClimbs.map((climb, i) => (
                <div
                  key={climb.id}
                  id={`climb-${climb.id}`}
                  className={highlightClimbId === climb.id ? 'gym-card-highlight' : ''}
                  onClickCapture={() => {
                    sessionStorage.setItem(
                      `gymPageState_${id}`,
                      JSON.stringify({ tab: 'climbs', climbId: climb.id })
                    )
                  }}
                >
                  <ClimbCard
                    climb={climb}
                    climbStatus={computeClimbStatus(climb.id, ascentsMap)}
                    isFavorited={favoritedIds.has(climb.id)}
                    onLogAscent={c => setLogModalClimb(c)}
                    onToggleFavorite={handleToggleFavorite}
                    showBorder={i !== 0}
                  />
                </div>
              ))}
            </div>
          )
        )}

      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApply={handleApplyFilters}
        activeGradeRange={activeGradeRange}
        activeTags={[]}
        activeFavorites={activeFavorites}
        activeStatus={activeStatus}
        activeRouteStatus={activeRouteStatus}
        activeExcludeRepeats={activeExcludeRepeats}
        activeSetters={activeSetters}
        activeGymTags={activeGymTags}
        activeSort={activeSort}
        activeDisciplines={activeDisciplines}
        setterProfiles={setterProfiles}
        gymStyleOptions={GYM_STYLE_OPTIONS}
        statusOptions={['All', 'Sent', 'Flashed', 'Project', 'Untouched']}
        showStyle={false}
        showRouteStatus={true}
        showDisciplines={true}
      />

      {logModalClimb && (
        <LogAscentModal
          climbId={logModalClimb.id}
          currentRepeatCount={logModalClimb.repeat_count ?? 0}
          onClose={() => setLogModalClimb(null)}
          onSaved={(tries) => handleLogAscentSaved(logModalClimb, tries)}
        />
      )}

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3 flex items-center gap-2 shadow-xl">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400 shrink-0">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-zinc-100">Ascent logged!</span>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
