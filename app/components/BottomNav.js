'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600'] })

function HomeIcon({ filled }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-1.06-1.061-7.22-7.22a2.25 2.25 0 00-3.182 0l-7.22 7.22-1.06 1.06a.75.75 0 101.06 1.061l.97-.97V19.5a1.5 1.5 0 001.5 1.5H9a.75.75 0 00.75-.75v-4.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V20.25a.75.75 0 00.75.75h3.75a1.5 1.5 0 001.5-1.5v-7.441l.97.97a.75.75 0 101.06-1.061l-8.69-8.69z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function LogbookIcon({ filled }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function ProfileIcon({ filled }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

const TABS = [
  { label: 'Home',     href: '/dashboard', Icon: HomeIcon,     match: (p) => ['/', '/dashboard', '/gym', '/zone', '/climb'].some((s) => p === s || p.startsWith(s + '/')) },
  { label: 'Logbook',  href: '/logbook',   Icon: LogbookIcon,  match: (p) => p.startsWith('/logbook') },
  { label: 'Profile',  href: '/profile',   Icon: ProfileIcon,  match: (p) => p.startsWith('/profile') },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  function handleHomeClick(e) {
    e.preventDefault()
    const saved = localStorage.getItem('savedPath')
    if (saved) {
      localStorage.setItem('resumeActive', '1')
      router.push(saved)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className={`${poppins.className} fixed bottom-0 left-0 right-0 z-30 bg-zinc-950 border-t border-zinc-800`}>
      <nav className="flex items-stretch">
        {TABS.map(({ label, href, Icon, match }) => {
          const active = match(pathname)
          return (
            <Link
              key={href}
              href={href}
              onClick={label === 'Home' ? handleHomeClick : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                active ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon filled={active} />
              <span className={`text-[10px] font-medium ${active ? 'text-indigo-400' : 'text-zinc-500'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
      {/* Safe area spacer for devices with home indicator */}
      <div className="h-safe-bottom bg-zinc-950" style={{ height: 'env(safe-area-inset-bottom)' }} />
    </div>
  )
}
