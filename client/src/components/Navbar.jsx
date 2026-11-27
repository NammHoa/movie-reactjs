import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MENU, activeMenu } from '../lib/menu'
import MobileMenu from './MobileMenu'

const accountItem = 'px-3 py-2.5 uppercase first:pl-0 last:pr-0 hover:text-brand'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const active = activeMenu(pathname)

  return (
    // Khi menu điện thoại mở thì ghim header: nếu trang tự cuộn (ví dụ "Mua vé" tải chậm), nút đóng và danh sách vẫn ở nguyên
    <header className="relative border-b border-gray-200 bg-white shadow-sm has-[#mobile-menu]:sticky has-[#mobile-menu]:top-0 has-[#mobile-menu]:z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-1.5 lg:py-3">
        <Link to="/" className="shrink-0 whitespace-nowrap py-2 text-lg font-extrabold uppercase tracking-tight text-brand lg:text-2xl">
          Denim <span className="text-gray-800">Cinema</span>
        </Link>

        <nav aria-label="Tài khoản" className="hidden min-w-0 items-center divide-x divide-gray-300 whitespace-nowrap text-xs font-semibold lg:flex">
          {user?.role === 'admin' && (
            <Link to="/admin" className={accountItem}>Quản trị</Link>
          )}
          {user ? (
            <>
              <Link to="/profile" className="max-w-[16rem] truncate px-3 py-2.5 text-gray-500 first:pl-0 hover:text-brand" title="Hồ sơ của tôi">
                Xin chào, {user.name}
              </Link>
              <Link to="/my-tickets" className={accountItem}>Vé của tôi</Link>
              <button type="button" onClick={logout} className={`${accountItem} cursor-pointer text-brand`}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={accountItem}>Đăng nhập</Link>
              <Link to="/register" className={`${accountItem} text-brand`}>Đăng ký</Link>
            </>
          )}
        </nav>

        <MobileMenu user={user} onLogout={logout} active={active} />
      </div>

      <nav aria-label="Menu chính" className="hidden border-t-2 border-[#ddd3b5] lg:block">
        <div className="mx-auto flex max-w-6xl justify-center divide-x divide-gray-200 whitespace-nowrap px-4 text-[13px] font-semibold uppercase xl:text-sm">
          {MENU.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              aria-current={m.to === active ? 'page' : undefined}
              className={`px-3 py-3 hover:text-brand xl:px-5 ${m.to === active ? 'text-brand' : 'text-gray-700'}`}
            >
              {m.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
