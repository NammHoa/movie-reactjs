const router = require('express').Router()
const { verifyToken } = require('../middleware/auth')
const { loginAccountLimiter, loginIpLimiter, registerLimiter, checkLimiter, changePasswordLimiter } = require('../middleware/rateLimit')
const { check, register, login, me } = require('../controllers/authController')
const profile = require('../controllers/profileController')

router.post('/check', checkLimiter, check)
router.post('/register', registerLimiter, register)
router.post('/login', loginAccountLimiter, loginIpLimiter, login)
router.get('/me', verifyToken, me)
router.get('/profile', verifyToken, profile.get)
router.patch('/profile', verifyToken, profile.update)
router.post('/change-password', verifyToken, changePasswordLimiter, profile.changePassword)

module.exports = router
