const test = require('node:test')
const assert = require('node:assert/strict')
const { startTestApp } = require('./helpers/testApp')
const { parseIdentifier } = require('../src/utils/validators')

// Mật khẩu chỉ dùng cho test
const PASS = 'Chi-Test-01'
const NEXT = 'Chi-Test-02'

let app
let Cinema
let Movie
let Room
let User

let a
let b
let roomA
let movie
let hq

test.before(async () => {
  app = await startTestApp()
  Cinema = require('../src/models/Cinema')
  Movie = require('../src/models/Movie')
  Room = require('../src/models/Room')
  User = require('../src/models/User')
})
test.after(() => app.stop())

test.beforeEach(async () => {
  await Promise.all([Cinema, Movie, Room, User, require('../src/models/Showtime')].map((m) => m.deleteMany({})))
  a = await Cinema.create({ name: 'Rạp A' })
  b = await Cinema.create({ name: 'Rạp B' })
  roomA = await Room.create({ cinema: a._id, name: 'Phòng 1' })
  movie = await Movie.create({ title: 'Phim chung', duration: 100, status: 'now_showing' })
  hq = await app.makeUser('admin')
})

const create = (extra = {}) =>
  app.call('POST', '/admin/users/managers', { username: 'svh.test', name: 'Quản lý A', email: 'svh@example.test', cinema: a._id, password: PASS, ...extra }, hq.token)
const login = (identifier, password) => app.call('POST', '/auth/login', { identifier, password })
const role = (id, value) => app.call('PATCH', `/admin/users/${id}/role`, { role: value }, hq.token)

test('phân biệt email, số điện thoại và tên đăng nhập', () => {
  assert.deepEqual(parseIdentifier('  SVH.Test '), { type: 'username', value: 'svh.test' })
  assert.deepEqual(parseIdentifier('0988.123.456'), { type: 'phone', value: '0988123456' })
  assert.equal(parseIdentifier('A@B.vn').type, 'email')
  for (const bad of ['abc', '12345', '....', 'ten co cach', 'ten_gach', 'a'.repeat(31), 'a@b']) {
    assert.equal(parseIdentifier(bad), null, bad)
  }
})

test('trụ sở tạo tài khoản và quản lý đăng nhập được', async () => {
  const made = await create({ username: 'SVH.Test' })
  assert.equal(made.status, 201)
  assert.deepEqual([made.json.username, made.json.role, made.json.cinema.name], ['svh.test', 'manager', a.name])
  assert.equal(made.json.password, undefined)

  const res = await login(' Svh.TEST ', PASS)
  assert.equal(res.status, 200)
  assert.deepEqual(res.json.user.cinema, { _id: String(a._id), name: a.name })
  assert.deepEqual((await app.call('GET', '/auth/me', undefined, res.json.token)).json.user.cinema, res.json.user.cinema)

  const check = await app.call('POST', '/auth/check', { identifier: 'SVH.Test' })
  assert.deepEqual(check.json, { exists: true, type: 'username', value: 'svh.test' })
})

test('từ chối dữ liệu sai hoặc trùng', async () => {
  assert.equal((await create()).status, 201)
  const fresh = { username: 'moi.test', email: 'm@example.test' }
  for (const [extra, code] of [
    [{ email: 'khac@example.test' }, 409],
    [{ username: 'khac.test' }, 409],
    [{ ...fresh, username: '0988123456' }, 400],
    [{ ...fresh, username: 'a b c d' }, 400],
    [{ ...fresh, email: 'sai' }, 400],
    [{ ...fresh, name: '  ' }, 400],
    [{ ...fresh, name: 'x'.repeat(101) }, 400],
    [{ ...fresh, password: 'yeu' }, 400],
    [{ ...fresh, cinema: 'khong-co' }, 400],
    [{ ...fresh, cinema: String(movie._id) }, 400],
  ]) {
    assert.equal((await create(extra)).status, code, JSON.stringify(extra))
  }
  assert.equal(await User.countDocuments({ role: 'manager' }), 1)
})

test('hai yêu cầu cùng lúc chỉ tạo được một tài khoản', async () => {
  const codes = (await Promise.all([create(), create()])).map((r) => r.status).sort()
  assert.deepEqual(codes, [201, 409])
})

test('chỉ trụ sở quản lý tài khoản chi nhánh', async () => {
  const { json } = await create()
  const { token } = (await login('svh.test', PASS)).json
  for (const [method, url] of [
    ['POST', '/admin/users/managers'],
    ['PATCH', `/admin/users/${json._id}/manager`],
    ['POST', `/admin/users/${json._id}/password`],
  ]) {
    assert.equal((await app.call(method, url, {}, token)).status, 403, url)
  }
})

test('đăng ký thường không đặt được tên đăng nhập hay vai trò', async () => {
  const res = await app.call('POST', '/auth/register', {
    name: 'Khách', email: 'k@example.test', phone: '0900000001', password: PASS, dob: '2000-01-01', gender: 'other',
    username: 'svh.gia', role: 'manager', cinema: a._id,
  })
  assert.equal(res.status, 201)
  assert.equal(res.json.user.cinema, null)
  const saved = await User.findOne({ email: 'k@example.test' }).lean()
  assert.deepEqual([saved.role, saved.username, saved.cinema], ['user', undefined, undefined])
})

test('đổi rạp, gỡ quyền và cấp lại có hiệu lực ngay với phiên đang đăng nhập', async () => {
  const { json } = await create()
  const { token } = (await login('svh.test', PASS)).json
  const showInA = () =>
    app.call('POST', '/showtimes', { movie: movie._id, room: roomA._id, startTime: new Date(Date.now() + 86400e3).toISOString(), price: 80000 }, token)
  const me = async () => (await app.call('GET', '/auth/me', undefined, token)).json.user
  const assign = (cinema) => app.call('PATCH', `/admin/users/${json._id}/manager`, { cinema }, hq.token)

  assert.equal((await assign(b._id)).json.cinema.name, b.name)
  assert.equal((await me()).cinema.name, b.name)
  assert.equal((await showInA()).status, 403)
  assert.equal((await assign('khong-co')).status, 400)

  assert.equal((await role(json._id, 'user')).status, 200)
  assert.equal((await app.call('GET', '/admin/stats', undefined, token)).status, 403)
  assert.equal((await me()).cinema, null)
  assert.equal((await User.findById(json._id).lean()).cinema, undefined)

  assert.equal((await assign(a._id)).status, 200)
  assert.equal((await showInA()).status, 201)
})

test('không có đường biến admin hay khách thành quản lý, hay tài khoản chi nhánh thành admin', async () => {
  const { json } = await create()
  const customer = await app.makeUser()
  const boss = await app.makeUser('admin')
  for (const target of [customer, boss]) {
    assert.equal((await app.call('PATCH', `/admin/users/${target.user._id}/manager`, { cinema: a._id }, hq.token)).status, 409)
    assert.equal((await app.call('POST', `/admin/users/${target.user._id}/password`, { password: NEXT }, hq.token)).status, 409)
  }
  assert.equal((await role(json._id, 'admin')).status, 409)
  assert.equal((await role(customer.user._id, 'manager')).status, 400)
  assert.equal((await role(json._id, 'user')).status, 200)
  assert.equal((await role(json._id, 'admin')).status, 409)
  assert.equal(await User.countDocuments({ role: 'admin' }), 2)
})

test('chốt "còn ít nhất một admin" không bao giờ biến tài khoản chi nhánh thành admin', async (t) => {
  const { json } = await create()
  const boss = await app.makeUser('admin')
  // Giả lập hai admin hạ quyền nhau đúng lúc đang gỡ quyền: lúc chốt kiểm tra thì đếm được 0 admin
  t.mock.method(User, 'countDocuments', async () => 0)

  assert.equal((await role(json._id, 'user')).status, 200)
  const branch = await User.findById(json._id).lean()
  assert.deepEqual([branch.role, branch.cinema], ['user', undefined])

  // Hạ quyền một admin trong cùng tình huống thì vẫn được hoàn tác
  assert.equal((await role(boss.user._id, 'user')).status, 409)
  assert.equal((await User.findById(boss.user._id).lean()).role, 'admin')
})

test('đặt lại mật khẩu: mật khẩu cũ và phiên cũ hết hiệu lực', async () => {
  const { json } = await create()
  const old = (await login('svh.test', PASS)).json
  const reset = (password) => app.call('POST', `/admin/users/${json._id}/password`, { password }, hq.token)

  assert.equal((await reset('yeu')).status, 400)
  assert.equal((await reset(NEXT)).status, 200)
  assert.equal((await login('svh.test', PASS)).status, 401)
  assert.equal((await login('svh.test', NEXT)).status, 200)
  assert.equal((await app.call('POST', '/auth/refresh', { refreshToken: old.refreshToken })).status, 401)
})

test('danh sách người dùng có tab quản lý rạp', async () => {
  await create()
  const list = async (query) => (await app.call('GET', `/admin/users${query}`, undefined, hq.token)).json
  const json = await list('?role=manager')
  assert.deepEqual(json.items.map((u) => [u.username, u.cinema.name]), [['svh.test', a.name]])
  assert.deepEqual([json.counts.manager, json.counts.all], [1, 2])
  assert.equal((await list('?q=svh.te')).total, 1)
})
