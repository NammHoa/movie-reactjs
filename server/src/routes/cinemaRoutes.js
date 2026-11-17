const router = require('express').Router()
const { verifyToken, isAdmin } = require('../middleware/auth')
const c = require('../controllers/cinemaController')

// Rạp: ai cũng xem được, chỉ admin được thêm / sửa / xóa
router.get('/', c.list)
router.post('/', verifyToken, isAdmin, c.create)
router.put('/:id', verifyToken, isAdmin, c.update)
router.delete('/:id', verifyToken, isAdmin, c.remove)

module.exports = router
