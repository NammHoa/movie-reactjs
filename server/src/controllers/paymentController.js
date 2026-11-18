const crypto = require('crypto')
const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const { isId, wrap } = require('../utils/http')
const { PROVIDER, mockEnabled, vnpayEnabled, paymentUrl } = require('../services/paymentGateway')
const vnpay = require('../services/vnpay')
const { notPayableMessage, settleSuccess, settleFailure } = require('../services/paymentSettlement')

const NOT_FOUND = { message: 'Không tìm thấy giao dịch' }

const present = (payment, booking) => ({
  _id: payment._id,
  status: payment.status,
  amount: payment.amount,
  provider: payment.provider,
  txnRef: payment.txnRef,
  paidAt: payment.paidAt,
  paymentUrl: payment.provider === 'vnpay' ? null : paymentUrl(payment),
  booking: booking && { _id: booking._id, code: booking.code, paymentStatus: booking.paymentStatus, expiresAt: booking.expiresAt },
})

// POST /api/payments  { booking }
exports.create = wrap(async (req, res) => {
  if (!isId(req.body.booking)) return res.status(400).json({ message: 'Đơn đặt vé không hợp lệ' })
  const booking = await Booking.findOne({ _id: req.body.booking, user: req.user.id })
  if (!booking) return res.status(404).json({ message: 'Không tìm thấy vé' })
  if (booking.paymentStatus !== 'pending' || booking.expiresAt <= new Date()) {
    return res.status(409).json({ message: notPayableMessage(booking) })
  }

  let payment = await Payment.findOne({ booking: booking._id, status: 'pending', provider: PROVIDER })
  const created = !payment
  if (!payment) {
    payment = await Payment.create({
      booking: booking._id,
      user: req.user.id,
      amount: booking.totalPrice,
      provider: PROVIDER,
      txnRef: `${booking.code}${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
    })
  }
  const body = present(payment, booking)
  // VNPay: URL chứa số tiền, mã giao dịch và giờ hết hạn nên được ký mới ở mỗi lần bấm thanh toán
  if (vnpayEnabled()) body.paymentUrl = vnpay.buildPayUrl({ payment, booking, ip: req.ip })
  res.status(created ? 201 : 200).json(body)
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

  const payment = await Payment.findOne({ _id: req.params.id, user: req.user.id, provider: 'mock' })
  if (!payment) return res.status(404).json(NOT_FOUND)

  if (req.body.result === 'failed') {
    const { payment: current } = await settleFailure(payment, 'declined')
    return res.json(present(current, await Booking.findById(payment.booking)))
  }

  const { outcome, payment: current, booking } = await settleSuccess(payment)
  if (outcome === 'paid') return res.json(present(current, booking))
  if (outcome === 'already_paid') return res.json({ ...present(current, booking), alreadyPaid: true })
  if (outcome === 'busy') return res.status(409).json({ message: 'Giao dịch đang được xử lý' })
  if (outcome === 'not_payable') return res.status(409).json({ message: notPayableMessage(booking) })
  res.status(409).json({ message: 'Giao dịch đã thất bại, vui lòng tạo thanh toán mới' })
})
