import { useEffect, useRef, useState } from 'react'
import { rowState } from '../lib/slider'
import MovieCard from './MovieCard'

const GAP = 16 // khớp với gap-4

const arrowCls =
  'absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 pb-1 text-3xl leading-none text-white hover:bg-brand disabled:pointer-events-none disabled:opacity-30 md:flex'

export default function PosterRow({ movies }) {
  const boxRef = useRef(null)
  const [state, setState] = useState({ fits: true, atStart: true, atEnd: true })
  const count = movies.length

  const measure = () => boxRef.current && setState(rowState(boxRef.current))

  // ResizeObserver chạy ngay khi bắt đầu theo dõi, nên đo luôn lần đầu và mỗi khi số phim đổi
  useEffect(() => {
    if (!boxRef.current) return
    const observer = new ResizeObserver(measure)
    observer.observe(boxRef.current)
    return () => observer.disconnect()
  }, [count])

  if (!count) return null

  // Mỗi lần bấm đi đúng một khung (bề rộng khung cộng một khoảng cách giữa hai thẻ)
  const page = (step) => boxRef.current.scrollBy({ left: step * (boxRef.current.clientWidth + GAP) })

  return (
    <div className="relative">
      <div
        ref={boxRef}
        onScroll={measure}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth py-1 [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
      >
        {movies.map((m) => (
          <div
            key={m._id}
            className="w-[calc((100%-1rem)/2)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)] [&>a]:h-full"
          >
            <MovieCard movie={m} />
          </div>
        ))}
      </div>

      {!state.fits && (
        <>
          <button type="button" onClick={() => page(-1)} disabled={state.atStart} aria-label="Phim trước" className={`${arrowCls} -left-3`}>
            ‹
          </button>
          <button type="button" onClick={() => page(1)} disabled={state.atEnd} aria-label="Phim sau" className={`${arrowCls} -right-3`}>
            ›
          </button>
        </>
      )}
    </div>
  )
}
