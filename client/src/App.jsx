import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import RateLimitToast from './components/RateLimitToast'
import { AdminRoute, ProtectedRoute } from './routes/ProtectedRoute'
import Home from './pages/user/Home'
import Auth from './pages/user/Auth'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Movies from './pages/admin/Movies'
import Cinemas from './pages/admin/Cinemas'
import Showtimes from './pages/admin/Showtimes'
import MovieDetail from './pages/user/MovieDetail'
import Booking from './pages/user/Booking'
import MyTickets from './pages/user/MyTickets'
import Pay from './pages/user/Pay'
import Ticket from './pages/user/Ticket'
import PaymentResult from './pages/user/PaymentResult'

export default function App() {
  return (
    <>
      <Navbar />
      <RateLimitToast />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies/:id" element={<MovieDetail />} />
        <Route path="/booking/:id" element={<Booking />} />
        <Route
          path="/my-tickets"
          element={
            <ProtectedRoute>
              <MyTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute>
              <Ticket />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pay/:id"
          element={
            <ProtectedRoute>
              <Pay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/result/:id"
          element={
            <ProtectedRoute>
              <PaymentResult />
            </ProtectedRoute>
          }
        />
        {/* Đăng nhập và đăng ký dùng chung một luồng */}
        <Route path="/login" element={<Auth />} />
        <Route path="/register" element={<Auth />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="movies" element={<Movies />} />
          <Route path="cinemas" element={<Cinemas />} />
          <Route path="showtimes" element={<Showtimes />} />
        </Route>
      </Routes>
    </>
  )
}
