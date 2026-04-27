'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import {
  fetchGymById,
  fetchZonesByGym,
  fetchActiveGymPresenceCount,
  fetchActiveGymSessions,
  fetchUserActiveGymSession,
  insertGymSession,
  updateGymSession,
  checkOutGymSession,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  insertNotification,
  fetchUserProfile,
} from '@/lib/queries'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const SECTION_ORDER = ['Willing to Belay', 'Looking for a Catch', 'Open to Spotting', 'Just Climbing']

const STATUSES = [
  {
    value: 'Just Climbing',
    label: 'Just Climbing',
    desc: 'Doing your own thing',
    border: 'border-zinc-600',
    bg: 'bg-zinc-800/60',
    dot: 'bg-zinc-400',
    text: 'text-zinc-300',
    badge: 'bg-zinc-700/60 text-zinc-300',
  },
  {
    value: 'Looking for a Catch',
    label: 'Looking for a Catch',
    desc: 'Need someone to belay you',
    border: 'border-blue-500/50',
    bg: 'bg-blue-500/10',
    dot: 'bg-blue-400',
    text: 'text-blue-300',
    badge: 'bg-blue-500/15 text-blue-300',
  },
  {
    value: 'Willing to Belay',
    label: 'Willing to Belay',
    desc: 'Happy to give a catch',
    border: 'border-green-500/50',
    bg: 'bg-green-500/10',
    dot: 'bg-green-400',
    text: 'text-green-300',
    badge: 'bg-green-500/15 text-green-300',
  },
  {
    value: 'Open to Spotting',
    label: 'Open to Spotting',
    desc: 'Available to spot climbers',
    border: 'border-yellow-500/50',
    bg: 'bg-yellow-500/10',
    dot: 'bg-yellow-400',
    text: 'text-yellow-300',
    badge: 'bg-yellow-500/15 text-yellow-300',
  },
]

const DISCIPLINE_BADGE = {
  Boulder:    'bg-orange-500/10 text-orange-400',
  Lead:       'bg-blue-500/10 text-blue-400',
  'Top Rope': 'bg-green-500/10 text-green-400',
  Autobelay:  'bg-purple-500/10 text-purple-400',
}

function getStatus(value) {
  return STATUSES.find(s => s.value === value) ?? STATUSES[0]
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400 shrink-0">
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-zinc-500 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

function timeAgo(iso) {
  if (!iso) return ''
  const seconds = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ── Avatar grid card ───────────────────────────────────────────────────────────

function AvatarCard({ session, onTap }) {
  const st = getStatus(session.status)
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex flex-col items-center gap-2 active:opacity-70 transition-opacity"
    >
      {session.avatar_url ? (
        <img
          src={session.avatar_url}
          alt={session.username ?? 'Climber'}
          className="w-20 h-20 rounded-full object-cover bg-zinc-800"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-zinc-700 flex items-center justify-center text-2xl font-bold text-zinc-300">
          {session.username ? session.username.slice(0, 1).toUpperCase() : '?'}
        </div>
      )}
      <p className="text-xs font-medium text-zinc-200 text-center leading-tight max-w-full truncate w-full px-1">
        {session.username ?? 'Climber'}
      </p>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.badge}`}>
        {st.label}
      </span>
    </button>
  )
}

// ── Check-in bottom sheet ──────────────────────────────────────────────────────

function CheckInSheet({ open, onClose, zones, onSubmit, saving, initialZoneId = null, startStep = 1 }) {
  const [step, setStep] = useState(startStep)
  const [selectedZoneId, setSelectedZoneId] = useState(initialZoneId)

  useEffect(() => {
    if (open) {
      setStep(startStep)
      setSelectedZoneId(initialZoneId)
    }
  }, [open, startStep, initialZoneId])

  if (!open) return null

  function handleBack() {
    if (step === 2) setStep(1)
    else onClose()
  }

  const stepTitle = step === 1 ? 'Choose Zone' : 'Set Your Status'

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-800 flex flex-col max-h-[88vh]">

        {/* Handle + header */}
        <div className="shrink-0 px-5 pb-3">
          <div className="flex justify-center pt-3 pb-4">
            <div className="w-10 h-1 rounded-full bg-zinc-700" />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
            >
              <BackIcon />
            </button>
            <h2 className="text-base font-semibold text-zinc-100">{stepTitle}</h2>
            <div className="flex-1" />
            <div className="flex gap-1">
              {[1, 2].map(n => (
                <div key={n} className={`h-1 rounded-full transition-all ${n === step ? 'w-5 bg-indigo-500' : 'w-2 bg-zinc-700'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">

          {step === 1 && (
            <div className="flex flex-col gap-2 pt-1">
              {zones.length === 0 ? (
                <p className="text-center text-zinc-600 text-sm py-8">No zones found.</p>
              ) : (
                zones.map(zone => {
                  const isSelected = selectedZoneId === zone.id
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setSelectedZoneId(isSelected ? null : zone.id)}
                      className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${isSelected ? 'text-indigo-300' : 'text-zinc-100'}`}>
                          {zone.name}
                        </p>
                      </div>
                      {zone.discipline && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${DISCIPLINE_BADGE[zone.discipline] ?? 'bg-zinc-700/50 text-zinc-400'}`}>
                          {zone.discipline}
                        </span>
                      )}
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3 pt-1">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => !saving && onSubmit({ zoneId: selectedZoneId, status: s.value })}
                  disabled={saving}
                  className={`w-full flex items-start gap-4 px-4 py-4 rounded-2xl border text-left transition-all active:scale-[0.98] disabled:opacity-60 ${s.border} ${s.bg}`}
                >
                  <div className={`mt-0.5 w-3 h-3 rounded-full shrink-0 ${s.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${s.text}`}>{s.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{s.desc}</p>
                  </div>
                  {saving ? (
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRightIcon />
                  )}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Footer — step 1 only */}
        {step === 1 && (
          <div className="shrink-0 px-4 pb-6 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all text-white font-semibold text-base shadow-lg shadow-indigo-900/40"
            >
              Continue
            </button>
            <p className="text-center text-xs text-zinc-600 mt-2">
              {selectedZoneId ? 'Zone selected' : 'No zone selected — you can skip this'}
            </p>
          </div>
        )}

        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </div>
    </>
  )
}

// ── User action sheet ──────────────────────────────────────────────────────────

function UserActionSheet({ open, session, onClose, onNotify, onViewProfile, notifying }) {
  if (!open || !session) return null
  const st = getStatus(session.status)

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-800 flex flex-col">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* User identity */}
        <div className="flex flex-col items-center gap-2 pt-2 pb-5 px-5">
          {session.avatar_url ? (
            <img
              src={session.avatar_url}
              alt={session.username ?? 'Climber'}
              className="w-16 h-16 rounded-full object-cover bg-zinc-800"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-xl font-bold text-zinc-300">
              {session.username ? session.username[0].toUpperCase() : '?'}
            </div>
          )}
          <p className="text-sm font-semibold text-zinc-100">{session.username ?? 'Climber'}</p>
          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${st.badge}`}>
            {st.label}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-4 pb-6">
          <button
            onClick={onNotify}
            disabled={notifying}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all text-white font-semibold text-sm shadow-lg shadow-indigo-900/40 disabled:opacity-60"
          >
            {notifying ? 'Sending…' : "Let them know you're interested"}
          </button>
          <button
            onClick={onViewProfile}
            className="w-full py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] transition-all text-zinc-200 font-semibold text-sm"
          >
            View Profile
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-zinc-500 hover:text-zinc-400 active:opacity-70 transition-all text-sm font-medium"
          >
            Cancel
          </button>
        </div>

        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </div>
    </>
  )
}

// ── Notifications bottom sheet ─────────────────────────────────────────────────

function NotificationsSheet({ open, onClose, notifications, onNotifTap, onMarkAllRead, markingAllRead }) {
  if (!open) return null
  const unread = notifications.filter(n => !n.is_read).length

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-800 flex flex-col max-h-[88vh]">

        {/* Handle + header */}
        <div className="shrink-0 px-5 pt-3 pb-4 border-b border-zinc-800">
          <div className="flex justify-center pb-4">
            <div className="w-10 h-1 rounded-full bg-zinc-700" />
          </div>
          <div className="flex items-center gap-3">
            <h2 className="flex-1 text-base font-semibold text-zinc-100">Notifications</h2>
            {unread > 0 && (
              <button
                onClick={onMarkAllRead}
                disabled={markingAllRead}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 active:opacity-70 disabled:opacity-40 transition-opacity"
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {notifications.length === 0 ? (
            <p className="text-center text-zinc-600 text-sm py-10">No notifications yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => onNotifTap(n)}
                  className={`w-full flex items-start gap-3 px-3 py-3 rounded-2xl text-left transition-all active:scale-[0.98] ${
                    !n.is_read
                      ? 'bg-indigo-500/10 border border-indigo-500/15'
                      : 'hover:bg-zinc-800/50'
                  }`}
                >
                  {n.sender_avatar_url ? (
                    <img
                      src={n.sender_avatar_url}
                      alt={n.sender_username ?? ''}
                      className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5 bg-zinc-800"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5 text-sm font-bold text-zinc-300">
                      {n.sender_username ? n.sender_username[0].toUpperCase() : '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-100 leading-snug">
                      <span className="font-semibold">{n.sender_username ?? 'Someone'}</span>
                      {' '}{n.message}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </div>
    </>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function GymPresencePage() {
  const { id } = useParams()
  const router = useRouter()

  const userIdRef = useRef(null)
  const toastTimerRef = useRef(null)

  // Single source of truth for the current user's checked-in state.
  // null  → not checked in (show Check In button)
  // {...} → checked in (show session card)
  const [activeSession, setActiveSession] = useState(null)

  const [gym, setGym] = useState(null)
  const [zones, setZones] = useState([])
  const [activeCount, setActiveCount] = useState(null)
  const [activeSessions, setActiveSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetStartStep, setSheetStartStep] = useState(1)
  const [sheetInitialZone, setSheetInitialZone] = useState(null)
  const [saving, setSaving] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  // toast: null | { message: string }
  const [toast, setToast] = useState(null)

  const [userId, setUserId] = useState(null)
  const [currentUsername, setCurrentUsername] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [notifSheetOpen, setNotifSheetOpen] = useState(false)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [actionTarget, setActionTarget] = useState(null)
  const [notifying, setNotifying] = useState(false)

  // ── Initial data fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return

    async function fetchData() {
      // 1. Confirm auth first
      const { data: { user } } = await supabase.auth.getUser()
      userIdRef.current = user?.id ?? null
      if (user) setUserId(user.id)

      // 2. Parallel non-user fetches
      const [gymData, zonesArr, count, sessions] = await Promise.all([
        fetchGymById(id),
        fetchZonesByGym(id),
        fetchActiveGymPresenceCount(id),
        fetchActiveGymSessions(id),
      ])

      setGym(gymData)
      setZones(zonesArr)
      setActiveCount(count)
      setActiveSessions(sessions)

      // 3. User-dependent fetches in parallel
      if (user) {
        const [session, notifsArr, profile] = await Promise.all([
          fetchUserActiveGymSession(user.id, id),
          fetchNotifications(user.id),
          fetchUserProfile(user.id),
        ])
        setActiveSession(session)
        setNotifications(notifsArr)
        setCurrentUsername(profile?.username ?? null)
      }

      setLoading(false)
    }

    fetchData()
  }, [id])

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`gym-presence-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gym_sessions', filter: `gym_id=eq.${id}` },
        () => {
          fetchActiveGymSessions(id).then(s => setActiveSessions(s))
          fetchActiveGymPresenceCount(id).then(c => setActiveCount(c))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  // ── Notifications realtime ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notifications-presence-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, () => {
        fetchNotifications(userId).then(n => setNotifications(n))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // ── Cleanup toast timer on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }
  }, [])

  // ── Toast helper ────────────────────────────────────────────────────────────
  function showToast(message) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ message })
    toastTimerRef.current = setTimeout(() => setToast(null), 2000)
  }

  // ── Notification handlers ───────────────────────────────────────────────────
  async function handleNotifTap(notif) {
    setNotifSheetOpen(false)
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      await markNotificationRead(notif.id)
    }
    if (notif.sender_id) {
      router.push(`/profile/${notif.sender_id}?from=gym&gymId=${id}`)
    }
  }

  async function handleMarkAllRead() {
    if (!userId) return
    setMarkingAllRead(true)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    await markAllNotificationsRead(userId)
    setMarkingAllRead(false)
  }

  // ── Spot request ────────────────────────────────────────────────────────────
  async function handleNotifyUser() {
    if (!actionTarget || !userId) return
    setNotifying(true)
    const zoneName = currentZone?.name ?? null
    const username = currentUsername ?? 'Someone'
    const message = zoneName
      ? `${username} is looking for a spot and wants to connect with you at ${zoneName}`
      : `${username} is looking for a spot and wants to connect with you`
    await insertNotification({
      recipient_id: actionTarget.user_id,
      sender_id: userId,
      type: 'spot_request',
      message,
    })
    setNotifying(false)
    setActionTarget(null)
    showToast("They've been notified!")
  }

  // ── Sheet handlers ──────────────────────────────────────────────────────────
  function openCheckIn() {
    setSheetStartStep(1)
    setSheetInitialZone(null)
    setSheetOpen(true)
  }

  function openChangeStatus() {
    // Go straight to status selection (step 2) — zone is already set
    setSheetStartStep(2)
    setSheetInitialZone(activeSession?.zone_id ?? null)
    setSheetOpen(true)
  }

  async function handleSheetSubmit({ zoneId, status }) {
    const uid = userIdRef.current
    if (!uid) return
    setSaving(true)

    if (activeSession) {
      // ── Change Status on an existing session ──
      const { error } = await updateGymSession(activeSession.id, { zone_id: zoneId ?? null, status })
      setSaving(false)
      setSheetOpen(false)
      if (!error) {
        setActiveSession(prev => ({ ...prev, zone_id: zoneId ?? null, status }))
      }
    } else {
      // ── Fresh check-in ──
      const selectedZone = zones.find(z => z.id === zoneId) ?? null
      console.log('[CheckIn] selected zone object:', selectedZone, '| zoneId arg:', zoneId)
      const insertPayload = {
        user_id: uid,
        gym_id: id,
        zone_id: zoneId ?? null,
        status,
        is_active: true,
        checked_in_at: new Date().toISOString(),
      }
      console.log('[CheckIn] inserting payload:', JSON.stringify(insertPayload, null, 2))
      const { data, error } = await insertGymSession(insertPayload)
      console.log('[CheckIn] result — data:', data, '| error:', error)
      setSaving(false)
      setSheetOpen(false)

      if (!error && data) {
        setActiveCount(prev => (prev ?? 0) + 1)
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToast({ message: 'You are checked in' })
        toastTimerRef.current = setTimeout(() => {
          setToast(null)
          setActiveSession(data)
        }, 2000)
      }
    }
  }

  // ── Check out ───────────────────────────────────────────────────────────────
  async function handleCheckOut() {
    if (!activeSession) return
    setCheckingOut(true)
    const { error } = await checkOutGymSession(activeSession.id)
    setCheckingOut(false)
    if (!error) {
      setActiveSession(null)
      setActiveCount(prev => Math.max(0, (prev ?? 1) - 1))
      showToast('Checked out')
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const currentStatus = activeSession ? getStatus(activeSession.status) : null
  const currentZone = activeSession?.zone_id ? zones.find(z => z.id === activeSession.zone_id) : null
  const unreadNotifCount = notifications.filter(n => !n.is_read).length

  const sections = SECTION_ORDER
    .map(sv => ({ status: getStatus(sv), users: activeSessions.filter(s => s.status === sv) }))
    .filter(s => s.users.length > 0)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100`}>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        .toast-slide-up { animation: slide-up 200ms ease forwards; }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => router.push(`/gym/${id}`)}
          className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <h1 className="flex-1 text-base font-semibold text-zinc-100 truncate">
          {gym?.name ?? '…'}
        </h1>
        {/* Bell button — always shown when not loading */}
        {!loading && (
          <button
            onClick={() => setNotifSheetOpen(true)}
            className="relative shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-1"
            aria-label="Notifications"
          >
            <BellIcon />
            {unreadNotifCount > 0 && (
              <span className="absolute top-0 right-0 min-w-[15px] h-[15px] rounded-full bg-rose-500 flex items-center justify-center text-[9px] font-bold text-white leading-none px-0.5">
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </button>
        )}
        {/* Header Check In button — only shown when not loading and no active session */}
        {!loading && !activeSession && !toast && (
          <button
            onClick={openCheckIn}
            className="shrink-0 px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white text-sm font-semibold"
          >
            Check In
          </button>
        )}
      </div>

      <div className="pb-28 flex flex-col gap-0">

        <div className="px-4 pt-6 pb-4 flex flex-col gap-6">

          {/* ── Active session card ── */}
          {!loading && activeSession && currentStatus && (
            <div className={`rounded-2xl border px-4 py-4 flex flex-col gap-3 ${currentStatus.border} ${currentStatus.bg}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-3 h-3 rounded-full shrink-0 ${currentStatus.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-base ${currentStatus.text}`}>{currentStatus.label}</p>
                  <p className="text-sm text-zinc-500 mt-0.5">{currentStatus.desc}</p>
                  {currentZone && (
                    <p className="text-xs text-zinc-500 mt-1.5">
                      <span className="text-zinc-600">Zone: </span>{currentZone.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={openChangeStatus}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all text-sm font-semibold text-zinc-300"
                >
                  Change Status
                </button>
                <button
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 transition-all text-sm font-semibold text-rose-400 disabled:opacity-50"
                >
                  {checkingOut ? 'Checking Out…' : 'Check Out'}
                </button>
              </div>
            </div>
          )}

          {/* ── Who's Climbing count ── */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="text-indigo-400">
              <UsersIcon />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Who's Climbing</h2>

            {loading ? (
              <div className="flex flex-col items-center gap-2 mt-2">
                <div className="h-14 w-24 rounded-2xl bg-zinc-900 animate-pulse" />
                <div className="h-4 w-40 rounded-lg bg-zinc-900 animate-pulse" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <p className="text-6xl font-bold text-zinc-100 tabular-nums">{activeCount}</p>
                <p className="text-sm text-zinc-500">
                  {activeCount === 1 ? 'climber active' : 'climbers active'} in the last 3 hours
                </p>
              </div>
            )}
          </div>

          {/* ── Check In CTA — only when not loading, not checked in, no toast showing ── */}
          {!loading && !activeSession && !toast && (
            <div className="flex flex-col items-center gap-2 mt-2">
              <button
                onClick={openCheckIn}
                className="w-full max-w-xs py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all text-white font-semibold text-base shadow-lg shadow-indigo-900/40"
              >
                Check In
              </button>
              <p className="text-xs text-zinc-600">Let others know you're here</p>
            </div>
          )}

        </div>

        {/* ── Active user grid ── */}
        {loading ? (
          <div className="px-4 pt-4 grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full bg-zinc-900 animate-pulse" />
                <div className="h-3 w-14 rounded bg-zinc-900 animate-pulse" />
                <div className="h-4 w-16 rounded-full bg-zinc-900 animate-pulse" />
              </div>
            ))}
          </div>
        ) : sections.length === 0 ? (
          <p className="text-center text-zinc-600 text-sm py-10 px-4">
            No one has checked in yet. Be the first!
          </p>
        ) : (
          <div className="flex flex-col gap-6 px-4 pt-4">
            {sections.map(({ status: st, users }) => (
              <div key={st.value}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{st.label}</p>
                  <span className="text-xs text-zinc-700">{users.length}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {users.map(session => (
                    <AvatarCard
                      key={session.id}
                      session={session}
                      onTap={session.user_id === userId
                        ? () => router.push(`/profile/${session.user_id}?from=gym&gymId=${id}`)
                        : () => setActionTarget(session)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="toast-slide-up fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3 shadow-xl whitespace-nowrap">
          <CheckCircleIcon />
          <span className="text-sm font-medium text-zinc-100">{toast.message}</span>
        </div>
      )}

      <UserActionSheet
        open={!!actionTarget}
        session={actionTarget}
        onClose={() => setActionTarget(null)}
        onNotify={handleNotifyUser}
        onViewProfile={() => {
          const target = actionTarget
          setActionTarget(null)
          router.push(`/profile/${target.user_id}?from=gym&gymId=${id}`)
        }}
        notifying={notifying}
      />

      <NotificationsSheet
        open={notifSheetOpen}
        onClose={() => setNotifSheetOpen(false)}
        notifications={notifications}
        onNotifTap={handleNotifTap}
        onMarkAllRead={handleMarkAllRead}
        markingAllRead={markingAllRead}
      />

      <CheckInSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        zones={zones}
        onSubmit={handleSheetSubmit}
        saving={saving}
        initialZoneId={sheetInitialZone}
        startStep={sheetStartStep}
      />

      <BottomNav />
    </div>
  )
}
