const Showtime = require('../models/Showtime')
const Booking = require('../models/Booking')
const Movie = require('../models/Movie')
const Room = require('../models/Room')
const { str, isId, wrap } = require('../utils/http')
const { buildSeatMap } = require('../utils/seats')

const GAP_MS = 15 * 60 * 1000 // nghỉ 15 phút giữa 2 suất (dọn phòng)
const DAY_MS = 24 * 60 * 60 * 1000
const NOT_FOUND = { message: 'Không tìm thấy suất chiếu' }

const POPULATE = [
  { path: 'movie', select: 'title poster duration status' },
  { path: 'room', select: 'name rows seatsPerRow cinema', populate: { path: 'cinema', select: 'name city address' } },
]

const fmtVN = (d) =>
  d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })

// GET /api/showtimes?movie=&cinema=&room=&date=YYYY-MM-DD&includePast=1
exports.list = wrap(async (req, res) => {
  const filter = {}
  if (isId(req.query.movie)) filter.movie = req.query.movie
  if (isId(req.query.room)) filter.room = req.query.room
  if (isId(req.query.cinema)) {
    filter.room = { $in: await Room.find({ cinema: req.query.cinema }).distinct('_id') }
    if (isId(req.query.room)) filter.room = req.query.room
  }

  const time = {}
  if (req.query.includePast !== '1') time.$gte = new Date()
  const date = str(req.query.date)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const start = new Date(`${date}T00:00:00+07:00`) // ngày theo giờ Việt Nam
    if (!isNaN(start)) {
      time.$gte = time.$gte && time.$gte > start ? time.$gte : start
      time.$lt = new Date(start.getTime() + DAY_MS)
    }
  }
  if (Object.keys(time).length) filter.startTime = time

  res.json(await Showtime.find(filter).populate(POPULATE).sort({ startTime: 1 }).limit(500))
})

exports.getOne = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const st = await Showtime.findById(req.params.id).populate(POPULATE)
  if (!st) return res.status(404).json(NOT_FOUND)
  res.json(st)
})

// GET /api/showtimes/:id/seats -> sơ đồ ghế và trạng thái từng ghế của suất chiếu
exports.seats = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const st = await Showtime.findById(req.params.id).populate(POPULATE)
  if (!st || !st.room || !st.movie) return res.status(404).json(NOT_FOUND)

  const { rows, seatsPerRow } = st.room
  const total = rows * seatsPerRow
  res.json({
    showtime: {
      _id: st._id,
      movie: { _id: st.movie._id, title: st.movie.title, poster: st.movie.poster, duration: st.movie.duration },
      room: { _id: st.room._id, name: st.room.name, cinema: st.room.cinema },
      startTime: st.startTime,
      endTime: st.endTime,
      price: st.price,
    },
    closed: st.startTime <= new Date(), // suất đã bắt đầu: không đặt vé được nữa
    total,
    booked: st.bookedSeats.length,
    available: total - st.bookedSeats.length,
    seatMap: buildSeatMap(rows, seatsPerRow, st.bookedSeats),
  })
})

// Trả về lỗi (chuỗi) nếu trùng lịch với suất khác trong cùng phòng
async function findOverlap(room, start, end, ignoreId) {
  const filter = {
    room,
    startTime: { $lt: new Date(end.getTime() + GAP_MS) },
    endTime: { $gt: new Date(start.getTime() - GAP_MS) },
  }
  if (ignoreId) filter._id = { $ne: ignoreId }
  const other = await Showtime.findOne(filter).populate('movie', 'title')
  if (!other) return null
  return `Trùng lịch với suất "${other.movie?.title}" (${fmtVN(other.startTime)} – ${fmtVN(other.endTime)}). Cần cách nhau ít nhất 15 phút.`
}

const validPrice = (p) => Number.isInteger(p) && p > 0 && p <= 5_000_000

exports.create = wrap(async (req, res) => {
  const { movie: movieId, room: roomId } = req.body
  const price = Number(req.body.price)
  const start = new Date(req.body.startTime)

  if (!isId(movieId)) return res.status(400).json({ message: 'Vui lòng chọn phim' })
  if (!isId(roomId)) return res.status(400).json({ message: 'Vui lòng chọn phòng chiếu' })
  if (isNaN(start)) return res.status(400).json({ message: 'Giờ chiếu không hợp lệ' })
  if (start <= new Date()) return res.status(400).json({ message: 'Giờ chiếu phải ở tương lai' })
  if (!validPrice(price)) return res.status(400).json({ message: 'Giá vé phải là số nguyên từ 1 đến 5.000.000 VND' })

  const [movie, room] = await Promise.all([Movie.findById(movieId), Room.exists({ _id: roomId })])
  if (!movie) return res.status(400).json({ message: 'Phim không tồn tại' })
  if (movie.status === 'ended') return res.status(400).json({ message: 'Phim đã ngừng chiếu' })
  if (!room) return res.status(400).json({ message: 'Phòng chiếu không tồn tại' })

  const end = new Date(start.getTime() + movie.duration * 60000)
  const conflict = await findOverlap(roomId, start, end)
  if (conflict) return res.status(409).json({ message: conflict })

  const st = await Showtime.create({ movie: movieId, room: roomId, startTime: start, endTime: end, price })
  res.status(201).json(await st.populate(POPULATE))
})

exports.update = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const st = await Showtime.findById(req.params.id)
  if (!st) return res.status(404).json(NOT_FOUND)

  const b = req.body
  const movieId = b.movie !== undefined ? b.movie : st.movie.toString()
  const roomId = b.room !== undefined ? b.room : st.room.toString()
  const start = b.startTime !== undefined ? new Date(b.startTime) : st.startTime
  const price = b.price !== undefined ? Number(b.price) : st.price

  if (!isId(movieId)) return res.status(400).json({ message: 'Phim không hợp lệ' })
  if (!isId(roomId)) return res.status(400).json({ message: 'Phòng chiếu không hợp lệ' })
  if (isNaN(start)) return res.status(400).json({ message: 'Giờ chiếu không hợp lệ' })
  if (!validPrice(price)) return res.status(400).json({ message: 'Giá vé phải là số nguyên từ 1 đến 5.000.000 VND' })

  const scheduleChanged =
    movieId !== st.movie.toString() || roomId !== st.room.toString() || start.getTime() !== st.startTime.getTime()
  if (scheduleChanged && st.bookedSeats.length > 0) {
    return res.status(409).json({ message: 'Suất chiếu đã có người đặt vé, chỉ được đổi giá vé' })
  }
  if (scheduleChanged && start <= new Date()) {
    return res.status(400).json({ message: 'Giờ chiếu phải ở tương lai' })
  }

  const [movie, room] = await Promise.all([Movie.findById(movieId), Room.exists({ _id: roomId })])
  if (!movie) return res.status(400).json({ message: 'Phim không tồn tại' })
  if (!room) return res.status(400).json({ message: 'Phòng chiếu không tồn tại' })

  const end = new Date(start.getTime() + movie.duration * 60000)
  if (scheduleChanged) {
    const conflict = await findOverlap(roomId, start, end, st._id)
    if (conflict) return res.status(409).json({ message: conflict })
  }

  Object.assign(st, { movie: movieId, room: roomId, startTime: start, endTime: end, price })
  await st.save()
  res.json(await st.populate(POPULATE))
})

exports.remove = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const st = await Showtime.findById(req.params.id)
  if (!st) return res.status(404).json(NOT_FOUND)
  if (st.bookedSeats.length > 0) {
    return res.status(409).json({ message: 'Suất chiếu đã có người đặt vé, không thể xóa' })
  }
  // Còn lịch sử đơn (kể cả đơn đã hủy) thì giữ lại suất chiếu để "Vé của tôi" vẫn hiển thị được
  if (await Booking.exists({ showtime: st._id })) {
    return res.status(409).json({ message: 'Suất chiếu đã có đơn đặt vé (kể cả đơn đã hủy), không thể xóa' })
  }
  await st.deleteOne()
  res.json({ message: 'Đã xóa suất chiếu' })
})
