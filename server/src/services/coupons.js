// Trạng thái hiện tại của mã. Thứ tự kiểm tra cũng là thứ tự ưu tiên khi nhiều điều kiện cùng đúng.
function statusOf(coupon, now = new Date()) {
  if (!coupon.active) return 'inactive'
  if (coupon.startsAt && coupon.startsAt > now) return 'scheduled'
  if (coupon.expiresAt && coupon.expiresAt <= now) return 'expired'
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return 'exhausted'
  return 'running'
}

module.exports = { statusOf }
