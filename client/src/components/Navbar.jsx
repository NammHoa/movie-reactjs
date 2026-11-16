import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-2xl font-extrabold tracking-tight text-brand">
          MOVIE<span className="text-gray-800">BOOKING</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          {user?.role === 'admin' && (
            <Link to="/admin" className="hover:text-brand">Quản trị</Link>
          )}
          {user ? (
            <>
              <span className="hidden text-gray-500 sm:inline">Xin chào, {user.name}</span>
              <Link to="/my-tickets" className="hover:text-brand">Vé của tôi</Link>
              <button
                onClick={logout}
                className="rounded border border-brand px-3 py-1.5 text-brand transition hover:bg-brand hover:text-white"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-brand">Đăng nhập</Link>
              <Link
                to="/register"
                className="rounded bg-brand px-4 py-1.5 text-white transition hover:bg-brand-dark"
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
