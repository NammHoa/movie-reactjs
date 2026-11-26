import test from 'node:test'
import assert from 'node:assert/strict'
import { nearestIndex, rowState, wrapIndex } from '../src/lib/slider.js'

test('wrapIndex quay vòng ở hai đầu', () => {
  assert.equal(wrapIndex(3, 3), 0)
  assert.equal(wrapIndex(-1, 3), 2)
  assert.equal(wrapIndex(1, 3), 1)
  assert.equal(wrapIndex(0, 0), 0)
})

test('nearestIndex chọn ảnh gần vị trí cuộn nhất', () => {
  assert.equal(nearestIndex(0, [0, 800, 1600]), 0)
  assert.equal(nearestIndex(500, [0, 800, 1600]), 1)
  assert.equal(nearestIndex(9999, [0, 800, 1600]), 2)
  assert.equal(nearestIndex(10, []), 0)
})

const row = (scrollLeft, clientWidth = 1000, scrollWidth = 2500) => rowState({ scrollLeft, clientWidth, scrollWidth })

test('rowState: đủ chỗ cho cả hàng thì không cần mũi tên', () => {
  assert.equal(row(0, 1000, 1000).fits, true)
  assert.equal(row(0, 1000, 1001).fits, true) // lệch 1px do làm tròn
  assert.equal(row(0, 1000, 600).fits, true)
  assert.equal(row(0).fits, false)
})

test('rowState: biết đang ở đầu, giữa hay cuối hàng', () => {
  assert.deepEqual(row(0), { fits: false, atStart: true, atEnd: false })
  assert.deepEqual(row(700), { fits: false, atStart: false, atEnd: false })
  assert.deepEqual(row(1500), { fits: false, atStart: false, atEnd: true })
})

test('rowState: vị trí cuộn lẻ vẫn tính đúng hai đầu', () => {
  assert.equal(row(0.5).atStart, true)
  assert.equal(row(1499.4).atEnd, true)
})
