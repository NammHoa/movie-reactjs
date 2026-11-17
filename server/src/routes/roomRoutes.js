const router = require('express').Router()
const { verifyToken, isAdmin } = require('../middleware/auth')
const c = require('../controllers/cinemaController')

// Phòng chiếu: GET /api/rooms?cinema=<id>
router.get('/', c.listRooms)
router.post('/', verifyToken, isAdmin, c.createRoom)
router.put('/:id', verifyToken, isAdmin, c.updateRoom)
router.delete('/:id', verifyToken, isAdmin, c.removeRoom)

module.exports = router
