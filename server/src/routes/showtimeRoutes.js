const router = require('express').Router()
const { verifyToken, isAdmin } = require('../middleware/auth')
const c = require('../controllers/showtimeController')

router.get('/', c.list)
router.get('/:id', c.getOne)

router.post('/', verifyToken, isAdmin, c.create)
router.put('/:id', verifyToken, isAdmin, c.update)
router.delete('/:id', verifyToken, isAdmin, c.remove)

module.exports = router
