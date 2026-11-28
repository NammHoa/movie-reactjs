import { AGE_INFO } from '../lib/ageRating'

// round: nhãn tròn ở thẻ phim, chỉ ghi số tuổi ("T16" thành "16"); P và K giữ nguyên
export default function AgeBadge({ code, round = false, className = '' }) {
  const info = AGE_INFO[code]
  if (!info) return null
  const shape = round ? 'inline-flex h-6 w-6 items-center justify-center rounded-full' : 'inline-block rounded px-1.5 py-0.5'
  return (
    <span title={info.label} className={`${shape} shrink-0 text-xs font-bold leading-none text-white ${info.cls} ${className}`}>
      {round ? code.replace(/^T/, '') : code}
    </span>
  )
}
