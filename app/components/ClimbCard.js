'use client'

import { useRouter } from 'next/navigation'
import GradeBadge from './GradeBadge'

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

const STATUS_BG = {
  flashed:   'rgba(59, 130, 246, 0.10)',
  sent:      'rgba(34, 197, 94, 0.10)',
  project:   'rgba(234, 179, 8, 0.10)',
  untouched: 'transparent',
}

/**
 * A single climb row for list views (discover / zone pages).
 *
 * @param {object} props
 * @param {object}   props.climb           - Climb object (id, grade, color, tags, repeat_count, zoneName?)
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
}) {
  const router = useRouter()

  return (
    <li
      className={showBorder ? 'border-t border-zinc-800/60' : ''}
      style={{ backgroundColor: STATUS_BG[climbStatus] }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Grade badge — navigates to climb detail */}
        <button
          onClick={() => router.push(`/climb/${climb.id}`)}
          className="shrink-0"
          aria-label={`View climb ${climb.grade ?? ''}`}
        >
          <GradeBadge grade={climb.grade} color={climb.color} />
        </button>

        {/* Tags + zone name or repeat count */}
        <button
          onClick={() => router.push(`/climb/${climb.id}`)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.isArray(climb.tags) && climb.tags.length > 0
              ? climb.tags.map((tag) => (
                  <span key={tag} className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))
              : <span className="text-zinc-600 text-xs">No tags</span>
            }
          </div>
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
