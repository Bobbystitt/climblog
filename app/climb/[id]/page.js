'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import { climbColor } from '@/constants/colors'
import { fetchClimbById } from '@/lib/queries'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })


function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  )
}


function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function CameraIcon({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  )
}

function RepeatIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function StarIcon({ filled }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  )
}

function StarRating({ value, onChange, color = 'text-yellow-400' }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className={`transition-colors active:scale-90 ${n <= value ? color : 'text-zinc-700'}`}
        >
          <StarIcon filled={n <= value} />
        </button>
      ))}
    </div>
  )
}

function PhotoModal({ url, onClose }) {
  const containerRef = useRef(null)
  const gestureRef = useRef({
    scale: 1, tx: 0, ty: 0,
    isPinching: false,
    initDist: 0, initScale: 1,
    initTx: 0, initTy: 0,
    initX: 0, initY: 0,
  })
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 })

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Native touch listeners so we can call preventDefault on touchmove
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function pinchDist(touches) {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    function commit(scale, tx, ty) {
      gestureRef.current.scale = scale
      gestureRef.current.tx = tx
      gestureRef.current.ty = ty
      setTransform({ scale, tx, ty })
    }

    function onStart(e) {
      const g = gestureRef.current
      if (e.touches.length === 2) {
        g.isPinching = true
        g.initDist = pinchDist(e.touches)
        g.initScale = g.scale
        g.initTx = g.tx
        g.initTy = g.ty
      } else if (e.touches.length === 1) {
        g.initX = e.touches[0].clientX
        g.initY = e.touches[0].clientY
        g.initTx = g.tx
        g.initTy = g.ty
      }
    }

    function onMove(e) {
      e.preventDefault()
      const g = gestureRef.current
      if (e.touches.length === 2) {
        const newScale = Math.min(4, Math.max(1, g.initScale * (pinchDist(e.touches) / g.initDist)))
        commit(newScale, g.tx, g.ty)
      } else if (e.touches.length === 1 && !g.isPinching && g.scale > 1) {
        const dx = e.touches[0].clientX - g.initX
        const dy = e.touches[0].clientY - g.initY
        commit(g.scale, g.initTx + dx, g.initTy + dy)
      }
    }

    function onEnd(e) {
      if (e.touches.length < 2) gestureRef.current.isPinching = false
      if (gestureRef.current.scale <= 1) commit(1, 0, 0)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur flex items-center justify-center text-zinc-300 hover:text-white active:scale-90 transition-all"
        aria-label="Close"
      >
        <XIcon />
      </button>

      {/* Image container — touch-handled, click stops propagation to backdrop */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt="Climb photo"
          draggable={false}
          className="w-full max-h-screen object-contain select-none"
          style={{
            transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
            transformOrigin: 'center center',
            touchAction: 'none',
            willChange: 'transform',
            userSelect: 'none',
          }}
        />
      </div>
    </div>
  )
}

function LogAscentModal({ climbId, initialAttempts, currentRepeatCount, onClose, onSaved }) {
  const [attempts, setAttempts] = useState(Math.max(1, initialAttempts))
  const [difficulty, setDifficulty] = useState(0)
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setError('Not logged in.'); return }

    const now = new Date().toISOString()

    const { error: insertError } = await supabase.from('ascents').insert({
      user_id: user.id,
      climb_id: climbId,
      tries: attempts,
      status: 'sent',
      notes: notes.trim() || null,
      climbed_at: now,
      difficulty_rating: difficulty || null,
      rating: rating || null,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    const { error: rpcError } = await supabase.rpc('increment_repeat_count', { climb_id: climbId })
    if (rpcError) {
      // Fallback: manual increment
      await supabase
        .from('climbs')
        .update({ repeat_count: (currentRepeatCount ?? 0) + 1 })
        .eq('id', climbId)
    }

    setSaving(false)
    onSaved()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-800 pb-safe">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        <div className="px-5 pt-3 pb-6 flex flex-col gap-6 overflow-y-auto max-h-[80vh]">
          <h2 className="text-lg font-bold text-zinc-100">Log Ascent</h2>

          {/* Attempts */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Attempts</p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setAttempts(a => Math.max(1, a - 1))}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-xl font-light"
              >
                −
              </button>
              <span className="w-8 text-center text-xl font-bold text-zinc-100">{attempts}</span>
              <button
                type="button"
                onClick={() => setAttempts(a => a + 1)}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-xl font-light"
              >
                +
              </button>
            </div>
          </div>

          {/* Difficulty rating */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Difficulty</p>
            <StarRating value={difficulty} onChange={setDifficulty} color="text-orange-400" />
          </div>

          {/* Overall rating */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rating</p>
            <StarRating value={rating} onChange={setRating} color="text-yellow-400" />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How'd it go? Key moves, beta…"
              rows={3}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 resize-none transition"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3 -mt-2">{error}</p>
          )}

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all text-white font-semibold text-base shadow-lg shadow-indigo-900/40"
          >
            {saving ? 'Saving…' : 'Save Ascent'}
          </button>
        </div>
      </div>
    </>
  )
}

function ProjectConfirmModal({ attempts, onYes, onNo, saving }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70" />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 w-full max-w-sm flex flex-col gap-4">
          <h2 className="text-base font-bold text-zinc-100">Log your attempts?</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            You have {attempts} {attempts === 1 ? 'attempt' : 'attempts'} on this climb. Want to save them to your logbook?
          </p>
          <div className="flex gap-3 mt-1">
            <button
              onClick={onNo}
              className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 active:scale-[0.98] transition-all"
            >
              No
            </button>
            <button
              onClick={onYes}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving…' : 'Yes'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function ClimbPage() {
  const { id } = useParams()
  const router = useRouter()
  const [climb, setClimb] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [confirmNav, setConfirmNav] = useState(null) // { destination } when showing guard
  const [confirmSaving, setConfirmSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile) setUserRole(profile.role)
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    if (id) localStorage.setItem('savedPath', `/climb/${id}`)
  }, [id])

  useEffect(() => {
    async function fetchClimb() {
      const { data, error } = await fetchClimbById(id)
      if (error || !data) setNotFound(true)
      else setClimb(data)
      setLoading(false)
    }
    if (id) fetchClimb()
  }, [id])

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${id}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('climb-photos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      e.target.value = ''
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('climb-photos')
      .getPublicUrl(path)

    await supabase.from('climbs').update({ photo_url: publicUrl }).eq('id', id)
    setClimb(c => ({ ...c, photo_url: publicUrl }))
    setUploading(false)
    e.target.value = ''
  }

  function navigate(destination) {
    if (attempts > 0) {
      setConfirmNav({ destination })
    } else {
      router.push(destination)
    }
  }

  async function handleConfirmYes() {
    setConfirmSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('ascents').insert({
        user_id: user.id,
        climb_id: id,
        tries: attempts,
        status: 'project',
        climbed_at: new Date().toISOString(),
      })
    }
    setConfirmSaving(false)
    router.push(confirmNav.destination)
  }

  function handleConfirmNo() {
    router.push(confirmNav.destination)
  }

  if (loading) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4`}>
        <p className="text-zinc-400 text-sm">Climb not found.</p>
        <button onClick={() => router.push('/dashboard')} className="text-zinc-500 text-sm underline">Go back</button>
      </div>
    )
  }

  const repeatCount = climb.repeat_count ?? 0

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate(`/zone/${climb.zone_id}`)}
          className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <h1 className="flex-1 text-base font-semibold text-zinc-100 truncate">
          {climb.grade || 'Unknown Grade'}
        </h1>
        {(userRole === 'setter' || userRole === 'admin') && (
          <button
            onClick={() => router.push(`/climb/${id}/edit`)}
            className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-1.5 rounded-lg hover:bg-zinc-800"
            aria-label="Edit climb"
          >
            <PencilIcon />
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-40">
        {/* Photo area */}
        <div className="relative w-full h-56 bg-zinc-800 overflow-hidden">
          {climb.photo_url ? (
            <img
              src={climb.photo_url}
              alt="Climb photo"
              onClick={() => setPhotoModalOpen(true)}
              className="w-full h-full object-cover cursor-pointer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CameraIcon className="w-10 h-10 text-zinc-600" />
            </div>
          )}

          {/* Grade badge overlaid bottom-left */}
          <div
            className="absolute bottom-3 left-3 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: climbColor(climb.color) }}
          >
            <span className="text-white font-bold text-sm leading-none">{climb.grade || '?'}</span>
          </div>

          {/* Upload button — setter/admin only */}
          {(userRole === 'setter' || userRole === 'admin') && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur flex items-center justify-center text-zinc-300 hover:text-zinc-100 active:scale-90 transition-all disabled:opacity-50"
              aria-label="Upload photo"
            >
              {uploading
                ? <div className="w-5 h-5 rounded-full border-2 border-zinc-600 border-t-zinc-200 animate-spin" />
                : <CameraIcon />
              }
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {/* Climb info */}
        <div className="px-4 mt-5">
          {/* Tags row */}
          {Array.isArray(climb.tags) && climb.tags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {climb.tags.map((tag) => (
                <span key={tag} className="bg-zinc-800 text-zinc-400 text-sm px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Repeat count */}
          <div className="flex items-center justify-center gap-1.5 mt-4 text-zinc-500">
            <RepeatIcon />
            <span className="text-sm">
              {repeatCount === 0
                ? 'No repeats yet'
                : `${repeatCount} ${repeatCount === 1 ? 'repeat' : 'repeats'}`}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800 mt-6" />

          {/* Description if present */}
          {climb.description && (
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">{climb.description}</p>
          )}
        </div>
      </div>

      {/* Bottom action bar — Log Ascent + Attempts counter */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 pt-4 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent">
        <div className="flex items-center gap-3">
          {/* Log Ascent button */}
          <button
            onClick={() => setModalOpen(true)}
            className="flex-1 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all text-white font-semibold text-base shadow-lg shadow-indigo-900/40"
          >
            Log Ascent
          </button>

          {/* Attempts counter */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl px-3 py-3">
            <button
              onClick={() => setAttempts(a => Math.max(0, a - 1))}
              className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-lg font-light"
            >
              −
            </button>
            <span className="w-6 text-center text-base font-bold text-zinc-100">{attempts}</span>
            <button
              onClick={() => setAttempts(a => a + 1)}
              className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-lg font-light"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <BottomNav onNavigate={navigate} />

      {/* Success toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3 flex items-center gap-2 shadow-xl">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400 shrink-0">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-zinc-100">Ascent logged!</span>
        </div>
      )}

      {/* Photo lightbox */}
      {photoModalOpen && climb.photo_url && (
        <PhotoModal url={climb.photo_url} onClose={() => setPhotoModalOpen(false)} />
      )}

      {/* Project confirm modal */}
      {confirmNav && (
        <ProjectConfirmModal
          attempts={attempts}
          saving={confirmSaving}
          onYes={handleConfirmYes}
          onNo={handleConfirmNo}
        />
      )}

      {/* Log Ascent modal */}
      {modalOpen && (
        <LogAscentModal
          climbId={id}
          initialAttempts={attempts}
          currentRepeatCount={climb?.repeat_count ?? 0}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            setAttempts(0)
            setClimb(c => ({ ...c, repeat_count: (c.repeat_count ?? 0) + 1 }))
            setToast(true)
            setTimeout(() => setToast(false), 2500)
          }}
        />
      )}
    </div>
  )
}
