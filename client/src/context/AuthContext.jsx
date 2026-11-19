import { createContext, useContext, useEffect, useState } from 'react'
import api, { bare } from '../api/axios'
import { clearSession, getRefreshToken, getToken, saveSession } from '../lib/session'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'))
    } catch {
      return null
    }
  })

  // Mỗi lần mở trang: hỏi server tài khoản hiện tại để cập nhật lại role.
  // (Nếu token hết hạn / tài khoản bị xóa, interceptor trong api/axios.js sẽ tự đăng xuất.)
  useEffect(() => {
    if (!getToken()) return
    api
      .get('/auth/me')
      .then(({ data }) => {
        saveSession({ user: data.user })
        setUser(data.user)
      })
      .catch(() => {})
  }, [])

  const login = (userData, token, refreshToken) => {
    saveSession({ token, refreshToken, user: userData })
    setUser(userData)
  }

  // Cập nhật thông tin hiển thị (tên, số điện thoại...) sau khi sửa hồ sơ; token giữ nguyên
  const updateUser = (userData) => {
    saveSession({ user: userData })
    setUser(userData)
  }

  // Báo server hủy phiên; không liên lạc được thì vẫn đăng xuất ở máy này
  const logout = () => {
    const refreshToken = getRefreshToken()
    if (refreshToken) bare.post('/auth/logout', { refreshToken }).catch(() => {})
    clearSession()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
