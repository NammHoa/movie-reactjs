const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const User = require('../models/User')
const { serverError } = require('../utils/http')

// Xác thực token, rồi đọc lại tài khoản từ database mỗi lần gọi API.
// Nhờ vậy khi đổi quyền hoặc xóa tài khoản, thay đổi có hiệu lực ngay
// (không phải đợi token cũ hết hạn).
const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization
  const token = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null
  if (!token) return res.status(401).json({ message: 'Chưa đăng nhập' })

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' })
  }
  if (!mongoose.isValidObjectId(payload.id)) {
    return res.status(401).json({ message: 'Token không hợp lệ' })
  }

  try {
    const account = await User.findById(payload.id).select('-password')
    if (!account) return res.status(401).json({ message: 'Tài khoản không còn tồn tại' })
    // Đổi mật khẩu thì mọi phiên đăng nhập cũ (kể cả token bị lộ) mất hiệu lực. iat tính bằng giây.
    if (account.passwordChangedAt && payload.iat < Math.floor(account.passwordChangedAt.getTime() / 1000)) {
      return res.status(401).json({ message: 'Mật khẩu đã được đổi, vui lòng đăng nhập lại' })
    }
    req.account = account // toàn bộ thông tin tài khoản (không có mật khẩu)
    req.user = { id: account._id.toString(), role: account.role } // role lấy từ database
    next()
  } catch (err) {
    serverError(res, err)
  }
}

const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền' })
  }
  next()
}

module.exports = { verifyToken, isAdmin }
