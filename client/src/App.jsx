import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import { AdminRoute } from './routes/ProtectedRoute'
import Home from './pages/user/Home'
import Login from './pages/user/Login'
import Register from './pages/user/Register'
import Dashboard from './pages/admin/Dashboard'

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
