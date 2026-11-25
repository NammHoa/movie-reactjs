const mongoose = require('mongoose')

// Mỗi đơn chỉ có một khoản hoàn tiền (chỉ mục unique), thử lại nhiều lần vẫn là cùng một bản ghi.
const refundSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    provider: { type: String, required: true },
    // pending: chờ xử lý hoặc chưa rõ kết quả; processing: đang gọi cổng thanh toán; success; failed: cổng từ chối, có thể thử lại
    status: { type: String, enum: ['pending', 'processing', 'success', 'failed'], default: 'pending' },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: Date,
    completedAt: Date,
    gatewayRefNo: String,
    failReason: String,
    emailSentAt: Date, // email xác nhận hoàn tiền đã gửi lúc nào; trống nghĩa là chưa gửi hoặc gửi lỗi
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    manual: Boolean, // admin đánh dấu đã hoàn tiền thủ công (hoàn trực tiếp trên cổng thanh toán hoặc chuyển khoản)
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
  },
  { timestamps: true },
)

refundSchema.index({ status: 1, createdAt: 1 })

module.exports = mongoose.model('Refund', refundSchema)
