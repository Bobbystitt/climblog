'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import { climbColor } from '@/constants/colors'
import { ROPE_DISCIPLINES } from '@/constants/grades'
import {
  fetchClimbById,
  fetchZoneById,
  fetchSetterProfile,
  fetchClimbComments,
  insertClimbComment,
  fetchClimbMedia,
  insertClimbMedia,
  fetchUserFavorites,
  toggleFavorite,
  fetchClimbAscents,
  fetchClimbTotalsForUser,
} from '@/lib/queries'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function StatusBadge({ status, isFlash }) {
  if (!status) return null
  let label, bg, fg
  if (isFlash)                { label = 'Flash';   bg = 'rgba(59,130,246,0.15)'; fg = '#60a5fa' }
  else if (status === 'sent') { label = 'Sent';    bg = 'rgba(34,197,94,0.15)';  fg = '#4ade80' }
  else                        { label = 'Project'; bg = 'rgba(234,179,8,0.15)'; fg = '#fbbf24' }
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none" style={{ backgroundColor: bg, color: fg }}>
      {label}
    </span>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
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

function RepeatIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function HeartIcon({ filled }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-rose-400">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5 text-zinc-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

function PlayIcon({ className = 'w-5 h-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-zinc-500">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function UpvoteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
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

// ─── Star rating (used in LogAscentModal) ─────────────────────────────────────

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
        <button key={n} type="button" onClick={() => onChange(n === value ? 0 : n)}
          className={`transition-colors active:scale-90 ${n <= value ? color : 'text-zinc-700'}`}>
          <StarIcon filled={n <= value} />
        </button>
      ))}
    </div>
  )
}

// ─── Photo lightbox ───────────────────────────────────────────────────────────

function PhotoModal({ url, onClose }) {
  const containerRef = useRef(null)
  const gestureRef = useRef({ scale: 1, tx: 0, ty: 0, isPinching: false, initDist: 0, initScale: 1, initTx: 0, initTy: 0, initX: 0, initY: 0 })
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function pinchDist(t) { const dx = t[0].clientX - t[1].clientX; const dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx*dx+dy*dy) }
    function commit(scale, tx, ty) { gestureRef.current.scale = scale; gestureRef.current.tx = tx; gestureRef.current.ty = ty; setTransform({ scale, tx, ty }) }

    function onStart(e) {
      const g = gestureRef.current
      if (e.touches.length === 2) { g.isPinching = true; g.initDist = pinchDist(e.touches); g.initScale = g.scale; g.initTx = g.tx; g.initTy = g.ty }
      else if (e.touches.length === 1) { g.initX = e.touches[0].clientX; g.initY = e.touches[0].clientY; g.initTx = g.tx; g.initTy = g.ty }
    }
    function onMove(e) {
      e.preventDefault()
      const g = gestureRef.current
      if (e.touches.length === 2) { commit(Math.min(4, Math.max(1, g.initScale * (pinchDist(e.touches) / g.initDist))), g.tx, g.ty) }
      else if (e.touches.length === 1 && !g.isPinching && g.scale > 1) { commit(g.scale, g.initTx + (e.touches[0].clientX - g.initX), g.initTy + (e.touches[0].clientY - g.initY)) }
    }
    function onEnd(e) { if (e.touches.length < 2) gestureRef.current.isPinching = false; if (gestureRef.current.scale <= 1) commit(1, 0, 0) }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchmove', onMove); el.removeEventListener('touchend', onEnd) }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center" onClick={onClose}>
      <button onClick={e => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur flex items-center justify-center text-zinc-300 hover:text-white active:scale-90 transition-all">
        <XIcon />
      </button>
      <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden" onClick={e => e.stopPropagation()}>
        <img src={url} alt="Climb photo" draggable={false} className="w-full max-h-screen object-contain select-none"
          style={{ transform: `translate(${transform.tx}px,${transform.ty}px) scale(${transform.scale})`, transformOrigin: 'center center', touchAction: 'none', willChange: 'transform', userSelect: 'none' }} />
      </div>
    </div>
  )
}

// ─── Video fullscreen modal ───────────────────────────────────────────────────

function VideoFullscreenModal({ url, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center" onClick={onClose}>
      <button onClick={e => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur flex items-center justify-center text-zinc-300 hover:text-white active:scale-90 transition-all">
        <XIcon />
      </button>
      <video src={url} className="w-full max-h-screen" controls autoPlay playsInline onClick={e => e.stopPropagation()} />
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

    const { error: insertError } = await supabase.from('ascents').insert({
      user_id: user.id, climb_id: climbId, tries: attempts, status: 'sent',
      notes: notes.trim() || null, climbed_at: new Date().toISOString(),
      difficulty_rating: difficulty || null, rating: rating || null,
    })
    if (insertError) { setError(insertError.message); setSaving(false); return }

    const { error: rpcError } = await supabase.rpc('increment_repeat_count', { climb_id: climbId })
    if (rpcError) { await supabase.from('climbs').update({ repeat_count: (currentRepeatCount ?? 0) + 1 }).eq('id', climbId) }

    setSaving(false)
    onSaved()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-800 pb-safe">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-zinc-700" /></div>
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
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How'd it go? Key moves, beta…" rows={3}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 resize-none transition" />
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
            <button onClick={onNo} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 active:scale-[0.98] transition-all">No</button>
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

function MediaUploadSheet({ file, mediaType, climbId, userId, onClose, onUploaded }) {
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

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

    const { error: uploadError } = await supabase.storage.from('climb-media').upload(path, file, { upsert: false })
    if (uploadError) { setError(`Upload failed: ${uploadError.message}`); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('climb-media').getPublicUrl(path)
    const { data, error: insertError } = await insertClimbMedia({
      climb_id: climbId, user_id: userId, url: publicUrl, media_type: mediaType, is_public: true,
    })
    if (insertError) { setError(insertError.message); setUploading(false); return }
    onUploaded(data)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-800 max-h-[85vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="w-10 h-1 rounded-full bg-zinc-700" /></div>
        <div className="px-5 pt-2 pb-3 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-zinc-100">{mediaType === 'video' ? 'Add Beta Video' : 'Add Photo'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-sm">Cancel</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 pb-6 flex flex-col gap-5">
          {preview && (mediaType === 'video'
            ? <video src={preview} className="w-full rounded-xl max-h-52 object-cover" controls playsInline />
            : <img src={preview} alt="Preview" className="w-full rounded-xl max-h-52 object-cover" />
          )}
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

// ─── Media type picker sheet ──────────────────────────────────────────────────

function MediaPickerSheet({ onPhoto, onVideo, onClose }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-800">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-zinc-700" /></div>
        <div className="px-5 pt-2 pb-8 flex flex-col gap-3">
          <button onClick={onPhoto}
            className="w-full py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] transition-all text-zinc-100 font-semibold text-sm text-left px-5">
            📷 Upload Photo
          </button>
          <button onClick={onVideo}
            className="w-full py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] transition-all text-zinc-100 font-semibold text-sm text-left px-5">
            🎥 Upload Video
          </button>
          <button onClick={onClose} className="text-center text-sm text-zinc-500 py-1">Cancel</button>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ClimbPageInner() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [climb, setClimb] = useState(null)
  const [gymId, setGymId] = useState(null)
  const [returnPath, setReturnPath] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [attempts, setAttempts] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState(false)
  const [confirmNav, setConfirmNav] = useState(null)
  const [confirmSaving, setConfirmSaving] = useState(false)

  const [userRole, setUserRole] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const currentUserIdRef = useRef(null)

  const [setter, setSetter] = useState(null)

  // Favorite
  const [isFavorited, setIsFavorited] = useState(false)
  const [togglingFav, setTogglingFav] = useState(false)

  // Hero photo upload
  const [uploading, setUploading] = useState(false)
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const heroFileInputRef = useRef(null)

  // Media (photos + videos)
  const [media, setMedia] = useState([])
  const [fullscreenVideo, setFullscreenVideo] = useState(null)
  const [pendingMediaFile, setPendingMediaFile] = useState(null)
  const [pendingMediaType, setPendingMediaType] = useState(null)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const videoFileInputRef = useRef(null)
  const photoFileInputRef = useRef(null)

  // Comments
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [commentError, setCommentError] = useState(null)
  // { [commentId]: { count: number, mine: boolean } }
  const [upvotes, setUpvotes] = useState({})
  // { [userId]: { status, isFlash } } — best ascent per commenter on this climb
  const [commenterAscents, setCommenterAscents] = useState({})
  // cumulative tries for the current user on this climb
  const [myTotalTries, setMyTotalTries] = useState(null)

  // ── Fetch user ──
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

  // ── Save path + read return path ──
  useEffect(() => {
    if (!id) return
    localStorage.setItem('savedPath', `/climb/${id}`)
    // Query-param return path takes priority (e.g. from=profile&profileId=xxx)
    const fromParam = searchParams.get('from')
    const profileId = searchParams.get('profileId')
    if (fromParam === 'profile' && profileId) {
      setReturnPath(`/profile/${profileId}`)
      return
    }
    // Fallback: sessionStorage return path (e.g. from logbook)
    const stored = sessionStorage.getItem('climbReturnPath')
    if (stored) {
      setReturnPath(stored)
      sessionStorage.removeItem('climbReturnPath')
    }
  }, [id])

  // ── Load climb data ──
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

      // Fetch zone + setter + commenter ascents in parallel
      const userIds = [...new Set(commentsData.map(c => c.user_id))]
      const [zoneData, climbAscents] = await Promise.all([
        fetchZoneById(climbData.zone_id),
        userIds.length > 0 ? fetchClimbAscents(id) : Promise.resolve([]),
        climbData.setter_id
          ? fetchSetterProfile(climbData.setter_id).then(p => { if (p) setSetter(p) })
          : Promise.resolve(),
      ])

      if (zoneData?.gym_id) setGymId(zoneData.gym_id)

      // Build per-user flash/sent/project from sorted ascents (ascending by climbed_at)
      if (climbAscents.length > 0) {
        const userFirstAscent = {}
        const userHasSent = {}
        for (const a of climbAscents) {
          if (!userFirstAscent[a.user_id]) userFirstAscent[a.user_id] = a
          if (a.status === 'sent' && !userHasSent[a.user_id]) userHasSent[a.user_id] = a
        }
        const best = {}
        for (const uid of Object.keys(userFirstAscent)) {
          const first = userFirstAscent[uid]
          const sent = userHasSent[uid]
          if (!sent) {
            best[uid] = { status: 'project', isFlash: false }
          } else {
            const isFlash = first.status === 'sent' && first.tries === 1
            best[uid] = { status: 'sent', isFlash }
          }
        }
        setCommenterAscents(best)
      }
    }
    if (id) load()
  }, [id])

  // ── Check favorite + fetch my cumulative tries ──
  useEffect(() => {
    async function checkFav() {
      if (!currentUserId || !id) return
      const [favs, totals] = await Promise.all([
        fetchUserFavorites(currentUserId, [id]),
        fetchClimbTotalsForUser(currentUserId, [id]),
      ])
      setIsFavorited(favs.length > 0)
      if (totals.length > 0) setMyTotalTries(totals[0].total_tries)
    }
    checkFav()
  }, [currentUserId, id])

  // ── Toggle favorite ──
  async function handleToggleFavorite() {
    if (!currentUserId || togglingFav) return
    setTogglingFav(true)
    const was = isFavorited
    setIsFavorited(f => !f)
    await toggleFavorite(currentUserId, id, was)
    setTogglingFav(false)
  }

  // ── Hero photo upload ──
  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${id}-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('climb-photos').upload(path, file, { upsert: true })
    if (uploadError) { setUploading(false); e.target.value = ''; return }
    const { data: { publicUrl } } = supabase.storage.from('climb-photos').getPublicUrl(path)
    await supabase.from('climbs').update({ photo_url: publicUrl }).eq('id', id)
    setClimb(c => ({ ...c, photo_url: publicUrl }))
    setUploading(false)
    e.target.value = ''
  }

  // ── Upvote ──
  function handleUpvote(commentId) {
    if (!currentUserId) return
    setUpvotes(prev => {
      const cur = prev[commentId] ?? { count: 0, mine: false }
      return { ...prev, [commentId]: { count: cur.mine ? cur.count - 1 : cur.count + 1, mine: !cur.mine } }
    })
  }

  // ── Add comment ──
  async function handleSendComment() {
    const userId = currentUserIdRef.current
    if (!userId || !commentText.trim()) return
    setCommentError(null)
    setSendingComment(true)
    const { data, error } = await insertClimbComment(userId, id, commentText.trim())
    if (error) {
      setCommentError(error.message ?? 'Failed to post comment.')
    } else if (data) {
      setComments(prev => [data, ...prev])
      setCommentText('')
    }
    setSendingComment(false)
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
        <button onClick={() => router.push('/gym/4561f1e2-5b13-4de9-8197-53642de8b5e0')} className="text-zinc-500 text-sm underline">Go back</button>
      </div>
    )
  }

  const repeatCount = climb.repeat_count ?? 0
  const heroColor = climbColor(climb.color)
  const isRope = ROPE_DISCIPLINES.includes(climb.discipline)
  const sortedComments = [...comments].sort((a, b) => (upvotes[b.id]?.count ?? 0) - (upvotes[a.id]?.count ?? 0))

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100`}>

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative w-full h-[40vh] min-h-[200px]" style={{ backgroundColor: heroColor }}>
        {climb.photo_url ? (
          <img
            src={climb.photo_url}
            alt="Climb photo"
            onClick={() => setPhotoModalOpen(true)}
            className="w-full h-full object-cover cursor-pointer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: heroColor }}>
            <div className="opacity-20">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="white" className="w-16 h-16">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </div>
          </div>
        )}

        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none" />

        {/* Back button */}
        <button
          onClick={() => navigate(returnPath ?? (gymId ? `/gym/${gymId}` : '/gym/4561f1e2-5b13-4de9-8197-53642de8b5e0'))}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-all"
          aria-label="Go back"
        >
          <BackIcon />
        </button>

        {/* Edit button for setters/admins */}
        {(userRole === 'setter' || userRole === 'admin') && (
          <button
            onClick={() => router.push(`/climb/${id}/edit`)}
            className="absolute top-4 right-14 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-all"
            aria-label="Edit climb"
          >
            <PencilIcon />
          </button>
        )}

        {/* Hero photo upload for setters/admins */}
        {(userRole === 'setter' || userRole === 'admin') && (
          <button
            onClick={() => heroFileInputRef.current?.click()}
            disabled={uploading}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-all disabled:opacity-50"
            aria-label="Upload photo"
          >
            {uploading
              ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <CameraIcon />
            }
          </button>
        )}
        <input ref={heroFileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

        {/* Grade badge (+ name for rope) — bottom left */}
        {isRope ? (
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
            <div className="shrink-0 px-3 py-1.5 rounded-xl shadow-lg" style={{ backgroundColor: heroColor }}>
              <span className="text-white font-bold text-sm leading-none">{climb.rope_grade || '?'}</span>
            </div>
            {climb.name && (
              <p className="text-white font-bold text-lg leading-tight drop-shadow-lg truncate">{climb.name}</p>
            )}
          </div>
        ) : (
          <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl shadow-lg" style={{ backgroundColor: heroColor }}>
            <span className="text-white font-bold text-base leading-none">{climb.grade || '?'}</span>
          </div>
        )}
      </div>

      {/* ─── Scrollable content ────────────────────────────────────────────── */}
      <div className="pb-40">

        {/* ── Action bar ── */}
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-zinc-800/60">
          {/* Attempts counter */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAttempts(a => Math.max(0, a - 1))}
              className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-xl font-light select-none"
              aria-label="Decrease attempts"
            >−</button>
            <span className="w-7 text-center text-lg font-bold text-zinc-100 tabular-nums">{attempts}</span>
            <button
              type="button"
              onClick={() => setAttempts(a => a + 1)}
              className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 text-xl font-light select-none"
              aria-label="Increase attempts"
            >+</button>
          </div>

          {/* Log Ascent button */}
          <button
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all text-white font-semibold text-sm shadow-lg shadow-indigo-900/40"
          >
            Log Ascent
          </button>
        </div>

        {/* Secondary info row: repeat count, favorite, my total tries, setter */}
        <div className="px-4 pt-2.5 pb-1 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <RepeatIcon />
            <span className="text-sm font-medium tabular-nums">{repeatCount}</span>
          </div>
          <button
            onClick={handleToggleFavorite}
            disabled={!currentUserId || togglingFav}
            className="p-1 active:scale-90 transition-all disabled:opacity-40"
            aria-label={isFavorited ? 'Remove favorite' : 'Add favorite'}
          >
            <HeartIcon filled={isFavorited} />
          </button>
          {myTotalTries != null && myTotalTries > 0 && (
            <span className="text-xs text-zinc-500 tabular-nums">
              {myTotalTries} total {myTotalTries === 1 ? 'try' : 'tries'}
            </span>
          )}
          {setter && (
            <p className="ml-auto text-xs text-zinc-600">
              Set by <span className="text-zinc-500">@{setter.username ?? 'Unknown'}</span>
            </p>
          )}
        </div>

        {/* ── Beta & Media ── */}
        <div className="mt-5">
          <div className="px-4 mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-100">Beta &amp; Media</h2>
            {media.length > 0 && (
              <span className="text-xs font-medium text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{media.length}</span>
            )}
          </div>

          <div className="flex gap-2 px-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {media.length === 0 ? (
              <div
                onClick={() => currentUserId && setShowMediaPicker(true)}
                className="shrink-0 w-[100px] h-[100px] flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 active:scale-95 transition-transform cursor-pointer"
              >
                <PlayIcon className="w-6 h-6 text-zinc-600" />
                <p className="text-[10px] text-zinc-500 text-center px-2 leading-snug">Add the first beta video</p>
              </div>
            ) : (
              <>
                {media.map(item => {
                  const username = item.profiles?.username ?? 'Unknown'
                  const isVideo = item.media_type === 'video'
                  return (
                    <div
                      key={item.id}
                      onClick={() => isVideo ? setFullscreenVideo(item.url) : setPhotoModalOpen(item.url)}
                      className="shrink-0 w-[100px] flex flex-col rounded-xl overflow-hidden bg-zinc-800 active:scale-95 transition-transform cursor-pointer"
                    >
                      <div className="relative w-[100px] h-[76px] bg-zinc-800 overflow-hidden">
                        {isVideo ? (
                          <>
                            <video src={item.url} className="w-full h-full object-cover" preload="metadata" playsInline muted />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                              <div className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
                                <PlayIcon className="w-3 h-3 text-white ml-0.5" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <img src={item.url} alt="Media" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="px-2 py-1.5 bg-zinc-800">
                        <p className="text-[10px] font-medium text-zinc-400 truncate">@{username}</p>
                      </div>
                    </div>
                  )
                })}

                {/* Plus card */}
                {currentUserId && (
                  <div
                    onClick={() => setShowMediaPicker(true)}
                    className="shrink-0 w-[100px] h-[100px] flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 active:scale-95 transition-transform cursor-pointer"
                  >
                    <PlusIcon />
                    <p className="text-[10px] text-zinc-500">Add media</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Hidden file inputs */}
          <input ref={videoFileInputRef} type="file" accept="video/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setPendingMediaFile(f); setPendingMediaType('video'); e.target.value = '' } }} />
          <input ref={photoFileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setPendingMediaFile(f); setPendingMediaType('photo'); e.target.value = '' } }} />
        </div>

        {/* ── Comments ── */}
        <div className="mt-6">
          <div className="px-4 mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-100">Comments</h2>
            {comments.length > 0 && (
              <span className="text-xs font-medium text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{comments.length}</span>
            )}
          </div>

          {comments.length === 0 && (
            <p className="px-4 text-sm text-zinc-600">No comments yet. Be the first!</p>
          )}

          <div className="flex flex-col">
            {sortedComments.map(comment => {
              const profile = comment.profiles ?? {}
              const userAscent = commenterAscents[comment.user_id]
              const upvoteData = upvotes[comment.id] ?? { count: 0, mine: false }
              return (
                <div key={comment.id} className="flex gap-3 px-4 py-3.5 border-t border-zinc-800/50 items-start">
                  <Avatar url={profile.avatar_url} name={profile.username} className="w-8 h-8 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-200">{profile.username ?? 'User'}</span>
                      {userAscent && <StatusBadge status={userAscent.status} isFlash={userAscent.isFlash} />}
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">{comment.body}</p>
                  </div>
                  <button
                    onClick={() => handleUpvote(comment.id)}
                    disabled={!currentUserId}
                    className={`shrink-0 flex flex-col items-center gap-0.5 pt-0.5 min-w-[28px] transition-colors disabled:opacity-30 ${upvoteData.mine ? 'text-indigo-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    <UpvoteIcon />
                    {upvoteData.count > 0 && (
                      <span className="text-[11px] font-semibold leading-none">{upvoteData.count}</span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          {commentError && (
            <p className="mx-4 mt-3 text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{commentError}</p>
          )}
        </div>
      </div>

      {/* ─── Fixed comment input ──────────────────────────────────────────── */}
      <div className="fixed bottom-16 left-0 right-0 bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800 px-4 py-3 z-30">
        {currentUserId ? (
          <div className="flex gap-2 items-center">
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
        ) : (
          <p className="text-center text-xs text-zinc-600">Sign in to comment</p>
        )}
      </div>

      <BottomNav onNavigate={navigate} />

      {/* ─── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3 flex items-center gap-2 shadow-xl">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400 shrink-0">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-zinc-100">Ascent logged!</span>
        </div>
      )}

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}
      {photoModalOpen && (
        <PhotoModal
          url={typeof photoModalOpen === 'string' ? photoModalOpen : climb.photo_url}
          onClose={() => setPhotoModalOpen(false)}
        />
      )}

      {fullscreenVideo && (
        <VideoFullscreenModal url={fullscreenVideo} onClose={() => setFullscreenVideo(null)} />
      )}

      {confirmNav && (
        <ProjectConfirmModal
          attempts={attempts}
          saving={confirmSaving}
          onYes={handleConfirmYes}
          onNo={handleConfirmNo}
        />
      )}

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

      {showMediaPicker && (
        <MediaPickerSheet
          onPhoto={() => { setShowMediaPicker(false); photoFileInputRef.current?.click() }}
          onVideo={() => { setShowMediaPicker(false); videoFileInputRef.current?.click() }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}

      {pendingMediaFile && (
        <MediaUploadSheet
          file={pendingMediaFile}
          mediaType={pendingMediaType}
          climbId={id}
          userId={currentUserIdRef.current}
          onClose={() => { setPendingMediaFile(null); setPendingMediaType(null) }}
          onUploaded={item => {
            setMedia(prev => [item, ...prev])
            setPendingMediaFile(null)
            setPendingMediaType(null)
          }}
        />
      )}
    </div>
  )
}

export default function ClimbPage() {
  return (
    <Suspense>
      <ClimbPageInner />
    </Suspense>
  )
}
