import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldScrollTop } from '../src/lib/scroll.js'

const go = (change = {}) =>
  shouldScrollTop({ from: '/', to: '/movies/abc', hash: '', navigationType: 'PUSH', ...change })

test('sang trang khác thì cuộn về đầu', () => {
  assert.equal(go(), true)
  assert.equal(go({ navigationType: 'REPLACE' }), true)
})

test('quay lại hoặc tiến tới bằng trình duyệt thì để nguyên vị trí', () => {
  assert.equal(go({ navigationType: 'POP' }), false)
})

test('đường dẫn có # thì để trang tự cuộn tới đích', () => {
  assert.equal(go({ from: '/cinemas', to: '/', hash: '#movie-list' }), false)
})

test('vẫn ở cùng một trang thì không cuộn', () => {
  assert.equal(go({ from: '/', to: '/' }), false)
})
