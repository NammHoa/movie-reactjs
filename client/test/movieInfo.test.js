import test from 'node:test'
import assert from 'node:assert/strict'
import { basicInfo, rankMeta } from '../src/lib/movie.js'

test('ghép thể loại, quốc gia và thời lượng', () => {
  assert.equal(basicInfo({ genres: ['Chính kịch', 'Hài'], country: 'Việt Nam', duration: 127 }), 'Chính kịch, Hài, Việt Nam (127 phút)')
})

test('thiếu phần nào thì bỏ phần đó, không để dấu thừa', () => {
  assert.equal(basicInfo({ genres: [], country: 'Mỹ', duration: 100 }), 'Mỹ (100 phút)')
  assert.equal(basicInfo({ genres: ['Hài'], country: '', duration: 100 }), 'Hài (100 phút)')
  assert.equal(basicInfo({ duration: 95 }), '95 phút') // phim cũ chỉ có thời lượng
  assert.equal(basicInfo({ genres: ['Hài'], country: 'Mỹ' }), 'Hài, Mỹ')
  assert.equal(basicInfo({}), '')
})

test('dòng phụ ở Box Office: thời lượng và ngày khởi chiếu', () => {
  const releaseDate = new Date(2026, 4, 1, 12).toISOString()
  assert.equal(rankMeta({ duration: 127, releaseDate }), '127 phút | 1/5/2026')
})

test('dòng phụ ở Box Office: thiếu ngày khởi chiếu thì không có dấu gạch', () => {
  assert.equal(rankMeta({ duration: 95, releaseDate: null }), '95 phút')
  assert.equal(rankMeta({ duration: 95 }), '95 phút')
})
