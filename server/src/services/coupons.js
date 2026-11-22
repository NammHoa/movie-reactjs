const Booking = require('../models/Booking')
const Coupon = require('../models/Coupon')

const CODE_RE = /^[A-Z0-9_-]{4,20}$/
// Cổng thanh toán cần số tiền dương, nên giảm giá không bao giờ kéo tổng tiền xuống dưới mức này
const MIN_PAYABLE = 10000

const money = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`

// Trạng thái hiện tại của mã. Thứ tự kiểm tra cũng là thứ tự ưu tiên khi nhiều điều kiện cùng đúng.
function statusOf(coupon, now = new Date()) {
  if (!coupon.active) return 'inactive'
  if (coupon.startsAt && coupon.startsAt > now) return 'scheduled'
  if (coupon.expiresAt && coupon.expiresAt <= now) return 'expired'
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return 'exhausted'
  return 'running'
}

function computeDiscount(coupon, subtotal) {
  let discount = coupon.type === 'percent' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value
  if (coupon.type === 'percent' && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
  return Math.max(0, Math.min(discount, subtotal - MIN_PAYABLE))
}

// Kiểm tra một mã có áp dụng được cho người này và số tiền vé này không (chưa giữ lượt dùng).
// Trả về { coupon, discount } hoặc { error }. Mã không tồn tại và mã đã bị tắt cùng một câu trả lời.
async function evaluate(input, userId, subtotal, now = new Date()) {
  const code = typeof input === 'string' ? input.trim().toUpperCase() : ''
  if (!CODE_RE.test(code)) return { error: 'Mã giảm giá không hợp lệ' }
  const coupon = await Coupon.findOne({ code })
  if (!coupon || !coupon.active) return { error: 'Mã giảm giá không hợp lệ' }

  const status = statusOf(coupon, now)
  if (status === 'scheduled') return { error: 'Mã giảm giá chưa đến thời gian sử dụng' }
  if (status === 'expired') return { error: 'Mã giảm giá đã hết hạn' }
  if (status === 'exhausted') return { error: 'Mã giảm giá đã hết lượt sử dụng' }
  if (subtotal < coupon.minOrder) return { error: `Đơn tối thiểu ${money(coupon.minOrder)} mới dùng được mã này` }
  if (await Booking.exists({ user: userId, coupon: coupon._id, couponHeld: true })) {
    return { error: 'Bạn đã dùng mã giảm giá này rồi' }
  }

  const discount = computeDiscount(coupon, subtotal)
  if (discount <= 0) return { error: 'Mã giảm giá không áp dụng được cho đơn này' }
  return { coupon, discount }
}

// Giữ một lượt dùng bằng MỘT lệnh nguyên tử có kiểm tra lại điều kiện và giới hạn,
// nên nhiều người đặt cùng lúc cũng không vượt quá số lượt. Trả về null nếu không giữ được.
function reserve(couponId, now = new Date()) {
  return Coupon.findOneAndUpdate(
    {
      _id: couponId,
      active: true,
      $and: [{ $or: [{ startsAt: null }, { startsAt: { $lte: now } }] }, { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }],
      $expr: { $or: [{ $eq: ['$usageLimit', null] }, { $lt: ['$usedCount', '$usageLimit'] }] },
    },
    { $inc: { usedCount: 1 } },
  )
}

const release = (couponId) => Coupon.updateOne({ _id: couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } })

// Gọi đúng một lần cho mỗi đơn, ngay sau khi thắng bước đổi pending -> cancelled/expired (bước đó đã là trọng tài duy nhất)
async function releaseForBooking(booking) {
  if (booking?.coupon) await release(booking.coupon)
}

module.exports = { CODE_RE, MIN_PAYABLE, statusOf, computeDiscount, evaluate, reserve, release, releaseForBooking }
