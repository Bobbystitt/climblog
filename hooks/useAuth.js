'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Handles auth check + optional profile fetch.
 * Redirects to /login if no session exists.
 *
 * @param {object} [options]
 * @param {boolean} [options.fetchProfile=false] - Also fetch the user's profile row
 * @returns {{ user: object|null, profile: object|null, loading: boolean }}
 */
export default function useAuth({ fetchProfile = false } = {}) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)
      if (fetchProfile) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
      setLoading(false)
    }
    init()
  }, [router, fetchProfile])

  return { user, profile, loading }
}
