import { useState } from 'react'
import { STATUS_LABELS } from '../lib/movie'

export function Poster({ src, alt, className = '' }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 text-3xl text-gray-400 ${className}`}>
        🎬
      </div>
    )
  }
  return <img src={src} alt={alt} onError={() => setBroken(true)} className={`object-cover ${className}`} />
}

export default function MovieCard({ movie }) {
  return (
    <div className="group overflow-hidden rounded-lg bg-white shadow-sm transition hover:shadow-md">
      <div className="relative">
        <Poster src={movie.poster} alt={movie.title} className="aspect-[2/3] w-full" />
        <span className="absolute left-2 top-2 rounded bg-brand px-2 py-0.5 text-xs font-semibold text-white">
          {STATUS_LABELS[movie.status]}
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] font-semibold leading-tight group-hover:text-brand">
          {movie.title}
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          {movie.duration} phút{movie.genres?.length ? ` • ${movie.genres.join(', ')}` : ''}
        </p>
      </div>
    </div>
  )
}
