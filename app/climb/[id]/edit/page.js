'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

const GRADE_OPTIONS = [
  'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8',
  'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17',
  '5.5', '5.6', '5.7', '5.8', '5.9',
  '5.10a', '5.10b', '5.10c', '5.10d',
  '5.11a', '5.11b', '5.11c', '5.11d',
  '5.12a', '5.12b', '5.12c', '5.12d',
  '5.13a', '5.13b', '5.13c', '5.13d',
  '5.14a', '5.14b', '5.14c', '5.14d',
]

const COLOR_OPTIONS = [
  { value: 'red',    label: 'Red',    hex: '#C0392B' },
  { value: 'blue',   label: 'Blue',   hex: '#2471A3' },
  { value: 'green',  label: 'Green',  hex: '#1E8449' },
  { value: 'yellow', label: 'Yellow', hex: '#D4AC0D' },
  { value: 'orange', label: 'Orange', hex: '#CA6F1E' },
  { value: 'purple', label: 'Purple', hex: '#7D3C98' },
  { value: 'pink',   label: 'Pink',   hex: '#C0527A' },
  { value: 'white',  label: 'White',  hex: '#D5D8DC' },
  { value: 'gray',   label: 'Gray',   hex: '#707B7C' },
  { value: 'black',  label: 'Black',  hex: '#2C3E50' },
  { value: 'tan',    label: 'Tan',    hex: '#C4A882' },
]

const TAG_OPTIONS = ['Crimpy', 'Slopey', 'Juggy', 'Overhang', 'Slab']

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function PhotoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}

export default function EditClimbPage() {
  const { id } = useParams()
  const router = useRouter()

  const [authLoading, setAuthLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [climbLoading, setClimbLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [grade, setGrade] = useState('')
  const [color, setColor] = useState('')
  const [tags, setTags] = useState([])
  const [description, setDescription] = useState('')
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [zoneId, setZoneId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile || (profile.role !== 'setter' && profile.role !== 'admin')) {
        router.replace('/')
        return
      }
      setAuthorized(true)
      setAuthLoading(false)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!id) return
    async function fetchClimb() {
      const { data, error } = await supabase.from('climbs').select('*').eq('id', id).single()
      if (error || !data) { setNotFound(true); setClimbLoading(false); return }
      setGrade(data.grade ?? '')
      setColor(data.color ?? '')
      setTags(data.tags ?? [])
      setDescription(data.description ?? '')
      setZoneId(data.zone_id)
      if (data.photo_url) {
        setExistingPhotoUrl(data.photo_url)
        setPhotoPreview(data.photo_url)
      }
      setClimbLoading(false)
    }
    fetchClimb()
  }, [id])

  function toggleTag(tag) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setRemovePhoto(false)
  }

  function handleRemovePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    setRemovePhoto(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!grade) { setError('Please select a grade.'); return }
    if (!color) { setError('Please select a color.'); return }
    setSaving(true)
    setError(null)

    let photoUrl = existingPhotoUrl

    if (removePhoto) {
      photoUrl = null
    }

    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const path = `${zoneId ?? id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('climb-photos')
        .upload(path, photoFile, { upsert: false })
      if (uploadError) {
        setError(`Photo upload failed: ${uploadError.message}`)
        setSaving(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('climb-photos').getPublicUrl(path)
      photoUrl = publicUrl
    }

    const updateData = {
      grade,
      color,
      tags,
      description: description.trim() || null,
      photo_url: photoUrl,
    }

    const { error: updateError } = await supabase.from('climbs').update(updateData).eq('id', id)
    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    router.push(`/climb/${id}`)
  }

  if (authLoading || climbLoading) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    )
  }

  if (!authorized) return null

  if (notFound) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4`}>
        <p className="text-zinc-400 text-sm">Climb not found.</p>
        <button onClick={() => router.back()} className="text-zinc-500 text-sm underline">Go back</button>
      </div>
    )
  }

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
        <h1 className="flex-1 text-base font-semibold text-zinc-100">Edit Climb</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pb-28 px-4 pt-6 flex flex-col gap-7">

        {/* Color */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Hold Color</p>
          <div className="flex flex-wrap gap-2.5">
            {COLOR_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setColor(opt.value)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  color === opt.value
                    ? 'border-zinc-100 scale-105'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: opt.hex }}
                />
                <span className={color === opt.value ? 'text-zinc-100' : ''}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grade */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Grade</p>
          <div className="flex flex-wrap gap-2">
            {GRADE_OPTIONS.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  grade === g
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Style Tags</p>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  tags.includes(tag)
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Description <span className="normal-case font-normal text-zinc-600">(optional)</span></p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Beta, key moves, notable features…"
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 resize-none transition"
          />
        </div>

        {/* Photo */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Photo <span className="normal-case font-normal text-zinc-600">(optional)</span></p>
          <label className="flex flex-col items-center justify-center gap-2 bg-zinc-800 border border-dashed border-zinc-600 rounded-xl px-4 py-6 cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/80 transition-colors">
            {photoPreview && !removePhoto ? (
              <img src={photoPreview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg" />
            ) : (
              <>
                <span className="text-zinc-500"><PhotoIcon /></span>
                <span className="text-sm text-zinc-500">Tap to upload photo</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="sr-only"
            />
          </label>
          {(photoPreview && !removePhoto) && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Remove photo
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</p>
        )}
      </form>

      {/* Submit bar */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 pt-4 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all text-white font-semibold text-base shadow-lg shadow-indigo-900/40"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
