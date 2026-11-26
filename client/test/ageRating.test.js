import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { AGE_INFO } from '../src/lib/ageRating.js'

test('nhãn độ tuổi đúng như thiết kế', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(AGE_INFO).map(([code, v]) => [code, v.label])),
    {
      P: 'Mọi lứa tuổi',
      K: 'Dưới 13 tuổi xem cùng người giám hộ',
      T13: 'Từ 13 tuổi',
      T16: 'Từ 16 tuổi',
      T18: 'Từ 18 tuổi',
    },
  )
  for (const { cls } of Object.values(AGE_INFO)) assert.match(cls, /bg-/)
})

// Hai nơi khai báo cùng một danh sách; lệch nhau thì admin chọn được mã mà server từ chối (hoặc ngược lại)
test('danh sách mã khớp với server', () => {
  const source = readFileSync(new URL('../../server/src/models/Movie.js', import.meta.url), 'utf8')
  const codes = /const AGE_RATINGS = \[([^\]]*)\]/.exec(source)[1].match(/[A-Z0-9]+/g)
  assert.deepEqual(Object.keys(AGE_INFO), codes)
})
