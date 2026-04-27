'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'

const poppins = Poppins({ subsets: ['latin'], weight: ['400'] })

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/gym/4561f1e2-5b13-4de9-8197-53642de8b5e0')
  }, [router])

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
      <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
    </div>
  )
}
