import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import api from '../../api/axios'
import { Poster } from '../../components/MovieCard'
import RefundButton, { RefundInfo } from '../../components/RefundButton'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../lib/errors'
import { formatDateTime, formatPrice } from '../../lib/movie'

export default function Ticket() {
  const { id } = useParams()
  const { user } = useAuth()
  const [state, setState] = useState({ status: 'loading' }) // loading | ok | notfound | error
  const [now] = useState(() => Date.now())
  const [mail, setMail] = useState({ busy: false, sentAt: null, error: '' })
  const [refundNotice, setRefundNotice] = useState('')

  const sendEmail = async () => {
    setMail((m) => ({ ...m, busy: true, error: '' }))
    try {
      const { data } = await api.post(`/bookings/${id}/email`)
      setMail({ busy: false, sentAt: data.emailSentAt, error: '' })
    } catch (err) {
      setMail((m) => ({ ...m, busy: false, error: errorMessage(err, 'Chưa gửi được email, vui lòng thử lại sau') }))
    }
  }

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

  if (booking.paymentStatus === 'refunding' || booking.paymentStatus === 'refunded') {
    return (
      <div className="mx-auto max-w-lg space-y-3 px-4 py-10 text-center">
        {refundNotice && <p role="status" className="rounded bg-green-50 p-4 text-sm text-green-700">{refundNotice}</p>}
        <p className="rounded bg-gray-100 p-4 text-sm text-gray-700">
          Vé này đã được hủy nên không còn dùng được để vào rạp. Mã vé: <span className="font-mono font-bold tracking-widest">{booking.code}</span>
        </p>
        <RefundInfo refund={booking.refund} />
        <Link to="/my-tickets" className="inline-block pt-2 font-semibold text-brand hover:underline">← Vé của tôi</Link>
      </div>
    )
  }

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

  const checkedIn = !!booking.checkedInAt
  const ended = !!showtime && new Date(showtime.endTime).getTime() <= now
  const dimmed = checkedIn || ended
  const cinema = showtime?.room?.cinema
  const sentAt = mail.sentAt ?? booking.emailSentAt

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
            {booking.discount > 0 && (
              <dd className="text-xs text-green-700">Đã giảm {formatPrice(booking.discount)} ({booking.couponCode})</dd>
            )}
          </div>
        </dl>

        <div className="relative border-t-2 border-dashed border-gray-200 px-5 pb-6 pt-5 text-center">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-gray-50" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-gray-50" />
          <div className={`mx-auto w-fit rounded-lg border border-gray-200 p-3 ${dimmed ? 'opacity-30' : ''}`}>
            <QRCodeSVG value={booking.code} size={168} level="M" />
          </div>
          <p className="mt-3 font-mono text-2xl font-extrabold tracking-widest">{booking.code}</p>
          {checkedIn ? (
            <p role="status" className="mt-2 rounded bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-600">
              Vé đã được sử dụng lúc {formatDateTime(booking.checkedInAt)}
            </p>
          ) : ended ? (
            <p className="mt-2 rounded bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-600">Suất chiếu đã kết thúc, vé hết hiệu lực</p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">Đưa mã QR này cho nhân viên rạp để vào phòng chiếu</p>
          )}
        </div>
      </div>

      {booking.emailEnabled && !dimmed && (
        <div className="mt-4 rounded-2xl bg-white p-4 text-center text-sm shadow">
          <p className="break-words text-gray-600">
            {sentAt ? `Đã gửi vé tới ${user?.email ?? 'email của bạn'} lúc ${formatDateTime(sentAt)}` : 'Nhận vé này qua email để xem lại khi không có mạng.'}
          </p>
          {mail.error && (
            <p role="alert" className="mt-2 rounded bg-red-50 px-3 py-2 text-red-600">
              {mail.error}
            </p>
          )}
          <button
            onClick={sendEmail}
            disabled={mail.busy}
            className="mt-3 h-11 w-full rounded border border-brand font-semibold text-brand transition hover:bg-red-50 disabled:opacity-60"
          >
            {mail.busy ? 'Đang gửi...' : sentAt ? 'Gửi lại email' : 'Gửi vé về email'}
          </button>
        </div>
      )}

      {!checkedIn && (
        <div className="mt-4 rounded-2xl bg-white p-4 text-center text-sm shadow empty:hidden">
          <RefundButton booking={booking} now={now} onDone={(updated, message) => { setRefundNotice(message); setState({ status: 'ok', booking: updated }) }} />
        </div>
      )}

      <Link to="/my-tickets" className="mt-5 block text-center text-sm text-gray-500 hover:text-brand">← Vé của tôi</Link>
    </div>
  )
}
