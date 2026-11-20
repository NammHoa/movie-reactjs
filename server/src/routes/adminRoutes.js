const router = require('express').Router()
const { verifyToken, isAdmin } = require('../middleware/auth')
const c = require('../controllers/adminController')
const bookings = require('../controllers/adminBookingController')
const tickets = require('../controllers/adminTicketController')
const users = require('../controllers/adminUserController')
const coupons = require('../controllers/adminCouponController')

// Toàn bộ khu vực này chỉ dành cho admin
router.use(verifyToken, isAdmin)

router.get('/stats', c.stats)

router.get('/bookings', bookings.list)
router.get('/bookings/:id', bookings.getOne)
router.post('/bookings/:id/cancel', bookings.cancel)

router.get('/users', users.list)
router.patch('/users/:id/role', users.setRole)

router.get('/coupons', coupons.list)
router.post('/coupons', coupons.create)
router.get('/coupons/:id', coupons.getOne)
router.put('/coupons/:id', coupons.update)
router.delete('/coupons/:id', coupons.remove)

router.get('/tickets/:code', tickets.lookup)
router.post('/tickets/:code/check-in', tickets.checkIn)

module.exports = router
