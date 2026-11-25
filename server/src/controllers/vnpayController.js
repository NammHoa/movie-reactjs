const Payment = require('../models/Payment')
const vnpay = require('../services/vnpay')
const { settleSuccess, settleFailure } = require('../services/paymentSettlement')
const { clientUrl } = require('../config/env')

const RESULT = {
  ok: { code: '00', message: 'Confirm Success' },
  done: { code: '02', message: 'Order already confirmed' },
  notFound: { code: '01', message: 'Order not found' },
  amount: { code: '04', message: 'Invalid amount' },
  signature: { code: '97', message: 'Invalid signature' },
  retry: { code: '99', message: 'Processing, please retry' },
}

// Xử lý kết quả VNPay gửi về. IPN (VNPay gọi server) và return URL (khách được chuyển về) dùng chung hàm này,
// nên kết quả chỉ được ghi một lần dù hai đường về cùng lúc hay IPN bị gọi lặp (xem settleSuccess).
// Mã 00 và 02 báo VNPay dừng gọi lại; 01, 04, 97, 99 khiến VNPay gọi lại IPN sau 5 phút.
async function applyResult(query) {
  if (!vnpay.verify(query)) return { result: RESULT.signature }

  const payment = await Payment.findOne({ txnRef: query.vnp_TxnRef, provider: 'vnpay' })
  if (!payment) return { result: RESULT.notFound }
  if (Number(query.vnp_Amount) !== Math.round(payment.amount * 100)) return { result: RESULT.amount, payment }

  const details = {}
  if (query.vnp_TransactionNo) details.gatewayTxnNo = query.vnp_TransactionNo
  if (query.vnp_BankCode) details.bankCode = query.vnp_BankCode
  if (/^\d{14}$/.test(query.vnp_PayDate ?? '')) details.gatewayPayDate = query.vnp_PayDate

  // Chỉ coi là thành công khi cả hai mã đều là 00 (mẫu của VNPay dùng "hoặc", lỏng hơn mức cần thiết).
  if (query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00') {
    const { outcome } = await settleSuccess(payment, details)
    if (outcome === 'busy') return { result: RESULT.retry, payment }
    if (outcome === 'already_paid' || outcome === 'already_failed') return { result: RESULT.done, payment }
    if (outcome === 'not_payable') console.warn(`[vnpay] Khách đã bị trừ tiền nhưng đơn không còn hợp lệ, cần hoàn tiền: ${payment.txnRef} (${details.gatewayTxnNo})`)
    return { result: RESULT.ok, payment }
  }

  const { changed, payment: current } = await settleFailure(payment, `vnpay_${query.vnp_ResponseCode}`, details)
  if (changed) return { result: RESULT.ok, payment }
  return { result: current.status === 'processing' ? RESULT.retry : RESULT.done, payment }
}

// GET /api/payments/vnpay/ipn : VNPay gọi thẳng vào server, phải trả JSON { RspCode, Message }
exports.ipn = async (req, res) => {
  try {
    const { result } = await applyResult(req.query)
    res.json({ RspCode: result.code, Message: result.message })
  } catch (err) {
    console.error('VNPay IPN error:', err.message)
    res.json({ RspCode: '99', Message: 'Unknown error' })
  }
}

// GET /api/payments/vnpay/return : trình duyệt của khách được VNPay chuyển về, rồi đưa tiếp sang trang kết quả.
// Trang kết quả luôn đọc trạng thái thật từ database, không hiển thị gì từ tham số trên URL.
exports.returnUrl = async (req, res) => {
  const base = clientUrl()
  try {
    const { payment } = await applyResult(req.query)
    res.redirect(payment ? `${base}/payment/result/${payment._id}` : `${base}/my-tickets`)
  } catch (err) {
    console.error('VNPay return error:', err.message)
    res.redirect(`${base}/my-tickets`)
  }
}
