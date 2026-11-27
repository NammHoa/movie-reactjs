import { useEffect, useRef, useState } from 'react'
import { rowState } from '../lib/slider'
import PosterTile from './PosterTile'

const GAP = 16 // khớp với gap-4

const arrowCls =
  'absolute top-1/2 hidden h-24 w-10 -translate-y-1/2 items-center justify-center text-gray-400 transition hover:text-brand disabled:pointer-events-none disabled:opacity-30 md:flex'

const Chevron = ({ d }) => (
  <svg viewBox="0 0 14 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true" className="h-16 w-9">
    <path d={d} />
  </svg>
)

export default function PosterRow({ movies }) {
  const boxRef = useRef(null)
  const [state, setState] = useState({ fits: true, atStart: true, atEnd: true })
  const [activeId, setActiveId] = useState(null) // thẻ đang mở nút do được chạm hoặc bấm
  const count = movies.length

  const measure = () => boxRef.current && setState(rowState(boxRef.current))

  // ResizeObserver chạy ngay khi bắt đầu theo dõi, nên đo luôn lần đầu và mỗi khi số phim đổi
  useEffect(() => {
    if (!boxRef.current) return
    const observer = new ResizeObserver(measure)
    observer.observe(boxRef.current)
    return () => observer.disconnect()
  }, [count])

  // Chạm ra ngoài thẻ đang mở thì đóng nó
  useEffect(() => {
    if (!activeId) return
    const close = (e) => {
      if (!e.target.closest?.(`[data-tile="${activeId}"]`)) setActiveId(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [activeId])

  if (!count) return null

  // Mỗi lần bấm đi đúng một khung (bề rộng khung cộng một khoảng cách giữa hai thẻ)
  const page = (step) => boxRef.current.scrollBy({ left: step * (boxRef.current.clientWidth + GAP) })

  return (
    <div className="relative md:px-12">
      {/* Lề tự động ở thẻ đầu và cuối giữ hàng ít phim nằm giữa; khi hàng dài hơn khung thì lề tự về 0 */}
      <div
        ref={boxRef}
        onScroll={measure}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden [&>:first-child]:ml-auto [&>:last-child]:mr-auto"
      >
        {movies.map((m) => (
          <div
            key={m._id}
            className="w-[calc((100%-1rem)/2)] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)]"
          >
            <PosterTile
              movie={m}
              active={activeId === m._id}
              onActivate={() => setActiveId(m._id)}
              onDeactivate={() => setActiveId((id) => (id === m._id ? null : id))}
            />
          </div>
        ))}
      </div>

      {!state.fits && (
        <>
          <button type="button" onClick={() => page(-1)} disabled={state.atStart} aria-label="Phim trước" className={`${arrowCls} left-0`}>
            <Chevron d="M12 1L2 12l10 11" />
          </button>
          <button type="button" onClick={() => page(1)} disabled={state.atEnd} aria-label="Phim sau" className={`${arrowCls} right-0`}>
            <Chevron d="M2 1l10 11L2 23" />
          </button>
        </>
      )}
    </div>
  )
}
