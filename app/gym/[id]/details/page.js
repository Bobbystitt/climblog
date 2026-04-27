'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import {
  fetchGymById,
  fetchZonesByGym,
  fetchClimbsByZones,
  fetchMemberCount,
  fetchUserProfile,
} from '@/lib/queries'
import { CHART_GRADES, GRADE_HEX } from '@/constants/grades'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

// ─── Icons ────────────────────────────────────────────────────────────────────

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

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3 12a8.959 8.959 0 01.284-2.253" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

// ─── Custom chart tooltip ──────────────────────────────────────────────────────

function GradeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { grade, count } = payload[0].payload
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-100 shadow-xl">
      {grade}: {count} {count === 1 ? 'climb' : 'climbs'}
    </div>
  )
}

// ─── Discipline config ────────────────────────────────────────────────────────

const DISCIPLINE_CONFIG = {
  Boulder:    { label: 'Boulder',    bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', fill: 'bg-orange-400' },
  Lead:       { label: 'Lead',       bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20',   fill: 'bg-blue-400' },
  'Top Rope': { label: 'Top Rope',   bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20',  fill: 'bg-green-400' },
  Autobelay:  { label: 'Autobelay',  bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', fill: 'bg-purple-400' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GymDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const mapFileInputRef = useRef(null)

  const [gym, setGym] = useState(null)
  const [zones, setZones] = useState([])
  const [climbs, setClimbs] = useState([])
  const [memberCount, setMemberCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [zoneMapUrl, setZoneMapUrl] = useState(null)
  const [uploadingMap, setUploadingMap] = useState(false)

  useEffect(() => {
    async function load() {
      const [gymData, zonesData, memberCnt, { data: { user } }] = await Promise.all([
        fetchGymById(id),
        fetchZonesByGym(id),
        fetchMemberCount(),
        supabase.auth.getUser(),
      ])
      setGym(gymData)
      setZoneMapUrl(gymData?.zone_map_url ?? null)
      setZones(zonesData)
      setMemberCount(memberCnt)

      if (user) {
        const profile = await fetchUserProfile(user.id)
        if (profile?.role === 'admin') setIsAdmin(true)
      }

      if (zonesData.length > 0) {
        const climbsData = await fetchClimbsByZones(zonesData.map(z => z.id))
        setClimbs(climbsData)
      }
      setLoading(false)
    }
    if (id) load()
  }, [id])

  async function handleMapUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingMap(true)
    const ext = file.name.split('.').pop()
    const path = `${id}-zonemap.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('gym-images')
      .upload(path, file, { upsert: true })
    if (uploadError) { setUploadingMap(false); e.target.value = ''; return }
    const { data: { publicUrl } } = supabase.storage.from('gym-images').getPublicUrl(path)
    await supabase.from('gyms').update({ zone_map_url: publicUrl }).eq('id', id)
    setZoneMapUrl(publicUrl)
    setUploadingMap(false)
    e.target.value = ''
  }

  if (loading) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
      </div>
    )
  }

  // ── Grade distribution ──
  const gradeCount = {}
  for (const c of climbs) {
    if (c.grade) gradeCount[c.grade] = (gradeCount[c.grade] ?? 0) + 1
  }
  const gradeChartData = CHART_GRADES
    .map(g => ({ grade: g, count: gradeCount[g] ?? 0 }))
    .filter(d => d.count > 0)

  // ── Discipline breakdown ──
  const disciplineFromClimbs = {}
  for (const c of climbs) {
    if (c.discipline) {
      disciplineFromClimbs[c.discipline] = (disciplineFromClimbs[c.discipline] ?? 0) + 1
    }
  }
  const disciplineCountFallback = {}
  for (const z of zones) {
    if (z.discipline) {
      const n = climbs.filter(c => c.zone_id === z.id).length
      disciplineCountFallback[z.discipline] = (disciplineCountFallback[z.discipline] ?? 0) + n
    }
  }
  const disciplineSource = Object.keys(disciplineFromClimbs).length > 0 ? disciplineFromClimbs : disciplineCountFallback
  const disciplineData = Object.keys(disciplineSource).map(d => ({
    key: d,
    count: disciplineSource[d],
    cfg: DISCIPLINE_CONFIG[d] ?? { label: d, bg: 'bg-zinc-700/30', text: 'text-zinc-400', border: 'border-zinc-700', fill: 'bg-zinc-500' },
  })).sort((a, b) => b.count - a.count)

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100`}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 flex items-center gap-3 px-4 h-14">
        <button
          onClick={() => router.push(`/gym/${id}`)}
          className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
          aria-label="Back"
        >
          <BackIcon />
        </button>
        <h1 className="flex-1 text-base font-bold text-zinc-100 truncate">{gym?.name ?? 'Gym Details'}</h1>
      </div>

      {/* ── Zone map hero ── */}
      <div className="relative w-full bg-zinc-900" style={{ minHeight: 220 }}>
        {zoneMapUrl ? (
          <img
            src={zoneMapUrl}
            alt="Zone map"
            className="w-full object-contain"
            style={{ minHeight: 220, maxHeight: 420 }}
          />
        ) : (
          <div className="w-full flex flex-col items-center justify-center gap-2 text-zinc-600" style={{ minHeight: 220 }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 opacity-30">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            <p className="text-sm text-zinc-600">No zone map uploaded yet</p>
          </div>
        )}

        {/* Gradient + gym name overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pointer-events-none">
          <p className="text-lg font-bold text-white drop-shadow-lg">{gym?.name}</p>
          <p className="text-xs text-zinc-300 mt-0.5 drop-shadow">Zone Map</p>
        </div>

        {/* Admin upload button */}
        {isAdmin && (
          <button
            onClick={() => mapFileInputRef.current?.click()}
            disabled={uploadingMap}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-all disabled:opacity-50"
            aria-label="Upload zone map"
          >
            {uploadingMap
              ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <CameraIcon />
            }
          </button>
        )}
        <input ref={mapFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleMapUpload} />
      </div>

      {/* ── Content sections ── */}
      <div className="pb-24 flex flex-col gap-6 pt-5">

        {/* ── Website link ── */}
        {gym?.website_url && (
          <div className="px-4">
            <a
              href={gym.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 active:opacity-70 transition-opacity"
            >
              <span className="text-blue-400"><GlobeIcon /></span>
              <span className="text-sm font-medium text-blue-400 truncate">{gym.website_url.replace(/^https?:\/\//, '')}</span>
            </a>
          </div>
        )}

        {/* ── Grade distribution ── */}
        <div>
          <div className="px-4 mb-3 flex items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-100">Grade Distribution</h2>
            <span className="text-xs font-medium text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{climbs.length} climbs</span>
          </div>
          {gradeChartData.length === 0 ? (
            <p className="px-4 text-sm text-zinc-600">No climb data yet.</p>
          ) : (
            <div className="px-2">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={gradeChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="20%">
                  <XAxis
                    dataKey="grade"
                    tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'inherit' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'inherit' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<GradeTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {gradeChartData.map(entry => (
                      <Cell key={entry.grade} fill={GRADE_HEX[entry.grade] ?? '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Discipline breakdown ── */}
        {disciplineData.length > 0 && (
          <div>
            <div className="px-4 mb-3">
              <h2 className="text-sm font-bold text-zinc-100">Disciplines</h2>
            </div>
            <div className="px-4 flex flex-col gap-2">
              {disciplineData.map(({ key, count, cfg }) => {
                const pct = climbs.length > 0 ? Math.round((count / climbs.length) * 100) : 0
                return (
                  <div key={key} className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${cfg.bg} ${cfg.border}`}>
                    <span className={`text-sm font-bold w-20 shrink-0 ${cfg.text}`}>{cfg.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className={`h-full rounded-full ${cfg.fill}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${cfg.text}`}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Member count ── */}
        <div className="px-4">
          <div className="flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5">
            <span className="text-indigo-400"><UsersIcon /></span>
            <span className="text-sm font-medium text-zinc-300">
              {memberCount !== null ? memberCount.toLocaleString() : '—'}{' '}
              <span className="text-zinc-500">members on ClimbLog</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
