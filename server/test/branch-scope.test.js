const test = require('node:test')
const assert = require('node:assert/strict')
const { startTestApp } = require('./helpers/testApp')

const HOUR = 3600e3

let app
let Booking
let Cinema
let Movie
let Payment
let Refund
let Review
let Room
let Showtime
let User

let a
let b
let movie
let hq
let manager
let customer

test.before(async () => {
  app = await startTestApp()
  Booking = require('../src/models/Booking')
  Cinema = require('../src/models/Cinema')
  Movie = require('../src/models/Movie')
  Payment = require('../src/models/Payment')
  Refund = require('../src/models/Refund')
  Review = require('../src/models/Review')
  Room = require('../src/models/Room')
  Showtime = require('../src/models/Showtime')
  User = require('../src/models/User')
})
test.after(() => app.stop())

// Một chi nhánh: rạp, phòng, suất sắp chiếu, một đơn đã trả tiền và một đơn đang chờ
async function makeBranch(name, prefix) {
  const cinema = await Cinema.create({ name })
  const room = await Room.create({ cinema: cinema._id, name: 'Phòng 1', rows: 5, seatsPerRow: 5 })
  const showtime = await Showtime.create({
    movie: movie._id,
    room: room._id,
    startTime: new Date(Date.now() + HOUR),
    endTime: new Date(Date.now() + 3 * HOUR),
    price: 90000,
    bookedSeats: ['A1', 'A2', 'B1'],
  })
  const order = { user: customer.user._id, showtime: showtime._id, pricePerSeat: 90000 }
  const paid = await Booking.create({ ...order, code: `${prefix}PAID`, seats: ['A1', 'A2'], totalPrice: 180000, paymentStatus: 'paid', paidAt: new Date() })
  const pending = await Booking.create({ ...order, code: `${prefix}WAIT`, seats: ['B1'], totalPrice: 90000, expiresAt: new Date(Date.now() + HOUR) })
  return { cinema, room, showtime, paid, pending }
}

test.beforeEach(async () => {
  const models = [Booking, Cinema, Movie, Payment, Refund, Review, Room, Showtime, User]
  await Promise.all(models.map((m) => m.deleteMany({})))
  movie = await Movie.create({ title: 'Phim chung', duration: 100, status: 'now_showing' })
  customer = await app.makeUser()
  a = await makeBranch('Rạp A', 'AAA')
  b = await makeBranch('Rạp B', 'BBB')
  hq = await app.makeUser('admin')
  manager = await app.makeUser('manager', { cinema: a.cinema._id })
})

const get = (who, url) => app.call('GET', url, undefined, who.token)
const status = async (who, method, url, body) => (await app.call(method, url, body, who.token)).status
const showBody = (room, hours) => ({ movie: movie._id, room: room._id, startTime: new Date(Date.now() + hours * HOUR).toISOString(), price: 80000 })

const staffCalls = () => [
  ['GET', '/admin/stats'],
  ['GET', '/admin/bookings'],
  ['GET', `/admin/bookings/${a.paid._id}`],
  ['POST', `/admin/bookings/${a.pending._id}/cancel`, {}],
  ['GET', `/admin/tickets/${a.paid.code}`],
  ['POST', `/admin/tickets/${a.paid.code}/check-in`, {}],
  ['POST', '/showtimes', showBody(a.room, 24)],
  ['PUT', `/showtimes/${a.showtime._id}`, { price: 70000 }],
  ['DELETE', `/showtimes/${a.showtime._id}`],
]

test('khách và quản lý chưa có rạp không vào được chức năng nhân viên nào', async () => {
  const noCinema = await app.makeUser('manager')
  for (const who of [customer, noCinema]) {
    for (const [method, url, body] of staffCalls()) assert.equal(await status(who, method, url, body), 403, `${method} ${url}`)
  }
})

test('quản lý rạp bị chặn ở mọi chức năng của trụ sở', async () => {
  for (const [method, url] of [
    ['GET', '/admin/users'],
    ['PATCH', `/admin/users/${customer.user._id}/role`],
    ['GET', '/admin/coupons'],
    ['GET', '/admin/banners'],
    ['GET', '/admin/refunds'],
    ['POST', `/admin/bookings/${a.paid._id}/refund`],
    ['POST', '/movies'],
    ['PUT', `/movies/${movie._id}`],
    ['POST', '/cinemas'],
    ['POST', '/rooms'],
    ['PUT', `/rooms/${a.room._id}`],
    ['DELETE', `/cinemas/${a.cinema._id}`],
  ]) {
    assert.equal(await status(manager, method, url, method === 'GET' ? undefined : {}), 403, `${method} ${url}`)
  }
})

test('quản lý rạp không xóa được đánh giá của người khác', async () => {
  const review = await Review.create({ movie: movie._id, user: customer.user._id, rating: 4 })
  assert.equal(await status(manager, 'DELETE', `/reviews/${review._id}`), 403)
  assert.ok(await Review.exists({ _id: review._id }))
})

test('suất chiếu: chỉ trong phòng của rạp mình', async () => {
  const created = await app.call('POST', '/showtimes', showBody(a.room, 24), manager.token)
  assert.equal(created.status, 201)
  assert.equal(await status(manager, 'POST', '/showtimes', showBody(b.room, 24)), 403)
  assert.equal(await status(manager, 'PUT', `/showtimes/${b.showtime._id}`, { price: 1000 }), 404)
  assert.equal(await status(manager, 'PUT', `/showtimes/${b.showtime._id}`, { room: a.room._id }), 404)
  assert.equal(await status(manager, 'PUT', `/showtimes/${created.json._id}`, { room: b.room._id }), 403)
  assert.equal(await status(manager, 'PUT', `/showtimes/${created.json._id}`, { price: 75000 }), 200)
  assert.equal(await status(manager, 'DELETE', `/showtimes/${b.showtime._id}`), 404)
  assert.ok(await Showtime.exists({ _id: b.showtime._id, price: 90000 }))
  assert.equal(await status(manager, 'DELETE', `/showtimes/${created.json._id}`), 200)
  assert.equal(await status(hq, 'POST', '/showtimes', showBody(b.room, 48)), 201)
})

test('đơn đặt vé: chỉ của rạp mình', async () => {
  const codesOf = (res) => res.json.items.map((i) => i.code).sort()
  assert.deepEqual(codesOf(await get(manager, '/admin/bookings')), [a.paid.code, a.pending.code].sort())
  assert.equal((await get(manager, `/admin/bookings?q=${b.paid.code}`)).json.total, 0)
  assert.equal(await status(manager, 'GET', `/admin/bookings/${b.paid._id}`), 404)
  assert.equal(await status(manager, 'POST', `/admin/bookings/${b.pending._id}/cancel`, {}), 404)
  assert.ok((await Showtime.findById(b.showtime._id)).bookedSeats.includes('B1'))
  // Trang vé của khách không mở cho nhân viên rạp
  assert.equal(await status(manager, 'GET', `/bookings/${a.paid._id}`), 404)
  const cancelled = await app.call('POST', `/admin/bookings/${a.pending._id}/cancel`, {}, manager.token)
  assert.equal(cancelled.json.paymentStatus, 'cancelled')
  assert.equal((await get(hq, '/admin/bookings')).json.total, 4)
})

test('hoàn tiền: quản lý chỉ thấy bản tóm tắt', async () => {
  const payment = await Payment.create({ booking: a.paid._id, user: customer.user._id, amount: 180000, txnRef: 'REF-A', status: 'success' })
  await Refund.create({ booking: a.paid._id, payment: payment._id, user: customer.user._id, amount: 180000, provider: 'mock', requestedBy: customer.user._id, status: 'failed', failReason: 'vnpay_99' })
  await Booking.updateOne({ _id: a.paid._id }, { paymentStatus: 'refunding' })

  const mine = await get(manager, `/admin/bookings/${a.paid._id}`)
  assert.deepEqual(Object.keys(mine.json.refund).sort(), ['amount', 'completedAt', 'requestedAt', 'status'])
  assert.equal(mine.json.refund.status, 'processing')
  assert.deepEqual(Object.keys(mine.json.payments[0]).sort(), ['_id', 'amount', 'createdAt', 'provider', 'status', 'txnRef'])
  assert.equal((await get(hq, `/admin/bookings/${a.paid._id}`)).json.refund.failReason, 'vnpay_99')
})

test('tổng quan: chỉ số liệu rạp mình', async () => {
  const { json } = await get(manager, '/admin/stats?days=7')
  assert.deepEqual(json.summary, { revenue: 180000, tickets: 2, paidBookings: 1 })
  assert.equal(json.status.paid, 1)
  assert.equal(json.status.pending, 1)
  assert.deepEqual(json.topMovies.map((m) => [m.tickets, m.revenue]), [[2, 180000]])
  assert.deepEqual(json.counts, { nowShowing: 1, upcomingShowtimes: 1 })

  const all = (await get(hq, '/admin/stats?days=7')).json
  assert.equal(all.summary.revenue, 360000)
  assert.equal(typeof all.counts.users, 'number')
})

test('soát vé: vé rạp khác không lộ thông tin và không đổi gì', async () => {
  for (const [method, url, code] of [
    ['GET', `/admin/tickets/${b.paid.code}`, 200],
    ['POST', `/admin/tickets/${b.paid.code}/check-in`, 409],
  ]) {
    const res = await app.call(method, url, method === 'GET' ? undefined : {}, manager.token)
    assert.equal(res.status, code)
    assert.equal(res.json.result.status, 'other_cinema')
    assert.ok(res.json.result.message.includes(b.cinema.name))
    assert.equal(res.json.booking, null)
    assert.ok(!JSON.stringify(res.json).includes(customer.user.email))
  }
  assert.equal((await Booking.findById(b.paid._id)).checkedInAt, undefined)

  const own = await app.call('POST', `/admin/tickets/${a.paid.code}/check-in`, {}, manager.token)
  assert.equal(own.json.result.status, 'checked_in')
})

test('rạp còn quản lý thì không xóa được', async () => {
  const empty = await Cinema.create({ name: 'Rạp trống' })
  const other = await app.makeUser('manager', { cinema: empty._id })
  assert.equal(await status(hq, 'DELETE', `/cinemas/${empty._id}`), 409)
  await User.updateOne({ _id: other.user._id }, { role: 'user', $unset: { cinema: 1 } })
  assert.equal(await status(hq, 'DELETE', `/cinemas/${empty._id}`), 200)
})
