const PROVIDER = process.env.PAYMENT_GATEWAY || 'mock'

// Cổng giả lập chỉ chạy ở môi trường phát triển, không bao giờ bật khi chạy thật.
const mockEnabled = () => PROVIDER === 'mock' && process.env.NODE_ENV !== 'production'

// Địa chỉ để đưa người dùng sang trang thanh toán.
// Giả lập: trang /pay/:id của chính website. Khi làm VNPay, thay bằng URL đã ký của VNPay.
const paymentUrl = (payment) => `/pay/${payment._id}`

module.exports = { PROVIDER, mockEnabled, paymentUrl }
