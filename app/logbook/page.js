'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import BottomNav from '@/app/components/BottomNav'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import useAuth from '@/hooks/useAuth'
import { fetchUserAscents } from '@/lib/queries'
import { GRADE_HEX, V_GRADE_ORDER } from '@/constants/grades'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function gradeHex(grade) {
  if (!grade) return '#52525b'
  return GRADE_HEX[grade.toUpperCase()] ?? '#52525b'
}

// Extract UTC date string YYYY-MM-DD from a climbed_at ISO timestamp
function toDateKey(isoString) {
  return isoString.slice(0, 10)
}

// Format a YYYY-MM-DD key as "17 Mar 2026"
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function formatDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

function ChevronIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
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

export default function LogbookPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [sessions, setSessions] = useState([])
  const [chartData, setChartData] = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchUserAscents(user.id).then(ascents => {
      // Group by UTC date portion of climbed_at
      const byDate = {}
      for (const a of ascents) {
        if (!a.climbed_at) continue
        const key = toDateKey(a.climbed_at)
        if (!byDate[key]) byDate[key] = []
        byDate[key].push(a)
      }

      const sessionList = Object.entries(byDate)
        .map(([date, items]) => ({
          date,
          total: items.length,
          sends: items.filter(a => a.status === 'sent' || a.status === 'flash').length,
        }))
        .sort((a, b) => b.date.localeCompare(a.date))

      // Tally all sends by grade for the chart
      const gradeTally = {}
      for (const a of ascents) {
        if (a.status !== 'sent' && a.status !== 'flash') continue
        const grade = a.climbs?.grade
        if (!grade) continue
        gradeTally[grade] = (gradeTally[grade] ?? 0) + 1
      }

      const chart = V_GRADE_ORDER
        .filter(g => gradeTally[g])
        .map(g => ({ grade: g, count: gradeTally[g] }))

      setSessions(sessionList)
      setChartData(chart)
      setDataLoaded(true)
    })
  }, [user])

  const loading = authLoading || !dataLoaded

  if (loading) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-100">Logbook</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Sends by Grade chart */}
        {chartData.length > 0 && (
          <div className="mx-4 mb-6 bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Sends by Grade</p>
            <ResponsiveContainer width="100%" height={160}>
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
                  {chartData.map((entry) => (
                    <Cell key={entry.grade} fill={gradeHex(entry.grade)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sessions list */}
        <div className="px-4 mb-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sessions</h2>
        </div>

        {sessions.length === 0 ? (
          <p className="text-center text-zinc-500 text-sm mt-12">No sessions logged yet.</p>
        ) : (
          <ul className="mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            {sessions.map((session, index) => (
              <li key={session.date} className={index !== 0 ? 'border-t border-zinc-800/60' : ''}>
                <button
                  onClick={() => router.push(`/logbook/${session.date}`)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-zinc-800/50 active:bg-zinc-800 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-100 text-sm">{formatDateKey(session.date)}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {session.total} {session.total === 1 ? 'climb' : 'climbs'}, {session.sends} sent
                    </p>
                  </div>
                  <ChevronIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
