// Dùng: npm run make-admin -- <email hoặc số điện thoại>
require('dotenv').config()
require('dns').setServers(['8.8.8.8', '1.1.1.1'])
const mongoose = require('mongoose')
const User = require('../src/models/User')

const id = (process.argv[2] || '').trim()
if (!id) {
  console.error('Thiếu tham số. Ví dụ: npm run make-admin -- ban@gmail.com')
  process.exit(1)
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    const filter = id.includes('@') ? { email: id.toLowerCase() } : { phone: id }
    const user = await User.findOneAndUpdate(filter, { role: 'admin' }, { new: true })
    console.log(user ? `Đã cấp quyền admin cho: ${user.name} (${user.email})` : 'Không tìm thấy tài khoản này')
    process.exit(user ? 0 : 1)
  })
  .catch((err) => {
    console.error('Lỗi:', err.message)
    process.exit(1)
  })
