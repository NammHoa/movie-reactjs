const QRCode = require('qrcode')
const Booking = require('../models/Booking')
const mailer = require('./mailer')
const { clientUrl } = require('../config/env')

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const dateFmt = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour12: false,
})
const price = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`

const POPULATE = [
  { path: 'user', select: 'name email' },
  {
    path: 'showtime',
    select: 'movie room startTime',
    populate: [
      { path: 'movie', select: 'title' },
      { path: 'room', select: 'name cinema', populate: { path: 'cinema', select: 'name address' } },
    ],
  },
]

function buildContent(booking) {
  const { showtime, user } = booking
  const movie = showtime?.movie?.title ?? 'Phim'
  const cinema = showtime?.room?.cinema
  const place = cinema ? `${cinema.name} — ${showtime.room.name}` : '—'
  const when = showtime ? dateFmt.format(showtime.startTime) : '—'
  const seats = booking.seats.join(', ')
  const link = `${clientUrl()}/tickets/${booking._id}`

  const rows = [
    ['Phim', movie],
    ['Rạp', place],
    ...(cinema?.address ? [['Địa chỉ', cinema.address]] : []),
    ['Suất chiếu', when],
    ['Ghế', seats],
    ...(booking.discount > 0
      ? [
          ['Tiền vé', price(booking.subtotal ?? booking.totalPrice)],
          ['Giảm giá', `−${price(booking.discount)} (${booking.couponCode})`],
        ]
      : []),
    ['Tổng tiền', price(booking.totalPrice)],
  ]

  const text = [
    `Chào ${user.name || 'bạn'}, bạn đã đặt vé thành công.`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `Mã vé: ${booking.code}`,
    `Xem vé điện tử: ${link}`,
    '',
    'Đưa mã QR (đính kèm trong email này hoặc trong trang vé) cho nhân viên rạp để vào phòng chiếu.',
  ].join('\n')

  // Dùng bảng và style trực tiếp: nhiều ứng dụng email không hiểu CSS hiện đại
  const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#231f20;padding:20px 24px;color:#ffffff">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e3d9a5">Vé điện tử</div>
<div style="font-size:20px;font-weight:bold;margin-top:6px">${esc(movie)}</div>
</td></tr>
<tr><td style="padding:20px 24px">
<p style="margin:0 0 16px;font-size:14px">Chào ${esc(user.name || 'bạn')}, bạn đã đặt vé thành công.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
${rows
  .map(([k, v]) => `<tr><td style="padding:6px 0;color:#6b7280;width:96px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-weight:bold">${esc(v)}</td></tr>`)
  .join('\n')}
</table>
<div style="margin:20px 0;padding:16px;border:2px dashed #d1d5db;border-radius:8px;text-align:center">
<div style="font-size:12px;color:#6b7280">Mã vé</div>
<div style="font-family:Consolas,monospace;font-size:28px;font-weight:bold;letter-spacing:4px;margin-top:4px">${esc(booking.code)}</div>
</div>
<p style="margin:0 0 20px;text-align:center"><a href="${esc(link)}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px">Xem vé điện tử</a></p>
<p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5">Đưa mã QR đính kèm (ve-${esc(booking.code)}.png) hoặc mở vé điện tử cho nhân viên rạp để vào phòng chiếu.</p>
</td></tr></table></td></tr></table></body></html>`

  return { subject: `Vé xem phim ${movie} — mã ${booking.code}`, html, text }
}

// Gửi vé cho khách. force=true: khách bấm "gửi lại" nên gửi dù trước đó đã gửi.
// Lần gửi tự động sau khi thanh toán "giành" việc gửi bằng một lệnh nguyên tử, nên IPN và return URL
// của VNPay về cùng lúc cũng chỉ gửi đúng một email. Gửi lỗi thì nhả lại để lần sau còn gửi được.
async function sendTicketEmail(bookingId, { force = false } = {}) {
  if (!mailer.enabled()) return { status: 'disabled' }

  if (!force) {
    const claimed = await Booking.findOneAndUpdate(
      { _id: bookingId, paymentStatus: 'paid', emailSentAt: null },
      { emailSentAt: new Date(), $unset: { emailError: 1 } },
    )
    if (!claimed) return { status: 'skipped' }
  }
  const release = (error) =>
    force ? Booking.updateOne({ _id: bookingId }, { emailError: error }) : Booking.updateOne({ _id: bookingId }, { $unset: { emailSentAt: 1 }, emailError: error })

  try {
    const booking = await Booking.findOne({ _id: bookingId, paymentStatus: 'paid' }).populate(POPULATE)
    if (!booking) return { status: 'skipped' }
    if (!booking.user?.email) {
      await release('Tài khoản không có email')
      return { status: 'no_email' }
    }

    const { subject, html, text } = buildContent(booking)
    const qr = await QRCode.toBuffer(booking.code, { width: 400, margin: 2, errorCorrectionLevel: 'M' })
    await mailer.send({
      to: booking.user.email,
      toName: booking.user.name,
      subject,
      html,
      text,
      attachments: [{ name: `ve-${booking.code}.png`, content: qr }],
    })

    const sentAt = new Date()
    await Booking.updateOne({ _id: bookingId }, { emailSentAt: sentAt, $unset: { emailError: 1 } })
    return { status: 'sent', sentAt }
  } catch (err) {
    await release(String(err.message).slice(0, 200)).catch(() => {})
    return { status: 'failed', error: err.message }
  }
}

// Gọi sau khi thanh toán thành công: không chờ kết quả và không bao giờ làm hỏng việc ghi nhận thanh toán
function queueTicketEmail(bookingId) {
  sendTicketEmail(bookingId)
    .then((r) => r.status === 'failed' && console.warn(`[mail] Không gửi được vé cho đơn ${bookingId}: ${r.error}`))
    .catch((err) => console.error('[mail] Lỗi gửi vé:', err.message))
}

module.exports = { sendTicketEmail, queueTicketEmail, buildContent, esc, dateFmt, price, POPULATE }
