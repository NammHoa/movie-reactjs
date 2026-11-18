// Cách nạp thông tin liên quan (khách, phim, rạp) của một đơn để hiển thị cho admin
const ADMIN_POPULATE = [
  { path: 'user', select: 'name email phone' },
  {
    path: 'showtime',
    select: 'movie room startTime endTime price',
    populate: [
      { path: 'movie', select: 'title' },
      { path: 'room', select: 'name cinema', populate: { path: 'cinema', select: 'name city' } },
    ],
  },
]

module.exports = { ADMIN_POPULATE }
