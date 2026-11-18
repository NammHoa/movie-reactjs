const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const Showtime = require('../models/Showtime')
const User = require('../models/User')
const { isId, wrap } = require('../utils/http')
const { ADMIN_POPULATE: POPULATE } = require('../services/bookingView')

const STATUSES = ['pending', 'paid', 'cancelled', 'expired']
const MAX_LIMIT = 100
const MAX_QUERY = 50
const NOT_FOUND = { message: 'Không tìm thấy đơn' }

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Số nguyên dương trong khoảng [min, max]; thiếu thì dùng mặc định, sai thì trả null
const intParam = (v, fallback, min, max) => {
  if (v === undefined) return fallback
  if (typeof v !== 'string' || !/^\d{1,6}$/.test(v)) return null
  const n = Number(v)
  return n >= min && n <= max ? n : null
}

const present = (booking) => ({ ...booking, canCancel: booking.paymentStatus === 'pending' })

// GET /api/admin/bookings?status=paid&q=ABC&page=1&limit=20
// q tìm theo mã đơn (đầu mã) hoặc theo tên / email / số điện thoại của người đặt.
exports.list = wrap(async (req, res) => {
  const { status, q } = req.query
  const page = intParam(req.query.page, 1, 1, 100000)
  const limit = intParam(req.query.limit, 20, 1, MAX_LIMIT)
  if (page === null || limit === null) return res.status(400).json({ message: 'Trang hoặc số dòng không hợp lệ' })
  if (status !== undefined && status !== 'all' && !STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ' })
  }
  if (q !== undefined && (typeof q !== 'string' || q.length > MAX_QUERY)) {
    return res.status(400).json({ message: `Từ khóa tìm kiếm không hợp lệ (tối đa ${MAX_QUERY} ký tự)` })
  }

  const filter = {}
  if (STATUSES.includes(status)) filter.paymentStatus = status

  const term = q?.trim()
  if (term) {
    // Từ khóa luôn được escape: người dùng gõ ".*" chỉ tìm đúng chuỗi ".*", không phải biểu thức chính quy
    const pattern = escapeRegex(term)
    const people = await User.find({ $or: [{ name: new RegExp(pattern, 'i') }, { email: new RegExp(pattern, 'i') }, { phone: new RegExp(pattern) }] })
      .select('_id')
      .limit(200)
      .lean()
    filter.$or = [{ code: new RegExp(`^${escapeRegex(term.toUpperCase())}`) }, { user: { $in: people.map((u) => u._id) } }]
  }

  const [total, items] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate(POPULATE).lean(),
  ])
  res.json({ items: items.map(present), page, limit, total, pages: Math.ceil(total / limit) })
})

// GET /api/admin/bookings/:id -> chi tiết đơn kèm lịch sử các lần thanh toán
exports.getOne = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const booking = await Booking.findById(req.params.id).populate(POPULATE).lean()
  if (!booking) return res.status(404).json(NOT_FOUND)
  const payments = await Payment.find({ booking: booking._id }).sort({ createdAt: -1 }).select('-user').lean()
  res.json({ ...present(booking), payments })
})

// POST /api/admin/bookings/:id/cancel -> hủy đơn CHƯA thanh toán và nhả ghế
// Đơn đã thanh toán không hủy ở đây vì cần hoàn tiền, việc đó phải xử lý qua cổng thanh toán.
exports.cancel = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const booking = await Booking.findById(req.params.id)
  if (!booking) return res.status(404).json(NOT_FOUND)

  const messages = {
    paid: 'Đơn đã thanh toán, không thể hủy tại đây (cần hoàn tiền qua cổng thanh toán)',
    cancelled: 'Đơn này đã được hủy trước đó',
    expired: 'Đơn đã hết hạn thanh toán và được hủy tự động',
  }
  if (messages[booking.paymentStatus]) return res.status(409).json({ message: messages[booking.paymentStatus] })

  // Cùng cơ chế "trọng tài" với khách tự hủy, thanh toán và dọn đơn hết hạn: chỉ một bên thắng được đơn đang chờ,
  // nên không thể vừa bị hủy/nhả ghế vừa được tính là đã thanh toán.
  const cancelled = await Booking.findOneAndUpdate(
    { _id: booking._id, paymentStatus: 'pending' },
    { paymentStatus: 'cancelled' },
    { returnDocument: 'after' },
  )
  if (!cancelled) return res.status(409).json({ message: 'Không thể hủy đơn này (trạng thái vừa thay đổi), vui lòng tải lại' })

  await Showtime.updateOne({ _id: booking.showtime }, { $pull: { bookedSeats: { $in: booking.seats } } })
  const fresh = await Booking.findById(booking._id).populate(POPULATE).lean()
  res.json(present(fresh))
})
