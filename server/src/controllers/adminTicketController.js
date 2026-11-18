const Booking = require('../models/Booking')
const { wrap } = require('../utils/http')
const { ADMIN_POPULATE } = require('../services/bookingView')

// Cho phép vào rạp từ trước giờ chiếu này; sớm hơn thì từ chối
const CHECKIN_OPENS_MS = 120 * 60 * 1000
const CODE_RE = /^[A-Z0-9]{4,16}$/

const POPULATE = [...ADMIN_POPULATE, { path: 'checkedInBy', select: 'name' }]

// Vé có dùng được vào lúc này không, kèm lý do để nhân viên biết phải nói gì với khách
function judge(booking, now) {
  const s = booking.paymentStatus
  if (s === 'cancelled') return { status: 'cancelled', message: 'Vé đã bị hủy' }
  if (s === 'expired') return { status: 'unpaid', message: 'Đơn đã hết hạn thanh toán, vé không có hiệu lực' }
  if (s === 'pending') return { status: 'unpaid', message: 'Đơn chưa thanh toán, vé không có hiệu lực' }
  if (booking.checkedInAt) return { status: 'used', message: 'Vé này đã được sử dụng' }
  const showtime = booking.showtime
  if (!showtime) return { status: 'ended', message: 'Suất chiếu không còn tồn tại' }
  if (new Date(showtime.endTime) <= now) return { status: 'ended', message: 'Suất chiếu đã kết thúc' }
  if (new Date(showtime.startTime).getTime() - CHECKIN_OPENS_MS > now.getTime()) {
    return { status: 'too_early', message: 'Chưa đến giờ vào rạp (mở trước giờ chiếu 2 tiếng)' }
  }
  return { status: 'valid', message: 'Vé hợp lệ' }
}

// Mã trong QR chính là mã đơn; chấp nhận chữ thường và khoảng trắng thừa vì nhân viên có thể gõ tay
const normalizeCode = (raw) => String(raw ?? '').trim().toUpperCase()

async function findByCode(code) {
  return Booking.findOne({ code }).populate(POPULATE).lean()
}

// GET /api/admin/tickets/:code -> xem thông tin và tình trạng vé, KHÔNG thay đổi gì
exports.lookup = wrap(async (req, res) => {
  const code = normalizeCode(req.params.code)
  if (!CODE_RE.test(code)) return res.status(400).json({ message: 'Mã vé không hợp lệ' })
  const booking = await findByCode(code)
  if (!booking) return res.status(404).json({ message: 'Không tìm thấy vé với mã này' })
  res.json({ result: judge(booking, new Date()), booking })
})

// POST /api/admin/tickets/:code/check-in -> xác nhận khách vào rạp, mỗi vé chỉ dùng được một lần
exports.checkIn = wrap(async (req, res) => {
  const code = normalizeCode(req.params.code)
  if (!CODE_RE.test(code)) return res.status(400).json({ message: 'Mã vé không hợp lệ' })
  const booking = await findByCode(code)
  if (!booking) return res.status(404).json({ message: 'Không tìm thấy vé với mã này' })

  const verdict = judge(booking, new Date())
  if (verdict.status !== 'valid') return res.status(409).json({ result: verdict, booking })

  // Hai nhân viên quét cùng một vé cùng lúc: lệnh cập nhật có điều kiện "chưa vào rạp" chỉ cho MỘT người thắng,
  // người còn lại nhận lại thông tin vé đã dùng thay vì cho hai khách cùng vào bằng một vé.
  const won = await Booking.findOneAndUpdate(
    { _id: booking._id, paymentStatus: 'paid', checkedInAt: null },
    { checkedInAt: new Date(), checkedInBy: req.user.id },
    { returnDocument: 'after' },
  )
  const fresh = await findByCode(code)
  if (!won) return res.status(409).json({ result: judge(fresh, new Date()), booking: fresh })
  res.json({ result: { status: 'checked_in', message: 'Đã xác nhận vào rạp' }, booking: fresh })
})
