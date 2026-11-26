import test from 'node:test'
import assert from 'node:assert/strict'
import { nearestIndex, wrapIndex } from '../src/lib/slider.js'

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
