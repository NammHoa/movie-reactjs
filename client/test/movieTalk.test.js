import test from 'node:test'
import assert from 'node:assert/strict'
import { PAGE_SIZE, TALK_TABS, orderTalkMovies, shownFromState, statusFromSearch } from '../src/lib/movieTalk.js'

test('hai tab đúng thứ tự, Đang chiếu là mặc định', () => {
  assert.deepEqual(TALK_TABS.map((t) => [t.status, t.label, t.search]), [
    ['now_showing', 'Phim đang chiếu', ''],
    ['coming_soon', 'Phim sắp chiếu', '?tab=coming'],
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

const m = (id, extra) => ({ _id: id, title: id, ...extra })
const view = (rows) => rows.map((r) => [r.movie._id, r.rank])

test('đang chiếu: theo thứ tự Box Office và có số, phim còn lại giữ thứ tự cũ, không số', () => {
  assert.deepEqual(
    view(orderTalkMovies('now_showing', [m('a'), m('b'), m('c'), m('d')], [m('c'), m('a')])),
    [['c', 1], ['a', 2], ['b', null], ['d', null]],
  )
})

test('Box Office còn nhớ tạm phim không còn trong danh sách: số vẫn liền nhau', () => {
  assert.deepEqual(
    view(orderTalkMovies('now_showing', [m('a'), m('b')], [m('gone'), m('b'), m('a')])),
    [['b', 1], ['a', 2]],
  )
})

test('không có Box Office thì vẫn đủ phim, không số', () => {
  assert.deepEqual(view(orderTalkMovies('now_showing', [m('a'), m('b')], [])), [['a', null], ['b', null]])
})

test('sắp chiếu: ngày sớm đứng trước, thiếu ngày xếp cuối, trùng ngày thì theo tên, không dùng Box Office', () => {
  const movies = [
    m('x'),
    m('late', { releaseDate: '2026-12-20T00:00:00.000Z' }),
    m('b', { releaseDate: '2026-12-01T00:00:00.000Z' }),
    m('a', { releaseDate: '2026-12-01T00:00:00.000Z' }),
  ]
  assert.deepEqual(view(orderTalkMovies('coming_soon', movies, [m('late')])), [['a', null], ['b', null], ['late', null], ['x', null]])
})

test('sắp xếp không làm đổi danh sách gốc', () => {
  const movies = [m('b', { releaseDate: '2026-12-02' }), m('a', { releaseDate: '2026-12-01' })]
  orderTalkMovies('coming_soon', movies, [])
  orderTalkMovies('now_showing', movies, [m('a')])
  assert.deepEqual(movies.map((x) => x._id), ['b', 'a'])
})

test('số phim đang mở lấy từ lịch sử trình duyệt, giá trị lạ thì về 8', () => {
  assert.equal(PAGE_SIZE, 8)
  for (const [state, shown] of [[null, 8], [undefined, 8], [{}, 8], [{ shown: 16 }, 16], [{ shown: 3 }, 8], [{ shown: '24' }, 8], [{ shown: 8.5 }, 8]]) {
    assert.equal(shownFromState(state), shown, JSON.stringify(state))
  }
})
