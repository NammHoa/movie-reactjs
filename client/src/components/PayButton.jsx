import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { errorMessage } from '../lib/errors'

export default function PayButton({ bookingId, children = 'Thanh toán', className = 'h-12 w-full' }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pay = async () => {
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/payments', { booking: bookingId })
      navigate(data.paymentUrl)
    } catch (err) {
      setError(errorMessage(err, 'Không thể tạo thanh toán, vui lòng thử lại'))
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        onClick={pay}
        disabled={busy}
        className={`rounded bg-brand px-4 font-bold text-white transition hover:bg-brand-dark disabled:opacity-60 ${className}`}
      >
        {busy ? 'Đang chuyển đến cổng thanh toán...' : children}
      </button>
      {error && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
