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

const REFUND_URL = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'
const REFUND_TIMEOUT_MS = 20 * 1000

// Chữ ký của API hoàn tiền: các trường ghép bằng "|" theo đúng thứ tự VNPay quy định (khác chữ ký của đường dẫn thanh toán).
const REQUEST_FIELDS = ['vnp_RequestId', 'vnp_Version', 'vnp_Command', 'vnp_TmnCode', 'vnp_TransactionType', 'vnp_TxnRef', 'vnp_Amount', 'vnp_TransactionNo', 'vnp_TransactionDate', 'vnp_CreateBy', 'vnp_CreateDate', 'vnp_IpAddr', 'vnp_OrderInfo']
const RESPONSE_FIELDS = ['vnp_ResponseId', 'vnp_Command', 'vnp_ResponseCode', 'vnp_Message', 'vnp_TmnCode', 'vnp_TxnRef', 'vnp_Amount', 'vnp_BankCode', 'vnp_PayDate', 'vnp_TransactionNo', 'vnp_TransactionType', 'vnp_TransactionStatus', 'vnp_OrderInfo', 'vnp_PromotionCode', 'vnp_PromotionAmount']
const joinFields = (fields, data) => fields.map((k) => data[k] ?? '').join('|')

// Gọi API hoàn tiền toàn phần (loại 02). Trả về:
//   { status: 'success', refNo }    VNPay nhận yêu cầu hoàn tiền (mã 00)
//   { status: 'rejected', reason }  VNPay từ chối rõ ràng (mã khác 00): chưa hoàn, có thể thử lại sau khi sửa nguyên nhân
//   { status: 'unknown', reason }   không có phản hồi đáng tin (mạng, lỗi máy chủ, chữ ký sai): KHÔNG biết tiền đã hoàn hay chưa
async function refund({ payment, booking, amount, createBy, ip, now = new Date() }) {
  const { tmnCode } = cfg()
  const payDate = payment.gatewayPayDate || (payment.paidAt ? vnTime(payment.paidAt) : '')
  const body = {
    vnp_RequestId: crypto.randomBytes(16).toString('hex'),
    vnp_Version: '2.1.0',
    vnp_Command: 'refund',
    vnp_TmnCode: tmnCode,
    vnp_TransactionType: '02',
    vnp_TxnRef: payment.txnRef,
    vnp_Amount: String(Math.round(amount * 100)),
    vnp_OrderInfo: `Hoan tien ve ${booking.code}`,
    vnp_TransactionNo: payment.gatewayTxnNo || '0',
    vnp_TransactionDate: payDate,
    vnp_CreateDate: vnTime(now),
    vnp_CreateBy: String(createBy || 'system').slice(0, 50),
    vnp_IpAddr: ip || '127.0.0.1',
  }
  body.vnp_SecureHash = hmac(joinFields(REQUEST_FIELDS, body))

  // Mọi trường hợp "chưa rõ kết quả" đều ghi log kèm nguyên nhân và thời gian chờ để còn biết đường sửa (không ghi khóa hay chữ ký)
  const startedAt = Date.now()
  const unknown = (reason, detail = '') => {
    console.warn(`[vnpay] Hoàn tiền ${payment.txnRef}: ${reason} sau ${Date.now() - startedAt}ms${detail ? ` - ${detail}` : ''}`)
    return { status: 'unknown', reason }
  }

  let res, text
  try {
    res = await fetch(process.env.VNPAY_REFUND_URL || REFUND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REFUND_TIMEOUT_MS),
    })
    text = await res.text()
  } catch (err) {
    if (err?.name === 'TimeoutError') return unknown('timeout', `quá ${REFUND_TIMEOUT_MS / 1000} giây không có phản hồi`)
    const code = err?.cause?.code ?? err?.code ?? err?.name ?? 'error'
    return unknown(`network_${code}`, String(err?.cause?.message ?? err?.message ?? '').slice(0, 150))
  }

  const snippet = text.replace(/\s+/g, ' ').slice(0, 300)
  if (!res.ok) return unknown(`http_${res.status}`, snippet)
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return unknown('invalid_response', `HTTP ${res.status}, ${res.headers?.get?.('content-type') ?? 'không có content-type'}: ${snippet || '(rỗng)'}`)
  }

  // Không tin phản hồi nếu chữ ký không khớp
  const expected = Buffer.from(hmac(joinFields(RESPONSE_FIELDS, data ?? {})))
  const actual = Buffer.from(String(data?.vnp_SecureHash ?? '').toLowerCase())
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return unknown('bad_signature', `mã phản hồi: ${String(data?.vnp_ResponseCode ?? '?').slice(0, 10)}`)

  if (data.vnp_ResponseCode === '00') return { status: 'success', refNo: data.vnp_TransactionNo || data.vnp_ResponseId }
  return { status: 'rejected', reason: `vnpay_${data.vnp_ResponseCode}` }
}

module.exports = { buildPayUrl, verify, refund, signData, encode, vnTime, returnUrl }
