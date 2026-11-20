const router = require('express').Router()
const { verifyToken } = require('../middleware/auth')
const { reviewLimiter } = require('../middleware/rateLimit')
const { remove } = require('../controllers/reviewController')

router.delete('/:id', verifyToken, reviewLimiter, remove)

module.exports = router
