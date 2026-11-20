import { useState } from 'react'
import { Link } from 'react-router-dom'
import { STATUS_LABELS, formatRating } from '../lib/movie'

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
    <Link
      to={`/movies/${movie._id}`}
      className="group block overflow-hidden rounded-lg bg-white shadow-sm transition hover:shadow-md"
    >
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
        {movie.ratingCount > 0 && (
          <p className="mt-1 flex items-center gap-1 text-sm">
            <span className="text-amber-400" aria-hidden="true">★</span>
            <span className="font-semibold">{formatRating(movie.ratingAvg)}</span>
            <span className="text-xs text-gray-400">({movie.ratingCount})</span>
          </p>
        )}
      </div>
    </Link>
  )
}
