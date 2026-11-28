const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

// Đổi tên database trong chuỗi kết nối thành "<tên>_test"; không bao giờ cho test chạm database thật
function testUri(uri) {
  const m = /^(mongodb(?:\+srv)?:\/\/[^/]+)\/?([^?]*)(\?.*)?$/.exec(uri || '')
  if (!m) throw new Error('MONGO_URI không hợp lệ')
  const base = m[2] || 'movie-booking'
  return `${m[1]}/${base.endsWith('_test') ? base : `${base}_test`}${m[3] || ''}`
}
process.env.MONGO_URI = testUri(process.env.MONGO_URI)
process.env.RATE_LIMIT_OFF = 'true'
process.env.EMAIL_PROVIDER = ''

const assert = require('assert')
const mongoose = require('mongoose')

async function startTestApp() {
  await mongoose.connect(process.env.MONGO_URI)
  // Chốt cuối trước khi xóa dữ liệu
  assert(mongoose.connection.name.endsWith('_test'), `Từ chối chạy test trên database "${mongoose.connection.name}"`)
  await mongoose.connection.dropDatabase()

  const app = require('../../src/app')
  // Đợi chỉ mục (kể cả unique) được tạo xong, nếu không các test chống trùng sẽ không đáng tin
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()))

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  const base = `http://127.0.0.1:${server.address().port}/api`

  const User = require('../../src/models/User')
  const { signToken } = require('../../src/utils/token')
  let users = 0

  return {
    async call(method, url, body, token) {
      const res = await fetch(base + url, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      return { status: res.status, json: await res.json().catch(() => null) }
    },
    async makeUser(role = 'user', extra = {}) {
      users += 1
      const user = await User.create({ name: `Test ${users}`, email: `test${users}@example.test`, password: 'khong-dung-de-dang-nhap', role, ...extra })
      return { user, token: signToken(user) }
    },
    async stop() {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
      assert(mongoose.connection.name.endsWith('_test'))
      await mongoose.connection.dropDatabase()
      await mongoose.disconnect()
    },
  }
}

module.exports = { testUri, startTestApp }
