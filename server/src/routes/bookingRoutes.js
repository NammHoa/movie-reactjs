const router = require('express').Router()
const { verifyToken } = require('../middleware/auth')
const c = require('../controllers/bookingController')

// Phải đăng nhập mới đặt vé được
router.post('/', verifyToken, c.create)

module.exports = router
