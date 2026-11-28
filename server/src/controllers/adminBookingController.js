const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const Showtime = require('../models/Showtime')
const User = require('../models/User')
const { isId, wrap } = require('../utils/http')
const { ADMIN_POPULATE: POPULATE } = require('../services/bookingView')
const { releaseForBooking } = require('../services/coupons')
const Refund = require('../models/Refund')
const refunds = require('../services/refunds')
const refundView = require('./adminRefundController')
const { scopeOf, showtimeIdsOf, showtimeInCinema } = require('../services/cinemaScope')

const STATUSES = ['pending', 'paid', 'cancelled', 'expired', 'refunding', 'refunded']
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

const present = ({ couponHeld: _held, ...booking }) => ({ ...booking, subtotal: booking.subtotal ?? booking.totalPrice, canCancel: booking.paymentStatus === 'pending' })

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
  const scope = scopeOf(req.user)
  if (scope) filter.showtime = { $in: await showtimeIdsOf(scope) }

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
  const scope = scopeOf(req.user)
  if (!booking || (scope && String(booking.showtime?.room?.cinema?._id) !== scope)) return res.status(404).json(NOT_FOUND)
  // Quản lý rạp chỉ theo dõi: không thấy chi tiết lỗi, mã phía cổng thanh toán hay thao tác hoàn tiền
  const fields = scope ? 'amount status provider txnRef createdAt' : '-user'
  const payments = await Payment.find({ booking: booking._id }).sort({ createdAt: -1 }).select(fields).lean()
  const refund = await Refund.findOne({ booking: booking._id }).populate(refundView.POPULATE.filter((p) => p.path !== 'booking'))
  const show = scope ? refunds.summary : refundView.present
  res.json({ ...present(booking), payments, refund: refund ? show(refund) : null })
})

// POST /api/admin/bookings/:id/refund -> hủy vé ĐÃ thanh toán và hoàn tiền cho khách (không bị giới hạn 2 giờ như khách tự hủy)
exports.refund = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const booking = await Booking.findById(req.params.id).populate('showtime', 'startTime')
  if (!booking) return res.status(404).json(NOT_FOUND)

  const result = await refunds.requestRefund(booking, { id: req.user.id, role: 'admin', email: req.account.email }, req.ip)
  if (result.error) return res.status(result.error.status).json({ message: result.error.message })

  const fresh = await Booking.findById(booking._id).populate(POPULATE).lean()
  const refund = await Refund.findById(result.refund._id).populate(refundView.POPULATE.filter((p) => p.path !== 'booking'))
  const done = result.outcome === 'success'
  res.status(done ? 200 : 202).json({
    message: done
      ? 'Đã hủy vé và hoàn tiền cho khách'
      : result.outcome === 'manual'
        ? 'Đã hủy vé. Hoàn tiền tự động qua VNPay đang tắt: hãy hoàn trực tiếp trên cổng VNPay rồi đánh dấu "đã hoàn thủ công" ở mục Hoàn tiền.'
        : 'Đã hủy vé. Khoản hoàn tiền chưa hoàn tất, xem ở mục Hoàn tiền để thử lại hoặc đánh dấu hoàn thủ công.',
    booking: { ...present(fresh), refund: refundView.present(refund) },
  })
})

// POST /api/admin/bookings/:id/cancel -> hủy đơn CHƯA thanh toán và nhả ghế
// Đơn đã thanh toán không hủy ở đây vì cần hoàn tiền, việc đó phải xử lý qua cổng thanh toán.
exports.cancel = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const booking = await Booking.findById(req.params.id)
  const scope = scopeOf(req.user)
  // Kiểm tra phạm vi trước các thông báo theo trạng thái, để đơn rạp khác không lộ gì
  if (!booking || (scope && !(await showtimeInCinema(booking.showtime, scope)))) return res.status(404).json(NOT_FOUND)

  const messages = {
    paid: 'Đơn đã thanh toán, không thể hủy tại đây (cần hoàn tiền qua cổng thanh toán)',
    cancelled: 'Đơn này đã được hủy trước đó',
    expired: 'Đơn đã hết hạn thanh toán và được hủy tự động',
    refunding: 'Vé này đã được hủy và đang hoàn tiền',
    refunded: 'Vé này đã được hủy và hoàn tiền',
  }
  if (messages[booking.paymentStatus]) return res.status(409).json({ message: messages[booking.paymentStatus] })

  // Cùng cơ chế "trọng tài" với khách tự hủy, thanh toán và dọn đơn hết hạn: chỉ một bên thắng được đơn đang chờ,
  // nên không thể vừa bị hủy/nhả ghế vừa được tính là đã thanh toán.
  const cancelled = await Booking.findOneAndUpdate(
    { _id: booking._id, paymentStatus: 'pending' },
    { paymentStatus: 'cancelled', $unset: { couponHeld: 1 } },
    { returnDocument: 'after' },
  )
  if (!cancelled) return res.status(409).json({ message: 'Không thể hủy đơn này (trạng thái vừa thay đổi), vui lòng tải lại' })

  await Showtime.updateOne({ _id: booking.showtime }, { $pull: { bookedSeats: { $in: booking.seats } } })
  await releaseForBooking(cancelled)
  const fresh = await Booking.findById(booking._id).populate(POPULATE).lean()
  res.json(present(fresh))
})
