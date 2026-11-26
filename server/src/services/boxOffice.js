const Booking = require('../models/Booking')
const Movie = require('../models/Movie')
const Showtime = require('../models/Showtime')

const BOX_OFFICE_SIZE = 7
const WINDOW_MS = 168 * 3600e3
const CACHE_MS = 60e3

// Phim chưa có ngày khởi chiếu xếp sau mọi phim có ngày
const releaseTime = (m) => (m.releaseDate ? new Date(m.releaseDate).getTime() : Number.MIN_SAFE_INTEGER)

// Nhiều vé đứng trên; bằng vé thì khởi chiếu mới hơn đứng trên, cuối cùng xếp theo tên
function rankMovies(movies, sold, limit) {
  const tickets = (m) => sold.get(String(m._id)) ?? 0
  return [...movies]
    .sort((a, b) => tickets(b) - tickets(a) || releaseTime(b) - releaseTime(a) || a.title.localeCompare(b.title, 'vi'))
    .slice(0, limit)
}

// Số ghế đã bán của từng phim, tính theo đơn đang ở trạng thái đã thanh toán, trả tiền từ mốc `since`
async function ticketsSold(since) {
  const rows = await Booking.aggregate([
    { $match: { paymentStatus: 'paid', paidAt: { $gte: since } } },
    { $lookup: { from: Showtime.collection.name, localField: 'showtime', foreignField: '_id', as: 'show' } },
    { $unwind: '$show' },
    { $group: { _id: '$show.movie', tickets: { $sum: { $size: '$seats' } } } },
  ])
  return new Map(rows.map((r) => [String(r._id), r.tickets]))
}

let cache = null // { at, rows }

// Chỉ trả thứ tự, không trả số vé (doanh số không công khai)
async function getBoxOffice(now = new Date()) {
  if (cache && now - cache.at >= 0 && now - cache.at < CACHE_MS) return cache.rows

  const [sold, movies] = await Promise.all([
    ticketsSold(new Date(now - WINDOW_MS)),
    Movie.find({ status: 'now_showing' }).select('title ageRating duration releaseDate').lean(),
  ])
  const rows = rankMovies(movies, sold, BOX_OFFICE_SIZE).map((m) => ({
    _id: m._id,
    title: m.title,
    ageRating: m.ageRating ?? '',
    duration: m.duration,
    releaseDate: m.releaseDate ?? null,
  }))
  cache = { at: now, rows }
  return rows
}

const clearBoxOfficeCache = () => {
  cache = null
}

module.exports = { BOX_OFFICE_SIZE, WINDOW_MS, CACHE_MS, rankMovies, getBoxOffice, clearBoxOfficeCache }
