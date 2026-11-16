import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import { AdminRoute } from './routes/ProtectedRoute'
import Home from './pages/user/Home'
import Auth from './pages/user/Auth'
import Dashboard from './pages/admin/Dashboard'

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Đăng nhập và đăng ký dùng chung một luồng */}
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Dashboard />
            </AdminRoute>
          }
        />
      </Routes>
    </>
  )
}
