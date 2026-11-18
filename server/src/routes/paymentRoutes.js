const router = require('express').Router()
const { verifyToken } = require('../middleware/auth')
const { paymentLimiter } = require('../middleware/rateLimit')
const c = require('../controllers/paymentController')
const vnpayCtrl = require('../controllers/vnpayController')

// Hai địa chỉ này do VNPay / trình duyệt gọi, không có token đăng nhập: độ tin cậy nằm ở chữ ký (xem services/vnpay.js).
// Phải khai báo trước '/:id'.
router.get('/vnpay/ipn', vnpayCtrl.ipn)
router.get('/vnpay/return', vnpayCtrl.returnUrl)

router.post('/', verifyToken, paymentLimiter, c.create)
router.get('/:id', verifyToken, c.getOne)
router.post('/:id/mock-confirm', verifyToken, paymentLimiter, c.mockConfirm)

module.exports = router
