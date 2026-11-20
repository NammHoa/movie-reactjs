const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true }, // percent: 1-100, fixed: số tiền VND
    maxDiscount: { type: Number, default: null }, // chỉ dùng cho percent: giảm tối đa bao nhiêu VND
    minOrder: { type: Number, default: 0 }, // tiền vé tối thiểu để được áp mã
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: null }, // tổng số lượt dùng; null là không giới hạn
    usedCount: { type: Number, default: 0 }, // gồm cả đơn đang giữ chỗ, trả lại khi đơn bị hủy hoặc hết hạn
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Coupon', couponSchema)
