'use client'

import { useRouter } from 'next/navigation'
import GradeBadge from './GradeBadge'
import { ROPE_DISCIPLINES } from '@/constants/grades'

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

function HeartFilledIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  )
}

const STATUS_LABEL = {
  flashed: { text: 'Flashed', className: 'text-blue-400' },
  sent:    { text: 'Sent',    className: 'text-green-400' },
  project: { text: 'Project', className: 'text-yellow-400' },
}

const NEW_BADGE_CLS = 'bg-green-500/15 text-green-400 border border-green-500/25'
const EXPIRY_BADGE_CLS = {
  expiring: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25',
  overdue:  'bg-red-500/15 text-red-400 border border-red-500/25',
}

/**
 * A single climb row for list views (discover / zone pages).
 *
 * @param {object} props
 * @param {object}   props.climb           - Climb object (id, grade, color, tags, repeat_count, zoneName?, isNewRoute?, expiryStatus?, daysUntilReset?)
 * @param {string}   props.climbStatus     - 'flashed' | 'sent' | 'project' | 'untouched'
 * @param {boolean}  props.isFavorited     - Whether the climb is in the user's favorites
 * @param {function} props.onLogAscent     - Called with the climb object when the + button is tapped
 * @param {function} props.onToggleFavorite - Called with the climb id when the heart button is tapped
 * @param {boolean}  [props.showBorder=false] - Render a top border (true for all items except the first)
 */
export default function ClimbCard({
  climb,
  climbStatus = 'untouched',
  isFavorited = false,
  onLogAscent,
  onToggleFavorite,
  showBorder = false,
  videoCount = 0,
  commentCount = 0,
}) {
  const router = useRouter()

  const isNewRoute   = climb.isNewRoute   ?? false
  const expiryStatus = climb.expiryStatus ?? null
  const daysUntilReset = climb.daysUntilReset ?? null
  const hasBadge = isNewRoute || expiryStatus
  const isRope = ROPE_DISCIPLINES.includes(climb.discipline)

  return (
    <li className={`list-none${showBorder ? ' border-t border-zinc-800/60' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Grade badge — navigates to climb detail */}
        <button
          onClick={() => router.push(`/climb/${climb.id}`)}
          className="shrink-0"
          aria-label={`View climb ${isRope ? (climb.rope_grade ?? '') : (climb.grade ?? '')}`}
        >
          <GradeBadge grade={isRope ? (climb.rope_grade || '?') : climb.grade} color={climb.color} />
        </button>

        {/* Tags + zone name or repeat count */}
        <button
          onClick={() => router.push(`/climb/${climb.id}`)}
          className="relative flex-1 min-w-0 text-left"
        >
          {/* Rotation badges — stacked in top-right of text block */}
          {hasBadge && (
            <span className="absolute top-0 right-0 flex flex-col items-end gap-0.5">
              {isNewRoute && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-tight ${NEW_BADGE_CLS}`}>
                  New
                </span>
              )}
              {expiryStatus && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-tight ${EXPIRY_BADGE_CLS[expiryStatus]}`}>
                  {expiryStatus === 'overdue' ? 'Reset Due' : `T-${daysUntilReset} days`}
                </span>
              )}
            </span>
          )}
          {/* Climb name — rope disciplines only */}
          {isRope && climb.name && (
            <p className="text-sm font-bold text-zinc-100 truncate mb-1">{climb.name}</p>
          )}
          <div className={`flex flex-wrap items-center gap-1.5 ${hasBadge ? 'pr-16' : ''}`}>
            {Array.isArray(climb.tags) && climb.tags.length > 0
              ? climb.tags.map((tag) => (
                  <span key={tag} className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))
              : <span className="text-zinc-600 text-xs">No tags</span>
            }
          </div>
          {STATUS_LABEL[climbStatus] && (
            <p className={`text-xs mt-1 font-medium ${STATUS_LABEL[climbStatus].className}`}>
              {STATUS_LABEL[climbStatus].text}
            </p>
          )}
          {climb.zoneName ? (
            <p className="text-xs text-zinc-500 mt-1.5 truncate">{climb.zoneName}</p>
          ) : (
            <p className="text-xs text-zinc-600 mt-1.5">
              {(climb.repeat_count ?? 0) === 0
                ? 'No repeats'
                : `${climb.repeat_count} ${climb.repeat_count === 1 ? 'repeat' : 'repeats'}`
              }
            </p>
          )}
          {(videoCount > 0 || commentCount > 0) && (
            <div className="flex items-center gap-2.5 mt-1.5">
              {videoCount > 0 && (
                <span className="flex items-center gap-1 text-zinc-600">
                  <VideoIcon />
                  <span className="text-[11px] leading-none">{videoCount}</span>
                </span>
              )}
              {commentCount > 0 && (
                <span className="flex items-center gap-1 text-zinc-600">
                  <CommentIcon />
                  <span className="text-[11px] leading-none">{commentCount}</span>
                </span>
              )}
            </div>
          )}
        </button>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1">
          <button
            onClick={() => onLogAscent(climb)}
            className="p-2 text-zinc-500 hover:text-zinc-200 active:scale-90 transition-all rounded-lg hover:bg-zinc-800"
            aria-label="Log ascent"
          >
            <PlusIcon />
          </button>
          <button
            onClick={() => onToggleFavorite(climb.id)}
            className={`p-2 active:scale-90 transition-all rounded-lg hover:bg-zinc-800 ${
              isFavorited ? 'text-rose-500' : 'text-zinc-500 hover:text-rose-400'
            }`}
            aria-label={isFavorited ? 'Unfavorite' : 'Favourite'}
          >
            {isFavorited ? <HeartFilledIcon /> : <HeartIcon />}
          </button>
        </div>
      </div>
    </li>
  )
}
