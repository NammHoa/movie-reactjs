const Cinema = require('../models/Cinema')
const Room = require('../models/Room')
const Showtime = require('../models/Showtime')
const { str, isId, wrap } = require('../utils/http')
const { releaseExpired } = require('../services/bookingExpiry')

const NOT_FOUND = { message: 'Không tìm thấy rạp' }

function clean(body, partial = false) {
  const data = {}
  if (!partial || body.name !== undefined) {
    data.name = str(body.name)
    if (!data.name) return { error: 'Vui lòng nhập tên rạp' }
  }
  if (body.address !== undefined) data.address = str(body.address)
  if (body.city !== undefined) data.city = str(body.city)
  return { data }
}

// GET /api/cinemas?withUpcoming=1: thêm số suất chiếu sắp tới của từng rạp (trang chọn rạp cần để biết rạp nào chưa có lịch)
exports.list = wrap(async (req, res) => {
  const cinemas = await Cinema.find().sort({ city: 1, name: 1 }).lean()
  if (req.query.withUpcoming !== '1') return res.json(cinemas)

  const [rooms, perRoom] = await Promise.all([
    Room.find().select('cinema').lean(),
    Showtime.aggregate([{ $match: { startTime: { $gte: new Date() } } }, { $group: { _id: '$room', n: { $sum: 1 } } }]),
  ])
  const cinemaOfRoom = new Map(rooms.map((r) => [String(r._id), String(r.cinema)]))
  const upcoming = new Map()
  for (const { _id, n } of perRoom) {
    const cinema = cinemaOfRoom.get(String(_id))
    if (cinema) upcoming.set(cinema, (upcoming.get(cinema) ?? 0) + n)
  }
  res.json(cinemas.map((c) => ({ ...c, upcomingShowtimes: upcoming.get(String(c._id)) ?? 0 })))
})

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_DATES = 30

// Ngày (YYYY-MM-DD) theo giờ Việt Nam, đúng với cách trang lịch chiếu và API suất chiếu đang tính ngày
const dayStart = (date) => new Date(`${date}T00:00:00+07:00`)

// Ngày có thật trên lịch: JavaScript tự dồn "2026-02-30" thành 02/03, nên phải so lại từng phần
function isRealDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const check = new Date(Date.UTC(y, m - 1, d))
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d
}

// GET /api/cinemas/:id/schedule?date=YYYY-MM-DD
// Trả về các ngày còn suất chiếu và, cho ngày được chọn (mặc định là ngày gần nhất), các phim kèm suất chiếu và số ghế trống.
exports.schedule = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const cinema = await Cinema.findById(req.params.id).lean()
  if (!cinema) return res.status(404).json(NOT_FOUND)

  const wanted = req.query.date
  if (wanted !== undefined && !isRealDate(wanted)) {
    return res.status(400).json({ message: 'Ngày không hợp lệ (định dạng YYYY-MM-DD)' })
  }

  const rooms = await Room.find({ cinema: cinema._id }).select('name rows seatsPerRow').lean()
  const roomIds = rooms.map((r) => r._id)
  const now = new Date()

  const dateRows = await Showtime.aggregate([
    { $match: { room: { $in: roomIds }, startTime: { $gte: now } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime', timezone: '+07:00' } } } },
    { $sort: { _id: 1 } },
    { $limit: MAX_DATES },
  ])
  const dates = dateRows.map((d) => d._id)
  const date = wanted ?? dates[0] ?? null

  let movies = []
  if (date) {
    const start = dayStart(date)
    const from = start > now ? start : now
    const showtimes = await Showtime.find({ room: { $in: roomIds }, startTime: { $gte: from, $lt: new Date(start.getTime() + DAY_MS) } })
      .populate('movie', 'title poster duration genres status ratingAvg ratingCount')
      .sort({ startTime: 1 })
      .lean()

    // Làm mới ghế giữ chỗ đã hết hạn để số ghế trống không bị thấp hơn thực tế
    if (showtimes.length) await releaseExpired({ showtime: { $in: showtimes.map((s) => s._id) } })
    const fresh = showtimes.length ? await Showtime.find({ _id: { $in: showtimes.map((s) => s._id) } }).select('bookedSeats').lean() : []
    const booked = new Map(fresh.map((s) => [String(s._id), s.bookedSeats.length]))
    const roomById = new Map(rooms.map((r) => [String(r._id), r]))

    const byMovie = new Map()
    for (const s of showtimes) {
      const room = roomById.get(String(s.room))
      if (!s.movie || !room) continue
      const total = room.rows * room.seatsPerRow
      const available = Math.max(0, total - (booked.get(String(s._id)) ?? s.bookedSeats.length))
      const entry = byMovie.get(String(s.movie._id)) ?? { movie: s.movie, showtimes: [] }
      entry.showtimes.push({
        _id: s._id,
        startTime: s.startTime,
        endTime: s.endTime,
        price: s.price,
        room: { _id: room._id, name: room.name },
        total,
        available,
        soldOut: available === 0,
      })
      byMovie.set(String(s.movie._id), entry)
    }
    movies = [...byMovie.values()]
  }

  res.json({ cinema: { _id: cinema._id, name: cinema.name, address: cinema.address, city: cinema.city }, dates, date, movies })
})

exports.create = wrap(async (req, res) => {
  const { data, error } = clean(req.body)
  if (error) return res.status(400).json({ message: error })
  res.status(201).json(await Cinema.create(data))
})

exports.update = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const { data, error } = clean(req.body, true)
  if (error) return res.status(400).json({ message: error })
  const cinema = await Cinema.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after' })
  if (!cinema) return res.status(404).json(NOT_FOUND)
  res.json(cinema)
})

exports.remove = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  if (await Room.exists({ cinema: req.params.id })) {
    return res.status(409).json({ message: 'Rạp còn phòng chiếu, hãy xóa các phòng trước' })
  }
  const cinema = await Cinema.findByIdAndDelete(req.params.id)
  if (!cinema) return res.status(404).json(NOT_FOUND)
  res.json({ message: 'Đã xóa rạp' })
})

// ---------- Phòng chiếu ----------
const ROOM_NOT_FOUND = { message: 'Không tìm thấy phòng chiếu' }

exports.listRooms = wrap(async (req, res) => {
  const filter = isId(req.query.cinema) ? { cinema: req.query.cinema } : {}
  res.json(await Room.find(filter).populate('cinema', 'name city').sort({ name: 1 }))
})

const intIn = (v, min, max) => Number.isInteger(v) && v >= min && v <= max

exports.createRoom = wrap(async (req, res) => {
  const name = str(req.body.name)
  const rows = req.body.rows === undefined ? 8 : Number(req.body.rows)
  const seatsPerRow = req.body.seatsPerRow === undefined ? 10 : Number(req.body.seatsPerRow)
  if (!isId(req.body.cinema) || !(await Cinema.exists({ _id: req.body.cinema }))) {
    return res.status(400).json({ message: 'Rạp không tồn tại' })
  }
  if (!name) return res.status(400).json({ message: 'Vui lòng nhập tên phòng' })
  if (!intIn(rows, 1, 26)) return res.status(400).json({ message: 'Số hàng ghế phải từ 1 đến 26' })
  if (!intIn(seatsPerRow, 1, 30)) return res.status(400).json({ message: 'Số ghế mỗi hàng phải từ 1 đến 30' })
  res.status(201).json(await Room.create({ cinema: req.body.cinema, name, rows, seatsPerRow }))
})

exports.updateRoom = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(ROOM_NOT_FOUND)
  const room = await Room.findById(req.params.id)
  if (!room) return res.status(404).json(ROOM_NOT_FOUND)

  const data = {}
  if (req.body.name !== undefined) {
    data.name = str(req.body.name)
    if (!data.name) return res.status(400).json({ message: 'Vui lòng nhập tên phòng' })
  }
  if (req.body.rows !== undefined) {
    data.rows = Number(req.body.rows)
    if (!intIn(data.rows, 1, 26)) return res.status(400).json({ message: 'Số hàng ghế phải từ 1 đến 26' })
  }
  if (req.body.seatsPerRow !== undefined) {
    data.seatsPerRow = Number(req.body.seatsPerRow)
    if (!intIn(data.seatsPerRow, 1, 30)) return res.status(400).json({ message: 'Số ghế mỗi hàng phải từ 1 đến 30' })
  }

  const resized =
    (data.rows !== undefined && data.rows !== room.rows) ||
    (data.seatsPerRow !== undefined && data.seatsPerRow !== room.seatsPerRow)
  if (resized && (await Showtime.exists({ room: room._id, 'bookedSeats.0': { $exists: true } }))) {
    return res.status(409).json({ message: 'Phòng đã có vé được đặt, không thể đổi sơ đồ ghế' })
  }

  Object.assign(room, data)
  await room.save()
  res.json(room)
})

exports.removeRoom = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(ROOM_NOT_FOUND)
  if (await Showtime.exists({ room: req.params.id })) {
    return res.status(409).json({ message: 'Phòng đang có suất chiếu, hãy xóa các suất chiếu trước' })
  }
  const room = await Room.findByIdAndDelete(req.params.id)
  if (!room) return res.status(404).json(ROOM_NOT_FOUND)
  res.json({ message: 'Đã xóa phòng chiếu' })
})
