// Dùng: npm run make-admin -- <email hoặc số điện thoại>
require('dotenv').config()
require('dns').setServers(['8.8.8.8', '1.1.1.1'])
const mongoose = require('mongoose')
const { promoteToAdmin } = require('../src/services/adminAccounts')

const id = (process.argv[2] || '').trim()
if (!id) {
  console.error('Thiếu tham số. Ví dụ: npm run make-admin -- ban@gmail.com')
  process.exit(1)
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    const { user, error } = await promoteToAdmin(id)
    console.log(user ? `Đã cấp quyền admin cho: ${user.name} (${user.email})` : error)
    process.exit(user ? 0 : 1)
  })
  .catch((err) => {
    console.error('Lỗi:', err.message)
    process.exit(1)
  })
