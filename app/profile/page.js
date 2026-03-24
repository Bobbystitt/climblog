'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import BottomNav from '@/app/components/BottomNav'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import useAuth from '@/hooks/useAuth'
import { fetchUserProfile, fetchUserAscents } from '@/lib/queries'
import { GRADE_HEX, V_GRADE_ORDER } from '@/constants/grades'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function gradeHex(grade) {
  if (!grade) return '#52525b'
  return GRADE_HEX[grade.toUpperCase()] ?? '#52525b'
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2">
        <p className="text-xs text-zinc-300 font-semibold">{payload[0].payload.grade}</p>
        <p className="text-xs text-zinc-400">{payload[0].value} sends</p>
      </div>
    )
  }
  return null
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  )
}

function gradeRank(grade) {
  if (!grade) return -1
  const upper = grade.toUpperCase()
  if (upper === 'VB') return 0
  const m = upper.match(/^V(\d+)$/)
  return m ? parseInt(m[1]) + 1 : -1
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [lastSessionChart, setLastSessionChart] = useState([])
  const [stats, setStats] = useState({ totalSends: 0, topGrade: null, sessions: 0 })
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    if (!user) return
    async function loadData() {
      const [profileData, all] = await Promise.all([
        fetchUserProfile(user.id),
        fetchUserAscents(user.id),
      ])
      setProfile(profileData)

      const sends = all.filter(a => a.status === 'sent')
      const topGradeEntry = sends.reduce((best, a) => {
        const g = a.climbs?.grade
        return gradeRank(g) > gradeRank(best) ? g : best
      }, null)
      const sessionDates = new Set(all.map(a => a.climbed_at?.slice(0, 10)).filter(Boolean))
      setStats({ totalSends: sends.length, topGrade: topGradeEntry, sessions: sessionDates.size })

      if (all.length > 0) {
        const lastDate = all[0].climbed_at?.slice(0, 10)
        const lastSession = all.filter(a => a.climbed_at?.slice(0, 10) === lastDate)
        const tally = {}
        for (const a of lastSession) {
          if (a.status !== 'sent' && a.status !== 'flash') continue
          const g = a.climbs?.grade
          if (!g) continue
          tally[g] = (tally[g] ?? 0) + 1
        }
        const chart = V_GRADE_ORDER.filter(g => tally[g]).map(g => ({ grade: g, count: tally[g] }))
        setLastSessionChart(chart)
      }

      setDataLoaded(true)
    }
    loadData()
  }, [user])

  const loading = authLoading || !dataLoaded

  if (loading) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
      </div>
    )
  }

  const displayUsername = profile?.username ?? user?.email?.split('@')[0] ?? 'climber'
  const initials = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .map(s => s[0].toUpperCase())
    .join('') || displayUsername[0].toUpperCase()

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-4 py-3">
        <h1 className="text-base font-semibold text-zinc-100">Profile</h1>
        <button
          onClick={() => router.push('/profile/edit')}
          className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 active:scale-95 transition-all font-medium"
        >
          <PencilIcon />
          Edit
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Avatar + name */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4">
          <div className="w-20 h-20 rounded-full mb-3 overflow-hidden">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-indigo-600/20 border-2 border-indigo-500/30 rounded-full flex items-center justify-center">
                <span className="text-indigo-300 font-bold text-2xl">{initials}</span>
              </div>
            )}
          </div>
          {fullName && <p className="text-lg font-bold text-zinc-100">{fullName}</p>}
          <p className="text-sm text-zinc-500 mt-0.5">@{displayUsername}</p>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2 mx-4 mb-4">
          {[
            { label: 'Total Sends', value: stats.totalSends },
            { label: 'Top Grade',   value: stats.topGrade ?? '—' },
            { label: 'Sessions',    value: stats.sessions },
          ].map(({ label, value }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-2.5 flex flex-col items-center gap-0.5">
              <span className="text-base font-bold text-zinc-100 leading-tight">{value}</span>
              <span className="text-[10px] font-medium text-zinc-500 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* Last session chart */}
        {lastSessionChart.length > 0 && (
          <div className="mx-4 mb-4 bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Last Session — Sends by Grade</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={lastSessionChart} barCategoryGap="30%">
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
                  {lastSessionChart.map((entry) => (
                    <Cell key={entry.grade} fill={gradeHex(entry.grade)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {lastSessionChart.length === 0 && stats.totalSends === 0 && (
          <div className="mx-4 mb-4 bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex items-center justify-center">
            <p className="text-zinc-600 text-sm">No sessions logged yet</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
