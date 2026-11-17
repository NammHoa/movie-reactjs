const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // mã đặt vé ngắn gọn (dùng cho vé / mã QR)
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    showtime: { type: mongoose.Schema.Types.ObjectId, ref: 'Showtime', required: true },
    seats: { type: [String], required: true },
    pricePerSeat: { type: Number, required: true }, // lưu lại giá lúc đặt (admin đổi giá sau này không ảnh hưởng)
    totalPrice: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
  },
  { timestamps: true },
)

bookingSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('Booking', bookingSchema)
