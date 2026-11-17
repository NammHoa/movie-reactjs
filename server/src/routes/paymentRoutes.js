const router = require('express').Router()
const { verifyToken } = require('../middleware/auth')
const { paymentLimiter } = require('../middleware/rateLimit')
const c = require('../controllers/paymentController')

router.post('/', verifyToken, paymentLimiter, c.create)
router.get('/:id', verifyToken, c.getOne)
router.post('/:id/mock-confirm', verifyToken, paymentLimiter, c.mockConfirm)

module.exports = router
