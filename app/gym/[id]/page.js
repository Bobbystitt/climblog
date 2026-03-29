'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import GradeBadge from '@/app/components/GradeBadge'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { GRADE_HEX, CHART_GRADES } from '@/constants/grades'
import { climbColor } from '@/constants/colors'
import { fetchGymById, fetchZonesByGym, fetchClimbsByZones, fetchUserProfile, fetchClimbRatings } from '@/lib/queries'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  )
}

function ChevronDownIcon({ open }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
      className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function LayersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-zinc-500">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
    </svg>
  )
}

function StarIcon({ filled }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
      fill={filled ? '#eab308' : 'none'}
      stroke={filled ? '#eab308' : '#3f3f46'}
      strokeWidth={1.5}
      className="w-3.5 h-3.5">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2">
        <p className="text-xs text-zinc-300 font-semibold">{payload[0].payload.grade}</p>
        <p className="text-xs text-zinc-400">{payload[0].value} climbs</p>
      </div>
    )
  }
  return null
}

export default function GymPage() {
  const { id } = useParams()
  const router = useRouter()
  const fileInputRef = useRef(null)
  const zonesRef = useRef(null)

  const [gym, setGym] = useState(null)
  const [zones, setZones] = useState([])
  const [stats, setStats] = useState({ boulder: 0, lead: 0, topRope: 0 })
  const [chartData, setChartData] = useState([])
  const [topClimbs, setTopClimbs] = useState([])
  const [climbRatings, setClimbRatings] = useState({})
  const [disciplineFilter, setDisciplineFilter] = useState('All')
  // gymLoading: true only until the gym row itself arrives (controls hero render)
  const [gymLoading, setGymLoading] = useState(true)
  // contentLoading: true until zones/climbs/stats are ready (controls section skeletons)
  const [contentLoading, setContentLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [heroUrl, setHeroUrl] = useState(null)

  useEffect(() => {
    if (!id) return
    localStorage.setItem('savedPath', `/gym/${id}`)

    // Phase 1 — fetch gym record alone so the hero renders immediately
    async function fetchGym() {
      const gymData = await fetchGymById(id)
      if (gymData) {
        setGym(gymData)
        setHeroUrl(gymData.hero_image_url ?? null)
      }
      setGymLoading(false)
    }

    // Phase 2 — fetch everything else; runs in parallel with phase 1
    async function fetchContent() {
      const [{ data: { user } }, zonesArr] = await Promise.all([
        supabase.auth.getUser(),
        fetchZonesByGym(id),
      ])

      setZones(zonesArr)

      if (user) {
        const profile = await fetchUserProfile(user.id)
        setIsAdmin(profile?.role === 'admin' || profile?.role === 'setter')
      }

      if (zonesArr.length > 0) {
        const zoneIds = zonesArr.map(z => z.id)
        const rawClimbs = await fetchClimbsByZones(zoneIds)

        // Build lookup: zone_id → { name, discipline }
        const zoneNameMap = {}
        const zoneDiscMap = {}
        zonesArr.forEach(z => {
          zoneNameMap[z.id] = z.name ?? ''
          zoneDiscMap[z.id] = z.discipline ?? null
        })

        // Attach zone name + discipline to every climb
        const allClimbs = rawClimbs.map(c => ({
          ...c,
          zoneName: zoneNameMap[c.zone_id] ?? '',
          discipline: zoneDiscMap[c.zone_id] ?? null,
        }))

        console.log('[gym] first 3 climbs with discipline:',
          allClimbs.slice(0, 3).map(c => ({ id: c.id, grade: c.grade, discipline: c.discipline, zone_id: c.zone_id }))
        )

        // Stats — boulder = V-grades, lead = 5.x rope grades, top rope = 0 until type field added
        const boulder = allClimbs.filter(c => /^V/i.test(c.grade ?? '')).length
        const lead = allClimbs.filter(c => /^5\./.test(c.grade ?? '')).length
        setStats({ boulder, lead, topRope: 0 })

        // Grade distribution for chart (VB–V10)
        const gradeCount = Object.fromEntries(CHART_GRADES.map(g => [g, 0]))
        allClimbs.forEach(c => {
          const g = (c.grade ?? '').toUpperCase()
          if (g in gradeCount) gradeCount[g]++
        })
        setChartData(CHART_GRADES.map(g => ({ grade: g, count: gradeCount[g] })))

        // Top 5 by repeat_count (already have zoneName + discipline attached)
        const sorted = [...allClimbs]
          .sort((a, b) => (b.repeat_count ?? 0) - (a.repeat_count ?? 0))
          .slice(0, 5)
        setTopClimbs(sorted)

        // Avg ratings from ascents for top climbs
        if (sorted.length > 0) {
          const topIds = sorted.map(c => c.id)
          const ratingData = await fetchClimbRatings(topIds)

          const sums = {}
          const counts = {}
          ratingData.forEach(r => {
            sums[r.climb_id] = (sums[r.climb_id] ?? 0) + r.rating
            counts[r.climb_id] = (counts[r.climb_id] ?? 0) + 1
          })
          const avgs = {}
          Object.keys(sums).forEach(cid => { avgs[cid] = sums[cid] / counts[cid] })
          setClimbRatings(avgs)
        }
      }

      setContentLoading(false)
    }

    fetchGym()
    fetchContent()
  }, [id])

  async function handleHeroUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingHero(true)
    try {
      const gymId = id

      // Confirm the current user is admin/setter before touching the DB
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const profile = await fetchUserProfile(user.id)
      const role = profile?.role
      console.log('[hero upload] user:', user.id, 'role:', role, 'gymId:', gymId)
      if (role !== 'admin' && role !== 'setter') {
        throw new Error(`Unauthorized: role '${role}' cannot update gym`)
      }

      // Upload file to Storage
      const ext = file.name.split('.').pop()
      const path = `${gymId}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('gym-images')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('gym-images').getPublicUrl(path)
      console.log('[hero upload] publicUrl:', publicUrl)

      // Save URL to gyms table and log the full result
      const updateResult = await supabase
        .from('gyms')
        .update({ hero_image_url: publicUrl })
        .eq('id', gymId)
      console.log('[hero upload] gyms update result:', updateResult)
      if (updateResult.error) throw updateResult.error

      setHeroUrl(publicUrl)
    } catch (err) {
      console.error('[hero upload] failed:', err)
    } finally {
      setUploadingHero(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const DISCIPLINE_OPTIONS = ['All', 'Boulder', 'Lead', 'Top Rope', 'Autobelay']

  const filteredTopClimbs = disciplineFilter === 'All'
    ? topClimbs
    : topClimbs.filter(c => c.discipline === disciplineFilter)

  const hasDescription = !!(gym?.description?.trim())
  const descWords = hasDescription ? gym.description.split(' ') : []
  const isLongDesc = descWords.length > 30
  const shortDesc = isLongDesc ? descWords.slice(0, 30).join(' ') + '…' : gym?.description

  // Only block render until the gym row arrives — hero shows immediately after
  if (gymLoading) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100`}>

      {/* Floating back button */}
      <div className="fixed top-0 left-0 z-30 p-3 safe-area-inset-top">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900/80 backdrop-blur text-zinc-300 hover:text-zinc-100 active:scale-90 transition-all shadow-lg"
          aria-label="Go back"
        >
          <BackIcon />
        </button>
      </div>

      {/* ── 1. Hero Image ── renders immediately after gym row loads */}
      <div className="relative w-full h-60 bg-zinc-900 flex items-end">
        {heroUrl ? (
          <img
            src={heroUrl}
            alt={gym?.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
            <span className="text-6xl font-bold text-zinc-700 select-none opacity-20">
              {gym?.name?.[0] ?? '?'}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="relative z-10 w-full px-4 pb-4 flex items-end justify-between gap-3">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg leading-tight">
            {gym?.name}
          </h1>
          {isAdmin && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingHero}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur text-white hover:bg-black/70 active:scale-90 transition-all"
                aria-label="Upload hero image"
              >
                {uploadingHero
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <CameraIcon />
                }
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleHeroUpload}
              />
            </>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="pb-28">

        {/* ── 2. Stats Row ── */}
        <div className="flex border-b border-zinc-800">
          {[
            { count: stats.boulder, label: 'Boulder' },
            { count: stats.lead,    label: 'Lead' },
            { count: stats.topRope, label: 'Top Rope' },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`flex-1 flex flex-col items-center py-4 gap-0.5 ${i !== 0 ? 'border-l border-zinc-800' : ''}`}
            >
              {contentLoading
                ? <div className="h-7 w-8 rounded-md bg-zinc-800 animate-pulse mb-0.5" />
                : <span className="text-2xl font-bold text-zinc-100">{s.count}</span>
              }
              <span className="text-[11px] font-medium text-zinc-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── 3. Discipline Filter Pills ── */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none border-b border-zinc-800/60">
          {DISCIPLINE_OPTIONS.map(disc => (
            <button
              key={disc}
              onClick={() => setDisciplineFilter(disc)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                disciplineFilter === disc
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              {disc}
            </button>
          ))}
        </div>

        {/* ── 4. Grade Distribution Chart ── */}
        <div className="px-4 pt-5 pb-2">
          <p className="text-sm font-semibold text-zinc-300 mb-3">Grade Distribution</p>
          {contentLoading ? (
            <div className="h-[140px] rounded-xl bg-zinc-900 animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} barCategoryGap="22%">
                <XAxis
                  dataKey="grade"
                  tick={{ fill: '#a1a1aa', fontSize: 9, fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'inherit' }}
                  width={18}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map(entry => (
                    <Cell key={entry.grade} fill={GRADE_HEX[entry.grade] ?? '#52525b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── 4. Action Buttons ── */}
        <div className="flex gap-3 px-4 pt-2 pb-5">
          <button
            onClick={() => router.push(`/gym/${id}/discover`)}
            className="flex-1 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] transition-all text-white font-semibold text-[15px] shadow-lg"
          >
            Find a Climb
          </button>
          <button
            onClick={() => zonesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="flex-1 py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.97] transition-all text-zinc-100 font-semibold text-[15px]"
          >
            Browse by Zone
          </button>
        </div>

        {/* ── 6. Most Popular ── */}
        {contentLoading ? (
          <div className="px-4 pb-6">
            <p className="text-sm font-semibold text-zinc-300 mb-3">Most Popular</p>
            <div className="flex flex-col gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-zinc-900 animate-pulse" />
              ))}
            </div>
          </div>
        ) : filteredTopClimbs.length > 0 ? (
          <div className="px-4 pb-6">
            <p className="text-sm font-semibold text-zinc-300 mb-3">Most Popular</p>
            <div className="flex flex-col gap-2">
              {filteredTopClimbs.map(climb => {
                const avgRating = climbRatings[climb.id] ?? 0
                const stars = Math.round(avgRating)
                return (
                  <button
                    key={climb.id}
                    onClick={() => router.push(`/climb/${climb.id}`)}
                    className="w-full flex items-center gap-3 bg-zinc-900 rounded-2xl px-3 py-3 text-left hover:bg-zinc-800 active:scale-[0.99] transition-all"
                  >
                    <GradeBadge grade={climb.grade} color={climb.color} size="sm" className="shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {(climb.tags ?? []).length > 0
                          ? (climb.tags ?? []).map(tag => (
                              <span key={tag} className="text-[10px] bg-zinc-800 text-zinc-400 rounded-full px-2 py-0.5 font-medium">
                                {tag}
                              </span>
                            ))
                          : <span className="text-[10px] text-zinc-600 italic">No tags</span>
                        }
                      </div>
                      <p className="text-[10px] text-zinc-600 truncate">{climb.zoneName}</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => <StarIcon key={i} filled={i <= stars} />)}
                      </div>
                      <span className="text-[10px] text-zinc-600">
                        {climb.repeat_count ?? 0} repeats
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : !contentLoading && (
          <p className="px-4 pb-6 text-sm text-zinc-600">
            {disciplineFilter === 'All' ? 'No popular climbs yet.' : `No popular ${disciplineFilter} climbs yet.`}
          </p>
        )}

        {/* ── 7. About (collapsible) ── */}
        {hasDescription && (
          <div className="px-4 pb-6">
            <button
              onClick={() => setAboutOpen(v => !v)}
              className="w-full flex items-center justify-between mb-2"
            >
              <span className="text-sm font-semibold text-zinc-300">About</span>
              <ChevronDownIcon open={aboutOpen} />
            </button>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {aboutOpen || !isLongDesc ? gym.description : shortDesc}
            </p>
            {isLongDesc && (
              <button
                onClick={() => setAboutOpen(v => !v)}
                className="mt-2 text-xs text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
              >
                {aboutOpen ? 'Show Less' : 'Read More'}
              </button>
            )}
          </div>
        )}

        {/* ── Zones Section (target for "Browse by Zone") ── */}
        <div ref={zonesRef} className="pb-2">
          <div className="px-4 pb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-300">Zones</p>
            {!contentLoading && (
              <span className="text-xs text-zinc-600">
                {zones.length} {zones.length === 1 ? 'zone' : 'zones'}
              </span>
            )}
          </div>
          {contentLoading ? (
            <div className="flex flex-col gap-px">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-zinc-900 animate-pulse mx-4 rounded-xl mb-2" />
              ))}
            </div>
          ) : zones.length === 0 ? (
            <p className="text-center text-zinc-600 text-sm py-6">No zones yet.</p>
          ) : (() => {
            const ROPE_DISCIPLINES = ['lead', 'toprope', 'autobelay']
            const ROPE_LABEL = { lead: 'Lead', toprope: 'Top Rope', autobelay: 'Autobelay' }

            const boulderingZones = zones.filter(z => z.discipline === 'boulder')
            const ropeZones = zones.filter(z => ROPE_DISCIPLINES.includes(z.discipline))
            const uncategorised = zones.filter(z => !z.discipline || (z.discipline !== 'boulder' && !ROPE_DISCIPLINES.includes(z.discipline)))

            function ZoneRow({ zone, showBorder, showDisciplineLabel }) {
              return (
                <li className={showBorder ? 'border-t border-zinc-800/60' : ''}>
                  <button
                    onClick={() => router.push(`/zone/${zone.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-zinc-900 active:bg-zinc-900 transition-colors"
                  >
                    <LayersIcon />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-100 truncate">{zone.name}</p>
                      {zone.description && (
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{zone.description}</p>
                      )}
                    </div>
                    {showDisciplineLabel && zone.discipline && ROPE_LABEL[zone.discipline] && (
                      <span className="shrink-0 text-[10px] font-semibold text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full mr-1">
                        {ROPE_LABEL[zone.discipline]}
                      </span>
                    )}
                    <ChevronRightIcon />
                  </button>
                </li>
              )
            }

            return (
              <div className="flex flex-col">
                {boulderingZones.length > 0 && (
                  <div>
                    <p className="px-4 pt-1 pb-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Bouldering
                    </p>
                    <ul>
                      {boulderingZones.map((zone, i) => (
                        <ZoneRow key={zone.id} zone={zone} showBorder={i !== 0} showDisciplineLabel={false} />
                      ))}
                    </ul>
                  </div>
                )}
                {ropeZones.length > 0 && (
                  <div className={boulderingZones.length > 0 ? 'mt-4' : ''}>
                    <p className="px-4 pt-1 pb-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Ropes
                    </p>
                    <ul>
                      {ropeZones.map((zone, i) => (
                        <ZoneRow key={zone.id} zone={zone} showBorder={i !== 0} showDisciplineLabel={true} />
                      ))}
                    </ul>
                  </div>
                )}
                {uncategorised.length > 0 && (
                  <div className={(boulderingZones.length > 0 || ropeZones.length > 0) ? 'mt-4' : ''}>
                    <p className="px-4 pt-1 pb-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Other
                    </p>
                    <ul>
                      {uncategorised.map((zone, i) => (
                        <ZoneRow key={zone.id} zone={zone} showBorder={i !== 0} showDisciplineLabel={false} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })()}
        </div>

      </div>

      <BottomNav />
    </div>
  )
}
