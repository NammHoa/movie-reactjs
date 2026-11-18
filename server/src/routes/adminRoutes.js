const router = require('express').Router()
const { verifyToken, isAdmin } = require('../middleware/auth')
const c = require('../controllers/adminController')
const bookings = require('../controllers/adminBookingController')

// Toàn bộ khu vực này chỉ dành cho admin
router.use(verifyToken, isAdmin)

router.get('/stats', c.stats)

router.get('/bookings', bookings.list)
router.get('/bookings/:id', bookings.getOne)
router.post('/bookings/:id/cancel', bookings.cancel)

module.exports = router
