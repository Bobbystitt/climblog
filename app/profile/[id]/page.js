'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Poppins } from 'next/font/google'
import BottomNav from '@/app/components/BottomNav'
import GradeBadge from '@/app/components/GradeBadge'
import { fetchSetterProfile, fetchClimbsBySetter } from '@/lib/queries'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function SetterProfileInner() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromClimbId = searchParams.get('from') === 'climb' ? searchParams.get('climbId') : null

  const [profile, setProfile] = useState(null)
  const [climbs, setClimbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    async function load() {
      const [profileData, climbsData] = await Promise.all([
        fetchSetterProfile(id),
        fetchClimbsBySetter(id),
      ])
      if (!profileData) { setNotFound(true); setLoading(false); return }
      setProfile(profileData)
      setClimbs(climbsData)
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
        <button onClick={() => router.push('/dashboard')} className="text-zinc-500 text-sm underline">Go back</button>
      </div>
    )
  }

  const displayName = profile.username ?? 'Unknown Setter'
  const initial = displayName[0].toUpperCase()

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => router.push(fromClimbId ? `/climb/${fromClimbId}` : '/dashboard')}
          className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <h1 className="flex-1 text-base font-semibold text-zinc-100 truncate">Setter Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 px-4 pt-8 pb-6">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover bg-zinc-800"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-600/25 flex items-center justify-center">
              <span className="text-2xl font-bold text-indigo-400">{initial}</span>
            </div>
          )}
          <p className="text-xl font-bold text-zinc-100">{displayName}</p>
        </div>

        <div className="border-t border-zinc-800 mx-4" />

        {/* Routes set */}
        <div className="px-4 pt-4">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Routes Set
            {climbs.length > 0 && (
              <span className="text-zinc-600 normal-case font-normal ml-1">· {climbs.length}</span>
            )}
          </p>

          {climbs.length === 0 && (
            <p className="text-sm text-zinc-600 py-4">No routes set yet.</p>
          )}

          <ul>
            {climbs.map((climb, i) => {
              const zone = climb.zones ?? {}
              const gym = zone.gyms ?? {}
              const locationLabel = [gym.name, zone.name].filter(Boolean).join(' · ')
              return (
                <li key={climb.id} className={i > 0 ? 'border-t border-zinc-800/60' : ''}>
                  <button
                    onClick={() => router.push(`/climb/${climb.id}`)}
                    className="w-full flex items-center gap-3 px-0 py-3.5 text-left"
                  >
                    <GradeBadge grade={climb.grade} color={climb.color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(climb.tags) && climb.tags.length > 0
                          ? climb.tags.map(tag => (
                              <span key={tag} className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">{tag}</span>
                            ))
                          : <span className="text-zinc-600 text-xs">No tags</span>
                        }
                      </div>
                      {locationLabel && (
                        <p className="text-xs text-zinc-500 mt-1.5 truncate">{locationLabel}</p>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

export default function SetterProfilePage() {
  return (
    <Suspense>
      <SetterProfileInner />
    </Suspense>
  )
}
