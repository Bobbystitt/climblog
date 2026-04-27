import { supabase } from '@/lib/supabase'
import { V_GRADE_ORDER } from '@/constants/grades'

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

/** Lightweight: just id + zone_id + set_date, used to build zone climb counts without fetching full data */
export async function fetchZoneClimbSummaries(zoneIds) {
  const { data } = await supabase
    .from('climbs')
    .select('id, zone_id, set_date')
    .in('zone_id', zoneIds)
  return data ?? []
}

/** Returns { climb_id } rows — count per climb client-side */
export async function fetchClimbCommentCounts(climbIds) {
  const { data } = await supabase
    .from('climb_comments')
    .select('climb_id')
    .in('climb_id', climbIds)
  return data ?? []
}

/** Returns { climb_id } rows for public videos — count per climb client-side */
export async function fetchClimbVideoCounts(climbIds) {
  const { data } = await supabase
    .from('climb_media')
    .select('climb_id')
    .in('climb_id', climbIds)
    .eq('is_public', true)
    .eq('media_type', 'video')
  return data ?? []
}

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

export async function fetchMemberCount() {
  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
  return count ?? 0
}

export async function fetchActiveGymPresenceCount(gymId) {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('gym_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .gte('checked_in_at', threeHoursAgo)
  return count ?? 0
}

export async function fetchActiveGymSessions(gymId) {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('gym_sessions')
    .select('id, user_id, zone_id, status, checked_in_at, profiles(username, avatar_url), zones(name)')
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .gte('checked_in_at', threeHoursAgo)
    .order('checked_in_at', { ascending: false })
  return (data ?? []).map(({ profiles, zones, ...s }) => ({
    ...s,
    username: profiles?.username ?? null,
    avatar_url: profiles?.avatar_url ?? null,
    zone_name: zones?.name ?? null,
  }))
}

export async function fetchUserActiveGymSession(userId, gymId) {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('gym_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .gte('checked_in_at', threeHoursAgo)
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

export async function insertGymSession(sessionData) {
  const { data, error } = await supabase
    .from('gym_sessions')
    .insert(sessionData)
    .select()
    .single()
  return { data, error }
}

export async function updateGymSession(sessionId, updates) {
  const { error } = await supabase
    .from('gym_sessions')
    .update(updates)
    .eq('id', sessionId)
  return { error }
}

export async function checkOutGymSession(sessionId) {
  const { error } = await supabase
    .from('gym_sessions')
    .update({ is_active: false })
    .eq('id', sessionId)
  return { error }
}

export async function fetchActiveClimberCount() {
  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const tomorrowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()
  const { data } = await supabase
    .from('ascents')
    .select('user_id')
    .gte('climbed_at', todayStart)
    .lt('climbed_at', tomorrowStart)
  return new Set((data ?? []).map(r => r.user_id)).size
}

export async function searchProfiles(query) {
  if (!query.trim()) return []
  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .not('username', 'is', null)
    .ilike('username', `%${query.trim()}%`)
    .limit(10)
  return data ?? []
}

export async function fetchPublicProfileAscents(userId) {
  const { data } = await supabase
    .from('ascents')
    .select('id, status, tries, climbed_at, climbs(id, grade, color, zones(name))')
    .eq('user_id', userId)
    .order('climbed_at', { ascending: false })
  return data ?? []
}

export async function fetchProfileStats(userId) {
  const { data } = await supabase
    .from('ascents')
    .select('id, climbs(grade)')
    .eq('user_id', userId)
    .eq('status', 'sent')

  const sends = data ?? []
  const totalSends = sends.length

  let topGrade = null
  let topRank = -1
  for (const a of sends) {
    const g = a.climbs?.grade
    if (!g) continue
    const upper = g.toUpperCase()
    let rank = -1
    if (upper === 'VB') {
      rank = 0
    } else {
      const m = upper.match(/^V(\d+)$/)
      if (m) rank = parseInt(m[1]) + 1
    }
    if (rank > topRank) {
      topRank = rank
      topGrade = g
    }
  }

  return { totalSends, topGrade }
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

/** Fetch ascents for a specific set of climb IDs, ordered oldest-first for flash detection */
export async function fetchUserAscentsByClimbs(userId, climbIds) {
  const { data } = await supabase
    .from('ascents')
    .select('climb_id, status, tries, climbed_at')
    .eq('user_id', userId)
    .in('climb_id', climbIds)
    .order('climbed_at', { ascending: true })
  return data ?? []
}

/** Fetch cumulative attempt totals per climb for a user from the climb_attempt_totals view */
export async function fetchClimbTotalsForUser(userId, climbIds) {
  if (!climbIds.length) return []
  const { data } = await supabase
    .from('climb_attempt_totals')
    .select('climb_id, total_tries, is_flash, best_status')
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
  const { data } = await supabase.from('profiles').select('id, username, avatar_url, role').eq('id', setterId).single()
  return data
}

export async function fetchSetterProfiles() {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, first_name, last_name, avatar_url, role')
    .in('role', ['setter', 'admin'])
    .order('username', { ascending: true })
  return data ?? []
}

/** Returns { climb_id } rows — count per climb client-side to build favoriteMap */
export async function fetchClimbFavoriteCounts(climbIds) {
  if (!climbIds.length) return []
  const { data } = await supabase
    .from('favorites')
    .select('climb_id')
    .in('climb_id', climbIds)
  return data ?? []
}

/**
 * Returns { climb_id, best_status, is_flash } from climb_attempt_totals view.
 * One row per (user_id, climb_id). Used to build loggedMap, sentMap, flashMap, projectMap.
 */
export async function fetchClimbUserAggregates(climbIds) {
  if (!climbIds.length) return []
  const { data } = await supabase
    .from('climb_attempt_totals')
    .select('climb_id, best_status, is_flash')
    .in('climb_id', climbIds)
  return data ?? []
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
    .select('id, url, media_type, caption, created_at, user_id, profiles(username, avatar_url)')
    .eq('climb_id', climbId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function fetchClimbAscents(climbId) {
  const { data } = await supabase
    .from('ascents')
    .select('user_id, status, tries, climbed_at')
    .eq('climb_id', climbId)
    .order('climbed_at', { ascending: true })
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

// ─── Notifications ────────────────────────────────────────────────────────────

export async function insertNotification(notifData) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notifData)
    .select()
    .single()
  return { data, error }
}

export async function fetchUnreadNotificationCount(userId) {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)
  return count ?? 0
}

export async function fetchNotifications(userId) {
  const { data } = await supabase
    .from('notifications')
    .select('*, sender:profiles!sender_id(username, avatar_url)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []).map(({ sender, ...n }) => ({
    ...n,
    sender_username: sender?.username ?? null,
    sender_avatar_url: sender?.avatar_url ?? null,
  }))
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
  return { error }
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)
  return { error }
}
