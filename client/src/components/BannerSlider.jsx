import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { nearestIndex, wrapIndex } from '../lib/slider'

function BannerImage({ src, title }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-gray-300 px-4 text-center text-lg font-bold text-gray-700">
        <span className="line-clamp-3 min-w-0 break-words">{title}</span>
      </div>
    )
  }
  return <img src={src} alt={title} onError={() => setBroken(true)} className="aspect-video w-full object-cover" />
}

// Vị trí cuộn để từng ảnh nằm giữa khung
const offsetsOf = (box) =>
  [...box.querySelectorAll('[data-slide]')].map((el) => el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2)

const arrowCls =
  'absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 pb-1 text-3xl leading-none text-white hover:bg-brand lg:flex'

export default function BannerSlider({ items }) {
  const boxRef = useRef(null)
  const activeRef = useRef(0)
  const [active, setActive] = useState(0)
  const count = items.length

  // Đổi cỡ màn hình làm các vị trí cuộn thay đổi, nên đưa ảnh đang chọn về giữa
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(() => {
      const left = offsetsOf(box)[activeRef.current]
      if (left !== undefined) box.scrollTo({ left, behavior: 'instant' })
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [count])

  if (!count) return null

  const onScroll = () => {
    const box = boxRef.current
    const index = nearestIndex(box.scrollLeft, offsetsOf(box))
    activeRef.current = index
    setActive(index)
  }

  const goTo = (i) => boxRef.current.scrollTo({ left: offsetsOf(boxRef.current)[wrapIndex(i, count)] })

  return (
    <section aria-label="Phim nổi bật">
      <div className="relative">
        {/* Từ màn hình lớn, hai phần đệm 10% giữ ảnh đầu và ảnh cuối ở giữa */}
        <div
          ref={boxRef}
          onScroll={onScroll}
          className="relative flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] motion-reduce:scroll-auto lg:before:w-[10%] lg:before:shrink-0 lg:before:content-[''] lg:after:w-[10%] lg:after:shrink-0 lg:after:content-[''] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div key={item._id} data-slide className="w-full shrink-0 snap-center lg:w-4/5 lg:px-1.5">
              <Link to={`/movies/${item._id}`} className="block overflow-hidden rounded-lg bg-gray-200">
                <BannerImage key={item.backdrop} src={item.backdrop} title={item.title} />
              </Link>
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button type="button" onClick={() => goTo(active - 1)} aria-label="Banner trước" className={`${arrowCls} left-[10%] -translate-x-1/2`}>
              ‹
            </button>
            <button type="button" onClick={() => goTo(active + 1)} aria-label="Banner sau" className={`${arrowCls} right-[10%] translate-x-1/2`}>
              ›
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-2 flex justify-center">
          {items.map((item, i) => (
            <button
              key={item._id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Banner ${i + 1}`}
              aria-current={i === active ? 'true' : undefined}
              className="flex h-7 w-7 items-center justify-center"
            >
              <span className={`h-2.5 rounded-full transition-all ${i === active ? 'w-5 bg-brand' : 'w-2.5 bg-gray-300'}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
