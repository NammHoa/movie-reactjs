const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const { releaseExpired } = require('./bookingExpiry')
const { queueTicketEmail } = require('./ticketEmail')

const notPayableMessage = (booking) => {
  if (booking.paymentStatus === 'paid') return 'Đơn này đã được thanh toán'
  if (booking.paymentStatus === 'cancelled') return 'Đơn này đã bị hủy'
  return 'Đơn đã hết hạn thanh toán, vui lòng đặt lại vé'
}

// Ghi nhận một giao dịch thành công. Cổng thanh toán có thể báo nhiều lần, hoặc nhiều request đến cùng lúc.
// "Giành" giao dịch bằng một lệnh nguyên tử (pending -> processing): chỉ một request được xử lý,
// các request còn lại không được đụng vào đơn nên không bao giờ tính tiền hai lần.
// Trả về { outcome, payment, booking }: paid | already_paid | busy | already_failed | not_payable
async function settleSuccess(payment, details = {}) {
  const claimed = await Payment.findOneAndUpdate({ _id: payment._id, status: 'pending' }, { status: 'processing', ...details })
  if (!claimed) {
    const current = await Payment.findById(payment._id)
    const outcome = { success: 'already_paid', processing: 'busy' }[current.status] || 'already_failed'
    return { outcome, payment: current, booking: await Booking.findById(payment.booking) }
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
    const failed = await Payment.findOneAndUpdate({ _id: payment._id }, { status: 'failed', failReason: 'booking_not_payable' }, { returnDocument: 'after' })
    await releaseExpired({ _id: payment.booking })
    return { outcome: 'not_payable', payment: failed, booking: await Booking.findById(payment.booking) }
  }

  const done = await Payment.findOneAndUpdate({ _id: payment._id }, { status: 'success', paidAt: now }, { returnDocument: 'after' })
  queueTicketEmail(paid._id)
  return { outcome: 'paid', payment: done, booking: paid }
}

// Ghi nhận giao dịch thất bại. Chỉ giao dịch đang chờ (pending) mới đổi được; kết quả đã chốt thì giữ nguyên.
async function settleFailure(payment, reason, details = {}) {
  const failed = await Payment.findOneAndUpdate({ _id: payment._id, status: 'pending' }, { status: 'failed', failReason: reason, ...details }, { returnDocument: 'after' })
  return { changed: !!failed, payment: failed || (await Payment.findById(payment._id)) }
}

module.exports = { notPayableMessage, settleSuccess, settleFailure }
