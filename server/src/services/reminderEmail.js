const QRCode = require('qrcode')
const Booking = require('../models/Booking')
const Showtime = require('../models/Showtime')
const mailer = require('./mailer')
const { clientUrl } = require('../config/env')
const { esc, dateFmt, POPULATE } = require('./ticketEmail')

const HOUR_MS = 60 * 60 * 1000
const MIN_LEAD_MS = 10 * 60 * 1000 // suất chiếu chỉ còn dưới mức này thì nhắc đã quá muộn
const MAX_PER_RUN = 50 // giữ trong hạn mức gửi email mỗi ngày
const MAX_ATTEMPTS = 3
const SWEEP_INTERVAL_MS = 5 * 60 * 1000

// Nhắc trước giờ chiếu bao nhiêu giờ (đọc lúc gọi để đổi cấu hình không cần sửa code)
const leadHours = () => {
  const h = Number(process.env.REMINDER_HOURS)
  return Number.isFinite(h) && h > 0 && h <= 48 ? h : 3
}

function buildContent(booking, now = new Date()) {
  const { showtime, user } = booking
  const movie = showtime?.movie?.title ?? 'Phim'
  const cinema = showtime?.room?.cinema
  const place = cinema ? `${cinema.name} — ${showtime.room.name}` : '—'
  const when = dateFmt.format(showtime.startTime)
  const hours = Math.max(1, Math.round((new Date(showtime.startTime) - now) / HOUR_MS))
  const seats = booking.seats.join(', ')
  const link = `${clientUrl()}/tickets/${booking._id}`
  const settings = `${clientUrl()}/profile`

  const rows = [
    ['Phim', movie],
    ['Rạp', place],
    ...(cinema?.address ? [['Địa chỉ', cinema.address]] : []),
    ['Suất chiếu', when],
    ['Ghế', seats],
  ]
  const intro = `Còn khoảng ${hours} giờ nữa là đến suất chiếu của bạn.`

  const text = [
    `Chào ${user.name || 'bạn'}, ${intro.charAt(0).toLowerCase()}${intro.slice(1)}`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `Mã vé: ${booking.code}`,
    `Xem vé điện tử: ${link}`,
    '',
    'Đưa mã QR (đính kèm trong email này hoặc trong trang vé) cho nhân viên rạp để vào phòng chiếu.',
    `Không muốn nhận email nhắc nữa? Tắt trong Hồ sơ: ${settings}`,
  ].join('\n')

  const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#231f20;padding:20px 24px;color:#ffffff">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e3d9a5">Sắp đến giờ chiếu</div>
<div style="font-size:20px;font-weight:bold;margin-top:6px">${esc(movie)}</div>
</td></tr>
<tr><td style="padding:20px 24px">
<p style="margin:0 0 16px;font-size:14px">Chào ${esc(user.name || 'bạn')}, ${esc(intro.charAt(0).toLowerCase() + intro.slice(1))}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#6b7280;width:96px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-weight:bold">${esc(v)}</td></tr>`).join('\n')}
</table>
<div style="margin:20px 0;padding:16px;border:2px dashed #d1d5db;border-radius:8px;text-align:center">
<div style="font-size:12px;color:#6b7280">Mã vé</div>
<div style="font-family:Consolas,monospace;font-size:28px;font-weight:bold;letter-spacing:4px;margin-top:4px">${esc(booking.code)}</div>
</div>
<p style="margin:0 0 20px;text-align:center"><a href="${esc(link)}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px">Xem vé điện tử</a></p>
<p style="margin:0 0 8px;font-size:12px;color:#6b7280;line-height:1.5">Đưa mã QR đính kèm (ve-${esc(booking.code)}.png) hoặc mở vé điện tử cho nhân viên rạp để vào phòng chiếu.</p>
<p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5">Không muốn nhận email nhắc nữa? <a href="${esc(settings)}" style="color:#9ca3af">Tắt trong Hồ sơ</a>.</p>
</td></tr></table></td></tr></table></body></html>`

  return { subject: `Nhắc lịch chiếu: ${movie} lúc ${when}`, html, text }
}

// Gửi nhắc cho một vé. Giành quyền gửi bằng lệnh nguyên tử (cần chưa nhắc, còn hợp lệ), nên hai lần chạy cùng lúc
// hay hai bộ hẹn giờ cùng gọi cũng chỉ gửi một email. Gửi lỗi thì nhả lại để lần sau thử tiếp (tối đa MAX_ATTEMPTS lần).
async function sendReminder(bookingId, now = new Date()) {
  const claimed = await Booking.findOneAndUpdate(
    { _id: bookingId, paymentStatus: 'paid', checkedInAt: null, reminderSentAt: null, reminderAttempts: { $lt: MAX_ATTEMPTS } },
    { reminderSentAt: now, $inc: { reminderAttempts: 1 }, $unset: { reminderError: 1 } },
  )
  if (!claimed) return { status: 'skipped' }

  const release = (error) => Booking.updateOne({ _id: bookingId }, { $unset: { reminderSentAt: 1 }, reminderError: error })
  try {
    const booking = await Booking.findById(bookingId).populate(POPULATE)
    if (!booking?.showtime || !booking.user?.email) {
      await release('Thiếu suất chiếu hoặc email')
      return { status: 'no_email' }
    }
    const { subject, html, text } = buildContent(booking, now)
    const qr = await QRCode.toBuffer(booking.code, { width: 400, margin: 2, errorCorrectionLevel: 'M' })
    await mailer.send({
      to: booking.user.email,
      toName: booking.user.name,
      subject,
      html,
      text,
      attachments: [{ name: `ve-${booking.code}.png`, content: qr }],
    })
    return { status: 'sent' }
  } catch (err) {
    await release(String(err.message).slice(0, 200)).catch(() => {})
    return { status: 'failed', error: err.message }
  }
}

// Tìm và nhắc các vé sắp đến giờ chiếu. Trả về thống kê của lượt chạy.
// scope: điều kiện lọc thêm cho truy vấn vé, chỉ dùng trong test để không đụng tới dữ liệu thật trong cùng database.
async function runReminders({ now = new Date(), limit = MAX_PER_RUN, scope = {} } = {}) {
  if (!mailer.enabled()) return { enabled: false, found: 0, sent: 0, failed: 0, skipped: 0 }

  const lead = leadHours() * HOUR_MS
  const showtimeIds = await Showtime.find({ startTime: { $gt: new Date(now.getTime() + MIN_LEAD_MS), $lte: new Date(now.getTime() + lead) } }).distinct('_id')
  if (!showtimeIds.length) return { enabled: true, found: 0, sent: 0, failed: 0, skipped: 0 }

  const candidates = await Booking.find({
    paymentStatus: 'paid',
    checkedInAt: null,
    reminderSentAt: null,
    reminderAttempts: { $lt: MAX_ATTEMPTS },
    showtime: { $in: showtimeIds },
    ...scope,
  })
    .sort({ createdAt: 1 })
    .limit(limit * 4)
    .populate([{ path: 'user', select: 'emailReminders email' }, { path: 'showtime', select: 'startTime' }])
    .lean()

  // Bỏ vé của người đã tắt nhắc, và vé mua ngay trong khoảng nhắc (khách vừa đặt xong, đã biết giờ chiếu)
  const eligible = candidates.filter((b) => {
    if (!b.user?.email || b.user.emailReminders === false || !b.showtime) return false
    return !b.paidAt || new Date(b.paidAt).getTime() < new Date(b.showtime.startTime).getTime() - lead
  })

  const stats = { enabled: true, found: eligible.length, sent: 0, failed: 0, skipped: 0 }
  for (const b of eligible.slice(0, limit)) {
    const r = await sendReminder(b._id, now)
    if (r.status === 'sent') stats.sent++
    else if (r.status === 'skipped') stats.skipped++
    else stats.failed++
    if (r.status === 'failed') console.warn(`[mail] Không gửi được email nhắc giờ chiếu đơn ${b._id}: ${r.error}`)
  }
  return stats
}

// Bộ quét nội bộ cho lúc server đang thức. Lúc server ngủ thì GitHub Actions gọi POST /api/internal/reminders.
function startReminderSweeper() {
  let running = false
  const timer = setInterval(() => {
    if (running) return
    running = true
    runReminders()
      .catch((err) => console.error('Reminder sweep failed:', err.message))
      .finally(() => {
        running = false
      })
  }, SWEEP_INTERVAL_MS)
  timer.unref()
}

module.exports = { buildContent, sendReminder, runReminders, startReminderSweeper, leadHours, MAX_PER_RUN, MAX_ATTEMPTS }
