import axios from 'axios'
import { RATE_LIMIT_EVENT } from '../lib/errors'
import { clearSession, getRefreshToken, getToken, saveSession } from '../lib/session'

// Dev: để trống, Vite proxy chuyển /api sang server. Deploy: đặt VITE_API_URL=https://ten-server.onrender.com
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const baseURL = `${API_ORIGIN}/api`

const api = axios.create({ baseURL, withCredentials: true })
// Không gắn interceptor: các lời gọi làm mới/đăng xuất không được tự kích hoạt làm mới lần nữa
export const bare = axios.create({ baseURL, withCredentials: true })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const endSession = () => {
  clearSession()
  if (window.location.pathname !== '/login') window.location.href = '/login'
}

// Nhiều request hết hạn cùng lúc chỉ làm mới một lần (refresh token dùng một lần rồi đổi)
let refreshing = null

async function requestRefresh() {
  const used = getRefreshToken()
  try {
    const { data } = await bare.post('/auth/refresh', { refreshToken: used })
    saveSession(data)
    return data.token
  } catch (err) {
    // Tab khác có thể vừa đổi token trước: thử lại một lần với token mới nhất trong localStorage
    const latest = getRefreshToken()
    if (latest && latest !== used && err.response?.status === 401) {
      const { data } = await bare.post('/auth/refresh', { refreshToken: latest })
      saveSession(data)
      return data.token
    }
    throw err
  }
}

const refreshSession = () => {
  refreshing ??= requestRefresh().finally(() => (refreshing = null))
  return refreshing
}

const AUTH_URL = /^\/auth\/(login|register|check|refresh|logout)/

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error
    const url = config?.url || ''
    // Tải dữ liệu bị giới hạn: báo bằng thông báo nổi vì trang chỉ hiện lỗi chung. Form đăng nhập/đăng ký và
    // các thao tác gửi dữ liệu tự hiện thông báo tại chỗ nên không bắn thêm để khỏi trùng.
    if (response?.status === 429 && config?.method === 'get') {
      window.dispatchEvent(new CustomEvent(RATE_LIMIT_EVENT, { detail: { message: response.data?.message } }))
    }
    if (response?.status !== 401 || !getToken() || AUTH_URL.test(url)) return Promise.reject(error)

    // Token hết hạn: đổi lấy token mới rồi gửi lại đúng request đó, người dùng không bị đăng xuất
    if (getRefreshToken() && !config._retried) {
      config._retried = true
      try {
        // Request khác đã làm mới xong thì dùng luôn token mới, không làm mới thêm
        const sent = config.headers?.Authorization
        const token = sent === `Bearer ${getToken()}` ? await refreshSession() : getToken()
        config.headers.Authorization = `Bearer ${token}`
        return api(config)
      } catch (refreshError) {
        // Mất mạng hoặc server đang khởi động lại: giữ phiên, để lần sau thử lại
        if (!refreshError.response) return Promise.reject(error)
        // Còn lại là bị từ chối thật sự (phiên hết hạn, bị thu hồi...): về trang đăng nhập
        if (refreshError.response.status === 401) endSession()
        return Promise.reject(refreshError.response.status === 401 ? error : refreshError)
      }
    }

    // Phiên cũ không có refresh token (đăng nhập trước khi có tính năng này) hoặc đã thử lại mà vẫn 401
    endSession()
    return Promise.reject(error)
  },
)

export default api
