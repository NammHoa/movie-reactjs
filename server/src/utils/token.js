const jwt = require('jsonwebtoken')

const ACCESS_TOKEN_TTL = '15m'

const signToken = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL })

module.exports = { signToken }
