const { str } = require('./http')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^0\d{9}$/
const GENDERS = ['male', 'female', 'other']

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

module.exports = { GENDERS, normalizePhone, parseIdentifier, passwordError }
