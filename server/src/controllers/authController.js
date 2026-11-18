const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { serverError, str } = require('../utils/http')
const { GENDERS, parseIdentifier, passwordError } = require('../utils/validators')
const { signToken } = require('../utils/token')
const refreshTokens = require('../services/refreshTokens')

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
})

const findByIdentifier = (id) =>
  User.findOne(id.type === 'email' ? { email: id.value } : { phone: id.value })

// Thông tin tài khoản hiện tại (dùng để client đồng bộ lại role sau khi đổi quyền)
exports.me = (req, res) => {
  res.json({ user: publicUser(req.account) })
}

// Bước 1: kiểm tra SĐT/Email đã có tài khoản chưa
exports.check = async (req, res) => {
  try {
    const id = parseIdentifier(req.body.identifier)
    if (!id) return res.status(400).json({ message: 'Số điện thoại hoặc email không hợp lệ' })
    const exists = !!(await findByIdentifier(id))
    res.json({ exists, type: id.type, value: id.value })
  } catch (err) {
    serverError(res, err)
  }
}

exports.register = async (req, res) => {
  try {
    const name = str(req.body.name)
    const email = parseIdentifier(req.body.email)
    const phone = parseIdentifier(req.body.phone)
    const { password, gender } = req.body
    const dob = req.body.dob ? new Date(req.body.dob) : null

    if (!email || email.type !== 'email') return res.status(400).json({ message: 'Email không hợp lệ' })
    if (!phone || phone.type !== 'phone') return res.status(400).json({ message: 'Số điện thoại không hợp lệ' })
    const pwErr = passwordError(password)
    if (pwErr) return res.status(400).json({ message: pwErr })
    if (!name) return res.status(400).json({ message: 'Vui lòng nhập họ tên' })
    if (!dob || isNaN(dob) || dob > new Date()) {
      return res.status(400).json({ message: 'Ngày sinh không hợp lệ' })
    }
    if (!GENDERS.includes(gender)) return res.status(400).json({ message: 'Vui lòng chọn giới tính' })

    if (await User.findOne({ email: email.value })) {
      return res.status(409).json({ message: 'Email đã được sử dụng' })
    }
    if (await User.findOne({ phone: phone.value })) {
      return res.status(409).json({ message: 'Số điện thoại đã được sử dụng' })
    }

    const user = await User.create({
      name,
      email: email.value,
      phone: phone.value,
      password: await bcrypt.hash(password, 10),
      dob,
      gender,
      city: str(req.body.city),
      district: str(req.body.district),
      address: str(req.body.address),
    })
    res.status(201).json({ user: publicUser(user), token: signToken(user), refreshToken: await refreshTokens.issue(user._id) })
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Email hoặc số điện thoại đã được sử dụng' })
    serverError(res, err)
  }
}

exports.login = async (req, res) => {
  try {
    const id = parseIdentifier(req.body.identifier)
    const { password } = req.body
    const user = id && typeof password === 'string' ? await findByIdentifier(id) : null
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Thông tin đăng nhập hoặc mật khẩu không đúng' })
    }
    res.json({ user: publicUser(user), token: signToken(user), refreshToken: await refreshTokens.issue(user._id) })
  } catch (err) {
    serverError(res, err)
  }
}

// POST /api/auth/refresh  { refreshToken } -> cặp token mới; token cũ không dùng lại được
exports.refresh = async (req, res) => {
  try {
    const result = await refreshTokens.rotate(req.body?.refreshToken)
    if (!result) return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' })
    res.json({ user: publicUser(result.user), token: signToken(result.user), refreshToken: result.refreshToken })
  } catch (err) {
    serverError(res, err)
  }
}

// POST /api/auth/logout  { refreshToken } -> hủy phiên này (luôn trả 204, không tiết lộ token có thật hay không)
exports.logout = async (req, res) => {
  try {
    await refreshTokens.revoke(req.body?.refreshToken)
    res.status(204).end()
  } catch (err) {
    serverError(res, err)
  }
}
