import axios from 'axios'

export const RATE_LIMIT_EVENT = 'api:rate-limited'

export const isRateLimited = (err) => err?.response?.status === 429

// Số giây phải chờ khi bị giới hạn (0 nếu không có thông tin)
export const retryAfterOf = (err) => {
  const s = Number(err?.response?.data?.retryAfter ?? err?.response?.headers?.['retry-after'])
  return Number.isFinite(s) && s > 0 ? Math.ceil(s) : 0
}

// Thông báo cho người dùng: ưu tiên câu server trả về, mất kết nối thì báo riêng
export function errorMessage(err, fallback = 'Có lỗi xảy ra, vui lòng thử lại') {
  const offline = 'Không thể kết nối tới máy chủ'
  if (axios.isAxiosError(err) && !err.response) return offline
  const message = err?.response?.data?.message
  if (typeof message === 'string' && message) return message
  // Lỗi 5xx không có câu trả lời dạng JSON của server: do proxy/cổng trung gian khi server tắt hoặc quá tải
  return err?.response?.status >= 500 ? offline : fallback
}

const two = (n) => String(n).padStart(2, '0')

// 125 -> "02:05", 3725 -> "1:02:05"
export function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${two(m)}:${two(s % 60)}` : `${two(m)}:${two(s % 60)}`
}
