const Booking = require('../models/Booking')
const Showtime = require('../models/Showtime')
const { releaseForBooking } = require('./coupons')

const HOLD_MINUTES = Number(process.env.HOLD_MINUTES) || 10
const SWEEP_INTERVAL_MS = 30 * 1000

const newExpiry = () => new Date(Date.now() + HOLD_MINUTES * 60 * 1000)

async function releaseExpired(filter = {}) {
  const now = new Date()
  const candidates = await Booking.find({ paymentStatus: 'pending', expiresAt: { $lte: now }, ...filter }).limit(200)

  let released = 0
  for (const booking of candidates) {
    // Đổi pending -> expired là "trọng tài" duy nhất: chỉ request thắng được nhả ghế.
    // Thanh toán cũng đổi pending -> paid cùng cách (và đòi expiresAt > now), nên
    // một đơn không bao giờ vừa được trả tiền vừa bị nhả ghế.
    const won = await Booking.findOneAndUpdate(
      { _id: booking._id, paymentStatus: 'pending', expiresAt: { $lte: now } },
      { paymentStatus: 'expired', $unset: { couponHeld: 1 } },
    )
    if (!won) continue
    await Showtime.updateOne({ _id: booking.showtime }, { $pull: { bookedSeats: { $in: booking.seats } } })
    await releaseForBooking(won)
    released++
  }
  return released
}

function startExpirySweeper() {
  const timer = setInterval(() => {
    releaseExpired().catch((err) => console.error('Expiry sweep failed:', err.message))
  }, SWEEP_INTERVAL_MS)
  timer.unref()
}

module.exports = { HOLD_MINUTES, newExpiry, releaseExpired, startExpirySweeper }
