const crypto = require('crypto')
const { runReminders } = require('../services/reminderEmail')

const digest = (v) => crypto.createHash('sha256').update(String(v)).digest()

// POST /api/internal/reminders: bộ hẹn giờ bên ngoài (GitHub Actions) gọi để gửi email nhắc giờ chiếu.
// Bảo vệ bằng khóa CRON_SECRET (so sánh thời gian cố định). Chưa đặt khóa thì địa chỉ này coi như không tồn tại.
exports.run = async (req, res) => {
  const secret = process.env.CRON_SECRET
  if (!secret) return res.status(404).json({ message: 'Không tìm thấy API' })

  const header = req.headers.authorization || ''
  const given = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!crypto.timingSafeEqual(digest(given), digest(secret))) return res.status(401).json({ message: 'Không có quyền' })

  try {
    res.json(await runReminders())
  } catch (err) {
    console.error('Reminder run failed:', err.message)
    res.status(500).json({ message: 'Lỗi máy chủ' })
  }
}
