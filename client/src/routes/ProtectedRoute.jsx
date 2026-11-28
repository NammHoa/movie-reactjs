import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isStaff } from '../lib/roles'

export function ProtectedRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export function AdminRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return isStaff(user) ? children : <Navigate to="/" replace />
}

// Trang chỉ của trụ sở, nằm trong AdminRoute: quản lý rạp gõ thẳng địa chỉ thì về Tổng quan
export function HqRoute({ children }) {
  const { user } = useAuth()
  return user?.role === 'admin' ? children : <Navigate to="/admin" replace />
}
