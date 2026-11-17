import { formatDateTime, formatPrice } from '../lib/movie'

export default function BookingSummary({ booking }) {
  const { showtime } = booking
  const cinema = showtime?.room?.cinema
  return (
    <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
      <dt className="text-gray-500">Phim</dt>
      <dd className="font-semibold">{showtime?.movie?.title ?? '—'}</dd>
      <dt className="text-gray-500">Rạp</dt>
      <dd>{cinema ? `${cinema.name} — ${showtime.room.name}` : '—'}</dd>
      <dt className="text-gray-500">Suất chiếu</dt>
      <dd>{showtime ? formatDateTime(showtime.startTime) : '—'}</dd>
      <dt className="text-gray-500">Ghế</dt>
      <dd className="font-semibold">{booking.seats.join(', ')}</dd>
      <dt className="text-gray-500">Mã đặt vé</dt>
      <dd className="font-mono tracking-widest">{booking.code}</dd>
      <dt className="text-gray-500">Tổng tiền</dt>
      <dd className="font-bold text-brand">{formatPrice(booking.totalPrice)}</dd>
    </dl>
  )
}
