import { Link } from 'react-router-dom'
import { rankMeta } from '../lib/movie'
import AgeBadge from './AgeBadge'
import { Poster } from './MovieCard'

// Thẻ phim ở Movie Talk. rank: thứ hạng bán vé, null thì không hiện số
export default function TalkCard({ movie, rank }) {
  return (
    <Link to={`/movies/${movie._id}`} className="group flex h-full min-w-0 flex-col border border-gray-200 bg-white transition hover:shadow-md">
      <div className="relative">
        <Poster src={movie.poster} alt={movie.title} className="aspect-[2/3] w-full" />
        {rank && (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-1 pt-10 text-4xl font-extrabold italic leading-none text-white">
            <span className="sr-only">Hạng </span>
            {rank}
          </span>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-2 border-b border-gray-200 px-3 py-3">
        <AgeBadge code={movie.ageRating} round />
        <span title={movie.title} className="truncate text-sm font-bold uppercase text-gray-900 group-hover:text-brand">
          {movie.title}
        </span>
      </div>
      <p className="px-3 py-2 text-center text-xs text-gray-500 sm:text-sm">{rankMeta(movie)}</p>
    </Link>
  )
}
