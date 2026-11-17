import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import BookingSummary from '../../components/BookingSummary'
import Countdown from '../../components/Countdown'
import PayButton from '../../components/PayButton'
import { loadPayment } from '../../lib/payment'

const HEADERS = {
  success: { bg: 'bg-green-600', icon: '✓', title: 'Thanh toán thành công' },
  failed: { bg: 'bg-red-600', icon: '✕', title: 'Thanh toán không thành công' },
  processing: { bg: 'bg-amber-500', icon: '…', title: 'Giao dịch đang được xử lý' },
}

const LOST = {
  expired: 'Đơn đã hết hạn thanh toán, ghế đã được nhả. Vui lòng đặt lại vé.',
  cancelled: 'Đơn này đã bị hủy. Vui lòng đặt lại vé.',
}

export default function PaymentResult() {
  const { id } = useParams()
  const [state, setState] = useState({ status: 'loading' }) // loading | ok | notfound | error
  const [over, setOver] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadPayment(id)
      .then((res) => !cancelled && setState({ status: 'ok', ...res }))
      .catch((err) => !cancelled && setState({ status: err.response?.status === 404 ? 'notfound' : 'error' }))
    return () => {
      cancelled = true
    }
  }, [id])

  if (state.status === 'loading') return <p className="p-8 text-center text-gray-500">Đang tải kết quả...</p>
  if (state.status === 'notfound')
    return (
      <div className="p-8 text-center">
        <p className="mb-3 text-gray-600">Không tìm thấy giao dịch này.</p>
        <Link to="/my-tickets" className="font-semibold text-brand hover:underline">← Vé của tôi</Link>
      </div>
    )
  if (state.status === 'error') return <p className="p-8 text-center text-red-600">Không thể tải kết quả thanh toán</p>

  const { payment, booking } = state
  if (payment.status === 'pending') return <Navigate to={`/pay/${id}`} replace />

  const header = HEADERS[payment.status]
  const canRetry = payment.status === 'failed' && booking.canPay && !over

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className={`${header.bg} px-6 py-5 text-center text-white`}>
          <p className="text-3xl">{header.icon}</p>
          <h1 className="text-xl font-bold">{header.title}</h1>
        </div>

        <div className="space-y-5 p-6">
          <BookingSummary booking={booking} />

          {payment.status === 'success' && (
            <div className="space-y-3">
              <Link to={`/tickets/${booking._id}`} className="block rounded bg-brand py-3 text-center font-bold text-white hover:bg-brand-dark">
                Xem vé điện tử (mã QR)
              </Link>
              <div className="flex gap-3">
                <Link to="/" className="flex-1 rounded border border-gray-300 py-2.5 text-center text-sm font-semibold hover:bg-gray-50">
                  Về trang chủ
                </Link>
                <Link to="/my-tickets" className="flex-1 rounded border border-gray-300 py-2.5 text-center text-sm font-semibold hover:bg-gray-50">
                  Vé của tôi
                </Link>
              </div>
            </div>
          )}

          {payment.status === 'processing' && (
            <button onClick={() => window.location.reload()} className="w-full rounded border border-gray-300 py-2.5 text-sm font-semibold hover:bg-gray-50">
              Kiểm tra lại
            </button>
          )}

          {payment.status === 'failed' &&
            (canRetry ? (
              <div className="space-y-3">
                <p className="text-center text-sm text-gray-600">
                  Ghế vẫn được giữ cho bạn trong <Countdown expiresAt={booking.expiresAt} onExpire={() => setOver(true)} />
                </p>
                <PayButton bookingId={booking._id}>Thử thanh toán lại</PayButton>
                <Link to="/my-tickets" className="block text-center text-sm text-gray-500 hover:text-brand">
                  Để sau, quay lại vé của tôi
                </Link>
              </div>
            ) : (
              <div className="rounded bg-gray-50 p-4 text-center text-sm text-gray-600">
                <p className="mb-2">{LOST[booking.paymentStatus] ?? LOST.expired}</p>
                {booking.showtime && (
                  <Link to={`/booking/${booking.showtime._id}`} className="font-semibold text-brand hover:underline">
                    Đặt lại vé
                  </Link>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
