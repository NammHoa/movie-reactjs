const router = require('express').Router()
const { verifyToken } = require('../middleware/auth')
const { check, register, login, me } = require('../controllers/authController')

router.post('/check', check)
router.post('/register', register)
router.post('/login', login)
router.get('/me', verifyToken, me)

module.exports = router
