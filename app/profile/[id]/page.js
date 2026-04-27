'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Poppins } from 'next/font/google'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import BottomNav from '@/app/components/BottomNav'
import GradeBadge from '@/app/components/GradeBadge'
import { fetchUserProfile, fetchPublicProfileAscents } from '@/lib/queries'
import { GRADE_HEX, V_GRADE_ORDER } from '@/constants/grades'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

function gradeRank(g) {
  if (!g) return -1
  const upper = g.toUpperCase()
  if (upper === 'VB') return 0
  const m = upper.match(/^V(\d+)$/)
  return m ? parseInt(m[1]) + 1 : -1
}

function gradeHex(grade) {
  return GRADE_HEX[grade?.toUpperCase()] ?? '#52525b'
}

// ascentStatus is computed in the render section using per-climb history context

const STATUS_CONFIG = {
  flashed: { label: 'Flashed', bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
  sent:    { label: 'Sent',    bg: 'rgba(34,197,94,0.12)',   color: '#4ade80' },
  project: { label: 'Project', bg: 'rgba(234,179,8,0.12)',   color: '#fbbf24' },
}

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2">
      <p className="text-xs text-zinc-300 font-semibold">{payload[0].payload.grade}</p>
      <p className="text-xs text-zinc-400">{payload[0].value} sends</p>
    </div>
  )
}

function ClimberProfileInner() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromClimbId = searchParams.get('from') === 'climb' ? searchParams.get('climbId') : null
  const fromProfile = searchParams.get('from') === 'profile'
  const fromGymId = searchParams.get('from') === 'gym' ? searchParams.get('gymId') : null

  const [profile, setProfile] = useState(null)
  const [ascents, setAscents] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    async function load() {
      const [profileData, ascentsData] = await Promise.all([
        fetchUserProfile(id),
        fetchPublicProfileAscents(id),
      ])
      if (!profileData) { setNotFound(true); setLoading(false); return }
      setProfile(profileData)
      setAscents(ascentsData)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4`}>
        <p className="text-zinc-400 text-sm">Profile not found.</p>
        <button
          onClick={() => router.push(fromProfile ? '/profile' : fromGymId ? `/gym/${fromGymId}/presence` : '/gym/4561f1e2-5b13-4de9-8197-53642de8b5e0')}
          className="text-zinc-500 text-sm underline"
        >
          Go back
        </button>
      </div>
    )
  }

  // ── Computed stats ──────────────────────────────────────────────────────────
  const sends = ascents.filter(a => a.status === 'sent')

  const topGrade = sends.reduce((best, a) => {
    const g = a.climbs?.grade
    return gradeRank(g) > gradeRank(best) ? g : best
  }, null)

  const totalSessions = new Set(
    ascents.map(a => a.climbed_at?.slice(0, 10)).filter(Boolean)
  ).size

  // Grade distribution for chart
  const tally = {}
  for (const a of sends) {
    const g = a.climbs?.grade
    if (g) tally[g] = (tally[g] ?? 0) + 1
  }
  const chartData = V_GRADE_ORDER.filter(g => tally[g]).map(g => ({ grade: g, count: tally[g] }))

  // Per-climb history: ascents is ordered desc; reverse to get oldest-first
  const climbFirstAscent = {}  // climbId -> first ever ascent record
  const climbTotalTries = {}   // climbId -> sum of all tries
  for (const a of [...ascents].reverse()) {
    const climbId = a.climbs?.id
    if (!climbId) continue
    if (!climbFirstAscent[climbId]) climbFirstAscent[climbId] = a
    climbTotalTries[climbId] = (climbTotalTries[climbId] ?? 0) + (a.tries ?? 0)
  }

  // Flash: first ever ascent for the climb was this record AND it was sent in 1 try
  function isFlash(a) {
    const climbId = a.climbs?.id
    if (!climbId || a.status !== 'sent') return false
    const first = climbFirstAscent[climbId]
    return first?.id === a.id && a.tries === 1
  }

  function ascentStatus(a) {
    if (a.status === 'sent') return isFlash(a) ? 'flashed' : 'sent'
    return 'project'
  }

  const recentAscents = ascents.slice(0, 5)

  // ── Display values ──────────────────────────────────────────────────────────
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null
  const displayUsername = profile.username ?? 'climber'
  const initial = (fullName ?? displayUsername)[0]?.toUpperCase() ?? '?'

  const profileTitle = profile.role === 'admin' ? 'Admin Profile'
    : profile.role === 'setter' ? 'Setter Profile'
    : 'Climber Profile'

  const backDest = fromClimbId
    ? `/climb/${fromClimbId}`
    : fromProfile ? '/profile'
    : fromGymId ? `/gym/${fromGymId}/presence`
    : '/gym/4561f1e2-5b13-4de9-8197-53642de8b5e0'

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => router.push(backDest)}
          className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <h1 className="flex-1 text-base font-semibold text-zinc-100 truncate">{profileTitle}</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">

        {/* ── Avatar + identity ── */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4">
          <div className="w-24 h-24 rounded-full mb-4 ring-2 ring-zinc-800 overflow-hidden">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayUsername}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-indigo-600/20 flex items-center justify-center">
                <span className="text-indigo-300 font-bold text-3xl leading-none">{initial}</span>
              </div>
            )}
          </div>

          {fullName && (
            <p className="text-xl font-bold text-zinc-100 text-center">{fullName}</p>
          )}
          <p className={`text-sm text-zinc-500 ${fullName ? 'mt-0.5' : 'mt-0'}`}>
            @{displayUsername}
          </p>

          {(profile.role === 'setter' || profile.role === 'admin') && (
            <span className="mt-2.5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wide">
              {profile.role === 'admin' ? 'Admin' : 'Setter'}
            </span>
          )}
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-3 gap-2 mx-4 mb-5">
          {[
            { label: 'Total Sends', value: sends.length },
            { label: 'Top Grade',   value: topGrade ?? '—' },
            { label: 'Sessions',    value: totalSessions },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-3 flex flex-col items-center gap-0.5"
            >
              <span className="text-base font-bold text-zinc-100 leading-tight">{value}</span>
              <span className="text-[10px] font-medium text-zinc-500 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Empty state ── */}
        {ascents.length === 0 && (
          <div className="mx-4 mb-4 bg-zinc-900 rounded-2xl border border-zinc-800 p-8 flex flex-col items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.25} stroke="currentColor" className="w-10 h-10 text-zinc-700 mb-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="text-zinc-300 font-semibold text-sm">No climbs logged yet</p>
            <p className="text-zinc-600 text-xs text-center leading-relaxed">
              This climber hasn't recorded any ascents yet.
            </p>
          </div>
        )}

        {/* ── Grade distribution chart ── */}
        {chartData.length > 0 && (
          <div className="mx-4 mb-4 bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Sends by Grade
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} barCategoryGap="30%">
                <XAxis
                  dataKey="grade"
                  tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                  width={20}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map(entry => (
                    <Cell key={entry.grade} fill={gradeHex(entry.grade)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Recent activity ── */}
        {recentAscents.length > 0 && (
          <div className="mx-4 mb-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Recent Activity
            </p>
            <ul className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
              {recentAscents.map((ascent, i) => {
                const status = ascentStatus(ascent)
                const cfg = STATUS_CONFIG[status]
                const grade = ascent.climbs?.grade
                const color = ascent.climbs?.color
                const zoneName = ascent.climbs?.zones?.name
                const climbId = ascent.climbs?.id

                return (
                  <li key={ascent.id} className={`list-none${i > 0 ? ' border-t border-zinc-800/60' : ''}`}>
                    <button
                      onClick={() => climbId && router.push(`/climb/${climbId}?from=profile&profileId=${id}`)}
                      disabled={!climbId}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-zinc-800/60 transition-colors disabled:opacity-50"
                    >
                      <GradeBadge grade={grade} color={color} size="sm" />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-100 leading-snug">
                          {grade ?? '?'}
                        </p>
                        {zoneName && (
                          <p className="text-xs text-zinc-500 truncate mt-0.5">{zoneName}</p>
                        )}
                        {ascent.status === 'sent' && climbId && climbTotalTries[climbId] > 0 && (
                          <p className="text-xs text-zinc-600 mt-0.5">
                            {isFlash(ascent)
                              ? '1 try'
                              : `${climbTotalTries[climbId]} total ${climbTotalTries[climbId] === 1 ? 'try' : 'tries'}`}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full leading-snug"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-[11px] text-zinc-600 leading-none">
                          {formatDate(ascent.climbed_at)}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  )
}

export default function ClimberProfilePage() {
  return (
    <Suspense>
      <ClimberProfileInner />
    </Suspense>
  )
}
