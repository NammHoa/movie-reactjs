import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 px-4 py-2 sm:py-3">
        <Link to="/" className="shrink-0 text-lg font-extrabold tracking-tight text-brand sm:text-2xl">
          MOVIE<span className="text-gray-800">BOOKING</span>
        </Link>
        <nav className="ml-auto flex items-center gap-3 whitespace-nowrap text-xs font-medium sm:gap-5 sm:text-sm">
          {user?.role === 'admin' && (
            <Link to="/admin" className="py-2 hover:text-brand">Quản trị</Link>
          )}
          {user ? (
            <>
              <Link to="/profile" className="hidden max-w-[10rem] truncate py-2 text-gray-500 hover:text-brand sm:inline" title="Hồ sơ của tôi">
                Xin chào, {user.name}
              </Link>
              <Link to="/my-tickets" className="py-2 hover:text-brand">Vé của tôi</Link>
              <Link to="/profile" className="py-2 hover:text-brand sm:hidden">Hồ sơ</Link>
              <button
                onClick={logout}
                className="rounded border border-brand px-2.5 py-2 text-brand transition hover:bg-brand hover:text-white sm:px-3 sm:py-1.5"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="py-2 hover:text-brand">Đăng nhập</Link>
              <Link
                to="/register"
                className="rounded bg-brand px-3 py-2 text-white transition hover:bg-brand-dark sm:px-4 sm:py-1.5"
              >
                Đăng ký
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
