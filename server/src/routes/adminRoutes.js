const router = require('express').Router()
const { verifyToken, isAdmin, isStaff } = require('../middleware/auth')
const c = require('../controllers/adminController')
const bookings = require('../controllers/adminBookingController')
const tickets = require('../controllers/adminTicketController')
const users = require('../controllers/adminUserController')
const staff = require('../controllers/staffController')
const coupons = require('../controllers/adminCouponController')
const banners = require('../controllers/bannerController')
const refundsCtl = require('../controllers/adminRefundController')

router.use(verifyToken)

// Quản lý rạp dùng được; mỗi controller này tự lọc theo rạp của người gọi
router.get('/stats', isStaff, c.stats)
router.get('/bookings', isStaff, bookings.list)
router.get('/bookings/:id', isStaff, bookings.getOne)
router.post('/bookings/:id/cancel', isStaff, bookings.cancel)
router.get('/tickets/:code', isStaff, tickets.lookup)
router.post('/tickets/:code/check-in', isStaff, tickets.checkIn)

// Mọi route khai báo DƯỚI dòng này chỉ dành cho trụ sở
router.use(isAdmin)

router.post('/bookings/:id/refund', bookings.refund)

router.get('/refunds', refundsCtl.list)
router.post('/refunds/:id/retry', refundsCtl.retry)
router.post('/refunds/:id/resolve', refundsCtl.resolve)

router.get('/users', users.list)
router.patch('/users/:id/role', users.setRole)
router.post('/users/managers', staff.createManager)
router.patch('/users/:id/manager', staff.assignCinema)
router.post('/users/:id/password', staff.resetPassword)

router.get('/coupons', coupons.list)
router.post('/coupons', coupons.create)
router.get('/coupons/:id', coupons.getOne)
router.put('/coupons/:id', coupons.update)
router.delete('/coupons/:id', coupons.remove)

router.get('/banners', banners.adminList)
router.post('/banners', banners.add)
router.put('/banners/order', banners.reorder)
router.delete('/banners/:movieId', banners.remove)

module.exports = router
