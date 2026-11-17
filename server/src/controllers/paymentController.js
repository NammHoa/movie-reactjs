const crypto = require('crypto')
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const { isId, wrap } = require('../utils/http')
const { mockEnabled, paymentUrl } = require('../services/paymentGateway')
const { releaseExpired } = require('../services/bookingExpiry')

const NOT_FOUND = { message: 'Không tìm thấy giao dịch' }

const present = (payment, booking) => ({
  _id: payment._id,
  status: payment.status,
  amount: payment.amount,
  provider: payment.provider,
  txnRef: payment.txnRef,
  paidAt: payment.paidAt,
  paymentUrl: paymentUrl(payment),
  booking: booking && { _id: booking._id, code: booking.code, paymentStatus: booking.paymentStatus, expiresAt: booking.expiresAt },
})

const notPayableMessage = (booking) => {
  if (booking.paymentStatus === 'paid') return 'Đơn này đã được thanh toán'
  if (booking.paymentStatus === 'cancelled') return 'Đơn này đã bị hủy'
  return 'Đơn đã hết hạn thanh toán, vui lòng đặt lại vé'
}

// POST /api/payments  { booking }
exports.create = wrap(async (req, res) => {
  if (!isId(req.body.booking)) return res.status(400).json({ message: 'Đơn đặt vé không hợp lệ' })
  const booking = await Booking.findOne({ _id: req.body.booking, user: req.user.id })
  if (!booking) return res.status(404).json({ message: 'Không tìm thấy vé' })
  if (booking.paymentStatus !== 'pending' || booking.expiresAt <= new Date()) {
    return res.status(409).json({ message: notPayableMessage(booking) })
  }

  let payment = await Payment.findOne({ booking: booking._id, status: 'pending' })
  const created = !payment
  if (!payment) {
    payment = await Payment.create({
      booking: booking._id,
      user: req.user.id,
      amount: booking.totalPrice,
      txnRef: `${booking.code}${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
    })
  }
  res.status(created ? 201 : 200).json(present(payment, booking))
})

// GET /api/payments/:id
exports.getOne = wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  const payment = await Payment.findOne({ _id: req.params.id, user: req.user.id })
  if (!payment) return res.status(404).json(NOT_FOUND)
  res.json(present(payment, await Booking.findById(payment.booking)))
})

// POST /api/payments/:id/mock-confirm  { result: 'success' | 'failed' }
// Giả lập việc cổng thanh toán báo kết quả. Với VNPay thật, kết quả đến từ callback đã ký
// của VNPay (không bao giờ tin kết quả do trình duyệt tự gửi lên).
exports.mockConfirm = wrap(async (req, res) => {
  if (!mockEnabled()) return res.status(404).json(NOT_FOUND)
  if (!isId(req.params.id)) return res.status(404).json(NOT_FOUND)
  if (!['success', 'failed'].includes(req.body.result)) return res.status(400).json({ message: 'Kết quả không hợp lệ' })

  const payment = await Payment.findOne({ _id: req.params.id, user: req.user.id })
  if (!payment) return res.status(404).json(NOT_FOUND)

  if (req.body.result === 'failed') {
    const failed = await Payment.findOneAndUpdate({ _id: payment._id, status: 'pending' }, { status: 'failed', failReason: 'declined' }, { returnDocument: 'after' })
    const current = failed || (await Payment.findById(payment._id))
    return res.json(present(current, await Booking.findById(payment.booking)))
  }

  // Cổng thanh toán có thể gửi callback nhiều lần, hoặc nhiều request đến cùng lúc.
  // "Giành" giao dịch bằng một lệnh nguyên tử (pending -> processing): chỉ một request được xử lý,
  // các request còn lại không được đụng vào đơn nên không bao giờ tính tiền hai lần.
  const claimed = await Payment.findOneAndUpdate({ _id: payment._id, status: 'pending' }, { status: 'processing' })
  if (!claimed) {
    const current = await Payment.findById(payment._id)
    const booking = await Booking.findById(payment.booking)
    if (current.status === 'success') return res.json({ ...present(current, booking), alreadyPaid: true })
    if (current.status === 'processing') return res.status(409).json({ message: 'Giao dịch đang được xử lý' })
    return res.status(409).json({ message: 'Giao dịch đã thất bại, vui lòng tạo thanh toán mới' })
  }

  // Cùng cơ chế "trọng tài" với việc nhả ghế quá hạn (bookingExpiry): một đơn chỉ chuyển được
  // từ pending sang MỘT trong hai trạng thái paid hoặc expired, và paid đòi expiresAt > now.
  const now = new Date()
  const paid = await Booking.findOneAndUpdate(
    { _id: payment.booking, paymentStatus: 'pending', $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false } }] },
    { paymentStatus: 'paid', paidAt: now },
    { returnDocument: 'after' },
  )
  if (!paid) {
    // Với cổng thật: tiền đã bị trừ mà đơn không còn hợp lệ -> phải hoàn tiền (ghi nhận ở đây).
    await Payment.updateOne({ _id: payment._id }, { status: 'failed', failReason: 'booking_not_payable' })
    await releaseExpired({ _id: payment.booking })
    const booking = await Booking.findById(payment.booking)
    return res.status(409).json({ message: notPayableMessage(booking) })
  }

  const done = await Payment.findOneAndUpdate({ _id: payment._id }, { status: 'success', paidAt: now }, { returnDocument: 'after' })
  res.json(present(done, paid))
})
