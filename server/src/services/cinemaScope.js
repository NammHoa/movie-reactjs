const Room = require('../models/Room')
const Showtime = require('../models/Showtime')

// Phạm vi dữ liệu của nhân viên: null nghĩa là mọi rạp và CHỈ dành cho trụ sở.
// Người khác mà không có rạp thì ném lỗi, để thiếu dữ liệu không bao giờ biến thành "mọi rạp".
function scopeOf(user) {
  if (user.role === 'admin') return null
  if (!user.cinema) throw new Error('Tài khoản không có phạm vi rạp')
  return user.cinema
}

const roomIdsOf = (cinemaId) => Room.find({ cinema: cinemaId }).distinct('_id')
const showtimeIdsOf = async (cinemaId) => Showtime.find({ room: { $in: await roomIdsOf(cinemaId) } }).distinct('_id')

const roomInCinema = async (roomId, cinemaId) => !!(await Room.exists({ _id: roomId, cinema: cinemaId }))

async function showtimeInCinema(showtimeId, cinemaId) {
  const showtime = await Showtime.findById(showtimeId).select('room').lean()
  return !!showtime && roomInCinema(showtime.room, cinemaId)
}

module.exports = { scopeOf, roomIdsOf, showtimeIdsOf, roomInCinema, showtimeInCinema }
