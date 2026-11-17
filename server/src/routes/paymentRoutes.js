const router = require('express').Router()
const { verifyToken } = require('../middleware/auth')
const c = require('../controllers/paymentController')

router.post('/', verifyToken, c.create)
router.get('/:id', verifyToken, c.getOne)
router.post('/:id/mock-confirm', verifyToken, c.mockConfirm)

module.exports = router
