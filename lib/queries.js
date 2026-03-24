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
  const { data } = await supabase.from('climbs').select('*').eq('zone_id', zoneId)
  return data ?? []
}

export async function fetchClimbsByZones(zoneIds) {
  const { data } = await supabase.from('climbs').select('*').in('zone_id', zoneIds)
  return data ?? []
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
