import api from '../api/axios'

// Giao dịch kèm đơn đặt vé đầy đủ (phim, rạp, ghế...) để hiển thị
export async function loadPayment(id) {
  const { data: payment } = await api.get(`/payments/${id}`)
  const { data: booking } = await api.get(`/bookings/${payment.booking._id}`)
  return { payment, booking }
}

// Lý do giao dịch thất bại: mã VNPay có dạng "vnpay_<mã>" (xem bảng mã vnp_ResponseCode của VNPay)
const FAIL_MESSAGES = {
  vnpay_24: 'Bạn đã hủy giao dịch tại VNPay.',
  vnpay_11: 'Giao dịch đã hết hạn chờ thanh toán.',
  vnpay_51: 'Tài khoản không đủ số dư để thực hiện giao dịch.',
  vnpay_65: 'Tài khoản đã vượt hạn mức giao dịch trong ngày.',
  vnpay_09: 'Thẻ/tài khoản chưa đăng ký dịch vụ InternetBanking.',
  vnpay_10: 'Xác thực thông tin thẻ/tài khoản sai quá 3 lần.',
  vnpay_12: 'Thẻ/tài khoản đang bị khóa.',
  vnpay_13: 'Bạn nhập sai mật khẩu xác thực (OTP).',
  vnpay_79: 'Bạn nhập sai mật khẩu thanh toán quá số lần quy định.',
  vnpay_75: 'Ngân hàng thanh toán đang bảo trì.',
  vnpay_07: 'Giao dịch bị nghi ngờ bất thường và đang được VNPay xem xét.',
}

export const failMessage = (reason) => FAIL_MESSAGES[reason] || null
