const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'
const TIMEOUT_MS = 15 * 1000

const provider = () => process.env.EMAIL_PROVIDER || ''

// brevo: gửi thật. console: chỉ ghi log, dùng khi dev. Chưa cấu hình (hoặc console ở production) thì tắt hẳn,
// để giao diện không hứa "đã gửi email" khi thực tế không có gì được gửi đi.
const enabled = () => provider() === 'brevo' || (provider() === 'console' && process.env.NODE_ENV !== 'production')

// Gửi bằng HTTP API chứ không dùng SMTP: Render (gói free) chặn các cổng SMTP 25/465/587.
async function send({ to, toName, subject, html, text, attachments = [] }) {
  if (!enabled()) throw new Error('Email chưa được bật')

  if (provider() === 'console') {
    console.log(`[mail] to=${to} subject="${subject}" attachments=${attachments.map((a) => a.name).join(',') || '-'}`)
    return
  }

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.MAIL_FROM_NAME || 'MovieBooking', email: process.env.MAIL_FROM_EMAIL },
      to: [{ email: to, name: toName || undefined }],
      subject,
      htmlContent: html,
      textContent: text,
      attachment: attachments.length ? attachments.map((a) => ({ name: a.name, content: a.content.toString('base64') })) : undefined,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // Chỉ lấy lời giải thích của Brevo, không bao giờ in khóa API
    throw new Error(`Brevo ${res.status}: ${String(body.message || 'lỗi không rõ').slice(0, 200)}`)
  }
}

module.exports = { enabled, send }
