'use client'

import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import BottomNav from '@/app/components/BottomNav'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

export default function DiscoverPage() {
  const { id } = useParams()
  const router = useRouter()

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
            aria-label="Go back"
          >
            <BackIcon />
          </button>
          <h1 className="flex-1 text-base font-semibold text-zinc-100">Find a Climb</h1>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-600 text-sm">Coming soon</p>
      </div>
      <BottomNav />
    </div>
  )
}
