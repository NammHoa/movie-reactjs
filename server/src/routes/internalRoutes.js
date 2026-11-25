const router = require('express').Router()
const { limiter, MINUTE } = require('../middleware/rateLimit')
const { run } = require('../controllers/reminderController')

// Chặn dò khóa: giới hạn theo IP, đủ rộng cho bộ hẹn giờ gọi mỗi 15 phút
const internalLimiter = limiter({ windowMs: 10 * MINUTE, limit: 30 })

router.post('/reminders', internalLimiter, run)

module.exports = router
