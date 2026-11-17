const router = require('express').Router()
const { verifyToken } = require('../middleware/auth')
const { loginAccountLimiter, loginIpLimiter, registerLimiter, checkLimiter } = require('../middleware/rateLimit')
const { check, register, login, me } = require('../controllers/authController')

router.post('/check', checkLimiter, check)
router.post('/register', registerLimiter, register)
router.post('/login', loginAccountLimiter, loginIpLimiter, login)
router.get('/me', verifyToken, me)

module.exports = router
