import { useState } from 'react'
import api from '../api/axios'
import { errorMessage } from '../lib/errors'
import { formatDateTime, formatPrice } from '../lib/movie'

// Nút hủy vé đã thanh toán và nhận lại tiền, kèm chính sách. Không hiện gì nếu vé không thuộc diện này.
// onDone(booking, message) nhận vé đã cập nhật từ server (đã hoàn, hoặc đang hoàn tiền).
export default function RefundButton({ booking, now, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (booking.paymentStatus !== 'paid' || booking.checkedInAt) return null
  const ended = !booking.showtime || new Date(booking.showtime.endTime).getTime() <= now
  if (ended) return null

  if (!booking.canRefund) {
    return (
      <p className="text-xs text-gray-500">
        Đã quá hạn hủy vé{booking.refundDeadline ? ` (hạn: ${formatDateTime(booking.refundDeadline)})` : ''}. Cần hỗ trợ, vui lòng liên hệ rạp.
      </p>
    )
  }

  const refund = async () => {
    const title = booking.showtime?.movie?.title ?? 'phim này'
    const message = `Hủy vé "${title}" (ghế ${booking.seats.join(', ')})?\n\nBạn sẽ được hoàn ${formatPrice(booking.totalPrice)} về phương thức đã thanh toán. Ghế được trả lại và vé không dùng được nữa. Thao tác này không thể hoàn tác.`
    if (!window.confirm(message)) return
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(`/bookings/${booking._id}/refund`)
      onDone(data.booking, data.message)
    } catch (err) {
      setError(errorMessage(err, 'Không thể hủy vé, vui lòng thử lại'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {error && <p role="alert" className="mb-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={refund}
        disabled={busy}
        className="h-9 rounded border border-red-300 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? 'Đang hủy...' : 'Hủy vé & hoàn tiền'}
      </button>
      <p className="mt-1 text-xs text-gray-500">Hủy được đến {formatDateTime(booking.refundDeadline)}, hoàn {formatPrice(booking.totalPrice)}.</p>
    </div>
  )
}

// Tình trạng khoản hoàn tiền của vé đã hủy
export function RefundInfo({ refund }) {
  if (!refund) return null
  return refund.status === 'success' ? (
    <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
      Đã hoàn {formatPrice(refund.amount)}{refund.completedAt ? ` lúc ${formatDateTime(refund.completedAt)}` : ''}. Tiền về tài khoản tùy thời gian xử lý của ngân hàng.
    </p>
  ) : (
    <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
      Đang hoàn {formatPrice(refund.amount)}. Tiền sẽ về sau khi cổng thanh toán xử lý xong, bạn không cần làm thêm gì.
    </p>
  )
}
