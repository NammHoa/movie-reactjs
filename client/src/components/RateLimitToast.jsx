import { useEffect, useState } from 'react'
import { RATE_LIMIT_EVENT } from '../lib/errors'

// Thông báo nổi khi một lần TẢI dữ liệu bị giới hạn (các thao tác gửi dữ liệu đã tự hiện lỗi tại chỗ).
export default function RateLimitToast() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    const onLimit = (e) => setMessage(e.detail?.message || 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.')
    window.addEventListener(RATE_LIMIT_EVENT, onLimit)
    return () => window.removeEventListener(RATE_LIMIT_EVENT, onLimit)
  }, [])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 8000)
    return () => clearTimeout(timer)
  }, [message])

  if (!message) return null
  return (
    <div role="alert" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-lg bg-[#231f20] px-4 py-3 text-sm text-white shadow-lg">
      <p className="flex-1">{message}</p>
      <button onClick={() => setMessage('')} aria-label="Đóng thông báo" className="-m-2 shrink-0 p-2 text-lg leading-none text-gray-300 hover:text-white">
        ×
      </button>
    </div>
  )
}
