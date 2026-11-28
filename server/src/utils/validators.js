const { str } = require('./http')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^0\d{9}$/
const GENDERS = ['male', 'female', 'other']

const normalizePhone = (p) => str(p).replace(/[\s.-]/g, '').replace(/^\+84/, '0')

// Tên đăng nhập của tài khoản chi nhánh. Bắt buộc có chữ cái nên không bao giờ trùng dạng với số điện thoại.
const USERNAME_RE = /^(?=.*[a-z])[a-z0-9.]{4,30}$/

// "abc@x.com" -> { type: 'email' }, "0988..." -> { type: 'phone' }, "svh.denim" -> { type: 'username' }, sai định dạng -> null
const parseIdentifier = (raw) => {
  const v = str(raw)
  if (v.includes('@')) {
    return EMAIL_RE.test(v) ? { type: 'email', value: v.toLowerCase() } : null
  }
  const phone = normalizePhone(v)
  if (PHONE_RE.test(phone)) return { type: 'phone', value: phone }
  const username = v.toLowerCase()
  return USERNAME_RE.test(username) ? { type: 'username', value: username } : null
}

// 8-16 ký tự, có chữ hoa, chữ thường, và số hoặc ký tự đặc biệt
const passwordError = (pw) => {
  if (typeof pw !== 'string' || pw.length < 8 || pw.length > 16) return 'Mật khẩu phải có từ 8 đến 16 ký tự'
  if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw)) return 'Mật khẩu cần ít nhất 1 chữ hoa và 1 chữ thường'
  if (!/[\d\W_]/.test(pw)) return 'Mật khẩu cần ít nhất 1 chữ số hoặc ký tự đặc biệt'
  return null
}

module.exports = { GENDERS, USERNAME_RE, normalizePhone, parseIdentifier, passwordError }
