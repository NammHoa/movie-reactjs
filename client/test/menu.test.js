import test from 'node:test'
import assert from 'node:assert/strict'
import { MENU, activeMenu } from '../src/lib/menu.js'

test('đủ 7 mục đúng thứ tự', () => {
  assert.deepEqual(MENU.map((m) => [m.label, m.to]), [
    ['Mua vé', '/#movie-list'],
    ['Movie Talk', '/movie-talk'],
    ['Rạp chiếu phim', '/cinemas'],
    ['Tin mới & Ưu đãi', '/news'],
    ['Shop', '/shop'],
    ['De Coin', '/de-coin'],
    ['Quảng cáo & Thuê rạp', '/rent'],
  ])
})

test('4 mục chưa làm', () => {
  assert.deepEqual(MENU.filter((m) => m.comingSoon).map((m) => m.to), ['/news', '/shop', '/de-coin', '/rent'])
})

test('tô mục của trang đang xem', () => {
  assert.equal(activeMenu('/'), '/#movie-list')
  assert.equal(activeMenu('/cinemas'), '/cinemas')
  assert.equal(activeMenu('/cinemas/abc123'), '/cinemas')
  assert.equal(activeMenu('/news'), '/news')
  assert.equal(activeMenu('/news/'), '/news')
})

test('trang không thuộc mục nào thì không tô', () => {
  for (const path of ['/movies/abc', '/movie', '/newsletter', '/booking/1', '/login', '/profile', '/my-tickets', '/admin', '/admin/cinemas']) {
    assert.equal(activeMenu(path), null, path)
  }
})
