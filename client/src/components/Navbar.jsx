import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const accountItem = 'px-2 py-2.5 uppercase first:pl-0 last:pr-0 hover:text-brand sm:px-3'
const mainItem = 'flex-1 px-4 py-2.5 text-center hover:text-brand lg:flex-none'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      {/* Dưới lg: dòng 1 là logo và tài khoản, dòng 2 là menu. Từ lg gộp thành một dòng */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 px-4 lg:py-2">
        <Link to="/" className="shrink-0 whitespace-nowrap py-2 text-base font-extrabold uppercase tracking-tight text-brand sm:text-2xl">
          Denim <span className="text-gray-800">Cinema</span>
        </Link>

        <nav
          aria-label="Menu chính"
          className="order-3 flex w-full divide-x divide-gray-300 whitespace-nowrap border-t border-gray-100 text-xs font-bold uppercase sm:text-sm lg:order-2 lg:ml-6 lg:w-auto lg:border-t-0"
        >
          <Link to="/#movie-list" className={mainItem}>Mua vé</Link>
          <Link to="/cinemas" className={mainItem}>Rạp chiếu phim</Link>
        </nav>

        {/* Admin có thêm một mục nên trên điện thoại phần này đứng riêng một dòng, tránh xuống dòng lộn xộn */}
        <nav
          aria-label="Tài khoản"
          className={`order-2 flex min-w-0 flex-1 flex-wrap items-center justify-end divide-x divide-gray-300 whitespace-nowrap text-[11px] font-semibold sm:text-xs lg:order-3 ${user?.role === 'admin' ? 'max-sm:basis-full' : ''}`}
        >
          {user?.role === 'admin' && (
            <Link to="/admin" className={accountItem}>Quản trị</Link>
          )}
          {user ? (
            <>
              <Link to="/profile" className="hidden max-w-[12rem] truncate px-3 py-2.5 text-gray-500 first:pl-0 hover:text-brand sm:block" title="Hồ sơ của tôi">
                Xin chào, {user.name}
              </Link>
              <Link to="/my-tickets" className={accountItem}>Vé của tôi</Link>
              <Link to="/profile" className={`${accountItem} sm:hidden`}>Hồ sơ</Link>
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
      </div>
    </header>
  )
}
