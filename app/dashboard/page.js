'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [gyms, setGyms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase.from('gyms').select('*')
      if (!error) setGyms(data)
      setLoading(false)
    }

    init()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Gyms</h1>

      {gyms.length === 0 ? (
        <p className="text-gray-500">No gyms found.</p>
      ) : (
        <div className="grid gap-4">
          {gyms.map((gym) => (
            <button
              key={gym.id}
              onClick={() => router.push(`/gym/${gym.id}`)}
              className="w-full text-left p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300 active:scale-95 transition-all"
            >
              <p className="font-semibold text-gray-900">{gym.name}</p>
              {gym.location && (
                <p className="text-sm text-gray-500 mt-1">{gym.location}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
