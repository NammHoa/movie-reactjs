const router = require('express').Router()
const { verifyToken, isStaff } = require('../middleware/auth')
const c = require('../controllers/showtimeController')

router.get('/', c.list)
router.get('/:id/seats', c.seats)
router.get('/:id', c.getOne)

// Quản lý rạp chỉ ghi được suất trong phòng của rạp mình (controller kiểm tra)
router.post('/', verifyToken, isStaff, c.create)
router.put('/:id', verifyToken, isStaff, c.update)
router.delete('/:id', verifyToken, isStaff, c.remove)

module.exports = router
