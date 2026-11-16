const router = require('express').Router()
const { check, register, login } = require('../controllers/authController')

router.post('/check', check)
router.post('/register', register)
router.post('/login', login)

module.exports = router
