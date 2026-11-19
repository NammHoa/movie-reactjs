const crypto = require('crypto')
const RefreshToken = require('../models/RefreshToken')
const User = require('../models/User')

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000
// Hai tab cùng làm mới một lúc sẽ gửi cùng một token: lần thứ hai không phải là bị đánh cắp
const REUSE_GRACE_MS = 10 * 1000

const hash = (raw) => crypto.createHash('sha256').update(raw).digest('hex')

async function issue(userId, family = crypto.randomUUID()) {
  const raw = crypto.randomBytes(48).toString('base64url')
  await RefreshToken.create({ user: userId, tokenHash: hash(raw), family, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) })
  return raw
}

// Đổi refresh token lấy cặp mới. Trả { user, refreshToken } hoặc null khi token không dùng được.
async function rotate(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 200) return null
  const tokenHash = hash(raw)
  const now = new Date()

  // Một bước nguyên tử: nhiều request cùng gửi một token thì chỉ một request thắng
  const current = await RefreshToken.findOneAndUpdate(
    { tokenHash, usedAt: null, expiresAt: { $gt: now } },
    { usedAt: now },
    { returnDocument: 'after' },
  )

  if (!current) {
    const old = await RefreshToken.findOne({ tokenHash }).select('family usedAt expiresAt')
    // Token đã đổi từ lâu mà vẫn bị dùng lại: coi như bị lộ, đóng cả phiên
    if (old?.usedAt && now - old.usedAt > REUSE_GRACE_MS) await RefreshToken.deleteMany({ family: old.family })
    return null
  }

  const user = await User.findById(current.user)
  // Đổi mật khẩu sau khi cấp token này thì phiên cũ không còn hiệu lực
  if (!user || (user.passwordChangedAt && user.passwordChangedAt > current.createdAt)) {
    await RefreshToken.deleteMany({ family: current.family })
    return null
  }
  return { user, refreshToken: await issue(user._id, current.family) }
}

// Đăng xuất: hủy phiên chứa token này (không cần token còn hạn)
async function revoke(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 200) return
  const found = await RefreshToken.findOne({ tokenHash: hash(raw) }).select('family')
  if (found) await RefreshToken.deleteMany({ family: found.family })
}

const revokeAllForUser = (userId) => RefreshToken.deleteMany({ user: userId })

module.exports = { issue, rotate, revoke, revokeAllForUser }
