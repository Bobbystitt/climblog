'use client'

import { climbColor } from '@/constants/colors'

/**
 * Colored square badge showing the hold color and grade text.
 *
 * @param {object} props
 * @param {string} props.grade   - The grade label (e.g. "V5")
 * @param {string} props.color   - The hold color name (e.g. "red", "blue")
 * @param {'sm'|'md'} [props.size='md'] - 'sm' = 44 × 44 px, 'md' = 56 × 56 px
 * @param {string} [props.className='']  - Extra Tailwind classes (e.g. "shadow-sm")
 */
export default function GradeBadge({ grade, color, size = 'md', className = '' }) {
  const sizeClasses = size === 'sm'
    ? 'w-11 h-11 rounded-xl'
    : 'w-14 h-14 rounded-2xl'

  const gradeStr = grade || '?'
  const textSize = gradeStr.length >= 5 ? 'text-[10px]' : gradeStr.length === 4 ? 'text-xs' : 'text-sm'

  return (
    <div
      className={`${sizeClasses} flex items-center justify-center ${className}`}
      style={{ backgroundColor: climbColor(color) }}
    >
      <span className={`text-white font-bold ${textSize} leading-none`}>
        {gradeStr}
      </span>
    </div>
  )
}
