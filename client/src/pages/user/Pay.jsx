import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import api from '../../api/axios'
import BookingSummary from '../../components/BookingSummary'
import Countdown from '../../components/Countdown'
import { formatPrice } from '../../lib/movie'
import { loadPayment } from '../../lib/payment'

const UNPAYABLE = {
  paid: 'Đơn này đã được thanh toán.',
  cancelled: 'Đơn này đã bị hủy.',
  expired: 'Đơn đã hết hạn thanh toán, ghế đã được nhả.',
}

export default function Pay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading' }) // loading | ok | notfound | error
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState('') // '' | 'success' | 'failed'
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadPayment(id)
      .then((res) => !cancelled && setState({ status: 'ok', ...res }))
      .catch((err) => !cancelled && setState({ status: err.response?.status === 404 ? 'notfound' : 'error' }))
    return () => {
      cancelled = true
    }
  }, [id])

  if (state.status === 'loading') return <p className="p-8 text-center text-gray-500">Đang tải giao dịch...</p>
  if (state.status === 'notfound')
    return (
      <div className="p-8 text-center">
        <p className="mb-3 text-gray-600">Không tìm thấy giao dịch này.</p>
        <Link to="/my-tickets" className="font-semibold text-brand hover:underline">← Vé của tôi</Link>
      </div>
    )
  if (state.status === 'error') return <p className="p-8 text-center text-red-600">Không thể tải giao dịch</p>

  const { payment, booking } = state
  const resultPath = `/payment/result/${id}`
  if (payment.status !== 'pending') return <Navigate to={resultPath} replace />

  const confirm = async (result) => {
    setBusy(result)
    setError('')
    try {
      await api.post(`/payments/${id}/mock-confirm`, { result })
      navigate(resultPath, { replace: true })
    } catch (err) {
      // 409: đơn không còn thanh toán được (hết hạn, đã hủy...) -> trang kết quả sẽ giải thích
      if (err.response?.status === 409) return navigate(resultPath, { replace: true })
      setError(err.response?.data?.message || 'Không thể xử lý thanh toán')
      setBusy('')
    }
  }

  const payable = booking.canPay && !over

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="flex items-center justify-between bg-[#231f20] px-6 py-4 text-white">
          <h1 className="text-lg font-bold">Cổng thanh toán</h1>
          <span className="rounded bg-amber-400 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-black">Sandbox</span>
        </div>

        <div className="space-y-5 p-6">
          <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Đây là cổng thanh toán giả lập để thử nghiệm, không có khoản tiền thật nào bị trừ.
          </p>

          <div className="text-center">
            <p className="text-sm text-gray-500">Số tiền cần thanh toán</p>
            <p className="text-3xl font-extrabold text-brand">{formatPrice(payment.amount)}</p>
            <p className="mt-1 font-mono text-xs text-gray-400">Mã giao dịch: {payment.txnRef}</p>
          </div>

          <BookingSummary booking={booking} />

          {payable ? (
            <>
              <p className="text-center text-sm text-gray-600">
                Ghế được giữ trong <Countdown expiresAt={booking.expiresAt} onExpire={() => setOver(true)} />
              </p>
              {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              <div className="space-y-2">
                <button
                  onClick={() => confirm('success')}
                  disabled={!!busy}
                  className="h-12 w-full rounded bg-green-600 font-bold text-white transition hover:bg-green-700 disabled:opacity-60"
                >
                  {busy === 'success' ? 'Đang xử lý...' : 'Giả lập: thanh toán thành công'}
                </button>
                <button
                  onClick={() => confirm('failed')}
                  disabled={!!busy}
                  className="h-12 w-full rounded border border-red-300 font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {busy === 'failed' ? 'Đang xử lý...' : 'Giả lập: thanh toán thất bại'}
                </button>
              </div>
              <Link to="/my-tickets" className="block text-center text-sm text-gray-500 hover:text-brand">
                Để sau, quay lại vé của tôi
              </Link>
            </>
          ) : (
            <div className="rounded bg-gray-50 p-4 text-center text-sm text-gray-600">
              <p className="mb-2">{UNPAYABLE[booking.paymentStatus] ?? 'Đơn đã hết hạn thanh toán, ghế đã được nhả.'}</p>
              <Link to="/my-tickets" className="font-semibold text-brand hover:underline">Về vé của tôi</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
