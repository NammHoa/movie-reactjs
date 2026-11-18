const PROVIDER = process.env.PAYMENT_GATEWAY || 'mock'

// Cổng giả lập chạy ở môi trường phát triển. Ở production mặc định TẮT; chỉ bật cho bản demo
// khi cố ý đặt ALLOW_MOCK_PAYMENT=true (ai cũng "thanh toán" được mà không mất tiền).
const mockEnabled = () =>
  PROVIDER === 'mock' && (process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_PAYMENT === 'true')

// Địa chỉ để đưa người dùng sang trang thanh toán.
// Giả lập: trang /pay/:id của chính website. Khi làm VNPay, thay bằng URL đã ký của VNPay.
const paymentUrl = (payment) => `/pay/${payment._id}`

const vnpayEnabled = () => PROVIDER === 'vnpay'

module.exports = { PROVIDER, mockEnabled, vnpayEnabled, paymentUrl }
