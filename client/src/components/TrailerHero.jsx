import { useState } from 'react'
import { trailerSource } from '../lib/video'
import TrailerPlayer from './TrailerPlayer'

const TITLES = { now_showing: 'PHIM HOT TẠI RẠP', coming_soon: 'PHIM SẮP CHIẾU' }

const playCls =
  'absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/30 transition hover:bg-black/60 sm:h-24 sm:w-24'

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" aria-hidden="true" className="ml-1 h-7 w-7 sm:h-10 sm:w-10">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
)

// Khối ảnh ngang nền tối ở đầu trang phim; bấm ▶ mới tải video
export default function TrailerHero({ movie }) {
  const [playing, setPlaying] = useState(false)
  const [broken, setBroken] = useState(false)
  if (!movie.backdrop) return null

  const source = trailerSource(movie.trailer)
  const title = TITLES[movie.status]

  return (
    <section>
      {title && <p className="bg-[#ddd3b5] px-4 py-3 text-center text-sm font-semibold tracking-wide text-gray-900">{title}</p>}
      <div className="bg-[#231f20] sm:px-4 sm:py-8">
        <div className="relative mx-auto aspect-video w-full max-w-5xl overflow-hidden bg-black">
          {playing ? (
            <TrailerPlayer source={source} url={movie.trailer} title={movie.title} />
          ) : (
            <>
              {broken ? (
                <div className="flex h-full items-center justify-center bg-gray-700 px-6 text-center text-lg font-bold text-gray-200">{movie.title}</div>
              ) : (
                <img src={movie.backdrop} alt={movie.title} onError={() => setBroken(true)} className="h-full w-full object-cover" />
              )}
              {source ? (
                <button type="button" onClick={() => setPlaying(true)} aria-label="Phát trailer" className={playCls}>
                  <PlayIcon />
                </button>
              ) : (
                movie.trailer && (
                  <a href={movie.trailer} target="_blank" rel="noopener noreferrer" aria-label="Phát trailer" className={playCls}>
                    <PlayIcon />
                  </a>
                )
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
