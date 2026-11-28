const User = require('../models/User')

// Dùng cho lệnh make-admin. identifier là email hoặc số điện thoại. Trả { user } hoặc { error }.
async function promoteToAdmin(identifier) {
  const id = String(identifier).trim()
  const filter = id.includes('@') ? { email: id.toLowerCase() } : { phone: id }
  const target = await User.findOne(filter).select('username')
  if (!target) return { error: 'Không tìm thấy tài khoản này' }
  // Tài khoản chi nhánh (có tên đăng nhập) không bao giờ thành admin trụ sở, kể cả khi đã bị gỡ quyền
  if (target.username) return { error: 'Đây là tài khoản chi nhánh, không cấp quyền admin được. Hãy dùng một tài khoản khác.' }

  const user = await User.findByIdAndUpdate(target._id, { role: 'admin' }, { returnDocument: 'after' })
  return user ? { user } : { error: 'Không tìm thấy tài khoản này' }
}

module.exports = { promoteToAdmin }
