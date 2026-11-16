const router = require('express').Router()
const { verifyToken, isAdmin } = require('../middleware/auth')
const { list, getOne, create, update, remove } = require('../controllers/movieController')

// Ai cũng xem được
router.get('/', list)
router.get('/:id', getOne)

// Chỉ admin được thêm / sửa / xóa
router.post('/', verifyToken, isAdmin, create)
router.put('/:id', verifyToken, isAdmin, update)
router.delete('/:id', verifyToken, isAdmin, remove)

module.exports = router
