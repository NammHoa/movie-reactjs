const router = require('express').Router()
const { verifyToken } = require('../middleware/auth')
const c = require('../controllers/bookingController')

// Tất cả đều phải đăng nhập
router.post('/', verifyToken, c.create)
router.get('/mine', verifyToken, c.mine) // phải đặt trước '/:id' để "mine" không bị hiểu là một id
router.get('/:id', verifyToken, c.getOne)
router.post('/:id/cancel', verifyToken, c.cancel)

module.exports = router
