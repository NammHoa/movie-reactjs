export const getToken = () => localStorage.getItem('token')
export const getRefreshToken = () => localStorage.getItem('refreshToken')

// Chỉ ghi phần được truyền vào (đổi mật khẩu chỉ có token mới, không có user mới)
export function saveSession({ token, refreshToken, user }) {
  if (token) localStorage.setItem('token', token)
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
  if (user) localStorage.setItem('user', JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}
