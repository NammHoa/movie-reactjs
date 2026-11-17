import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../api/axios'
import Countdown from '../../components/Countdown'
import PayButton from '../../components/PayButton'
import { useAuth } from '../../context/AuthContext'
import { formatDateTime, formatPrice } from '../../lib/movie'

const MAX_SEATS = 8

function Seat({ seat, selected, disabled, onToggle }) {
  const base = 'h-[30px] w-[30px] rounded-t-lg text-[11px] font-semibold transition sm:h-9 sm:w-9'
  const style = seat.booked
    ? 'cursor-not-allowed bg-gray-300 text-gray-400'
    : selected
      ? 'bg-brand text-white shadow'
      : 'border border-gray-300 bg-white text-gray-700 hover:border-brand hover:text-brand'
  return (
    <button
      type="button"
      disabled={seat.booked || disabled}
      aria-label={`Ghế ${seat.code}${seat.booked ? ' (đã đặt)' : ''}`}
      aria-pressed={selected}
      onClick={() => onToggle(seat.code)}
      className={`${base} ${style}`}
    >
      {seat.number}
    </button>
  )
}

function Legend() {
  const item = (cls, label) => (
    <span className="flex items-center gap-2 text-sm text-gray-600">
      <span className={`inline-block h-5 w-5 rounded-t-md ${cls}`} />
      {label}
    </span>
  )
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
      {item('border border-gray-300 bg-white', 'Ghế trống')}
      {item('bg-brand', 'Ghế đang chọn')}
      {item('bg-gray-300', 'Đã có người đặt')}
    </div>
  )
}

export default function Booking() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ok | notfound | error
  const [selected, setSelected] = useState([])
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState(null) // đơn vừa giữ ghế, chờ thanh toán
  const [holdOver, setHoldOver] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/showtimes/${id}/seats`)
      setData(res.data)
      setStatus('ok')
      return res.data
    } catch (err) {
      setStatus(err.response?.status === 404 ? 'notfound' : 'error')
      return null
    }
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const toggle = (code) => {
    setError('')
    setSelected((cur) => {
      if (cur.includes(code)) {
        setNotice('')
        return cur.filter((c) => c !== code)
      }
      if (cur.length >= MAX_SEATS) {
        setNotice(`Chỉ được chọn tối đa ${MAX_SEATS} ghế mỗi lần`)
        return cur
      }
      setNotice('')
      return [...cur, code]
    })
  }

  const submit = async () => {
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/bookings', { showtime: id, seats: selected })
      setBooking(res.data)
      setHoldOver(false)
      setSelected([])
      load()
    } catch (err) {
      const body = err.response?.data
      setError(body?.message || 'Không thể đặt vé, vui lòng thử lại')
      if (err.response?.status === 409) {
        // Có người nhanh tay hơn: cập nhật sơ đồ và bỏ các ghế vừa hết
        await load()
        setSelected((cur) => cur.filter((c) => !body?.taken?.includes(c)))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') return <p className="p-8 text-center text-gray-500">Đang tải sơ đồ ghế...</p>
  if (status === 'notfound')
    return (
      <div className="p-8 text-center">
        <p className="mb-3 text-gray-600">Không tìm thấy suất chiếu này.</p>
        <Link to="/" className="font-semibold text-brand hover:underline">← Về trang chủ</Link>
      </div>
    )
  if (status === 'error') return <p className="p-8 text-center text-red-600">Không thể tải sơ đồ ghế</p>

  const { showtime, closed, seatMap, available } = data

  // ---- Đặt vé thành công ----
  if (booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="bg-green-600 px-6 py-5 text-center text-white">
            <p className="text-3xl">✓</p>
            <h1 className="text-xl font-bold">Đã giữ ghế cho bạn</h1>
          </div>
          <div className="space-y-4 p-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Mã đặt vé</p>
              <p className="text-3xl font-extrabold tracking-widest text-brand">{booking.code}</p>
            </div>
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
              <dt className="text-gray-500">Phim</dt>
              <dd className="font-semibold">{booking.showtime.movie.title}</dd>
              <dt className="text-gray-500">Rạp</dt>
              <dd>{booking.showtime.room.cinema.name} — {booking.showtime.room.name}</dd>
              <dt className="text-gray-500">Suất chiếu</dt>
              <dd>{formatDateTime(booking.showtime.startTime)}</dd>
              <dt className="text-gray-500">Ghế</dt>
              <dd className="font-semibold">{booking.seats.join(', ')}</dd>
              <dt className="text-gray-500">Tổng tiền</dt>
              <dd className="font-bold text-brand">{formatPrice(booking.totalPrice)}</dd>
              <dt className="text-gray-500">Trạng thái</dt>
              <dd>
                {holdOver ? (
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">Hết hạn thanh toán</span>
                ) : (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Chờ thanh toán</span>
                )}
              </dd>
            </dl>
            {holdOver ? (
              <p className="rounded bg-red-50 p-3 text-center text-sm text-red-600">
                Đã hết thời gian giữ ghế. Ghế đã được nhả, vui lòng đặt lại.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-sm text-gray-600">
                  Vui lòng thanh toán trong <Countdown expiresAt={booking.expiresAt} onExpire={() => setHoldOver(true)} />, sau đó ghế sẽ được nhả cho người khác.
                </p>
                <PayButton bookingId={booking._id}>Thanh toán {formatPrice(booking.totalPrice)}</PayButton>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setBooking(null)} className="flex-1 rounded border border-gray-300 py-2.5 text-sm font-semibold hover:bg-gray-50">
                Đặt thêm vé
              </button>
              <Link to="/my-tickets" className="flex-1 rounded bg-brand py-2.5 text-center text-sm font-bold text-white hover:bg-brand-dark">
                Xem vé của tôi
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const total = selected.length * showtime.price
  const sorted = [...selected].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to={`/movies/${showtime.movie._id}`} className="text-sm text-gray-500 hover:text-brand">← Quay lại phim</Link>
      <h1 className="mt-2 border-l-4 border-brand pl-3 text-2xl font-bold">Chọn ghế</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0 rounded-lg bg-white p-3 shadow-sm sm:p-6">
          {closed && (
            <p className="mb-4 rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">Suất chiếu này đã bắt đầu, không thể đặt vé.</p>
          )}
          <div className="overflow-x-auto pb-2">
            <div className="mx-auto w-fit">
              <div className="mx-auto mb-1 h-2 w-3/4 rounded-t-full bg-gray-300" />
              <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">Màn hình</p>
              {seatMap.map((row) => (
                <div key={row.row} className="mb-2 flex items-center justify-center gap-1.5 sm:gap-2">
                  <span className="w-4 text-center text-xs font-bold text-gray-400 sm:w-5">{row.row}</span>
                  <div className="flex gap-1 sm:gap-1.5">
                    {row.seats.map((seat) => (
                      <Seat key={seat.code} seat={seat} selected={selected.includes(seat.code)} disabled={closed} onToggle={toggle} />
                    ))}
                  </div>
                  <span className="w-4 text-center text-xs font-bold text-gray-400 sm:w-5">{row.row}</span>
                </div>
              ))}
            </div>
          </div>
          <Legend />
          <p className="mt-4 text-center text-xs text-gray-400">Còn {available} ghế trống</p>
        </section>

        <aside className="h-fit min-w-0 rounded-lg bg-white p-5 shadow-sm lg:sticky lg:top-4">
          <h2 className="text-lg font-bold">{showtime.movie.title}</h2>
          <p className="mt-1 text-sm text-gray-500">{showtime.room.cinema.name} — {showtime.room.name}</p>
          <p className="text-sm text-gray-500">{formatDateTime(showtime.startTime)}</p>

          <div className="my-4 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Ghế đã chọn</span>
              <span className="max-w-[60%] text-right font-semibold">{sorted.length ? sorted.join(', ') : '—'}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-gray-500">Giá mỗi ghế</span>
              <span>{formatPrice(showtime.price)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t pt-3 text-base">
              <span className="font-semibold">Tổng tiền</span>
              <span className="font-bold text-brand">{formatPrice(total)}</span>
            </div>
          </div>

          {notice && <p className="mb-3 text-sm text-amber-600">{notice}</p>}
          {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          {user ? (
            <button
              onClick={submit}
              disabled={selected.length === 0 || submitting || closed}
              className="h-12 w-full rounded bg-brand font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              {submitting ? 'Đang xử lý...' : 'Đặt vé'}
            </button>
          ) : (
            <button
              onClick={() => navigate('/login', { state: { from: `/booking/${id}` } })}
              className="h-12 w-full rounded bg-[#231f20] font-bold text-[#e3d9a5] hover:bg-black"
            >
              Đăng nhập để đặt vé
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}
