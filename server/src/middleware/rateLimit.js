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

// Lưới an toàn cho toàn bộ API, theo IP. Đủ rộng cho nhiều người cùng dùng một mạng wifi.
const apiLimiter = limiter({ windowMs: 5 * MINUTE, limit: 600 })

// Đặt SAU verifyToken: đếm theo tài khoản, nên đổi IP cũng không né được; request chưa đăng nhập thì rơi về IP.
const userKey = (req) => (req.user?.id ? `u:${req.user.id}` : ipKeyGenerator(req.ip))

// Giữ ghế và thanh toán là các thao tác tốn tài nguyên và có thể bị lạm dụng để chiếm ghế nên giới hạn chặt hơn.
const bookingCreateLimiter = limiter({ windowMs: 10 * MINUTE, limit: 10, key: userKey })
const paymentLimiter = limiter({ windowMs: 10 * MINUTE, limit: 20, key: userKey })

// Chặn đoán mật khẩu hiện tại bằng token bị lộ: chỉ đếm các lần nhập SAI mật khẩu hiện tại (403),
// nhập mật khẩu mới sai định dạng không bị tính.
const changePasswordLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 5,
  key: userKey,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => res.statusCode !== 403,
})

module.exports = {
  limiter,
  changePasswordLimiter,
  MINUTE,
  loginAccountLimiter,
  loginIpLimiter,
  registerLimiter,
  checkLimiter,
  apiLimiter,
  bookingCreateLimiter,
  paymentLimiter,
}
