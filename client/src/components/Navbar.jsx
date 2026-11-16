import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="flex items-center justify-between bg-gray-900 px-6 py-4">
      <Link to="/" className="text-xl font-bold text-red-500">
        🎬 MovieBooking
      </Link>
      <div className="flex items-center gap-4">
        {user?.role === 'admin' && (
          <Link to="/admin" className="hover:text-red-400">Admin</Link>
        )}
        {user ? (
          <>
            <Link to="/my-tickets" className="hover:text-red-400">Vé của tôi</Link>
            <button onClick={logout} className="rounded bg-red-600 px-3 py-1 hover:bg-red-700">
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-red-400">Đăng nhập</Link>
            <Link to="/register" className="rounded bg-red-600 px-3 py-1 hover:bg-red-700">
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
