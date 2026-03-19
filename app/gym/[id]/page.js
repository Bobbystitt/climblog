'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import ResumeBanner from '@/app/components/ResumeBanner'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronIcon() {
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

export default function GymPage() {
  const { id } = useParams()
  const router = useRouter()
  const [gym, setGym] = useState(null)
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) localStorage.setItem('savedPath', `/gym/${id}`)
  }, [id])

  useEffect(() => {
    async function fetchData() {
      const [{ data: gymData }, { data: zoneData }] = await Promise.all([
        supabase.from('gyms').select('*').eq('id', id).single(),
        supabase.from('zones').select('*').eq('gym_id', id).order('name', { ascending: true }),
      ])
      if (gymData) setGym(gymData)
      setZones(zoneData ?? [])
      setLoading(false)
    }
    if (id) fetchData()
  }, [id])

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
            aria-label="Go back"
          >
            <BackIcon />
          </button>
          <h1 className="flex-1 text-base font-semibold text-zinc-100 truncate">
            {loading ? '' : (gym?.name ?? 'Gym')}
          </h1>
          {!loading && (
            <span className="shrink-0 text-xs text-zinc-500">
              {zones.length} {zones.length === 1 ? 'zone' : 'zones'}
            </span>
          )}
        </div>
      </div>

      {/* Zone list */}
      <div className="flex-1 overflow-y-auto pb-24">
        <ResumeBanner />
        {loading ? (
          <div className="flex items-center justify-center mt-16">
            <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
          </div>
        ) : zones.length === 0 ? (
          <p className="text-center text-zinc-500 text-sm mt-12">No zones in this gym.</p>
        ) : (
          <ul>
            {zones.map((zone, index) => (
              <li key={zone.id} className={index !== 0 ? 'border-t border-zinc-800/60' : ''}>
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
