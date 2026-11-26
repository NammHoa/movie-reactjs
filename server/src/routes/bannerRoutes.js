const router = require('express').Router()
const { list } = require('../controllers/bannerController')

router.get('/', list)

module.exports = router
