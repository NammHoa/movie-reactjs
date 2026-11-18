const crypto = require('crypto')

const SANDBOX_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
const HOLD_FALLBACK_MS = 15 * 60 * 1000

const cfg = () => ({
  tmnCode: process.env.VNPAY_TMN_CODE,
  secret: process.env.VNPAY_HASH_SECRET,
  url: process.env.VNPAY_URL || SANDBOX_URL,
  serverUrl: (process.env.SERVER_URL || '').replace(/\/+$/, ''),
})

// Giống urlencode của PHP (mẫu của VNPay): khoảng trắng thành "+", và mã hóa cả ! ' ( ) * ~
// Chữ ký được tính trên chuỗi đã mã hóa này nên phải khớp từng ký tự với phía VNPay.
const encode = (v) =>
  encodeURIComponent(String(v))
    .replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+')

const signData = (params) =>
  Object.keys(params)
    .sort()
    .map((k) => `${encode(k)}=${encode(params[k])}`)
    .join('&')

const hmac = (data) => crypto.createHmac('sha512', cfg().secret).update(Buffer.from(data, 'utf-8')).digest('hex')

// yyyyMMddHHmmss theo giờ Việt Nam (GMT+7), không phụ thuộc múi giờ của server
const vnTime = (date) => new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14)

const returnUrl = () => `${cfg().serverUrl}/api/payments/vnpay/return`

// Địa chỉ chuyển khách sang trang thanh toán VNPay, đã ký bằng HMAC-SHA512.
function buildPayUrl({ payment, booking, ip, now = new Date() }) {
  const { tmnCode, url } = cfg()
  const expires = booking.expiresAt && booking.expiresAt > now ? booking.expiresAt : new Date(now.getTime() + HOLD_FALLBACK_MS)
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: Math.round(payment.amount * 100),
    vnp_CreateDate: vnTime(now),
    vnp_ExpireDate: vnTime(expires),
    vnp_CurrCode: 'VND',
    vnp_IpAddr: ip || '127.0.0.1',
    vnp_Locale: 'vn',
    vnp_OrderInfo: `Thanh toan ve xem phim ${booking.code}`,
    vnp_OrderType: 'other',
    vnp_ReturnUrl: returnUrl(),
    vnp_TxnRef: payment.txnRef,
  }
  const data = signData(params)
  return `${url}?${data}&vnp_SecureHash=${hmac(data)}`
}

// Kiểm tra chữ ký của dữ liệu VNPay gửi về (return URL hoặc IPN). Chỉ lấy các tham số vnp_*.
function verify(query) {
  const received = query?.vnp_SecureHash
  if (typeof received !== 'string') return false
  const params = {}
  for (const [k, v] of Object.entries(query)) {
    if (!k.startsWith('vnp_') || k === 'vnp_SecureHash' || k === 'vnp_SecureHashType') continue
    if (typeof v !== 'string') return false // tham số lặp (mảng) không bao giờ hợp lệ
    params[k] = v
  }
  const expected = Buffer.from(hmac(signData(params)))
  const actual = Buffer.from(received.toLowerCase())
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

module.exports = { buildPayUrl, verify, signData, encode, vnTime, returnUrl }
