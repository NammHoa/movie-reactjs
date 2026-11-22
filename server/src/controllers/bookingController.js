const crypto = require('crypto')
const Booking = require('../models/Booking')
const Showtime = require('../models/Showtime')
const { isId, wrap } = require('../utils/http')
const { isValidSeat } = require('../utils/seats')
const { newExpiry, releaseExpired } = require('../services/bookingExpiry')
const mailer = require('../services/mailer')
const { sendTicketEmail } = require('../services/ticketEmail')
const coupons = require('../services/coupons')

const MAX_SEATS_PER_BOOKING = 8
const MAX_ACTIVE_HOLDS = 5
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
  delete obj.checkedInBy // khách chỉ cần biết vé đã dùng lúc nào, không cần mã nội bộ của nhân viên soát vé
  delete obj.coupon // chỉ để đối chiếu nội bộ, khách cần thấy couponCode
  delete obj.couponHeld
  obj.subtotal ??= obj.totalPrice // đơn tạo trước khi có mã giảm giá
  const now = new Date()
  obj.canCancel = booking.paymentStatus === 'pending' && !!booking.showtime?.startTime && booking.showtime.startTime > now
  obj.canPay = booking.paymentStatus === 'pending' && !(booking.expiresAt <= now)
  obj.emailEnabled = mailer.enabled()
  delete obj.emailError // lỗi gửi mail chỉ để xem log, không cần cho khách
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

const hasCoupon = (v) => v !== undefined && v !== null && v !== ''

// POST /api/bookings/quote   { showtime, seats, coupon? } -> báo giá để khách xem trước, không giữ ghế hay mã
exports.quote = wrap(async (req, res) => {
  if (!isId(req.body.showtime)) return res.status(400).json({ message: 'Suất chiếu không hợp lệ' })
  const { seats, error } = parseSeats(req.body.seats)
  if (error) return res.status(400).json({ message: error })

  const showtime = await Showtime.findById(req.body.showtime).select('price startTime')
  if (!showtime) return res.status(404).json({ message: 'Suất chiếu không tồn tại' })
  if (showtime.startTime <= new Date()) return res.status(400).json({ message: 'Suất chiếu đã bắt đầu, không thể đặt vé' })

  const subtotal = showtime.price * seats.length
  if (!hasCoupon(req.body.coupon)) return res.json({ subtotal, discount: 0, total: subtotal, coupon: null })

  const applied = await coupons.evaluate(req.body.coupon, req.user.id, subtotal)
  if (applied.error) return res.status(400).json({ message: applied.error, field: 'coupon' })
  const { coupon, discount } = applied
  res.json({ subtotal, discount, total: subtotal - discount, coupon: { code: coupon.code, type: coupon.type, value: coupon.value } })
})

// POST /api/bookings   { showtime, seats: ["A1","A2"], coupon?: "CODE" }
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

  // Giới hạn số đơn đang giữ ghế mà chưa thanh toán để một người không thể chiếm hết ghế.
  // Đây là giới hạn mềm: nhiều request đồng thời có thể vượt vài đơn, nhưng đã có rate limit chặn ở phía trước.
  const holding = await Booking.countDocuments({ user: req.user.id, paymentStatus: 'pending', expiresAt: { $gt: new Date() } })
  if (holding >= MAX_ACTIVE_HOLDS) {
    return res.status(429).json({
      message: `Bạn đang giữ ${holding} đơn chưa thanh toán. Vui lòng thanh toán hoặc hủy bớt trước khi đặt thêm.`,
    })
  }

  // Kiểm tra mã trước khi giữ ghế, để mã sai không làm ghế bị giữ rồi nhả lại một cách vô ích
  const subtotal = showtime.price * seats.length
  let applied = null
  if (hasCoupon(req.body.coupon)) {
    applied = await coupons.evaluate(req.body.coupon, req.user.id, subtotal)
    if (applied.error) return res.status(400).json({ message: applied.error, field: 'coupon' })
  }

  // Giữ ghế bằng MỘT lệnh nguyên tử: chỉ thành công nếu KHÔNG ghế nào trong danh sách đã có người đặt.
  // Hai người bấm cùng lúc thì database xử lý lần lượt, người đến sau sẽ nhận null (không bao giờ bán trùng).
  const held = await Showtime.findOneAndUpdate(
    { _id: showtime._id, startTime: { $gt: new Date() }, bookedSeats: { $nin: seats } },
    { $push: { bookedSeats: { $each: seats } } },
    { returnDocument: 'after' },
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

  const giveBackSeats = () => Showtime.updateOne({ _id: showtime._id }, { $pull: { bookedSeats: { $in: seats } } })

  // Giữ lượt dùng mã (nguyên tử, kiểm tra lại giới hạn). Hết lượt giữa chừng thì trả ghế lại.
  if (applied && !(await coupons.reserve(applied.coupon._id))) {
    await giveBackSeats()
    return res.status(400).json({ message: 'Mã giảm giá đã hết lượt sử dụng', field: 'coupon' })
  }

  // Tạo đơn. Nếu lỗi thì trả lại cả ghế lẫn lượt dùng mã để không bị "mất".
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
          subtotal,
          discount: applied?.discount ?? 0,
          totalPrice: subtotal - (applied?.discount ?? 0),
          ...(applied && { coupon: applied.coupon._id, couponCode: applied.coupon.code, couponHeld: true }),
          expiresAt: newExpiry(),
        })
        break
      } catch (err) {
        // Trùng mã vé (cực hiếm) thì thử mã khác; trùng chỉ mục (user, coupon) là người này đã dùng mã rồi nên không thử lại
        if (err.code === 11000 && !err.keyPattern?.coupon && attempt < 3) continue
        throw err
      }
    }
    res.status(201).json(present(await booking.populate(POPULATE)))
  } catch (err) {
    await giveBackSeats()
    if (applied) await coupons.release(applied.coupon._id)
    if (applied && err.code === 11000 && err.keyPattern?.coupon) {
      return res.status(400).json({ message: 'Bạn đã dùng mã giảm giá này rồi', field: 'coupon' })
    }
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

// POST /api/bookings/:id/email -> gửi (lại) vé điện tử về email của chủ vé
exports.sendEmail = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  if (!mailer.enabled()) return res.status(503).json({ message: 'Tính năng gửi vé qua email chưa được bật' })

  const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id }).select('paymentStatus')
  if (!booking) return res.status(404).json(NOT_FOUND)
  if (booking.paymentStatus !== 'paid') return res.status(409).json({ message: 'Chỉ gửi được vé đã thanh toán' })

  const result = await sendTicketEmail(booking._id, { force: true })
  if (result.status === 'sent') return res.json({ message: 'Đã gửi vé qua email', emailSentAt: result.sentAt })
  if (result.status === 'no_email') return res.status(409).json({ message: 'Tài khoản của bạn chưa có email' })
  res.status(502).json({ message: 'Chưa gửi được email, vui lòng thử lại sau' })
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
    { paymentStatus: 'cancelled', $unset: { couponHeld: 1 } },
    { returnDocument: 'after' },
  )
  if (!cancelled) return res.status(409).json({ message: 'Không thể hủy vé này (trạng thái đã thay đổi)' })

  await Showtime.updateOne({ _id: booking.showtime._id }, { $pull: { bookedSeats: { $in: booking.seats } } })
  await coupons.releaseForBooking(cancelled)
  res.json(present(await cancelled.populate(POPULATE)))
})
