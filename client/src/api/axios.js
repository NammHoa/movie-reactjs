import axios from 'axios'
import { RATE_LIMIT_EVENT } from '../lib/errors'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Token hết hạn / tài khoản bị xóa -> xóa phiên đăng nhập và về trang đăng nhập.
// Bỏ qua các request đăng nhập/đăng ký (401 ở đó chỉ là sai mật khẩu).
const AUTH_FORM_URL = /^\/auth\/(login|register|check)/

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || ''
    // Tải dữ liệu bị giới hạn: báo bằng thông báo nổi vì trang chỉ hiện lỗi chung. Form đăng nhập/đăng ký và
    // các thao tác gửi dữ liệu tự hiện thông báo tại chỗ nên không bắn thêm để khỏi trùng.
    if (error.response?.status === 429 && error.config?.method === 'get') {
      window.dispatchEvent(new CustomEvent(RATE_LIMIT_EVENT, { detail: { message: error.response.data?.message } }))
    }
    if (error.response?.status === 401 && localStorage.getItem('token') && !AUTH_FORM_URL.test(url)) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
