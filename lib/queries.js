import { supabase } from '@/lib/supabase'

// ─── Gyms ─────────────────────────────────────────────────────────────────────

export async function fetchGyms() {
  const { data } = await supabase.from('gyms').select('*').order('name', { ascending: true })
  return data ?? []
}

export async function fetchGymById(id) {
  const { data } = await supabase.from('gyms').select('*').eq('id', id).single()
  return data
}

// ─── Zones ────────────────────────────────────────────────────────────────────

export async function fetchZonesByGym(gymId) {
  const { data } = await supabase
    .from('zones')
    .select('*')
    .eq('gym_id', gymId)
    .order('name', { ascending: true })
  return data ?? []
}

export async function fetchZoneById(id) {
  const { data } = await supabase.from('zones').select('*').eq('id', id).single()
  return data
}

// ─── Climbs ───────────────────────────────────────────────────────────────────

export async function fetchClimbById(id) {
  const { data, error } = await supabase.from('climbs').select('*').eq('id', id).single()
  return { data, error }
}

export async function fetchClimbsByZone(zoneId) {
  const { data } = await supabase
    .from('climbs')
    .select('*, zones(discipline)')
    .eq('zone_id', zoneId)
  return (data ?? []).map(({ zones, ...c }) => ({ ...c, discipline: zones?.discipline ?? null }))
}

export async function fetchClimbsByZones(zoneIds) {
  const { data } = await supabase
    .from('climbs')
    .select('*, zones(discipline)')
    .in('zone_id', zoneIds)
  return (data ?? []).map(({ zones, ...c }) => ({ ...c, discipline: zones?.discipline ?? null }))
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function fetchUserProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data
}

// ─── Ascents ──────────────────────────────────────────────────────────────────

/** Fetch all ascents for a user, with joined climb grade */
export async function fetchUserAscents(userId) {
  const { data } = await supabase
    .from('ascents')
    .select('*, climbs(grade)')
    .eq('user_id', userId)
    .order('climbed_at', { ascending: false })
  return data ?? []
}

/** Fetch ascents for a specific set of climb IDs (status + tries only) */
export async function fetchUserAscentsByClimbs(userId, climbIds) {
  const { data } = await supabase
    .from('ascents')
    .select('climb_id, status, tries')
    .eq('user_id', userId)
    .in('climb_id', climbIds)
  return data ?? []
}

/** Fetch all ascents within a date range for the logbook session detail view */
export async function fetchSessionAscents(userId, startISO, endISO) {
  const { data } = await supabase
    .from('ascents')
    .select('id, climbed_at, status, tries, difficulty_rating, rating, notes, climbs(id, grade, color)')
    .eq('user_id', userId)
    .gte('climbed_at', startISO)
    .lt('climbed_at', endISO)
    .order('climbed_at', { ascending: true })
  return data ?? []
}

/** Fetch ascent ratings for a set of climb IDs (for average rating calculation) */
export async function fetchClimbRatings(climbIds) {
  const { data } = await supabase
    .from('ascents')
    .select('climb_id, rating')
    .in('climb_id', climbIds)
    .not('rating', 'is', null)
  return data ?? []
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export async function fetchUserFavorites(userId, climbIds) {
  const { data } = await supabase
    .from('favorites')
    .select('climb_id')
    .eq('user_id', userId)
    .in('climb_id', climbIds)
  return data ?? []
}

export async function toggleFavorite(userId, climbId, isFav) {
  if (isFav) {
    await supabase.from('favorites').delete().eq('user_id', userId).eq('climb_id', climbId)
  } else {
    await supabase.from('favorites').insert({ user_id: userId, climb_id: climbId })
  }
}

// ─── Setter ───────────────────────────────────────────────────────────────────

export async function fetchSetterProfile(setterId) {
  const { data } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', setterId).single()
  return data
}

export async function claimClimb(climbId, userId) {
  const { error } = await supabase.from('climbs').update({ setter_id: userId }).eq('id', climbId)
  return { error }
}

export async function unclaimClimb(climbId) {
  const { error } = await supabase.from('climbs').update({ setter_id: null }).eq('id', climbId)
  return { error }
}

export async function fetchClimbsBySetter(setterId) {
  const { data } = await supabase
    .from('climbs')
    .select('id, grade, color, tags, zone_id, zones(name, gym_id, gyms(name))')
    .eq('setter_id', setterId)
    .order('created_at', { ascending: false })
  return data ?? []
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function fetchClimbComments(climbId) {
  const { data } = await supabase
    .from('climb_comments')
    .select('id, body, created_at, user_id, profiles(username, avatar_url)')
    .eq('climb_id', climbId)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function insertClimbComment(userId, climbId, body) {
  const { data, error } = await supabase
    .from('climb_comments')
    .insert({ user_id: userId, climb_id: climbId, body })
    .select('id, body, created_at, user_id, profiles(username, avatar_url)')
    .single()
  return { data, error }
}

// ─── Climb Media ──────────────────────────────────────────────────────────────

export async function fetchClimbMedia(climbId) {
  const { data } = await supabase
    .from('climb_media')
    .select('id, url, media_type, caption, created_at, user_id')
    .eq('climb_id', climbId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function insertClimbMedia(mediaData) {
  const { data, error } = await supabase.from('climb_media').insert(mediaData).select().single()
  return { data, error }
}

export async function deleteClimbComment(commentId) {
  const { error } = await supabase.from('climb_comments').delete().eq('id', commentId)
  return { error }
}

export async function deleteClimbMedia(mediaId) {
  const { error } = await supabase.from('climb_media').delete().eq('id', mediaId)
  return { error }
}

// ─── Zone Management ──────────────────────────────────────────────────────────

export async function deleteClimb(climbId) {
  const { error } = await supabase.from('climbs').delete().eq('id', climbId)
  return { error }
}

export async function deleteClimbsByZone(zoneId) {
  const { error } = await supabase.from('climbs').delete().eq('zone_id', zoneId)
  return { error }
}

export async function insertClimb(climbData) {
  const { data, error } = await supabase.from('climbs').insert(climbData).select().single()
  return { data, error }
}
