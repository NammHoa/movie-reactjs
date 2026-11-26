import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import RateLimitToast from './components/RateLimitToast'
import ScrollToTop from './components/ScrollToTop'
import { AdminRoute, ProtectedRoute } from './routes/ProtectedRoute'
import Home from './pages/user/Home'
import Auth from './pages/user/Auth'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Bookings from './pages/admin/Bookings'
import Checkin from './pages/admin/Checkin'
import Users from './pages/admin/Users'
import Movies from './pages/admin/Movies'
import Cinemas from './pages/admin/Cinemas'
import Showtimes from './pages/admin/Showtimes'
import Coupons from './pages/admin/Coupons'
import Banners from './pages/admin/Banners'
import Refunds from './pages/admin/Refunds'
import MovieDetail from './pages/user/MovieDetail'
import CinemaList from './pages/user/Cinemas'
import CinemaSchedule from './pages/user/CinemaSchedule'
import Booking from './pages/user/Booking'
import MyTickets from './pages/user/MyTickets'
import Pay from './pages/user/Pay'
import Ticket from './pages/user/Ticket'
import Profile from './pages/user/Profile'
import PaymentResult from './pages/user/PaymentResult'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <RateLimitToast />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies/:id" element={<MovieDetail />} />
        <Route path="/cinemas" element={<CinemaList />} />
        <Route path="/cinemas/:id" element={<CinemaSchedule />} />
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
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
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
          <Route path="bookings" element={<Bookings />} />
          <Route path="checkin" element={<Checkin />} />
          <Route path="users" element={<Users />} />
          <Route path="movies" element={<Movies />} />
          <Route path="cinemas" element={<Cinemas />} />
          <Route path="showtimes" element={<Showtimes />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="refunds" element={<Refunds />} />
          <Route path="banners" element={<Banners />} />
        </Route>
      </Routes>
    </>
  )
}
