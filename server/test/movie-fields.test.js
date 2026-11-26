const test = require('node:test')
const assert = require('node:assert/strict')
const { startTestApp } = require('./helpers/testApp')

let app
let admin

test.before(async () => {
  app = await startTestApp()
  admin = (await app.makeUser('admin')).token
})
test.after(() => app.stop())

const create = (extra = {}) => app.call('POST', '/movies', { title: 'Phim test', duration: 100, ...extra }, admin)
const read = async (id) => (await app.call('GET', `/movies/${id}`)).json
const pick = (m) => ({ backdrop: m.backdrop, ageRating: m.ageRating, country: m.country, formats: m.formats })

test('lưu và trả đủ 4 trường mới', async () => {
  const res = await create({ backdrop: 'https://img.example/b.jpg', ageRating: 'T16', country: ' Việt Nam ', formats: '2D, Phụ đề tiếng Anh' })
  assert.equal(res.status, 201)
  assert.deepEqual(pick(await read(res.json._id)), {
    backdrop: 'https://img.example/b.jpg',
    ageRating: 'T16',
    country: 'Việt Nam',
    formats: ['2D', 'Phụ đề tiếng Anh'],
  })
})

test('phim không gửi trường mới vẫn tạo được, mặc định rỗng', async () => {
  const res = await create()
  assert.equal(res.status, 201)
  assert.deepEqual(pick(await read(res.json._id)), { backdrop: '', ageRating: '', country: '', formats: [] })
})

test('nhận đủ 5 mã độ tuổi', async () => {
  for (const ageRating of ['P', 'K', 'T13', 'T16', 'T18']) {
    const res = await create({ ageRating })
    assert.equal(res.status, 201, ageRating)
    assert.equal(res.json.ageRating, ageRating)
  }
})

test('từ chối giá trị sai, kèm thông báo đúng trường', async () => {
  const cases = [
    [{ backdrop: 'javascript:alert(1)' }, /backdrop/],
    [{ backdrop: 'abc.jpg' }, /backdrop/],
    [{ ageRating: 'T15' }, /Độ tuổi không hợp lệ/],
    [{ ageRating: 16 }, /Độ tuổi không hợp lệ/],
    [{ country: 'x'.repeat(61) }, /Quốc gia tối đa 60 ký tự/],
  ]
  for (const [body, message] of cases) {
    const res = await create(body)
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.match(res.json.message, message)
  }
  assert.equal((await create({ country: 'x'.repeat(60) })).status, 201)
})

test('cập nhật một phần không xóa trường khác; gửi chuỗi rỗng thì xóa được', async () => {
  const { json } = await create({ backdrop: 'https://img.example/b.jpg', ageRating: 'T13', country: 'Mỹ', formats: ['3D'] })
  const put = (body) => app.call('PUT', `/movies/${json._id}`, body, admin)

  assert.equal((await put({ title: 'Tên mới' })).status, 200)
  assert.deepEqual(pick(await read(json._id)), { backdrop: 'https://img.example/b.jpg', ageRating: 'T13', country: 'Mỹ', formats: ['3D'] })

  assert.equal((await put({ backdrop: '', ageRating: '', country: '', formats: '' })).status, 200)
  assert.deepEqual(pick(await read(json._id)), { backdrop: '', ageRating: '', country: '', formats: [] })
})
