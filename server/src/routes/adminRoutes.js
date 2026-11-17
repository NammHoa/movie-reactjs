const router = require('express').Router()
const { verifyToken, isAdmin } = require('../middleware/auth')
const c = require('../controllers/adminController')

// Toàn bộ khu vực này chỉ dành cho admin
router.use(verifyToken, isAdmin)

router.get('/stats', c.stats)

module.exports = router
