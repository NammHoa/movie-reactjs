const Booking = require('../models/Booking')
const Payment = require('../models/Payment')
const Refund = require('../models/Refund')
const Showtime = require('../models/Showtime')
const vnpay = require('./vnpay')

const envHours = process.env.REFUND_CUTOFF_HOURS
// Khách tự hủy được đến trước giờ chiếu bao lâu (mặc định 2 giờ); admin không bị giới hạn này
const CUTOFF_HOURS = envHours !== undefined && envHours !== '' && Number(envHours) >= 0 ? Number(envHours) : 2
const CUTOFF_MS = CUTOFF_HOURS * 60 * 60 * 1000

const refundDeadline = (showtime) => (showtime?.startTime ? new Date(new Date(showtime.startTime).getTime() - CUTOFF_MS) : null)

// Vé này có đang đủ điều kiện để KHÁCH tự hủy và hoàn tiền không
const userCanRefund = (booking, now = new Date()) => {
  const deadline = refundDeadline(booking.showtime)
  return booking.paymentStatus === 'paid' && !booking.checkedInAt && !!deadline && deadline > now
}

// Lý do vé không hoàn tiền được (hoặc null nếu được). admin = true bỏ qua hạn hủy của khách.
function blockReason(booking, { admin = false, now = new Date() } = {}) {
  switch (booking.paymentStatus) {
    case 'pending':
      return 'Đơn chưa thanh toán, hãy dùng chức năng hủy đơn'
    case 'cancelled':
      return 'Vé này đã được hủy trước đó'
    case 'expired':
      return 'Đơn đã hết hạn thanh toán, không có khoản nào để hoàn'
    case 'refunding':
      return 'Vé này đang được hoàn tiền'
    case 'refunded':
      return 'Vé này đã được hoàn tiền'
  }
  if (booking.checkedInAt) return 'Vé đã được sử dụng, không thể hoàn tiền'
  if (admin) return null
  const showtime = booking.showtime
  if (!showtime) return 'Suất chiếu không còn tồn tại, vui lòng liên hệ rạp'
  if (new Date(showtime.startTime) <= now) return 'Suất chiếu đã bắt đầu, không thể hủy vé'
  if (!userCanRefund(booking, now)) return `Đã quá hạn hủy vé (hủy được trước giờ chiếu ${CUTOFF_HOURS} giờ). Vui lòng liên hệ rạp để được hỗ trợ.`
  return null
}

// Thông tin hoàn tiền cho khách: chỉ nói "đang xử lý" hay "đã hoàn", không lộ chi tiết cổng thanh toán
const summary = (refund) =>
  refund ? { status: refund.status === 'success' ? 'success' : 'processing', amount: refund.amount, requestedAt: refund.createdAt, completedAt: refund.completedAt ?? null } : null

// Gọi cổng thanh toán cho một khoản hoàn tiền. Dùng cho lần hoàn đầu tiên và cho việc thử lại sau này.
// "Giành" khoản hoàn bằng một lệnh nguyên tử (pending/failed -> processing): chỉ một lần gọi chạy tại một thời điểm,
// nên hai request cùng lúc hay bấm thử lại liên tục cũng không gửi hai yêu cầu hoàn tiền.
// Trả về { outcome: 'success' | 'failed' | 'pending' | 'busy', refund }
async function executeRefund(refundId, { ip, createBy } = {}) {
  const now = new Date()
  const claimed = await Refund.findOneAndUpdate(
    { _id: refundId, status: { $in: ['pending', 'failed'] } },
    { status: 'processing', lastAttemptAt: now, $inc: { attempts: 1 }, $unset: { failReason: 1 } },
    { returnDocument: 'after' },
  )
  if (!claimed) return { outcome: 'busy', refund: await Refund.findById(refundId) }

  let result
  try {
    if (claimed.provider === 'vnpay') {
      const [payment, booking] = await Promise.all([Payment.findById(claimed.payment), Booking.findById(claimed.booking)])
      result = await vnpay.refund({ payment, booking, amount: claimed.amount, createBy, ip, now })
    } else {
      result = { status: 'success', refNo: `MOCK-${claimed._id}` } // cổng giả lập hoàn tiền ngay
    }
  } catch (err) {
    result = { status: 'unknown', reason: String(err.message).slice(0, 100) }
  }

  if (result.status === 'success') {
    const refund = await Refund.findOneAndUpdate({ _id: claimed._id }, { status: 'success', completedAt: new Date(), gatewayRefNo: result.refNo }, { returnDocument: 'after' })
    await Booking.updateOne({ _id: claimed.booking, paymentStatus: 'refunding' }, { paymentStatus: 'refunded', refundedAt: new Date() })
    return { outcome: 'success', refund }
  }

  // Bị từ chối: có thể thử lại. Không rõ kết quả: giữ "pending" để người xử lý kiểm tra trên cổng trước khi thử lại.
  const failed = result.status === 'rejected'
  const refund = await Refund.findOneAndUpdate({ _id: claimed._id }, { status: failed ? 'failed' : 'pending', failReason: result.reason }, { returnDocument: 'after' })
  console.warn(`[refund] ${failed ? 'Cổng từ chối' : 'Chưa rõ kết quả'} hoàn tiền đơn ${claimed.booking}: ${result.reason}`)
  return { outcome: failed ? 'failed' : 'pending', refund }
}

// Hủy vé đã thanh toán và hoàn tiền. booking phải có showtime (startTime). actor = { id, role }.
// Trả về { error: { status, message } } hoặc { outcome, refund }.
async function requestRefund(booking, actor, ip) {
  const admin = actor.role === 'admin'
  const reason = blockReason(booking, { admin })
  if (reason) return { error: { status: 409, message: reason } }

  const payment = await Payment.findOne({ booking: booking._id, status: 'success' })
  if (!payment) return { error: { status: 409, message: 'Không tìm thấy giao dịch thanh toán của vé này, vui lòng liên hệ rạp' } }

  // Giành vé bằng MỘT lệnh nguyên tử, cùng cách với soát vé (cần checkedInAt trống) và thanh toán:
  // một vé chỉ có thể hoặc được hoàn tiền hoặc được vào rạp, không bao giờ cả hai.
  const claimed = await Booking.findOneAndUpdate(
    { _id: booking._id, paymentStatus: 'paid', checkedInAt: null },
    { paymentStatus: 'refunding', cancelledAt: new Date(), cancelledBy: actor.id },
    { returnDocument: 'after' },
  )
  if (!claimed) return { error: { status: 409, message: 'Trạng thái vé vừa thay đổi (đã dùng, hủy hoặc đang hoàn tiền), vui lòng tải lại' } }

  let refund
  try {
    refund = await Refund.create({ booking: booking._id, payment: payment._id, user: booking.user, amount: payment.amount, provider: payment.provider, requestedBy: actor.id })
  } catch (err) {
    // Không tạo được bản ghi hoàn tiền thì trả vé về như cũ để khách không bị mất vé mà không có khoản hoàn nào
    await Booking.updateOne({ _id: booking._id, paymentStatus: 'refunding' }, { paymentStatus: 'paid', $unset: { cancelledAt: 1, cancelledBy: 1 } })
    throw err
  }

  // Vé đã hủy thì ghế được nhả ngay, không chờ cổng thanh toán xử lý xong
  await Showtime.updateOne({ _id: booking.showtime._id ?? booking.showtime }, { $pull: { bookedSeats: { $in: booking.seats } } })

  return executeRefund(refund._id, { ip, createBy: actor.email ?? String(actor.id) })
}

module.exports = { CUTOFF_HOURS, refundDeadline, userCanRefund, blockReason, summary, executeRefund, requestRefund }
