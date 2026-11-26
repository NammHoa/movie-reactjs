const test = require('node:test')
const assert = require('node:assert/strict')
const { startTestApp } = require('./helpers/testApp')
const mongoose = require('mongoose')

// Đọc thẳng collection để test không phụ thuộc cách model được viết
const bannerDocs = () => mongoose.connection.collection('bannerlists')
const storedIds = async () => (await bannerDocs().findOne({ key: 'home' })).movies.map(String)

let app
let admin
let user
let Movie
let n = 0

test.before(async () => {
  app = await startTestApp()
  admin = (await app.makeUser('admin')).token
  user = (await app.makeUser()).token
  Movie = require('../src/models/Movie')
})
test.after(() => app.stop())

// Mỗi test bắt đầu với banner rỗng và không có phim
test.beforeEach(async () => {
  await Movie.deleteMany({})
  await bannerDocs().deleteMany({})
})

const makeMovie = (extra = {}) => {
  n += 1
  return Movie.create({ title: `Phim ${n}`, duration: 100, status: 'now_showing', backdrop: `https://img.example/${n}.jpg`, ...extra })
}
const makeMovies = async (count) => {
  const list = []
  for (let i = 0; i < count; i++) list.push(await makeMovie())
  return list
}
const publicList = async () => (await app.call('GET', '/banners')).json
const adminView = async () => (await app.call('GET', '/admin/banners', undefined, admin)).json
const add = (movie) => app.call('POST', '/admin/banners', { movieId: String(movie._id ?? movie) }, admin)
const remove = (movie) => app.call('DELETE', `/admin/banners/${movie._id ?? movie}`, undefined, admin)
const reorder = (ids) => app.call('PUT', '/admin/banners/order', { ids }, admin)
const ids = (list) => list.map((x) => String(x._id))

test('quyền: lệnh quản lý cần admin, danh sách công khai thì không', async () => {
  const movie = await makeMovie()
  const requests = [
    ['GET', '/admin/banners'],
    ['POST', '/admin/banners', { movieId: String(movie._id) }],
    ['PUT', '/admin/banners/order', { ids: [] }],
    ['DELETE', `/admin/banners/${movie._id}`],
  ]
  for (const [method, url, body] of requests) {
    assert.equal((await app.call(method, url, body)).status, 401, `${method} ${url} không token`)
    assert.equal((await app.call(method, url, body, user)).status, 403, `${method} ${url} user thường`)
  }
  const res = await app.call('GET', '/banners')
  assert.equal(res.status, 200)
  assert.deepEqual(res.json, [])
})

test('thêm theo thứ tự; công khai chỉ có đúng _id, title, backdrop', async () => {
  const [a, b] = await makeMovies(2)
  assert.equal((await add(a)).status, 201)
  const res = await add(b)
  assert.equal(res.status, 201)
  assert.equal(res.json.max, 8)
  assert.deepEqual(ids(res.json.items), ids([a, b]))

  const list = await publicList()
  assert.deepEqual(ids(list), ids([a, b]))
  assert.deepEqual(Object.keys(list[0]).sort(), ['_id', 'backdrop', 'title'])
  assert.equal(list[0].backdrop, a.backdrop)
})

test('trang admin có mục đang trên banner và phim đang chiếu còn lại', async () => {
  const onBanner = await makeMovie()
  const ready = await makeMovie()
  const noImage = await makeMovie({ backdrop: '' })
  await makeMovie({ status: 'coming_soon' })
  await add(onBanner)

  const view = await adminView()
  assert.deepEqual(view.items.map((x) => [x._id, x.title, x.backdrop, x.status, x.hiddenReason]), [[String(onBanner._id), onBanner.title, onBanner.backdrop, 'now_showing', null]])
  assert.deepEqual(
    Object.fromEntries(view.candidates.map((x) => [x._id, x.eligible])),
    { [String(ready._id)]: true, [String(noImage._id)]: false },
  )
})

test('từ chối phim không đủ điều kiện hoặc không tồn tại', async () => {
  for (const extra of [{ status: 'coming_soon' }, { status: 'ended' }, { backdrop: '' }]) {
    const res = await add(await makeMovie(extra))
    assert.equal(res.status, 400, JSON.stringify(extra))
    assert.equal(res.json.message, 'Chỉ thêm được phim đang chiếu có ảnh ngang')
  }
  for (const movieId of ['0'.repeat(24), 'abc', '', undefined, { $ne: null }]) {
    const res = await app.call('POST', '/admin/banners', { movieId }, admin)
    assert.equal(res.status, 404, JSON.stringify(movieId))
    assert.equal(res.json.message, 'Không tìm thấy phim')
  }
  assert.deepEqual(await publicList(), [])
})

test('mỗi phim một lần, tối đa 8', async () => {
  const movies = await makeMovies(9)
  for (const m of movies.slice(0, 8)) assert.equal((await add(m)).status, 201)

  const dup = await add(movies[0])
  assert.equal(dup.status, 409)
  assert.equal(dup.json.message, 'Phim này đã có trên banner')

  const full = await add(movies[8])
  assert.equal(full.status, 409)
  assert.equal(full.json.message, 'Banner đã đủ 8 phim')
  assert.equal((await publicList()).length, 8)
})

test('phim không còn đủ điều kiện thì tự ẩn, đủ lại thì tự hiện; mục ẩn vẫn tính vào 8', async () => {
  const movies = await makeMovies(8)
  for (const m of movies) await add(m)

  await Movie.updateOne({ _id: movies[0]._id }, { status: 'ended' })
  await Movie.updateOne({ _id: movies[1]._id }, { backdrop: '' })

  assert.deepEqual(ids(await publicList()), ids(movies.slice(2)))
  const reasons = Object.fromEntries((await adminView()).items.map((x) => [x._id, x.hiddenReason]))
  assert.equal(reasons[movies[0]._id], 'not_showing')
  assert.equal(reasons[movies[1]._id], 'no_backdrop')
  assert.equal((await add(await makeMovie())).json.message, 'Banner đã đủ 8 phim')

  await Movie.updateOne({ _id: movies[0]._id }, { status: 'now_showing' })
  await Movie.updateOne({ _id: movies[1]._id }, { backdrop: 'https://img.example/lai.jpg' })
  assert.deepEqual(ids(await publicList()), ids(movies))
})

test('xóa khỏi banner không xóa phim; xóa mục không có thì 404', async () => {
  const [a, b] = await makeMovies(2)
  await add(a)
  await add(b)

  const res = await remove(a)
  assert.equal(res.status, 200)
  assert.deepEqual(ids(res.json.items), ids([b]))
  assert.ok(await Movie.exists({ _id: a._id }))

  for (const target of [a, '0'.repeat(24), 'abc']) {
    const again = await remove(target)
    assert.equal(again.status, 404)
    assert.equal(again.json.message, 'Phim này không có trên banner')
  }
})

test('đổi thứ tự; danh sách gửi lên phải đúng cùng tập', async () => {
  const [a, b, c] = await makeMovies(3)
  for (const m of [a, b, c]) await add(m)
  const other = await makeMovie()

  const res = await reorder(ids([c, a, b]))
  assert.equal(res.status, 200)
  assert.deepEqual(ids(res.json.items), ids([c, a, b]))
  assert.deepEqual(ids(await publicList()), ids([c, a, b]))

  const wrong = [ids([c, a]), ids([c, a, b, other]), ids([c, a, a]), ids([c, a, other]), ['abc', 'def', 'ghi'], [], 'abc', undefined]
  for (const list of wrong) {
    const bad = await reorder(list)
    assert.equal(bad.status, 409, JSON.stringify(list))
    assert.equal(bad.json.message, 'Danh sách banner vừa thay đổi, vui lòng tải lại')
  }
  assert.deepEqual(ids(await publicList()), ids([c, a, b]))
})

test('banner rỗng thì đổi thứ tự bằng danh sách rỗng vẫn hợp lệ', async () => {
  assert.equal((await reorder([])).status, 200)
})

test('xóa phim ở trang quản lý phim thì gỡ luôn khỏi banner', async () => {
  const [a, b] = await makeMovies(2)
  await add(a)
  await add(b)

  assert.equal((await app.call('DELETE', `/movies/${a._id}`, undefined, admin)).status, 200)
  assert.deepEqual(await storedIds(), ids([b]))
})

test('đồng thời không vượt 8 và không trùng', async () => {
  const movies = await makeMovies(11)
  for (const m of movies.slice(0, 7)) await add(m)

  const results = await Promise.all(movies.slice(7).map(add))
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409, 409])
  assert.equal((await storedIds()).length, 8)
  assert.equal(await bannerDocs().countDocuments(), 1)

  await bannerDocs().deleteMany({}) // cả trường hợp tài liệu banner chưa tồn tại khi nhiều request đến cùng lúc
  const same = await Promise.all(Array.from({ length: 5 }, () => add(movies[0])))
  assert.deepEqual(same.map((r) => r.status).sort(), [201, 409, 409, 409, 409])
  assert.deepEqual(await storedIds(), ids([movies[0]]))
  assert.equal(await bannerDocs().countDocuments(), 1)
})

test('mục trỏ tới phim đã mất không làm lỗi và không chiếm chỗ', async () => {
  const movies = await makeMovies(8)
  for (const m of movies) await add(m)
  await Movie.deleteOne({ _id: movies[3]._id }) // xóa thẳng trong database, không qua API

  const open = await app.call('GET', '/banners')
  assert.equal(open.status, 200)
  assert.equal(open.json.length, 7)

  const view = await app.call('GET', '/admin/banners', undefined, admin)
  assert.equal(view.status, 200)
  assert.equal(view.json.items.length, 7)

  assert.equal((await add(await makeMovie())).status, 201)
  assert.equal((await publicList()).length, 8)
})
