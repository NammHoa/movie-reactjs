import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import Countdown from '../../components/Countdown'
import { Poster } from '../../components/MovieCard'
import PayButton from '../../components/PayButton'
import { errorMessage } from '../../lib/errors'
import { formatDateTime, formatPrice } from '../../lib/movie'

const TABS = [
  { value: 'upcoming', label: 'Sắp tới' },
  { value: 'history', label: 'Lịch sử' },
]

// Hết hạn giữ ghế: server đã đánh dấu 'expired', hoặc đã quá hạn nhưng chưa tới lượt dọn (mỗi 30s)
const isLapsed = (b, now) =>
  b.paymentStatus === 'expired' || (b.paymentStatus === 'pending' && new Date(b.expiresAt).getTime() <= now)

function statusOf(b, now) {
  if (b.paymentStatus === 'cancelled') return { label: 'Đã hủy', cls: 'bg-gray-200 text-gray-600' }
  if (b.paymentStatus === 'paid') {
    if (b.checkedInAt) return { label: 'Đã sử dụng', cls: 'bg-gray-200 text-gray-600' }
    // Đã trả tiền nhưng không đến xem: suất đã kết thúc thì vé không còn dùng được
    if (b.showtime && new Date(b.showtime.endTime).getTime() <= now) return { label: 'Đã hết hạn', cls: 'bg-gray-200 text-gray-600' }
    return { label: 'Đã thanh toán', cls: 'bg-green-100 text-green-700' }
  }
  if (isLapsed(b, now)) return { label: 'Hết hạn thanh toán', cls: 'bg-gray-200 text-gray-600' }
  if (!b.showtime || new Date(b.showtime.startTime).getTime() <= now) {
    return { label: 'Đã qua suất chiếu', cls: 'bg-gray-200 text-gray-600' }
  }
  return { label: 'Chờ thanh toán', cls: 'bg-amber-100 text-amber-700' }
}

// Vé đã quét ở cửa rạp thì thuộc về lịch sử
const isUpcoming = (b, now) =>
  b.paymentStatus !== 'cancelled' && !b.checkedInAt && !isLapsed(b, now) && !!b.showtime && new Date(b.showtime.endTime).getTime() > now

function TicketCard({ booking, now, onCancel, onExpire, busy }) {
  const { showtime } = booking
  const status = statusOf(booking, now)
  const cinema = showtime?.room?.cinema
  const payable = booking.canPay && !isLapsed(booking, now)

  return (
    <article className="flex gap-4 rounded-lg bg-white p-4 shadow-sm">
      <Poster src={showtime?.movie?.poster} alt="" className="h-28 w-20 shrink-0 rounded" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-lg font-bold leading-tight">{showtime?.movie?.title ?? 'Phim không còn tồn tại'}</h3>
          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${status.cls}`}>{status.label}</span>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {cinema ? `${cinema.name} — ${showtime.room.name}` : '—'}
        </p>
        <p className="text-sm text-gray-600">{showtime ? formatDateTime(showtime.startTime) : '—'}</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-gray-500">Ghế</dt>
          <dd className="font-semibold">{booking.seats.join(', ')}</dd>
          {booking.discount > 0 && (
            <>
              <dt className="text-gray-500">Giảm giá</dt>
              <dd className="text-green-700">−{formatPrice(booking.discount)} <span className="font-mono text-xs">({booking.couponCode})</span></dd>
            </>
          )}
          <dt className="text-gray-500">Tổng tiền</dt>
          <dd className="font-bold text-brand">{formatPrice(booking.totalPrice)}</dd>
          <dt className="text-gray-500">Mã vé</dt>
          <dd className="font-mono tracking-widest">{booking.code}</dd>
        </dl>
        {payable && (
          <p className="mt-3 text-sm text-gray-600">
            Thanh toán trong <Countdown expiresAt={booking.expiresAt} onExpire={onExpire} />
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {payable && (
            <PayButton bookingId={booking._id} className="h-9 text-sm">
              Thanh toán
            </PayButton>
          )}
          {booking.paymentStatus === 'paid' && (
            <Link to={`/tickets/${booking._id}`} className="inline-flex h-9 items-center rounded bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark">
              Xem vé điện tử
            </Link>
          )}
          {booking.canCancel && !isLapsed(booking, now) && (
            <button
              onClick={() => onCancel(booking)}
              disabled={busy}
              className="h-9 rounded border border-red-300 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              {busy ? 'Đang hủy...' : 'Hủy vé'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default function MyTickets() {
  const [now, setNow] = useState(() => Date.now())
  const [bookings, setBookings] = useState(null)
  const [tab, setTab] = useState('upcoming')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .get('/bookings/mine')
      .then(({ data }) => !cancelled && setBookings(data))
      .catch(() => !cancelled && setError('Không thể tải danh sách vé'))
    return () => {
      cancelled = true
    }
  }, [])

  const cancel = async (b) => {
    const title = b.showtime?.movie?.title ?? 'phim này'
    if (!window.confirm(`Hủy vé "${title}" (ghế ${b.seats.join(', ')})? Ghế sẽ được trả lại cho người khác.`)) return
    setBusyId(b._id)
    setError('')
    try {
      const { data } = await api.post(`/bookings/${b._id}/cancel`)
      setBookings((list) => list.map((x) => (x._id === data._id ? data : x)))
    } catch (err) {
      setError(errorMessage(err, 'Không thể hủy vé'))
    } finally {
      setBusyId(null)
    }
  }

  const shown = (bookings ?? []).filter((b) => (tab === 'upcoming') === isUpcoming(b, now))

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 border-l-4 border-brand pl-3 text-2xl font-bold">Vé của tôi</h1>

      <div className="mb-6 flex gap-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`-mb-px border-b-2 px-1 pb-3 text-base font-bold transition ${
              tab === t.value ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {bookings === null && !error && <p className="text-gray-500">Đang tải...</p>}

      {bookings !== null && shown.length === 0 && (
        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">
            {tab === 'upcoming' ? 'Bạn chưa có vé nào sắp tới.' : 'Chưa có vé nào trong lịch sử.'}
          </p>
          {tab === 'upcoming' && (
            <Link to="/" className="mt-3 inline-block font-semibold text-brand hover:underline">Đặt vé ngay →</Link>
          )}
        </div>
      )}

      <div className="space-y-4">
        {shown.map((b) => (
          <TicketCard key={b._id} booking={b} now={now} onCancel={cancel} onExpire={() => setNow(Date.now())} busy={busyId === b._id} />
        ))}
      </div>
    </div>
  )
}
