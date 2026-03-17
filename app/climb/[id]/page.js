'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const GRADE_COLORS = {
  V0: 'bg-green-600', V1: 'bg-green-500', V2: 'bg-lime-500',
  V3: 'bg-yellow-500', V4: 'bg-orange-400', V5: 'bg-orange-500',
  V6: 'bg-red-500', V7: 'bg-red-600', V8: 'bg-rose-700',
  V9: 'bg-pink-700', V10: 'bg-purple-600', V11: 'bg-purple-700',
  V12: 'bg-violet-700', V13: 'bg-indigo-700', V14: 'bg-blue-700',
  V15: 'bg-sky-700', V16: 'bg-cyan-700', V17: 'bg-teal-700',
}

function gradeColor(grade) {
  if (!grade) return 'bg-zinc-600'
  const upper = grade.toUpperCase()
  if (GRADE_COLORS[upper]) return GRADE_COLORS[upper]
  if (upper.startsWith('5.5') || upper.startsWith('5.6')) return 'bg-green-600'
  if (upper.startsWith('5.7') || upper.startsWith('5.8')) return 'bg-lime-500'
  if (upper.startsWith('5.9'))  return 'bg-yellow-500'
  if (upper.startsWith('5.10')) return 'bg-orange-400'
  if (upper.startsWith('5.11')) return 'bg-orange-500'
  if (upper.startsWith('5.12')) return 'bg-red-500'
  if (upper.startsWith('5.13')) return 'bg-rose-700'
  if (upper.startsWith('5.14')) return 'bg-purple-600'
  if (upper.startsWith('5.15')) return 'bg-indigo-700'
  return 'bg-zinc-600'
}

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-zinc-600">
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

function LogAscentModal({ climbId, initialAttempts, currentRepeatCount, onClose, onSaved }) {
  const [attempts, setAttempts] = useState(initialAttempts)
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
                onClick={() => setAttempts(a => Math.max(0, a - 1))}
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

export default function ClimbPage() {
  const { id } = useParams()
  const router = useRouter()
  const [climb, setClimb] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    async function fetchClimb() {
      const { data, error } = await supabase
        .from('climbs')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) setNotFound(true)
      else setClimb(data)
      setLoading(false)
    }
    if (id) fetchClimb()
  }, [id])

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
        <button onClick={() => router.back()} className="text-zinc-500 text-sm underline">Go back</button>
      </div>
    )
  }

  const repeatCount = climb.repeat_count ?? 0

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => router.back()}
          className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <h1 className="flex-1 text-base font-semibold text-zinc-100 truncate">
          {climb.name}
        </h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-40">
        {/* Photo placeholder */}
        <div className="mx-4 mt-4 rounded-2xl bg-zinc-900 border border-zinc-800 h-52 flex flex-col items-center justify-center gap-2">
          <CameraIcon />
          <p className="text-zinc-600 text-xs">No photo yet</p>
        </div>

        {/* Climb info */}
        <div className="px-4 mt-5">
          <h2 className="text-2xl font-bold text-zinc-100 leading-tight">{climb.name}</h2>

          {/* Grade + tags row */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {climb.grade && (
              <span className={`${gradeColor(climb.grade)} text-white text-sm font-bold px-3 py-1 rounded-full`}>
                {climb.grade}
              </span>
            )}
            {Array.isArray(climb.tags) && climb.tags.map((tag) => (
              <span key={tag} className="bg-zinc-800 text-zinc-400 text-sm px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          {/* Repeat count */}
          <div className="flex items-center gap-1.5 mt-4 text-zinc-500">
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

      <BottomNav />

      {/* Success toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3 flex items-center gap-2 shadow-xl">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400 shrink-0">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-zinc-100">Ascent logged!</span>
        </div>
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
