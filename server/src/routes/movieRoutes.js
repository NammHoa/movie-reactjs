const router = require('express').Router()
const { verifyToken, isAdmin } = require('../middleware/auth')
const { reviewLimiter } = require('../middleware/rateLimit')
const { list, boxOffice, getOne, create, update, remove } = require('../controllers/movieController')
const reviews = require('../controllers/reviewController')

// Ai cũng xem được
router.get('/', list)
router.get('/box-office', boxOffice) // đặt trước '/:id' để không bị hiểu là id phim
router.get('/:id', getOne)
router.get('/:id/reviews', reviews.list)

// Đánh giá cần đăng nhập và đã xem phim
router.get('/:id/reviews/me', verifyToken, reviews.mine)
router.put('/:id/reviews', verifyToken, reviewLimiter, reviews.save)

// Chỉ admin được thêm / sửa / xóa
router.post('/', verifyToken, isAdmin, create)
router.put('/:id', verifyToken, isAdmin, update)
router.delete('/:id', verifyToken, isAdmin, remove)

module.exports = router
