const mongoose = require('mongoose')
const Booking = require('../models/Booking')
const Movie = require('../models/Movie')
const Review = require('../models/Review')
const Showtime = require('../models/Showtime')

// Đã xem phim = có vé đã thanh toán của một suất chiếu phim này mà suất đó đã kết thúc.
// Không đòi đã quét vé, vì khách vẫn có thể xem mà không bị quét.
async function hasWatched(userId, movieId) {
  const ended = await Showtime.find({ movie: movieId, endTime: { $lte: new Date() } }).distinct('_id')
  if (!ended.length) return false
  return !!(await Booking.exists({ user: userId, paymentStatus: 'paid', showtime: { $in: ended } }))
}

// Tính lại từ dữ liệu gốc thay vì cộng/trừ dần, nên không bị lệch dù thêm, sửa hay xóa
async function refreshRating(movieId) {
  const [r] = await Review.aggregate([
    { $match: { movie: new mongoose.Types.ObjectId(String(movieId)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ])
  const ratingAvg = r ? Math.round(r.avg * 10) / 10 : 0
  const ratingCount = r ? r.n : 0
  await Movie.updateOne({ _id: movieId }, { ratingAvg, ratingCount })
  return { ratingAvg, ratingCount }
}

module.exports = { hasWatched, refreshRating }
