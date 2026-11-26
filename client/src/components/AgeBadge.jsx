import { AGE_INFO } from '../lib/ageRating'

export default function AgeBadge({ code, className = '' }) {
  const info = AGE_INFO[code]
  if (!info) return null
  return (
    <span title={info.label} className={`inline-block shrink-0 rounded px-1.5 py-0.5 text-xs font-bold leading-none text-white ${info.cls} ${className}`}>
      {code}
    </span>
  )
}
