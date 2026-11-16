export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_RE = /^0\d{9}$/

export const normalizePhone = (p) => p.replace(/[\s.-]/g, '').replace(/^\+84/, '0')

// Trả về { type: 'email' | 'phone', value } hoặc null nếu sai định dạng
export function parseIdentifier(raw) {
  const v = raw.trim()
  if (v.includes('@')) return EMAIL_RE.test(v) ? { type: 'email', value: v } : null
  const phone = normalizePhone(v)
  return PHONE_RE.test(phone) ? { type: 'phone', value: phone } : null
}

// Các quy tắc mật khẩu (hiển thị dạng checklist)
export const PASSWORD_RULES = [
  { id: 'length', label: 'Có 8 đến 16 ký tự', test: (p) => p.length >= 8 && p.length <= 16 },
  { id: 'case', label: 'Ít nhất 1 chữ in hoa, 1 chữ thường', test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
  { id: 'special', label: 'Ít nhất 1 chữ số, kí tự đặc biệt', test: (p) => /[\d\W_]/.test(p) },
]

export const isPasswordValid = (p) => PASSWORD_RULES.every((r) => r.test(p))
