const crypto = require('crypto')
const Booking = require('../models/Booking')
const Showtime = require('../models/Showtime')
const { isId, wrap } = require('../utils/http')
const { isValidSeat } = require('../utils/seats')
const { newExpiry, releaseExpired } = require('../services/bookingExpiry')

const MAX_SEATS_PER_BOOKING = 8
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // bỏ các ký tự dễ nhầm: I, O, 0, 1

const newCode = () =>
  Array.from(crypto.randomBytes(8), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('')

const POPULATE = {
  path: 'showtime',
  select: 'movie room startTime endTime price',
  populate: [
    { path: 'movie', select: 'title poster duration' },
    { path: 'room', select: 'name cinema', populate: { path: 'cinema', select: 'name city address' } },
  ],
}

// Thêm cờ canCancel để giao diện không phải tự suy luận quy tắc:
// chỉ hủy được đơn chưa thanh toán và suất chiếu chưa bắt đầu.
const present = (booking) => {
  const obj = booking.toObject()
  const now = new Date()
  obj.canCancel = booking.paymentStatus === 'pending' && !!booking.showtime?.startTime && booking.showtime.startTime > now
  obj.canPay = booking.paymentStatus === 'pending' && !(booking.expiresAt <= now)
  return obj
}

const NOT_FOUND = { message: 'Không tìm thấy vé' }

// Chuẩn hóa danh sách ghế từ client: mảng chuỗi, viết hoa, không trùng, tối đa 8 ghế.
function parseSeats(input) {
  if (!Array.isArray(input) || input.length === 0) return { error: 'Vui lòng chọn ít nhất một ghế' }
  if (input.length > MAX_SEATS_PER_BOOKING) return { error: `Chỉ được đặt tối đa ${MAX_SEATS_PER_BOOKING} ghế mỗi lần` }
  if (input.some((s) => typeof s !== 'string')) return { error: 'Danh sách ghế không hợp lệ' }
  const seats = input.map((s) => s.trim().toUpperCase())
  if (new Set(seats).size !== seats.length) return { error: 'Danh sách ghế bị trùng nhau' }
  return { seats }
}

// POST /api/bookings   { showtime, seats: ["A1","A2"] }
exports.create = wrap(async (req, res) => {
  if (!isId(req.body.showtime)) return res.status(400).json({ message: 'Suất chiếu không hợp lệ' })
  const { seats, error } = parseSeats(req.body.seats)
  if (error) return res.status(400).json({ message: error })

  const showtime = await Showtime.findById(req.body.showtime).populate('room', 'rows seatsPerRow')
  if (!showtime || !showtime.room) return res.status(404).json({ message: 'Suất chiếu không tồn tại' })
  if (showtime.startTime <= new Date()) {
    return res.status(400).json({ message: 'Suất chiếu đã bắt đầu, không thể đặt vé' })
  }
  const invalid = seats.filter((s) => !isValidSeat(s, showtime.room.rows, showtime.room.seatsPerRow))
  if (invalid.length) return res.status(400).json({ message: `Ghế không tồn tại trong phòng: ${invalid.join(', ')}` })

  await releaseExpired({ showtime: showtime._id })

  // Giữ ghế bằng MỘT lệnh nguyên tử: chỉ thành công nếu KHÔNG ghế nào trong danh sách đã có người đặt.
  // Hai người bấm cùng lúc thì database xử lý lần lượt, người đến sau sẽ nhận null (không bao giờ bán trùng).
  const held = await Showtime.findOneAndUpdate(
    { _id: showtime._id, startTime: { $gt: new Date() }, bookedSeats: { $nin: seats } },
    { $push: { bookedSeats: { $each: seats } } },
    { new: true },
  )
  if (!held) {
    const fresh = await Showtime.findById(showtime._id).select('bookedSeats')
    const taken = seats.filter((s) => fresh?.bookedSeats.includes(s))
    return res.status(409).json({
      message: taken.length
        ? `Ghế ${taken.join(', ')} đã có người đặt. Vui lòng chọn ghế khác.`
        : 'Không thể đặt vé cho suất chiếu này',
      taken,
    })
  }

  // Tạo đơn. Nếu lỗi thì trả ghế lại để không bị "mất ghế".
  try {
    let booking
    for (let attempt = 0; ; attempt++) {
      try {
        booking = await Booking.create({
          code: newCode(),
          user: req.user.id,
          showtime: showtime._id,
          seats,
          pricePerSeat: showtime.price,
          totalPrice: showtime.price * seats.length,
          expiresAt: newExpiry(),
        })
        break
      } catch (err) {
        if (err.code === 11000 && attempt < 3) continue // trùng mã (cực hiếm): thử mã khác
        throw err
      }
    }
    res.status(201).json(await booking.populate(POPULATE))
  } catch (err) {
    await Showtime.updateOne({ _id: showtime._id }, { $pull: { bookedSeats: { $in: seats } } })
    throw err
  }
})

// GET /api/bookings/mine -> vé của tôi (mới nhất trước)
exports.mine = wrap(async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(100).populate(POPULATE)
  res.json(bookings.map(present))
})

// GET /api/bookings/:id -> chi tiết một vé (chủ vé hoặc admin; người khác thấy như "không tồn tại")
exports.getOne = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const booking = await Booking.findById(req.params.id).populate(POPULATE)
  if (!booking) return res.status(404).json(NOT_FOUND)
  if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') return res.status(404).json(NOT_FOUND)
  res.json(present(booking))
})

// POST /api/bookings/:id/cancel -> hủy vé và nhả ghế
exports.cancel = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id }).populate('showtime', 'startTime')
  if (!booking) return res.status(404).json(NOT_FOUND)

  if (booking.paymentStatus === 'cancelled') return res.status(409).json({ message: 'Vé này đã được hủy trước đó' })
  if (booking.paymentStatus === 'expired') return res.status(409).json({ message: 'Đơn đã hết hạn thanh toán và được hủy tự động' })
  if (booking.paymentStatus === 'paid') {
    return res.status(409).json({ message: 'Vé đã thanh toán, không thể tự hủy. Vui lòng liên hệ rạp để được hỗ trợ.' })
  }
  if (!booking.showtime || booking.showtime.startTime <= new Date()) {
    return res.status(409).json({ message: 'Suất chiếu đã bắt đầu, không thể hủy vé' })
  }

  // Chuyển trạng thái pending -> cancelled bằng MỘT lệnh nguyên tử: nếu nhiều request hủy cùng lúc
  // thì chỉ MỘT request thắng và được phép nhả ghế (tránh nhả nhầm ghế đã được người khác đặt lại).
  const cancelled = await Booking.findOneAndUpdate(
    { _id: booking._id, paymentStatus: 'pending' },
    { paymentStatus: 'cancelled' },
    { new: true },
  )
  if (!cancelled) return res.status(409).json({ message: 'Không thể hủy vé này (trạng thái đã thay đổi)' })

  await Showtime.updateOne({ _id: booking.showtime._id }, { $pull: { bookedSeats: { $in: booking.seats } } })
  res.json(present(await cancelled.populate(POPULATE)))
})
