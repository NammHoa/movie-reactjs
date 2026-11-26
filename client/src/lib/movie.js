export const STATUS_LABELS = {
  now_showing: 'Đang chiếu',
  coming_soon: 'Sắp chiếu',
  ended: 'Ngừng chiếu',
}

export const STATUS_STYLES = {
  now_showing: 'bg-green-100 text-green-700',
  coming_soon: 'bg-amber-100 text-amber-700',
  ended: 'bg-gray-200 text-gray-600',
}

const pad = (n) => String(n).padStart(2, '0')

export const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

export const formatDateTime = (d) =>
  new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })

export const formatTime = (d) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

// "4.5" hoặc "4" (không in ".0")
export const formatRating = (n) => String(Math.round(n * 10) / 10)

export const formatPrice =(p) => `${Number(p).toLocaleString('vi-VN')}đ`

// "2026-11-18" theo giờ máy người dùng
export const dateKey = (d) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}

// Giá trị cho <input type="datetime-local"> từ chuỗi ISO
export const toLocalInput = (iso) => {
  const d = new Date(iso)
  return `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// "T4, 18/11"
export const dayLabel = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })

// "Chính kịch, Việt Nam (127 phút)"; thiếu phần nào thì bỏ phần đó
export function basicInfo({ genres, country, duration }) {
  const names = [...(genres ?? []), country].filter(Boolean).join(', ')
  if (!duration) return names
  return names ? `${names} (${duration} phút)` : `${duration} phút`
}
