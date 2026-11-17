const { rateLimit, ipKeyGenerator } = require('express-rate-limit')

const MINUTE = 60 * 1000

const humanize = (seconds) => (seconds < 90 ? `${seconds} giây` : `${Math.ceil(seconds / 60)} phút`)

// Bộ đếm nằm trong RAM của tiến trình: chạy nhiều server song song thì mỗi server đếm riêng
// (khi đó cần chuyển sang kho dùng chung như Redis). Tắt được khi dev bằng RATE_LIMIT_OFF=true,
// nhưng luôn bật ở production.
function limiter({ windowMs, limit, key, ...options }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV !== 'production' && process.env.RATE_LIMIT_OFF === 'true',
    keyGenerator: key || ((req) => ipKeyGenerator(req.ip)),
    handler: (req, res) => {
      const retryAfter = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000))
      res.status(429).json({
        message: `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${humanize(retryAfter)}.`,
        retryAfter,
      })
    },
    ...options,
  })
}

const identifierOf = (req) => {
  const v = req.body?.identifier
  return typeof v === 'string' ? v.trim().toLowerCase().slice(0, 100) : ''
}

const loginAccountLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 8,
  skipSuccessfulRequests: true,
  key: (req) => `${ipKeyGenerator(req.ip)}|${identifierOf(req)}`,
})
const loginIpLimiter = limiter({ windowMs: 15 * MINUTE, limit: 30, skipSuccessfulRequests: true })

// Chỉ đếm lần đăng ký THÀNH CÔNG: chặn tạo tài khoản hàng loạt nhưng không phạt người gõ sai form.
const registerLimiter = limiter({ windowMs: 60 * MINUTE, limit: 10, skipFailedRequests: true })

// Bước kiểm tra "SĐT/Email đã có tài khoản chưa" có thể bị dùng để dò danh sách người dùng.
const checkLimiter = limiter({ windowMs: 15 * MINUTE, limit: 40 })

module.exports = { limiter, MINUTE, loginAccountLimiter, loginIpLimiter, registerLimiter, checkLimiter }
