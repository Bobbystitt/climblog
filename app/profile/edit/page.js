'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import useAuth from '@/hooks/useAuth'
import { fetchUserProfile } from '@/lib/queries'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  )
}

export default function EditProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef(null)
  const { user, loading: authLoading } = useAuth()

  const [userId, setUserId] = useState(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [initial, setInitial] = useState('?')

  const [dataLoaded, setDataLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) return
    setUserId(user.id)
    fetchUserProfile(user.id).then(data => {
      if (data) {
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        setUsername(data.username ?? '')
        setAvatarUrl(data.avatar_url ?? null)
        setAvatarPreview(data.avatar_url ?? null)
        const first = data.first_name?.[0] ?? data.username?.[0] ?? user.email?.[0] ?? '?'
        setInitial(first.toUpperCase())
      } else {
        const first = user.email?.[0] ?? '?'
        setInitial(first.toUpperCase())
      }
      setDataLoaded(true)
    })
  }, [user])

  const loading = authLoading || !dataLoaded

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    // Upload avatar if a new file was selected
    let finalAvatarUrl = avatarUrl
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })
      if (uploadError) {
        setError(`Avatar upload failed: ${uploadError.message}`)
        setSaving(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      finalAvatarUrl = publicUrl
    }

    const full_name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || null

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username: username.trim() || null,
        full_name,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }

    setAvatarUrl(finalAvatarUrl)
    setAvatarFile(null)
    setSuccess(true)
    setTimeout(() => router.push('/profile'), 1000)
  }

  if (loading) {
    return (
      <div className={`${poppins.className} min-h-screen bg-zinc-950 flex items-center justify-center`}>
        <div className="w-6 h-6 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className={`${poppins.className} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => router.push('/profile')}
          className="shrink-0 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all p-0.5 -ml-0.5"
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <h1 className="flex-1 text-base font-semibold text-zinc-100">Edit Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <form onSubmit={handleSave} className="px-4 pt-8 flex flex-col gap-6">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-600/20 border-2 border-indigo-500/30 flex items-center justify-center">
                  <span className="text-indigo-300 font-bold text-3xl">{initial}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 active:scale-90 transition-all shadow-lg"
                aria-label="Change avatar"
              >
                <CameraIcon />
              </button>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              {avatarPreview ? 'Change photo' : 'Upload photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="sr-only"
            />
          </div>

          {/* First name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Your first name"
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition"
            />
          </div>

          {/* Last name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Your last name"
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition"
            />
          </div>

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="yourhandle"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</p>
          )}

          {/* Success */}
          {success && (
            <p className="text-sm text-green-400 bg-green-400/10 rounded-xl px-4 py-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
              Profile saved!
            </p>
          )}

          {/* Save button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all text-white font-semibold text-base mt-1"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  )
}
