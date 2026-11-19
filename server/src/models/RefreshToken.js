const mongoose = require('mongoose')

// Chỉ lưu bản băm SHA-256 của refresh token: lộ database cũng không dùng được token.
// Các token cùng một lần đăng nhập thuộc cùng một "family"; thu hồi family là đăng xuất phiên đó.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date, // đã đổi lấy token mới; dùng lại token này nghĩa là có người giữ bản sao
  },
  { timestamps: true },
)

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('RefreshToken', refreshTokenSchema)
