const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { str, wrap } = require('../utils/http')
const { signToken } = require('../utils/token')
const refreshTokens = require('../services/refreshTokens')
const { GENDERS, parseIdentifier, passwordError } = require('../utils/validators')

const NAME_MAX = 100
const PLACE_MAX = 100
const ADDRESS_MAX = 200

const profileOf = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  dob: u.dob ?? null,
  gender: u.gender ?? null,
  city: u.city ?? '',
  district: u.district ?? '',
  address: u.address ?? '',
})

// GET /api/auth/profile
exports.get = (req, res) => {
  res.json({ user: profileOf(req.account) })
}

// Kiểm tra từng trường được gửi lên; trả { update } hoặc { error }
const parse = (body) => {
  const update = {}

  if ('name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return { error: 'Vui lòng nhập họ tên' }
    if (name.length > NAME_MAX) return { error: `Họ tên tối đa ${NAME_MAX} ký tự` }
    update.name = name
  }

  if ('phone' in body) {
    const phone = parseIdentifier(body.phone)
    if (!phone || phone.type !== 'phone') return { error: 'Số điện thoại không hợp lệ' }
    update.phone = phone.value
  }

  if ('dob' in body) {
    const dob = typeof body.dob === 'string' && /^\d{4}-\d{2}-\d{2}/.test(body.dob) ? new Date(body.dob) : null
    if (!dob || isNaN(dob) || dob > new Date() || dob.getFullYear() < 1900) return { error: 'Ngày sinh không hợp lệ' }
    update.dob = dob
  }

  if ('gender' in body) {
    if (!GENDERS.includes(body.gender)) return { error: 'Giới tính không hợp lệ' }
    update.gender = body.gender
  }

  // Địa chỉ không bắt buộc: gửi chuỗi rỗng để xóa
  for (const [field, max] of [['city', PLACE_MAX], ['district', PLACE_MAX], ['address', ADDRESS_MAX]]) {
    if (!(field in body)) continue
    if (typeof body[field] !== 'string') return { error: 'Địa chỉ không hợp lệ' }
    const value = str(body[field])
    if (value.length > max) return { error: `Địa chỉ quá dài (tối đa ${max} ký tự)` }
    update[field] = value
  }

  return { update }
}

// PATCH /api/auth/profile — chỉ sửa các trường được gửi lên.
// Email, quyền và mật khẩu không sửa được ở đây (dù có gửi lên cũng bị bỏ qua).
exports.update = wrap(async (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}
  const { update, error } = parse(body)
  if (error) return res.status(400).json({ message: error })
  if (Object.keys(update).length === 0) return res.status(400).json({ message: 'Không có thông tin nào để cập nhật' })

  if (update.phone && update.phone !== req.account.phone) {
    const taken = await User.exists({ phone: update.phone, _id: { $ne: req.account._id } })
    if (taken) return res.status(409).json({ message: 'Số điện thoại đã được sử dụng' })
  }

  try {
    const user = await User.findByIdAndUpdate(req.account._id, { $set: update }, { returnDocument: 'after' }).select('-password')
    if (!user) return res.status(401).json({ message: 'Tài khoản không còn tồn tại' })
    res.json({ user: profileOf(user) })
  } catch (err) {
    // Hai yêu cầu cùng lúc giành một số điện thoại: chỉ mục unique của database là chốt chặn cuối
    if (err.code === 11000) return res.status(409).json({ message: 'Số điện thoại đã được sử dụng' })
    throw err
  }
})

// POST /api/auth/change-password  { currentPassword, newPassword }
// Trả token mới cho phiên hiện tại; các token cũ (thiết bị khác) bị vô hiệu hóa.
// Sai mật khẩu hiện tại trả 403 chứ không phải 401, vì client coi 401 là "hết phiên" và tự đăng xuất.
exports.changePassword = wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {}
  if (typeof currentPassword !== 'string' || !currentPassword) {
    return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại' })
  }
  const pwErr = passwordError(newPassword)
  if (pwErr) return res.status(400).json({ message: pwErr })
  if (newPassword === currentPassword) {
    return res.status(400).json({ message: 'Mật khẩu mới phải khác mật khẩu hiện tại' })
  }

  const user = await User.findById(req.account._id).select('password')
  if (!user) return res.status(401).json({ message: 'Tài khoản không còn tồn tại' })
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(403).json({ message: 'Mật khẩu hiện tại không đúng' })
  }

  // Chỉ ghi nếu mật khẩu vẫn là bản vừa kiểm tra, tránh hai lần đổi chạy chồng lên nhau
  const updated = await User.findOneAndUpdate(
    { _id: user._id, password: user.password },
    { password: await bcrypt.hash(newPassword, 10), passwordChangedAt: new Date() },
    { returnDocument: 'after' },
  )
  if (!updated) return res.status(409).json({ message: 'Mật khẩu vừa được thay đổi ở nơi khác, vui lòng thử lại' })

  // Đăng xuất mọi thiết bị khác, giữ phiên hiện tại bằng refresh token mới
  await refreshTokens.revokeAllForUser(updated._id)
  res.json({ message: 'Đã đổi mật khẩu', token: signToken(updated), refreshToken: await refreshTokens.issue(updated._id) })
})
