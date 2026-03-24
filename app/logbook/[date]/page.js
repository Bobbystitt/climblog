'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import BottomNav from '@/app/components/BottomNav'
import useAuth from '@/hooks/useAuth'
import { fetchSessionAscents } from '@/lib/queries'
import { climbColor } from '@/constants/colors'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

// Format a YYYY-MM-DD key as "17 Mar 2026"
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function formatDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

// Compact read-only star row
function StarDisplay({ value, color }) {
  if (!value || value < 1) return null
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`w-3.5 h-3.5 ${n <= value ? color : 'text-zinc-700'}`}
        >
          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005z" clipRule="evenodd" />
        </svg>
      ))}
    </div>
  )
}

export default function SessionDetailPage() {
  const { date } = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [ascents, setAscents] = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    if (!user || !date) return
    // date param is YYYY-MM-DD (UTC). Query the full day range.
    const start = `${date}T00:00:00.000Z`
    const [y, m, d] = date.split('-').map(Number)
    const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString()
    fetchSessionAscents(user.id, start, next).then(data => {
      setAscents(data)
      setDataLoaded(true)
    })
  }, [user, date])

  const loading = authLoading || !dataLoaded

  if (loading) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
      </div>
    )
  }

  const sends = ascents.filter(a => a.status === 'sent' || a.status === 'flash').length

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => router.push('/logbook')}
          className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-zinc-100 truncate">{formatDateKey(date)}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {ascents.length} {ascents.length === 1 ? 'climb' : 'climbs'} · {sends} sent
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {ascents.length === 0 ? (
          <p className="text-center text-zinc-500 text-sm mt-12">No ascents found for this date.</p>
        ) : (
          <ul className="mx-4 mt-4 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            {ascents.map((ascent, index) => {
              const grade = ascent.climbs?.grade
              const color = ascent.climbs?.color
              return (
                <li key={ascent.id} className={index !== 0 ? 'border-t border-zinc-800/60' : ''}>
                  <div className="flex items-start gap-3 px-4 py-4">
                    {/* Colored square — primary climb identifier */}
                    <div
                      className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: climbColor(color) }}
                    >
                      <span className="text-white font-bold text-sm leading-none">{grade ?? '?'}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Tries */}
                      {ascent.tries != null && ascent.tries > 0 && (
                        <p className="text-xs text-zinc-500">
                          {ascent.tries} {ascent.tries === 1 ? 'try' : 'tries'}
                        </p>
                      )}

                      {/* Star ratings */}
                      {(ascent.difficulty_rating > 0 || ascent.rating > 0) && (
                        <div className="flex items-center gap-3 mt-1.5">
                          {ascent.difficulty_rating > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-zinc-600 uppercase tracking-wide">Hard</span>
                              <StarDisplay value={ascent.difficulty_rating} color="text-orange-400" />
                            </div>
                          )}
                          {ascent.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-zinc-600 uppercase tracking-wide">Fun</span>
                              <StarDisplay value={ascent.rating} color="text-yellow-400" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {ascent.notes && (
                        <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">{ascent.notes}</p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
