const { serverError } = require('../utils/http')

// Lỗi phát sinh trước khi vào controller (đọc body JSON...) và mọi lỗi chưa được bắt.
// Luôn trả JSON ngắn gọn, không bao giờ lộ nội dung lỗi nội bộ hay stack cho người dùng.
module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err)
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Dữ liệu gửi lên không phải JSON hợp lệ' })
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Dữ liệu gửi lên quá lớn' })
  if (err.status >= 400 && err.status < 500) return res.status(err.status).json({ message: 'Yêu cầu không hợp lệ' })
  serverError(res, err)
}
