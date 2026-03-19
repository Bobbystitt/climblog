'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const GRADE_HEX = {
  V0: '#16a34a', V1: '#22c55e', V2: '#84cc16',
  V3: '#eab308', V4: '#fb923c', V5: '#f97316',
  V6: '#ef4444', V7: '#dc2626', V8: '#be123c',
  V9: '#be185d', V10: '#9333ea', V11: '#7e22ce',
  V12: '#6d28d9', V13: '#4338ca', V14: '#1d4ed8',
  V15: '#0369a1', V16: '#0e7490', V17: '#0f766e',
}

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

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [user, setUser] = useState(null)
  const [lastSessionChart, setLastSessionChart] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)

      // Fetch profile row
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, username, avatar_url')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Fetch ascents to find last session date
      const { data: ascents } = await supabase
        .from('ascents')
        .select('*, climbs(grade)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      const all = ascents ?? []
      if (all.length > 0) {
        const lastDate = all[0].date
        const lastSession = all.filter(a => a.date === lastDate)

        // Tally sends by grade for last session
        const vGrades = ['V0','V1','V2','V3','V4','V5','V6','V7','V8','V9','V10','V11','V12','V13','V14','V15','V16','V17']
        const tally = {}
        for (const a of lastSession) {
          if (a.status !== 'sent' && a.status !== 'flash') continue
          const g = a.climbs?.grade
          if (!g) continue
          tally[g] = (tally[g] ?? 0) + 1
        }
        const chart = vGrades.filter(g => tally[g]).map(g => ({ grade: g, count: tally[g] }))
        setLastSessionChart(chart)
      }

      setLoading(false)
    }
    init()
  }, [router])

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

        {lastSessionChart.length === 0 && (
          <div className="mx-4 mb-4 bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex items-center justify-center">
            <p className="text-zinc-600 text-sm">No sessions logged yet</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
