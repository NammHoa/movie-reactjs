const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    provider: { type: String, default: 'mock' },
    txnRef: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'processing', 'success', 'failed'], default: 'pending' },
    failReason: String,
    paidAt: Date,
  },
  { timestamps: true },
)

paymentSchema.index({ booking: 1, status: 1 })

module.exports = mongoose.model('Payment', paymentSchema)
