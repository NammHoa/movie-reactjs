const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    showtime: { type: mongoose.Schema.Types.ObjectId, ref: 'Showtime', required: true },
    seats: { type: [String], required: true },
    pricePerSeat: { type: Number, required: true },
    subtotal: Number, // tiền vé trước giảm giá; đơn cũ không có trường này thì coi như bằng totalPrice
    discount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true }, // số tiền khách phải trả (đã trừ giảm giá), cũng là số tiền gửi sang cổng thanh toán
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    couponCode: String, // lưu lại để vẫn hiển thị đúng dù mã sau này bị sửa
    couponHeld: Boolean, // true khi đơn đang giữ một lượt dùng mã (đơn chờ thanh toán hoặc đã thanh toán)
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
// Mỗi người chỉ giữ một lượt dùng cho mỗi mã; chỉ mục unique chặn dùng hai lần ngay cả khi hai request đến cùng lúc
bookingSchema.index({ user: 1, coupon: 1 }, { unique: true, partialFilterExpression: { couponHeld: true } })
bookingSchema.index({ paymentStatus: 1, expiresAt: 1 })
bookingSchema.index({ paymentStatus: 1, paidAt: 1 }) // thống kê doanh thu theo ngày thanh toán

module.exports = mongoose.model('Booking', bookingSchema)
