import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MENU } from '../lib/menu'
import { isStaff } from '../lib/roles'

const rowCls = 'flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-2 text-sm font-semibold uppercase'
const authBtn = 'flex h-11 flex-1 items-center justify-center rounded border border-brand text-sm font-bold uppercase'

const Icon = ({ d, className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className={className}>
    <path d={d} />
  </svg>
)

const BARS = 'M4 6h16M4 12h16M4 18h16'
const CLOSE = 'M6 6l12 12M18 6L6 18'
const CHEVRON = 'M9 6l6 6-6 6'

// Menu cho màn hình dưới lg: nút ba gạch mở danh sách phủ lên trang
export default function MobileMenu({ user, onLogout, active }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const { key } = useLocation()

  // Đổi trang (bấm mục, kể cả mục đang xem, hoặc nút quay lại) thì đóng menu
  const [seenKey, setSeenKey] = useState(key)
  if (seenKey !== key) {
    setSeenKey(key)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    // Cùng mốc với lg của Tailwind: lên màn hình rộng thì menu này bị ẩn nên phải đóng để mở khóa cuộn
    const wide = window.matchMedia('(min-width: 64rem)')
    const onWide = (e) => e.matches && setOpen(false)
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    wide.addEventListener('change', onWide)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      wide.removeEventListener('change', onWide)
    }
  }, [open])

  const logout = () => {
    setOpen(false)
    onLogout()
  }

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Đóng menu' : 'Mở menu'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded text-gray-800 hover:text-brand"
      >
        <Icon d={open ? CLOSE : BARS} />
      </button>

      {/* Neo theo header (phần tử relative). Danh sách bắt đầu ở 3.5rem: nút 44px cộng đệm 12px, và che luôn viền của header */}
      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full z-40 flex h-[calc(100dvh-3.5rem)] flex-col overflow-y-auto overscroll-contain border-t-2 border-[#ddd3b5] bg-white">
          <nav aria-label="Menu chính" className="flex shrink-0 flex-col">
            {MENU.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                aria-current={m.to === active ? 'page' : undefined}
                className={`${rowCls} ${m.to === active ? 'text-brand' : 'text-gray-800'}`}
              >
                {m.label}
                <Icon d={CHEVRON} className="h-4 w-4 shrink-0 text-gray-400" />
              </Link>
            ))}
          </nav>

          <nav aria-label="Tài khoản" className="mt-auto flex shrink-0 flex-col bg-gray-50">
            {user ? (
              <>
                <p className="truncate px-4 pb-1 pt-3 text-sm text-gray-500">Xin chào, {user.name}</p>
                {isStaff(user) && <Link to="/admin" className={rowCls}>Quản trị</Link>}
                <Link to="/my-tickets" className={rowCls}>Vé của tôi</Link>
                <Link to="/profile" className={rowCls}>Hồ sơ</Link>
                <button type="button" onClick={logout} className={`${rowCls} cursor-pointer text-left text-brand`}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <div className="flex gap-3 p-4">
                <Link to="/login" className={`${authBtn} bg-white text-brand`}>Đăng nhập</Link>
                <Link to="/register" className={`${authBtn} bg-brand text-white`}>Đăng ký</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </div>
  )
}
