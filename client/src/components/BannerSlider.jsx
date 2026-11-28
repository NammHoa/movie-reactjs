import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AUTOPLAY_MS, canAutoPlay, nearestIndex, wrapIndex } from '../lib/slider'

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

// Cuộn riêng khung banner (không dùng scrollIntoView, vì nó kéo cả trang về banner)
const scrollToSlide = (box, index, behavior) => {
  const offsets = offsetsOf(box)
  const left = offsets[wrapIndex(index, offsets.length)]
  if (left !== undefined) box.scrollTo({ left, behavior })
}

const arrowCls =
  'absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 pb-1 text-3xl leading-none text-white hover:bg-brand lg:flex'

const trackCls =
  'relative flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden'
// Kiểu ở trang chủ: từ màn hình lớn ló ảnh hai bên, phần đệm 10% giữ ảnh đầu và ảnh cuối ở giữa
const peekCls = "lg:before:w-[10%] lg:before:shrink-0 lg:before:content-[''] lg:after:w-[10%] lg:after:shrink-0 lg:after:content-['']"

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// hero: mỗi ảnh chiếm trọn khung, dùng trên nền tối. autoPlay: tự trượt, có nút tạm dừng
export default function BannerSlider({ items, hero = false, autoPlay = false }) {
  const boxRef = useRef(null)
  const activeRef = useRef(0)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(() => autoPlay && reducedMotion())
  const [hovering, setHovering] = useState(false)
  const [touching, setTouching] = useState(false)
  const [keyboard, setKeyboard] = useState(false)
  const [hidden, setHidden] = useState(() => document.hidden)
  const count = items.length
  const running = autoPlay && canAutoPlay({ count, paused, hovering, touching, keyboard, hidden })

  // Đổi cỡ màn hình làm các vị trí cuộn thay đổi, nên đưa ảnh đang chọn về giữa
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const observer = new ResizeObserver(() => scrollToSlide(box, activeRef.current, 'instant'))
    observer.observe(box)
    return () => observer.disconnect()
  }, [count])

  useEffect(() => {
    if (!autoPlay) return
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [autoPlay])

  // Phụ thuộc active: đổi ảnh bằng tay thì đếm lại từ đầu. Dùng hẹn giờ lặp để một lần cuộn bị bỏ qua
  // (ảnh không đổi) không làm banner đứng luôn
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => boxRef.current && scrollToSlide(boxRef.current, activeRef.current + 1), AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [running, active])

  if (!count) return null

  const onScroll = () => {
    const box = boxRef.current
    const index = nearestIndex(box.scrollLeft, offsetsOf(box))
    activeRef.current = index
    setActive(index)
  }

  const goTo = (i) => scrollToSlide(boxRef.current, i)

  // Các lý do tạm dừng do thao tác của khách. Chỉ chuột mới tính là "rê chuột": màn hình cảm ứng cũng
  // phát sự kiện pointer khi chạm nhưng không bao giờ "rời đi". Focus do bấm chuột không tính là dùng bàn phím
  const holdHandlers = autoPlay
    ? {
        onPointerEnter: (e) => e.pointerType === 'mouse' && setHovering(true),
        onPointerLeave: (e) => e.pointerType === 'mouse' && setHovering(false),
        onTouchStart: () => setTouching(true),
        onTouchEnd: () => setTouching(false),
        onTouchCancel: () => setTouching(false),
        onFocus: (e) => setKeyboard(e.target.matches(':focus-visible')),
        onBlur: (e) => !e.currentTarget.contains(e.relatedTarget) && setKeyboard(false),
      }
    : {}

  return (
    <section aria-label="Phim nổi bật" {...holdHandlers}>
      <div className="relative">
        <div ref={boxRef} onScroll={onScroll} className={`${trackCls} ${hero ? '' : peekCls}`}>
          {items.map((item) => (
            <div key={item._id} data-slide className={`w-full shrink-0 snap-center ${hero ? '' : 'lg:w-4/5 lg:px-1.5'}`}>
              <Link to={`/movies/${item._id}`} className={`block overflow-hidden ${hero ? 'bg-black' : 'rounded-lg bg-gray-200'}`}>
                <BannerImage key={item.backdrop} src={item.backdrop} title={item.title} />
              </Link>
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button type="button" onClick={() => goTo(active - 1)} aria-label="Banner trước" className={`${arrowCls} ${hero ? 'left-3' : 'left-[10%] -translate-x-1/2'}`}>
              ‹
            </button>
            <button type="button" onClick={() => goTo(active + 1)} aria-label="Banner sau" className={`${arrowCls} ${hero ? 'right-3' : 'right-[10%] translate-x-1/2'}`}>
              ›
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-2 flex flex-wrap items-center justify-center">
          {items.map((item, i) => (
            <button
              key={item._id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Banner ${i + 1}`}
              aria-current={i === active ? 'true' : undefined}
              className="flex h-7 w-7 items-center justify-center"
            >
              <span className={`h-2.5 rounded-full transition-all ${i === active ? 'w-5 bg-brand' : `w-2.5 ${hero ? 'bg-white/60' : 'bg-gray-300'}`}`} />
            </button>
          ))}
          {autoPlay && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Chạy banner' : 'Tạm dừng banner'}
              className={`ml-2 flex h-7 w-7 cursor-pointer items-center justify-center ${hero ? 'text-white hover:text-[#e3d9a5]' : 'text-gray-600 hover:text-brand'}`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                <path d={paused ? 'M7 4.5v15l13-7.5z' : 'M6 5h4v14H6zM14 5h4v14h-4z'} />
              </svg>
            </button>
          )}
        </div>
      )}
    </section>
  )
}
