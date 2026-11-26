const test = require('node:test')
const assert = require('node:assert/strict')
const { startTestApp } = require('./helpers/testApp')
const mongoose = require('mongoose')

// Nạp trong lúc test chạy, sau khi app test đã trỏ sang database _test
const service = () => require('../src/services/boxOffice')

const HOUR = 3600e3
const WEEK = 168 * HOUR

let app
let Movie
let Showtime
let Booking
let codes = 0

test.before(async () => {
  app = await startTestApp()
  Movie = require('../src/models/Movie')
  Showtime = require('../src/models/Showtime')
  Booking = require('../src/models/Booking')
})
test.after(() => app.stop())

test.beforeEach(async () => {
  await Promise.all([Movie.deleteMany({}), Showtime.deleteMany({}), Booking.deleteMany({})])
  service().clearBoxOfficeCache()
})

const makeMovie = (title, extra = {}) => Movie.create({ title, duration: 100, status: 'now_showing', ...extra })

// Một đơn đặt `seatCount` ghế cho phim
async function sell(movie, seatCount, { status = 'paid', paidAt = new Date(), createdAt } = {}) {
  const startTime = new Date(Date.now() + 48 * HOUR)
  const showtime = await Showtime.create({
    movie: movie._id,
    room: new mongoose.Types.ObjectId(),
    startTime,
    endTime: new Date(+startTime + 2 * HOUR),
    price: 90000,
  })
  codes += 1
  const booking = await Booking.create({
    code: `BOX${codes}`,
    user: new mongoose.Types.ObjectId(),
    showtime: showtime._id,
    seats: Array.from({ length: seatCount }, (_, i) => `A${i + 1}`),
    pricePerSeat: 90000,
    totalPrice: 90000 * seatCount,
    paymentStatus: status,
    paidAt,
  })
  if (createdAt) await Booking.collection.updateOne({ _id: booking._id }, { $set: { createdAt } })
}

const titles = (rows) => rows.map((r) => r.title)
const apiRows = async () => {
  const res = await app.call('GET', '/movies/box-office')
  assert.equal(res.status, 200)
  return res.json
}

test('đếm ghế, không đếm đơn', async () => {
  const a = await makeMovie('A', { releaseDate: new Date('2026-01-01') })
  const b = await makeMovie('B', { releaseDate: new Date('2026-06-01') })
  await sell(a, 4)
  for (let i = 0; i < 3; i++) await sell(b, 1)

  assert.deepEqual(titles(await apiRows()), ['A', 'B'])
})

test('chỉ tính đơn đang ở trạng thái đã thanh toán', async () => {
  const a = await makeMovie('A', { releaseDate: new Date('2026-01-01') })
  const b = await makeMovie('B', { releaseDate: new Date('2026-06-01') })
  await sell(a, 2)
  await sell(b, 1)
  for (const status of ['pending', 'cancelled', 'expired', 'refunding', 'refunded']) await sell(b, 5, { status })

  assert.deepEqual(titles(await apiRows()), ['A', 'B'])
})

test('mốc 168 giờ tính theo thời điểm thanh toán', async () => {
  const { getBoxOffice, WINDOW_MS } = service()
  assert.equal(WINDOW_MS, WEEK)

  const now = new Date()
  const ago = (ms) => new Date(now - ms)
  const edge = await makeMovie('Đúng mốc')
  const old = await makeMovie('Quá mốc')
  const late = await makeMovie('Đặt lâu rồi mới trả')
  await sell(edge, 2, { paidAt: ago(WEEK) })
  await sell(old, 5, { paidAt: ago(WEEK + 1000) })
  await sell(old, 1, { paidAt: ago(HOUR) })
  await sell(late, 3, { paidAt: ago(HOUR), createdAt: ago(30 * 24 * HOUR) })

  assert.deepEqual(titles(await getBoxOffice(now)), ['Đặt lâu rồi mới trả', 'Đúng mốc', 'Quá mốc'])
})

test('bằng vé: khởi chiếu mới hơn đứng trên, thiếu ngày xếp sau, rồi theo tên; phim 0 vé ở cuối', async () => {
  const withTickets = await makeMovie('Có vé', { releaseDate: new Date('2024-01-01') })
  await makeMovie('Cũ', { releaseDate: new Date('2025-01-01') })
  await makeMovie('Zeta không ngày')
  await makeMovie('Beta cùng ngày', { releaseDate: new Date('2026-03-01') })
  await makeMovie('Mới', { releaseDate: new Date('2026-06-01') })
  await makeMovie('Alpha không ngày')
  await makeMovie('An cùng ngày', { releaseDate: new Date('2026-03-01') })
  await sell(withTickets, 1)

  assert.deepEqual(titles(await apiRows()), [
    'Có vé', 'Mới', 'An cùng ngày', 'Beta cùng ngày', 'Cũ', 'Alpha không ngày', 'Zeta không ngày',
  ])
})

test('chỉ phim đang chiếu, tối đa 7; không có phim thì danh sách rỗng', async () => {
  assert.deepEqual(await apiRows(), [])
  service().clearBoxOfficeCache()

  for (let i = 1; i <= 9; i++) await sell(await makeMovie(`Đang chiếu ${i}`), i)
  for (const status of ['coming_soon', 'ended']) await sell(await makeMovie(status, { status }), 20)

  assert.deepEqual(
    titles(await apiRows()),
    [9, 8, 7, 6, 5, 4, 3].map((i) => `Đang chiếu ${i}`),
  )
})

test('phản hồi công khai không lộ số vé', async () => {
  const movie = await makeMovie('Đủ trường', { ageRating: 'T16', releaseDate: new Date('2026-05-01'), description: 'x' })
  await makeMovie('Thiếu trường')
  await sell(movie, 3)

  const rows = await apiRows()
  for (const row of rows) assert.deepEqual(Object.keys(row).sort(), ['_id', 'ageRating', 'duration', 'releaseDate', 'title'])
  assert.deepEqual(rows[0], {
    _id: String(movie._id),
    title: 'Đủ trường',
    ageRating: 'T16',
    duration: 100,
    releaseDate: '2026-05-01T00:00:00.000Z',
  })
  assert.equal(rows[1].releaseDate, null)
})

test('kết quả được nhớ tạm 60 giây', async () => {
  const { getBoxOffice, CACHE_MS } = service()
  assert.equal(CACHE_MS, 60e3)

  const now = Date.now()
  const a = await makeMovie('A', { releaseDate: new Date('2026-06-01') })
  const b = await makeMovie('B', { releaseDate: new Date('2026-01-01') })
  await sell(a, 1, { paidAt: new Date(now - 1000) })
  assert.deepEqual(titles(await getBoxOffice(new Date(now))), ['A', 'B'])

  await sell(b, 5, { paidAt: new Date(now - 1000) })
  assert.deepEqual(titles(await getBoxOffice(new Date(now + CACHE_MS - 1))), ['A', 'B'])
  assert.deepEqual(titles(await getBoxOffice(new Date(now + CACHE_MS + 1))), ['B', 'A'])
})
