'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { fetchUnreadNotificationCount } from '@/lib/queries'

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

function GymIcon({ filled }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

const TABS = [
  { label: 'Home',     href: '/dashboard', Icon: HomeIcon,     match: (p) => !p.includes('/presence') && ['/', '/dashboard', '/gym', '/zone', '/climb'].some((s) => p === s || p.startsWith(s + '/')) },
  { label: 'Logbook',  href: '/logbook',   Icon: LogbookIcon,  match: (p) => p.startsWith('/logbook') },
  { label: 'Gym',      href: '/gym',       Icon: GymIcon,      match: (p) => p.includes('/presence') },
  { label: 'Profile',  href: '/profile',   Icon: ProfileIcon,  match: (p) => p.startsWith('/profile') },
]

export default function BottomNav({ onNavigate }) {
  const pathname = usePathname()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let channel = null
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUnreadCount(await fetchUnreadNotificationCount(user.id))
      channel = supabase
        .channel(`notifications-badge-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, () => {
          fetchUnreadNotificationCount(user.id).then(c => setUnreadCount(c))
        })
        .subscribe()
    }
    init()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  function handleTabClick(e, href, label) {
    if (label === 'Home') {
      e.preventDefault()
      const saved = localStorage.getItem('savedPath')
      const dest = saved ?? '/gym/4561f1e2-5b13-4de9-8197-53642de8b5e0'
      if (saved) localStorage.setItem('resumeActive', '1')
      if (onNavigate) onNavigate(dest)
      else router.push(dest)
    } else if (label === 'Gym') {
      e.preventDefault()
      const saved = localStorage.getItem('savedPath') ?? ''
      const m = saved.match(/^\/gym\/([^/]+)/)
      const gymId = m ? m[1] : null
      const dest = gymId ? `/gym/${gymId}/presence` : '/dashboard'
      if (onNavigate) onNavigate(dest)
      else router.push(dest)
    } else if (onNavigate) {
      e.preventDefault()
      onNavigate(href)
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
              onClick={(e) => handleTabClick(e, href, label)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                active ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label === 'Gym' ? (
                <div className="relative">
                  <Icon filled={active} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] rounded-full bg-rose-500 flex items-center justify-center text-[9px] font-bold text-white leading-none px-0.5">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              ) : (
                <Icon filled={active} />
              )}
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
