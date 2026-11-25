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
    gatewayTxnNo: String, // mã giao dịch phía cổng thanh toán (VNPay: vnp_TransactionNo), dùng khi đối soát/hoàn tiền
    gatewayPayDate: String, // ngày giờ giao dịch do VNPay trả về (vnp_PayDate, yyyyMMddHHmmss); VNPay đòi đúng giá trị này khi hoàn tiền
    bankCode: String,
    paidAt: Date,
  },
  { timestamps: true },
)

paymentSchema.index({ booking: 1, status: 1 })

module.exports = mongoose.model('Payment', paymentSchema)
