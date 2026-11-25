const router = require('express').Router()
const { verifyToken } = require('../middleware/auth')
const { bookingCreateLimiter, emailLimiter, quoteLimiter, refundLimiter } = require('../middleware/rateLimit')
const c = require('../controllers/bookingController')

// Tất cả đều phải đăng nhập
router.post('/', verifyToken, bookingCreateLimiter, c.create)
router.post('/quote', verifyToken, quoteLimiter, c.quote)
router.get('/mine', verifyToken, c.mine) // phải đặt trước '/:id' để "mine" không bị hiểu là một id
router.get('/:id', verifyToken, c.getOne)
router.post('/:id/cancel', verifyToken, c.cancel)
router.post('/:id/email', verifyToken, emailLimiter, c.sendEmail)
router.post('/:id/refund', verifyToken, refundLimiter, c.refund)

module.exports = router
