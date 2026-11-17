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
  },
  { timestamps: true },
)

bookingSchema.index({ user: 1, createdAt: -1 })
bookingSchema.index({ paymentStatus: 1, expiresAt: 1 })

module.exports = mongoose.model('Booking', bookingSchema)
