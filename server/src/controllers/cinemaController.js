const Cinema = require('../models/Cinema')
const Room = require('../models/Room')
const Showtime = require('../models/Showtime')
const { str, isId, wrap } = require('../utils/http')

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

exports.list = wrap(async (req, res) => {
  res.json(await Cinema.find().sort({ city: 1, name: 1 }))
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
