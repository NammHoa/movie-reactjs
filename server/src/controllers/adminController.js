const Booking = require('../models/Booking')
const Showtime = require('../models/Showtime')
const Movie = require('../models/Movie')
const User = require('../models/User')
const { wrap } = require('../utils/http')

const DAY_MS = 24 * 60 * 60 * 1000
const VN_OFFSET_MS = 7 * 60 * 60 * 1000 // Việt Nam UTC+7, không có giờ mùa hè
const VN_TZ = '+07:00'
const MAX_DAYS = 365
const STATUSES = ['pending', 'paid', 'cancelled', 'expired', 'refunding', 'refunded']
const TOP_MOVIES = 5

// "2026-11-17" theo ngày của Việt Nam
const vnDateKey = (date) => new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10)

// GET /api/admin/stats?days=30
// Doanh thu tính theo thời điểm THANH TOÁN (paidAt), gom theo ngày giờ Việt Nam, chỉ tính đơn đã thanh toán.
exports.stats = wrap(async (req, res) => {
  const raw = req.query.days ?? '30'
  const days = Number(raw)
  if (!/^\d{1,3}$/.test(String(raw)) || days < 1 || days > MAX_DAYS) {
    return res.status(400).json({ message: `Số ngày phải từ 1 đến ${MAX_DAYS}` })
  }

  const now = new Date()
  // 00:00 (giờ VN) của ngày đầu tiên trong khoảng, ví dụ days=7 là 6 ngày trước cho đến hôm nay
  const from = new Date(Date.parse(`${vnDateKey(now)}T00:00:00${VN_TZ}`) - (days - 1) * DAY_MS)
  const paidInRange = { paymentStatus: 'paid', paidAt: { $gte: from } }

  const [dailyRows, topMovies, statusRows, users, nowShowing, upcomingShowtimes] = await Promise.all([
    Booking.aggregate([
      { $match: paidInRange },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt', timezone: VN_TZ } },
          revenue: { $sum: '$totalPrice' },
          tickets: { $sum: { $size: '$seats' } },
          bookings: { $sum: 1 },
        },
      },
    ]),
    Booking.aggregate([
      { $match: paidInRange },
      { $group: { _id: '$showtime', tickets: { $sum: { $size: '$seats' } }, revenue: { $sum: '$totalPrice' } } },
      { $lookup: { from: Showtime.collection.name, localField: '_id', foreignField: '_id', as: 'showtime' } },
      { $unwind: '$showtime' },
      { $group: { _id: '$showtime.movie', tickets: { $sum: '$tickets' }, revenue: { $sum: '$revenue' } } },
      { $sort: { revenue: -1, tickets: -1 } },
      { $limit: TOP_MOVIES },
      { $lookup: { from: Movie.collection.name, localField: '_id', foreignField: '_id', as: 'movie' } },
      { $unwind: { path: '$movie', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          movieId: '$_id',
          title: { $ifNull: ['$movie.title', 'Phim đã bị xóa'] },
          poster: '$movie.poster',
          tickets: 1,
          revenue: 1,
        },
      },
    ]),
    Booking.aggregate([{ $group: { _id: '$paymentStatus', count: { $sum: 1 } } }]),
    User.countDocuments(),
    Movie.countDocuments({ status: 'now_showing' }),
    Showtime.countDocuments({ startTime: { $gt: now } }),
  ])

  // Mỗi ngày trong khoảng đều có một dòng (ngày không bán được gì = 0) để biểu đồ liền mạch
  const byDay = new Map(dailyRows.map((r) => [r._id, r]))
  const daily = Array.from({ length: days }, (_, i) => {
    const date = vnDateKey(new Date(from.getTime() + i * DAY_MS))
    const row = byDay.get(date)
    return { date, revenue: row?.revenue ?? 0, tickets: row?.tickets ?? 0, bookings: row?.bookings ?? 0 }
  })

  const status = Object.fromEntries(STATUSES.map((s) => [s, 0]))
  for (const row of statusRows) status[row._id] = row.count

  res.json({
    range: { days, from, to: now, timezone: 'Asia/Ho_Chi_Minh' },
    summary: {
      revenue: daily.reduce((sum, d) => sum + d.revenue, 0),
      tickets: daily.reduce((sum, d) => sum + d.tickets, 0),
      paidBookings: daily.reduce((sum, d) => sum + d.bookings, 0),
    },
    daily,
    topMovies,
    status,
    counts: { users, nowShowing, upcomingShowtimes },
  })
})
