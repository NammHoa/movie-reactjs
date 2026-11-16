const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^0\d{9}$/
const GENDERS = ['male', 'female', 'other']

const str = (v) => (typeof v === 'string' ? v.trim() : '')

const normalizePhone = (p) => str(p).replace(/[\s.-]/g, '').replace(/^\+84/, '0')

// "abc@x.com" -> { type: 'email' }, "0988..." -> { type: 'phone' }, sai định dạng -> null
const parseIdentifier = (raw) => {
  const v = str(raw)
  if (v.includes('@')) {
    return EMAIL_RE.test(v) ? { type: 'email', value: v.toLowerCase() } : null
  }
  const phone = normalizePhone(v)
  return PHONE_RE.test(phone) ? { type: 'phone', value: phone } : null
}

// 8-16 ký tự, có chữ hoa, chữ thường, và số hoặc ký tự đặc biệt
const passwordError = (pw) => {
  if (typeof pw !== 'string' || pw.length < 8 || pw.length > 16) return 'Mật khẩu phải có từ 8 đến 16 ký tự'
  if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw)) return 'Mật khẩu cần ít nhất 1 chữ hoa và 1 chữ thường'
  if (!/[\d\W_]/.test(pw)) return 'Mật khẩu cần ít nhất 1 chữ số hoặc ký tự đặc biệt'
  return null
}

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
})

const findByIdentifier = (id) =>
  User.findOne(id.type === 'email' ? { email: id.value } : { phone: id.value })

// Bước 1: kiểm tra SĐT/Email đã có tài khoản chưa
exports.check = async (req, res) => {
  try {
    const id = parseIdentifier(req.body.identifier)
    if (!id) return res.status(400).json({ message: 'Số điện thoại hoặc email không hợp lệ' })
    const exists = !!(await findByIdentifier(id))
    res.json({ exists, type: id.type, value: id.value })
  } catch (err) {
    res.status(500).json({ message: err.message })
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
    res.status(201).json({ user: publicUser(user), token: signToken(user) })
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Email hoặc số điện thoại đã được sử dụng' })
    res.status(500).json({ message: err.message })
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
    res.json({ user: publicUser(user), token: signToken(user) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
