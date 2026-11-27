import test from 'node:test'
import assert from 'node:assert/strict'
import { embedUrl, trailerSource, youtubeId } from '../src/lib/video.js'

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

test('trailerSource: link YouTube phát bằng trình phát nhúng', () => {
  assert.deepEqual(trailerSource(`https://youtu.be/${ID}`), { type: 'youtube', src: embedUrl(ID) })
})

test('trailerSource: link file video phát bằng trình phát của trình duyệt', () => {
  for (const url of [
    'https://media.example.com/Movie/12267_301_100002.mp4',
    'https://media.example.com/a/B.MP4?token=abc&x=1#t=2',
    'http://media.example.com/a.webm',
    'https://media.example.com/a.m4v',
    'https://media.example.com/a.ogv',
    'https://media.example.com/a.ogg',
  ]) {
    assert.deepEqual(trailerSource(url), { type: 'file', src: url }, url)
  }
})

test('trailerSource: link khác thì không phát trong trang', () => {
  for (const url of [
    '',
    null,
    undefined,
    'a.mp4',
    'https://vimeo.com/123456',
    'https://example.com/watch?file=a.mp4',
    'https://example.com/a.mp4.html',
    'https://example.com/mp4',
    'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
    'ftp://example.com/a.mp4',
    'javascript:alert(1)//a.mp4',
    'data:video/mp4;base64,AAAA',
  ]) {
    assert.equal(trailerSource(url), null, String(url))
  }
})
