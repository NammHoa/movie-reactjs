import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import api from '../../api/axios'
import { Poster } from '../../components/MovieCard'
import { formatDateTime, formatPrice } from '../../lib/movie'

export default function Ticket() {
  const { id } = useParams()
  const [state, setState] = useState({ status: 'loading' }) // loading | ok | notfound | error
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    api
      .get(`/bookings/${id}`)
      .then(({ data }) => !cancelled && setState({ status: 'ok', booking: data }))
      .catch((err) => !cancelled && setState({ status: err.response?.status === 404 ? 'notfound' : 'error' }))
    return () => {
      cancelled = true
    }
  }, [id])

  if (state.status === 'loading') return <p className="p-8 text-center text-gray-500">Đang tải vé...</p>
  if (state.status === 'notfound')
    return (
      <div className="p-8 text-center">
        <p className="mb-3 text-gray-600">Không tìm thấy vé này.</p>
        <Link to="/my-tickets" className="font-semibold text-brand hover:underline">← Vé của tôi</Link>
      </div>
    )
  if (state.status === 'error') return <p className="p-8 text-center text-red-600">Không thể tải vé</p>

  const { booking } = state
  const { showtime } = booking

  if (booking.paymentStatus !== 'paid') {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <p className="mb-3 rounded bg-amber-50 p-4 text-sm text-amber-700">
          Vé điện tử chỉ có sau khi thanh toán thành công.
        </p>
        <Link to="/my-tickets" className="font-semibold text-brand hover:underline">← Vé của tôi</Link>
      </div>
    )
  }

  const used = !!showtime && new Date(showtime.endTime).getTime() <= now
  const cinema = showtime?.room?.cinema

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="flex gap-4 bg-[#231f20] p-5 text-white">
          <Poster src={showtime?.movie?.poster} alt="" className="h-24 w-16 shrink-0 rounded" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#e3d9a5]">Vé điện tử</p>
            <h1 className="mt-1 text-xl font-bold leading-tight">{showtime?.movie?.title ?? 'Phim không còn tồn tại'}</h1>
            <p className="mt-1 text-sm text-gray-300">{cinema ? `${cinema.name} — ${showtime.room.name}` : '—'}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 text-sm">
          <div className="col-span-2">
            <dt className="text-gray-500">Suất chiếu</dt>
            <dd className="font-semibold">{showtime ? formatDateTime(showtime.startTime) : '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Ghế</dt>
            <dd className="font-bold text-brand">{booking.seats.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Tổng tiền</dt>
            <dd className="font-semibold">{formatPrice(booking.totalPrice)}</dd>
          </div>
        </dl>

        <div className="relative border-t-2 border-dashed border-gray-200 px-5 pb-6 pt-5 text-center">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-gray-50" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-gray-50" />
          <div className={`mx-auto w-fit rounded-lg border border-gray-200 p-3 ${used ? 'opacity-30' : ''}`}>
            <QRCodeSVG value={booking.code} size={168} level="M" />
          </div>
          <p className="mt-3 font-mono text-2xl font-extrabold tracking-widest">{booking.code}</p>
          {used ? (
            <p className="mt-2 rounded bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-600">Suất chiếu đã kết thúc, vé hết hiệu lực</p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">Đưa mã QR này cho nhân viên rạp để vào phòng chiếu</p>
          )}
        </div>
      </div>

      <Link to="/my-tickets" className="mt-5 block text-center text-sm text-gray-500 hover:text-brand">← Vé của tôi</Link>
    </div>
  )
}
