'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function LocationIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
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

function displayName(user) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Climber'
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [gyms, setGyms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data } = await supabase.from('gyms').select('*').order('name', { ascending: true })
      setUser(user)
      setGyms(data ?? [])
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

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <p className="text-sm text-zinc-500 font-medium">Welcome back,</p>
        <h1 className="text-2xl font-bold text-zinc-100 mt-0.5">{displayName(user)}</h1>
      </div>

      {/* Section heading */}
      <div className="px-4 mb-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Your Gyms</h2>
      </div>

      {/* Gym list */}
      <div className="flex-1 overflow-y-auto pb-24">
        {gyms.length === 0 ? (
          <p className="text-center text-zinc-500 text-sm mt-12">No gyms found.</p>
        ) : (
          <ul>
            {gyms.map((gym, index) => (
              <li key={gym.id} className={index !== 0 ? 'border-t border-zinc-800/60' : ''}>
                <button
                  onClick={() => router.push(`/gym/${gym.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-zinc-900 active:bg-zinc-900 transition-colors"
                >
                  {/* Gym initial avatar */}
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                    <span className="text-indigo-400 font-bold text-base">
                      {gym.name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-100 truncate">{gym.name}</p>
                    {gym.location && (
                      <div className="flex items-center gap-1 mt-0.5 text-zinc-500">
                        <LocationIcon />
                        <span className="text-xs truncate">{gym.location}</span>
                      </div>
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
