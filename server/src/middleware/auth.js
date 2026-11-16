const jwt = require('jsonwebtoken')

const verifyToken = (req, res, next) => {
  const header = req.headers.authorization
  const token = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null
  if (!token) return res.status(401).json({ message: 'Chưa đăng nhập' })

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' })
  }
}

const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền' })
  }
  next()
}

module.exports = { verifyToken, isAdmin }
