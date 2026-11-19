const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    showtime: { type: mongoose.Schema.Types.ObjectId, ref: 'Showtime', required: true },
    seats: { type: [String], required: true },
    pricePerSeat: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'cancelled', 'expired'], default: 'pending' },
    expiresAt: Date,
    paidAt: Date,
    emailSentAt: Date, // vé điện tử đã được gửi qua email lúc nào; trống nghĩa là chưa gửi hoặc gửi lỗi
    emailError: String,
    checkedInAt: Date, // thời điểm vào rạp (quét vé); có giá trị nghĩa là vé đã được dùng
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

bookingSchema.index({ user: 1, createdAt: -1 })
bookingSchema.index({ paymentStatus: 1, expiresAt: 1 })
bookingSchema.index({ paymentStatus: 1, paidAt: 1 }) // thống kê doanh thu theo ngày thanh toán

module.exports = mongoose.model('Booking', bookingSchema)
