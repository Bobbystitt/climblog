'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import ConfirmModal from '@/app/components/ConfirmModal'
import { climbColor } from '@/constants/colors'
import {
  fetchClimbById,
  fetchZoneById,
  fetchSetterProfile,
  claimClimb,
  unclaimClimb,
  fetchClimbComments,
  insertClimbComment,
  deleteClimbComment,
  fetchClimbMedia,
  insertClimbMedia,
  deleteClimbMedia,
} from '@/lib/queries'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(isoStr) {
  if (!isoStr) return ''
  const diffSec = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000)
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Avatar({ url, name, className = '' }) {
  const letter = (name ?? '?')[0].toUpperCase()
  if (url) {
    return <img src={url} alt={name ?? ''} className={`rounded-full object-cover bg-zinc-700 shrink-0 ${className}`} />
  }
  return (
    <div className={`rounded-full bg-indigo-600/25 flex items-center justify-center shrink-0 ${className}`}>
      <span className="text-[10px] font-bold text-indigo-400 leading-none">{letter}</span>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

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

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-zinc-600">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white ml-1">
      <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
    </svg>
  )
}

function UploadMediaIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

// ─── Star rating ──────────────────────────────────────────────────────────────

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

// ─── Photo lightbox ───────────────────────────────────────────────────────────

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

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

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
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center" onClick={onClose}>
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur flex items-center justify-center text-zinc-300 hover:text-white active:scale-90 transition-all"
        aria-label="Close"
      >
        <XIcon />
      </button>
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

// ─── Log Ascent Modal ─────────────────────────────────────────────────────────

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

    if (insertError) { setError(insertError.message); setSaving(false); return }

    const { error: rpcError } = await supabase.rpc('increment_repeat_count', { climb_id: climbId })
    if (rpcError) {
      await supabase.from('climbs').update({ repeat_count: (currentRepeatCount ?? 0) + 1 }).eq('id', climbId)
    }

    setSaving(false)
    onSaved()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-800 pb-safe">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>
        <div className="px-5 pt-3 pb-6 flex flex-col gap-6 overflow-y-auto max-h-[80vh]">
          <h2 className="text-lg font-bold text-zinc-100">Log Ascent</h2>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Attempts</p>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setAttempts(a => Math.max(1, a - 1))}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-xl font-light">−</button>
              <span className="w-8 text-center text-xl font-bold text-zinc-100">{attempts}</span>
              <button type="button" onClick={() => setAttempts(a => a + 1)}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-xl font-light">+</button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Difficulty</p>
            <StarRating value={difficulty} onChange={setDifficulty} color="text-orange-400" />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rating</p>
            <StarRating value={rating} onChange={setRating} color="text-yellow-400" />
          </div>

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

          {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3 -mt-2">{error}</p>}

          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all text-white font-semibold text-base shadow-lg shadow-indigo-900/40">
            {saving ? 'Saving…' : 'Save Ascent'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Project Confirm Modal ────────────────────────────────────────────────────

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
            <button onClick={onNo}
              className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 active:scale-[0.98] transition-all">No</button>
            <button onClick={onYes} disabled={saving}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 transition-all">
              {saving ? 'Saving…' : 'Yes'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Media Upload Sheet ───────────────────────────────────────────────────────

function MediaUploadSheet({ file, climbId, userId, onClose, onUploaded }) {
  const [caption, setCaption] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const mediaType = file.type.startsWith('video') ? 'video' : 'photo'

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function handleUpload() {
    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `${climbId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('climb-media')
      .upload(path, file, { upsert: false })

    if (uploadError) {
      console.error('Media storage upload error:', uploadError)
      setError(`Upload failed: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('climb-media').getPublicUrl(path)

    const { data, error: insertError } = await insertClimbMedia({
      climb_id: climbId,
      user_id: userId,
      url: publicUrl,
      media_type: mediaType,
      caption: caption.trim() || null,
      is_public: isPublic,
    })

    if (insertError) {
      console.error('Media DB insert error:', insertError)
      setError(insertError.message)
      setUploading(false)
      return
    }

    onUploaded(data)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-800 max-h-[85vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>
        <div className="px-5 pt-2 pb-3 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-zinc-100">Add Media</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-sm">Cancel</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-6 flex flex-col gap-5">
          {preview && (
            mediaType === 'video'
              ? <video src={preview} className="w-full rounded-xl max-h-52 object-cover" controls playsInline />
              : <img src={preview} alt="Preview" className="w-full max-h-52 object-cover rounded-xl" />
          )}

          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Caption <span className="normal-case font-normal text-zinc-600">(optional)</span>
            </p>
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-300">Visible to everyone</p>
            <button
              onClick={() => setIsPublic(v => !v)}
              className={`w-11 h-6 rounded-full relative transition-colors ${isPublic ? 'bg-indigo-600' : 'bg-zinc-700'}`}
              aria-pressed={isPublic}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</p>}

          <button onClick={handleUpload} disabled={uploading}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all text-white font-semibold text-base shadow-lg shadow-indigo-900/40">
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Video item ───────────────────────────────────────────────────────────────

function VideoItem({ url, caption }) {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-zinc-900">
      <video
        ref={videoRef}
        src={url}
        className="w-full"
        playsInline
        onEnded={() => setPlaying(false)}
        onClick={togglePlay}
      />
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Play video"
        >
          <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
            <PlayIcon />
          </div>
        </button>
      )}
      {caption && <p className="px-3 py-2 text-xs text-zinc-400 bg-zinc-900">{caption}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClimbPage() {
  const { id } = useParams()
  const router = useRouter()

  // Core climb state
  const [climb, setClimb] = useState(null)
  const [gymId, setGymId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Ascent interaction state
  const [attempts, setAttempts] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState(false)
  const [confirmNav, setConfirmNav] = useState(null)
  const [confirmSaving, setConfirmSaving] = useState(false)

  // Photo upload (hero)
  const [uploading, setUploading] = useState(false)
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const fileInputRef = useRef(null)

  // User / role
  const [userRole, setUserRole] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const currentUserIdRef = useRef(null)

  // Setter attribution
  const [setter, setSetter] = useState(null)
  const [claiming, setClaiming] = useState(false)
  const [unclaiming, setUnclaiming] = useState(false)

  // Comments
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [commentError, setCommentError] = useState(null)
  const [deletingCommentId, setDeletingCommentId] = useState(null)

  // Media feed
  const [media, setMedia] = useState([])
  const [pendingMediaFile, setPendingMediaFile] = useState(null)
  const mediaFileInputRef = useRef(null)
  const [deletingMediaId, setDeletingMediaId] = useState(null)

  // Delete confirmation modal
  // { type: 'comment' | 'media', id: string, message: string }
  const [pendingDelete, setPendingDelete] = useState(null)

  // ── Fetch user profile & role ──
  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      currentUserIdRef.current = user.id
      setCurrentUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile) setUserRole(profile.role)
    }
    fetchProfile()
  }, [])

  // ── Save path ──
  useEffect(() => {
    if (id) localStorage.setItem('savedPath', `/climb/${id}`)
  }, [id])

  // ── Fetch climb, comments, and media in parallel ──
  useEffect(() => {
    async function load() {
      const [{ data: climbData, error }, commentsData, mediaData] = await Promise.all([
        fetchClimbById(id),
        fetchClimbComments(id),
        fetchClimbMedia(id),
      ])

      if (error || !climbData) { setNotFound(true); setLoading(false); return }

      setClimb(climbData)
      setComments(commentsData)
      setMedia(mediaData)
      setLoading(false)

      // Fetch zone to get gym_id for back navigation, and setter profile
      const [zoneData] = await Promise.all([
        fetchZoneById(climbData.zone_id),
        climbData.setter_id
          ? fetchSetterProfile(climbData.setter_id).then(p => { if (p) setSetter(p) })
          : Promise.resolve(),
      ])
      if (zoneData?.gym_id) setGymId(zoneData.gym_id)
    }
    if (id) load()
  }, [id])

  // ── Hero photo upload ──
  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${id}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('climb-photos')
      .upload(path, file, { upsert: true })

    if (uploadError) { setUploading(false); e.target.value = ''; return }

    const { data: { publicUrl } } = supabase.storage.from('climb-photos').getPublicUrl(path)
    await supabase.from('climbs').update({ photo_url: publicUrl }).eq('id', id)
    setClimb(c => ({ ...c, photo_url: publicUrl }))
    setUploading(false)
    e.target.value = ''
  }

  // ── Claim climb ──
  async function handleClaim() {
    const userId = currentUserIdRef.current
    if (!userId) return
    setClaiming(true)
    const { error } = await claimClimb(id, userId)
    if (!error) {
      setClimb(c => ({ ...c, setter_id: userId }))
      const profile = await fetchSetterProfile(userId)
      if (profile) setSetter(profile)
    }
    setClaiming(false)
  }

  // ── Unclaim climb ──
  async function handleUnclaim() {
    setUnclaiming(true)
    const { error } = await unclaimClimb(id)
    if (!error) {
      setClimb(c => ({ ...c, setter_id: null }))
      setSetter(null)
    }
    setUnclaiming(false)
  }

  // ── Add comment ──
  async function handleSendComment() {
    const userId = currentUserIdRef.current
    if (!userId || !commentText.trim()) return
    setCommentError(null)
    setSendingComment(true)
    const { data, error } = await insertClimbComment(userId, id, commentText.trim())
    if (error) {
      console.error('Comment insert error:', error)
      setCommentError(error.message ?? 'Failed to post comment.')
    } else if (data) {
      setComments(prev => [...prev, data])
      setCommentText('')
    }
    setSendingComment(false)
  }

  // ── Delete comment ──
  function handleDeleteComment(commentId) {
    setPendingDelete({ type: 'comment', id: commentId, message: 'Delete this comment?' })
  }

  // ── Delete media ──
  function handleDeleteMedia(mediaId) {
    setPendingDelete({ type: 'media', id: mediaId, message: 'Delete this media?' })
  }

  // ── Confirm delete ──
  async function handleConfirmDelete() {
    if (!pendingDelete) return
    const { type, id: targetId } = pendingDelete
    if (type === 'comment') {
      setDeletingCommentId(targetId)
      setPendingDelete(null)
      const { error } = await deleteClimbComment(targetId)
      if (!error) setComments(prev => prev.filter(c => c.id !== targetId))
      setDeletingCommentId(null)
    } else if (type === 'media') {
      setDeletingMediaId(targetId)
      setPendingDelete(null)
      const { error } = await deleteClimbMedia(targetId)
      if (!error) setMedia(prev => prev.filter(m => m.id !== targetId))
      setDeletingMediaId(null)
    }
  }

  // ── Navigation guard ──
  function navigate(destination) {
    if (attempts > 0) setConfirmNav({ destination })
    else router.push(destination)
  }

  async function handleConfirmYes() {
    setConfirmSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('ascents').insert({
        user_id: user.id, climb_id: id, tries: attempts,
        status: 'project', climbed_at: new Date().toISOString(),
      })
    }
    setConfirmSaving(false)
    router.push(confirmNav.destination)
  }

  function handleConfirmNo() { router.push(confirmNav.destination) }

  // ── Loading / not found ──
  if (loading) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
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
          onClick={() => navigate(gymId ? `/gym/${gymId}` : '/dashboard')}
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

        {/* ── Hero photo ── */}
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

          <div
            className="absolute bottom-3 left-3 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: climbColor(climb.color) }}
          >
            <span className="text-white font-bold text-sm leading-none">{climb.grade || '?'}</span>
          </div>

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
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>

        {/* ── Grade tag thumbnail ── */}
        {climb.tag_photo_url && (
          <div className="px-4 mt-4 flex items-center gap-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Grade Tag</p>
            <img
              src={climb.tag_photo_url}
              alt="Grade tag"
              onClick={() => setPhotoModalOpen(climb.tag_photo_url)}
              className="w-14 h-14 object-cover rounded-xl cursor-pointer active:scale-95 transition-transform"
            />
          </div>
        )}

        {/* ── Climb info ── */}
        <div className="px-4 mt-5">
          {Array.isArray(climb.tags) && climb.tags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {climb.tags.map((tag) => (
                <span key={tag} className="bg-zinc-800 text-zinc-400 text-sm px-3 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 mt-4 text-zinc-500">
            <RepeatIcon />
            <span className="text-sm">
              {repeatCount === 0 ? 'No repeats yet' : `${repeatCount} ${repeatCount === 1 ? 'repeat' : 'repeats'}`}
            </span>
          </div>

          <div className="border-t border-zinc-800 mt-6" />

          {climb.description && (
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">{climb.description}</p>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            1. SETTER ATTRIBUTION BAR
        ══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-zinc-800 mt-4 mx-4" />

        {/* Unattributed */}
        {!climb.setter_id && (
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                <span className="text-zinc-600 text-xs font-bold">?</span>
              </div>
              <span className="text-sm text-zinc-500">Set by Unattributed</span>
            </div>
            {(userRole === 'setter' || userRole === 'admin') && (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 active:scale-95 transition-all"
              >
                {claiming ? 'Claiming…' : 'Claim this climb'}
              </button>
            )}
          </div>
        )}

        {/* Setter known — loading */}
        {climb.setter_id && !setter && (
          <div className="px-4 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse shrink-0" />
            <div className="h-3.5 w-36 bg-zinc-800 animate-pulse rounded-full" />
          </div>
        )}

        {/* Setter known — loaded */}
        {climb.setter_id && setter && (
          <div className="px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => router.push(`/profile/${climb.setter_id}?from=climb&climbId=${id}`)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 active:opacity-60 transition-opacity"
            >
              <Avatar url={setter.avatar_url} name={setter.username} className="w-8 h-8" />
              <span className="flex-1 min-w-0 text-sm text-zinc-400 truncate">
                Set by <span className="font-semibold text-zinc-200">{setter.username ?? 'Unknown'}</span>
              </span>
              <ChevronRightIcon />
            </button>
            {(currentUserId === climb.setter_id || userRole === 'admin') && (
              <button
                onClick={handleUnclaim}
                disabled={unclaiming}
                className="shrink-0 text-xs font-semibold text-rose-400 hover:text-rose-300 disabled:opacity-50 active:scale-95 transition-all ml-2"
              >
                {unclaiming ? 'Unclaiming…' : 'Unclaim'}
              </button>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            2. COMMENTS SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-zinc-800 mx-4" />
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Comments {comments.length > 0 && <span className="text-zinc-600 normal-case font-normal">· {comments.length}</span>}
          </p>

          {comments.length === 0 && (
            <p className="text-sm text-zinc-600 py-2">No comments yet. Be the first!</p>
          )}

          <div className="flex flex-col gap-4">
            {comments.map(comment => {
              const profile = comment.profiles ?? {}
              const canDelete = comment.user_id === currentUserId || userRole === 'admin'
              return (
                <div key={comment.id} className="flex gap-3">
                  <Avatar url={profile.avatar_url} name={profile.username} className="w-7 h-7 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-200">{profile.username ?? 'User'}</span>
                      <span className="text-[11px] text-zinc-600">{formatRelativeTime(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed mt-0.5">{comment.body}</p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deletingCommentId === comment.id}
                      className="shrink-0 p-1.5 text-zinc-600 hover:text-rose-400 active:scale-90 disabled:opacity-40 transition-all rounded-lg hover:bg-zinc-800"
                      aria-label="Delete comment"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {commentError && (
            <p className="mt-3 text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{commentError}</p>
          )}

          {/* Comment input */}
          {currentUserId && (
            <div className="flex gap-2 mt-4">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() } }}
                placeholder="Add a comment…"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition"
              />
              <button
                onClick={handleSendComment}
                disabled={sendingComment || !commentText.trim()}
                className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-90 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center text-white"
                aria-label="Send comment"
              >
                {sendingComment
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <SendIcon />
                }
              </button>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            3. MEDIA SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <div className="border-t border-zinc-800 mx-4 mt-4" />
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Media {media.length > 0 && <span className="text-zinc-600 normal-case font-normal">· {media.length}</span>}
            </p>
            {currentUserId && (
              <button
                onClick={() => mediaFileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 active:scale-95 transition-all"
              >
                <UploadMediaIcon />
                Add Media
              </button>
            )}
          </div>
          <input
            ref={mediaFileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) { setPendingMediaFile(file); e.target.value = '' }
            }}
          />

          {media.length === 0 && (
            <p className="text-sm text-zinc-600 py-2">No media yet.</p>
          )}

          <div className="flex flex-col gap-3">
            {media.map(item => {
              const canDelete = item.user_id === currentUserId || userRole === 'admin'
              const isDeleting = deletingMediaId === item.id
              return item.media_type === 'video'
                ? (
                  <div key={item.id} className="relative">
                    <VideoItem url={item.url} caption={item.caption} />
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteMedia(item.id)}
                        disabled={isDeleting}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-zinc-900/80 backdrop-blur flex items-center justify-center text-zinc-400 hover:text-rose-400 active:scale-90 disabled:opacity-40 transition-all"
                        aria-label="Delete media"
                      >
                        {isDeleting
                          ? <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-500 border-t-zinc-200 animate-spin" />
                          : <TrashIcon />
                        }
                      </button>
                    )}
                  </div>
                )
                : (
                  <div key={item.id} className="relative rounded-xl overflow-hidden bg-zinc-900">
                    <img
                      src={item.url}
                      alt={item.caption ?? 'Climb media'}
                      className="w-full object-cover"
                      onClick={() => setPhotoModalOpen(item.url)}
                    />
                    {item.caption && (
                      <p className="px-3 py-2 text-xs text-zinc-400">{item.caption}</p>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteMedia(item.id)}
                        disabled={isDeleting}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-zinc-900/80 backdrop-blur flex items-center justify-center text-zinc-400 hover:text-rose-400 active:scale-90 disabled:opacity-40 transition-all"
                        aria-label="Delete media"
                      >
                        {isDeleting
                          ? <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-500 border-t-zinc-200 animate-spin" />
                          : <TrashIcon />
                        }
                      </button>
                    )}
                  </div>
                )
            })}
          </div>
        </div>

      </div>

      {/* ── Fixed bottom action bar ── */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 pt-4 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="flex-1 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all text-white font-semibold text-base shadow-lg shadow-indigo-900/40"
          >
            Log Ascent
          </button>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl px-3 py-3">
            <button
              onClick={() => setAttempts(a => Math.max(0, a - 1))}
              className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-lg font-light"
            >−</button>
            <span className="w-6 text-center text-base font-bold text-zinc-100">{attempts}</span>
            <button
              onClick={() => setAttempts(a => a + 1)}
              className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-lg font-light"
            >+</button>
          </div>
        </div>
      </div>

      <BottomNav onNavigate={navigate} />

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3 flex items-center gap-2 shadow-xl">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400 shrink-0">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-zinc-100">Ascent logged!</span>
        </div>
      )}

      {/* ── Photo lightbox (hero + media images) ── */}
      {photoModalOpen && typeof photoModalOpen === 'string' && (
        <PhotoModal url={photoModalOpen} onClose={() => setPhotoModalOpen(false)} />
      )}
      {photoModalOpen === true && climb.photo_url && (
        <PhotoModal url={climb.photo_url} onClose={() => setPhotoModalOpen(false)} />
      )}

      {/* ── Project confirm modal ── */}
      {confirmNav && (
        <ProjectConfirmModal
          attempts={attempts}
          saving={confirmSaving}
          onYes={handleConfirmYes}
          onNo={handleConfirmNo}
        />
      )}

      {/* ── Log Ascent modal ── */}
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

      {/* ── Media upload sheet ── */}
      {pendingMediaFile && (
        <MediaUploadSheet
          file={pendingMediaFile}
          climbId={id}
          userId={currentUserIdRef.current}
          onClose={() => setPendingMediaFile(null)}
          onUploaded={(item) => {
            setMedia(prev => [item, ...prev])
            setPendingMediaFile(null)
          }}
        />
      )}

      {/* ── Delete confirmation modal ── */}
      <ConfirmModal
        open={!!pendingDelete}
        message={pendingDelete?.message ?? ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
