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
  fetchGymById,
  fetchZonesByGym,
  fetchClimbsByZones,
  fetchUserAscentsByClimbs,
  fetchUserFavorites,
  fetchUserProfile,
  toggleFavorite as dbToggleFavorite,
} from '@/lib/queries'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

// Prevent the browser and Next.js from auto-restoring scroll position so our
// manual restoration wins. Safe to run at module level — guarded for SSR.
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

function computeClimbStatus(climbId, ascentsMap) {
  const ascents = ascentsMap[climbId] ?? []
  const sent = ascents.find(a => a.status === 'sent')
  if (sent) return sent.tries === 1 ? 'flashed' : 'sent'
  if (ascents.some(a => a.status === 'project')) return 'project'
  return 'untouched'
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GymPage() {
  const { id } = useParams()
  const router = useRouter()
  const heroInputRef = useRef(null)
  const heroRef = useRef(null)
  // Holds parsed sessionStorage state between the mount effect and the
  // restore effect — avoids reading sessionStorage twice.
  const savedStateRef = useRef(null)
  // Prevents the restore effect from firing more than once.
  const hasRestored = useRef(false)

  const [gym, setGym] = useState(null)
  const [zones, setZones] = useState([])
  const [allClimbs, setAllClimbs] = useState([])
  const [ascentsMap, setAscentsMap] = useState({})
  const [favoritedIds, setFavoritedIds] = useState(new Set())
  const [userId, setUserId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [zoneClimbCount, setZoneClimbCount] = useState({})
  const [zoneHasNew, setZoneHasNew] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('zones')
  const [heroUrl, setHeroUrl] = useState(null)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [showStickyHeader, setShowStickyHeader] = useState(false)
  const [highlightId, setHighlightId] = useState(null)

  // Filter state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeGradeRange, setActiveGradeRange] = useState([0, GRADE_SCALE_MAX])
  const [activeTags, setActiveTags] = useState([])
  const [activeFavorites, setActiveFavorites] = useState(false)
  const [activeStatus, setActiveStatus] = useState('All')

  // ── Read saved page state from sessionStorage on mount ──────────────────────
  // Must be inside useEffect (sessionStorage access rule).
  useEffect(() => {
    if (!id) return
    try {
      const raw = sessionStorage.getItem(`gymPageState_${id}`)
      if (!raw) return
      const state = JSON.parse(raw)
      sessionStorage.removeItem(`gymPageState_${id}`)
      savedStateRef.current = state
      hasRestored.current = false
      // Restore tab immediately so the correct tab renders once content loads.
      if (state.tab) setActiveTab(state.tab)
    } catch {}
  }, [id])

  // ── Restore scroll + highlight ───────────────────────────────────────────────
  // Fires when:
  //   • loading is done (content arrays are populated)
  //   • activeTab matches the saved tab (correct tab content is in the DOM)
  //   • the relevant content array is non-empty (elements exist to scroll to)
  //   • we haven't already restored this session
  useEffect(() => {
    const state = savedStateRef.current
    if (!state || !state.selectedId || hasRestored.current) return

    if (loading) return
    if (activeTab !== state.tab) return

    const contentReady = state.tab === 'zones' ? zones.length > 0 : allClimbs.length > 0
    if (!contentReady) return

    hasRestored.current = true
    savedStateRef.current = null

    requestAnimationFrame(() => {
      const prefix = state.tab === 'zones' ? 'zone-' : 'climb-'
      const el = document.getElementById(`${prefix}${state.selectedId}`)

      if (el) {
        const rect = el.getBoundingClientRect()

        // Walk up the DOM to find the actual scroll container — the first
        // ancestor whose scrollHeight exceeds its clientHeight.
        let scrollContainer = el.parentElement
        while (scrollContainer && scrollContainer !== document.documentElement) {
          const style = window.getComputedStyle(scrollContainer)
          const overflow = style.overflowY
          if (scrollContainer.scrollHeight > scrollContainer.clientHeight &&
              (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay')) {
            break
          }
          scrollContainer = scrollContainer.parentElement
        }
        if (!scrollContainer || scrollContainer === document.documentElement) {
          scrollContainer = document.documentElement
        }

        const absoluteTop = rect.top + scrollContainer.scrollTop - 100

        // Disable auto scroll restoration immediately before our assignment so
        // Next.js cannot reset it between frames.
        window.history.scrollRestoration = 'manual'

        // Double rAF: first frame sets the position, second frame re-asserts it
        // to override any reset Next.js applies after the initial paint.
        scrollContainer.scrollTop = absoluteTop
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = absoluteTop
        })
      }

      setHighlightId(state.selectedId)
      setTimeout(() => setHighlightId(null), 1200)
    })
  }, [loading, activeTab, zones, allClimbs])

  // ── IntersectionObserver on hero — depends on `gym` so it runs after the
  //    hero div is in the DOM (the loading spinner skips it). ─────────────────
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

  // ── Data fetch ──────────────────────────────────────────────────────────────
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
      if (user) setUserId(user.id)

      if (user) {
        const profile = await fetchUserProfile(user.id)
        if (profile?.role === 'admin') setIsAdmin(true)
      }

      if (zonesArr.length > 0) {
        const zoneIds = zonesArr.map(z => z.id)
        const zoneNameMap = {}
        zonesArr.forEach(z => { zoneNameMap[z.id] = z.name ?? '' })

        const rawClimbs = await fetchClimbsByZones(zoneIds)
        const climbs = rawClimbs.map(c => ({
          ...c,
          zoneName: zoneNameMap[c.zone_id] ?? '',
        }))
        setAllClimbs(climbs)

        const cutoff = new Date(Date.now() - SEVEN_DAYS_MS)
        const counts = {}
        const hasNew = {}
        climbs.forEach(c => {
          counts[c.zone_id] = (counts[c.zone_id] ?? 0) + 1
          if (c.set_date && new Date(c.set_date) >= cutoff) {
            hasNew[c.zone_id] = true
          }
        })
        setZoneClimbCount(counts)
        setZoneHasNew(hasNew)

        if (user && climbs.length > 0) {
          const climbIds = climbs.map(c => c.id)
          const [ascentsArr, favsArr] = await Promise.all([
            fetchUserAscentsByClimbs(user.id, climbIds),
            fetchUserFavorites(user.id, climbIds),
          ])
          const aMap = {}
          ascentsArr.forEach(a => {
            if (!aMap[a.climb_id]) aMap[a.climb_id] = []
            aMap[a.climb_id].push(a)
          })
          setAscentsMap(aMap)
          setFavoritedIds(new Set(favsArr.map(f => f.climb_id)))
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [id])

  // ── Navigation: save state before leaving ──────────────────────────────────
  // sessionStorage writes are fine in event handlers (not render-time).

  function handleZonePress(zoneId) {
    sessionStorage.setItem(`gymPageState_${id}`, JSON.stringify({ tab: 'zones', selectedId: zoneId }))
    router.push(`/zone/${zoneId}`)
  }

  // Called by the + button on ClimbCard (onLogAscent prop).
  function handleClimbPress(climb) {
    sessionStorage.setItem(`gymPageState_${id}`, JSON.stringify({ tab: 'climbs', selectedId: climb.id }))
    router.push(`/climb/${climb.id}`)
  }

  // Saves state for any click on a climb card (grade badge, text row, or + button).
  // Uses capture phase so it fires before ClimbCard's internal router.push calls.
  function handleClimbCardCapture(climbId) {
    sessionStorage.setItem(`gymPageState_${id}`, JSON.stringify({ tab: 'climbs', selectedId: climbId }))
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

  function handleApplyFilters({ gradeRange, tags, favorites, status }) {
    setActiveGradeRange(gradeRange)
    setActiveTags(tags)
    setActiveFavorites(favorites)
    setActiveStatus(status)
  }

  const hasActiveFilters = activeGradeRange[0] !== 0 || activeGradeRange[1] !== GRADE_SCALE_MAX
    || activeTags.length > 0 || activeFavorites || activeStatus !== 'All'

  // Filtered + sorted climbs
  const filteredClimbs = allClimbs
    .filter(c => {
      if (activeGradeRange[0] !== 0 || activeGradeRange[1] !== GRADE_SCALE_MAX) {
        const idx = gradeToIdx(c.grade)
        if (idx === -1 || idx < activeGradeRange[0] || idx > activeGradeRange[1]) return false
      }
      if (activeTags.length > 0) {
        const ct = (c.tags ?? []).map(t => t.toLowerCase())
        if (!activeTags.some(t => ct.includes(t.toLowerCase()))) return false
      }
      if (activeFavorites && !favoritedIds.has(c.id)) return false
      if (activeStatus !== 'All') {
        const s = computeClimbStatus(c.id, ascentsMap)
        if (activeStatus === 'Flashed' && s !== 'flashed') return false
        if (activeStatus === 'Sent' && s !== 'sent') return false
        if (activeStatus === 'Projects' && s !== 'project') return false
      }
      return true
    })
    .sort((a, b) => (b.repeat_count ?? 0) - (a.repeat_count ?? 0))

  if (loading && !gym) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div data-scroll-container className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100`}>

      {/* Keyframe for the highlight glow animation */}
      <style>{`
        @keyframes gym-card-highlight {
          0%   { box-shadow: none; }
          15%  { box-shadow: 0 0 0 2px rgba(129,140,248,0.75); }
          75%  { box-shadow: 0 0 0 2px rgba(129,140,248,0.75); }
          100% { box-shadow: none; }
        }
        .gym-card-highlight { animation: gym-card-highlight 1.2s ease forwards; }
      `}</style>

      {/* ── Fixed slim header — slides down when hero scrolls out of view ── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          transform: showStickyHeader ? 'translateY(0)' : 'translateY(-100%)',
          opacity: showStickyHeader ? 1 : 0,
          pointerEvents: showStickyHeader ? 'auto' : 'none',
          transition: 'transform 200ms ease, opacity 200ms ease',
        }}
        className="bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800"
      >
        <div className="flex items-center justify-between px-4 h-14">
          <h2 className="font-bold text-base text-zinc-100 truncate flex-1 mr-3">
            {gym?.name ?? '…'}
          </h2>
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
        {heroUrl ? (
          <img src={heroUrl} alt={gym?.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

        <button
          onClick={() => router.push('/dashboard')}
          className="absolute top-4 left-4 z-10 bg-black/40 backdrop-blur-sm text-white rounded-full p-2 active:scale-90 transition-all"
          aria-label="Go back"
        >
          <BackIcon />
        </button>

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

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">{gym?.name ?? '…'}</h1>
        </div>
      </div>

      {/* ── Tab toggle — shifts down when fixed header appears ── */}
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

      {/* ── Scrollable content ── */}
      <div className="pb-28">

        {/* ── Zones tab ── */}
        {activeTab === 'zones' && (
          loading ? (
            <div className="flex flex-col gap-3 px-4 pt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-zinc-900 animate-pulse" />
              ))}
            </div>
          ) : zones.length === 0 ? (
            <p className="text-center text-zinc-600 text-sm py-12">No zones yet.</p>
          ) : (
            <div className="flex flex-col gap-2 px-4 pt-2">
              {zones.map(zone => (
                <button
                  key={zone.id}
                  id={`zone-${zone.id}`}
                  type="button"
                  onClick={() => handleZonePress(zone.id)}
                  className={`w-full flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.99] transition-all rounded-2xl px-4 py-4 text-left ${
                    highlightId === zone.id ? 'gym-card-highlight' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-zinc-100 truncate">{zone.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {zoneClimbCount[zone.id] ?? 0} {(zoneClimbCount[zone.id] ?? 0) === 1 ? 'climb' : 'climbs'}
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
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* ── Climbs tab ── */}
        {activeTab === 'climbs' && (
          loading ? (
            <div className="flex flex-col gap-0 pt-2">
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
                  className={highlightId === climb.id ? 'gym-card-highlight' : ''}
                  onClickCapture={() => handleClimbCardCapture(climb.id)}
                >
                  <ClimbCard
                    climb={climb}
                    climbStatus={computeClimbStatus(climb.id, ascentsMap)}
                    isFavorited={favoritedIds.has(climb.id)}
                    onLogAscent={handleClimbPress}
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
        activeTags={activeTags}
        activeFavorites={activeFavorites}
        activeStatus={activeStatus}
        activeRouteStatus={[]}
      />

      <BottomNav />
    </div>
  )
}
