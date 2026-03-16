'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'

const poppins = Poppins({ subsets: ['latin'], weight: ['400'] })

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      router.replace(user ? '/dashboard' : '/login')
    })
  }, [router])

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
      <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
    </div>
  )
}
