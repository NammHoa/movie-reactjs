const Booking = require('../models/Booking')
const Refund = require('../models/Refund')
const mailer = require('./mailer')
const { clientUrl } = require('../config/env')
const { esc, dateFmt, price, POPULATE } = require('./ticketEmail')

function buildContent(booking, refund) {
  const { showtime, user } = booking
  const movie = showtime?.movie?.title ?? 'Phim'
  const cinema = showtime?.room?.cinema
  const rows = [
    ['Phim', movie],
    ['Rạp', cinema ? `${cinema.name} — ${showtime.room.name}` : '—'],
    ['Suất chiếu', showtime ? dateFmt.format(showtime.startTime) : '—'],
    ['Ghế', booking.seats.join(', ')],
    ['Mã vé', booking.code],
    ['Số tiền hoàn', price(refund.amount)],
  ]
  const note = 'Tiền được hoàn về đúng phương thức bạn đã thanh toán. Thời gian tiền về tài khoản tùy ngân hàng, thường trong vài ngày làm việc.'
  const link = `${clientUrl()}/my-tickets`

  const text = [`Chào ${user.name || 'bạn'}, vé của bạn đã được hủy và hoàn tiền.`, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', note, `Vé của tôi: ${link}`].join('\n')

  const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#231f20;padding:20px 24px;color:#ffffff">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e3d9a5">Đã hoàn tiền</div>
<div style="font-size:20px;font-weight:bold;margin-top:6px">${esc(movie)}</div>
</td></tr>
<tr><td style="padding:20px 24px">
<p style="margin:0 0 16px;font-size:14px">Chào ${esc(user.name || 'bạn')}, vé của bạn đã được hủy và hoàn tiền.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#6b7280;width:96px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-weight:bold">${esc(v)}</td></tr>`).join('\n')}
</table>
<p style="margin:20px 0 0;font-size:12px;color:#6b7280;line-height:1.5">${esc(note)}</p>
</td></tr></table></td></tr></table></body></html>`

  return { subject: `Đã hoàn tiền vé ${movie} — mã ${booking.code}`, html, text }
}

// Gửi email xác nhận hoàn tiền, đúng một lần cho mỗi khoản hoàn (giành bằng lệnh nguyên tử), gửi lỗi thì nhả lại để thử lần sau.
async function sendRefundEmail(refundId) {
  if (!mailer.enabled()) return { status: 'disabled' }
  const claimed = await Refund.findOneAndUpdate({ _id: refundId, status: 'success', emailSentAt: null }, { emailSentAt: new Date() }, { returnDocument: 'after' })
  if (!claimed) return { status: 'skipped' }
  try {
    const booking = await Booking.findById(claimed.booking).populate(POPULATE)
    if (!booking?.user?.email) {
      await Refund.updateOne({ _id: refundId }, { $unset: { emailSentAt: 1 } })
      return { status: 'no_email' }
    }
    const { subject, html, text } = buildContent(booking, claimed)
    await mailer.send({ to: booking.user.email, toName: booking.user.name, subject, html, text })
    return { status: 'sent' }
  } catch (err) {
    await Refund.updateOne({ _id: refundId }, { $unset: { emailSentAt: 1 } }).catch(() => {})
    return { status: 'failed', error: err.message }
  }
}

// Gọi sau khi hoàn tiền thành công: không chờ kết quả và không bao giờ làm hỏng việc ghi nhận hoàn tiền
function queueRefundEmail(refundId) {
  sendRefundEmail(refundId)
    .then((r) => r.status === 'failed' && console.warn(`[mail] Không gửi được email hoàn tiền ${refundId}: ${r.error}`))
    .catch((err) => console.error('[mail] Lỗi gửi email hoàn tiền:', err.message))
}

module.exports = { sendRefundEmail, queueRefundEmail, buildContent }
