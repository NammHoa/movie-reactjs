import test from 'node:test'
import assert from 'node:assert/strict'
import { TALK_TABS, statusFromSearch } from '../src/lib/movieTalk.js'

test('hai tab đúng thứ tự, Đang chiếu là mặc định', () => {
  assert.deepEqual(TALK_TABS.map((t) => [t.status, t.label, t.search]), [
    ['now_showing', 'Đang chiếu', ''],
    ['coming_soon', 'Sắp chiếu', '?tab=coming'],
  ])
})

test('đọc tab đang xem từ đường dẫn', () => {
  assert.equal(statusFromSearch(''), 'now_showing')
  assert.equal(statusFromSearch('?tab=coming'), 'coming_soon')
  assert.equal(statusFromSearch('?tab=coming&x=1'), 'coming_soon')
})

test('giá trị lạ thì coi như Đang chiếu', () => {
  assert.equal(statusFromSearch('?tab=xyz'), 'now_showing')
  assert.equal(statusFromSearch('?tab='), 'now_showing')
  assert.equal(statusFromSearch('?tab=coming_soon'), 'now_showing')
})
