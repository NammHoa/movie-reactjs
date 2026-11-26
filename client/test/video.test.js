import test from 'node:test'
import assert from 'node:assert/strict'
import { embedUrl, youtubeId } from '../src/lib/video.js'

const ID = 'dQw4w9WgXcQ'

test('nhận các dạng link YouTube thường gặp', () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?x=1&v=${ID}&t=3`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
  ]) {
    assert.equal(youtubeId(url), ID, url)
  }
})

test('không nhúng link giả, link lạ hoặc mã video sai', () => {
  for (const url of [
    '',
    null,
    undefined,
    'abc',
    `https://youtube.com.evil.com/watch?v=${ID}`,
    `https://notyoutube.com/watch?v=${ID}`,
    `https://evil.com/youtu.be/${ID}`,
    `ftp://youtube.com/watch?v=${ID}`,
    'javascript:alert(1)',
    'https://vimeo.com/123',
    'https://youtube.com/watch?v="><script>',
    `https://youtube.com/watch?v=${ID}extra`,
    'https://youtube.com/watch',
    `https://youtube.com/channel/${ID}`,
    'https://youtu.be/',
  ]) {
    assert.equal(youtubeId(url), null, String(url))
  }
})

test('trình phát nhúng dùng tên miền không đặt cookie', () => {
  assert.equal(embedUrl(ID), `https://www.youtube-nocookie.com/embed/${ID}?autoplay=1&rel=0`)
})
