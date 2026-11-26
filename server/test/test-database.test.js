const test = require('node:test')
const assert = require('node:assert/strict')
const { testUri } = require('./helpers/testApp')

test('testUri luôn trỏ tới database có đuôi _test', () => {
  assert.equal(testUri('mongodb+srv://u:p@host.net/movie-booking?w=majority'), 'mongodb+srv://u:p@host.net/movie-booking_test?w=majority')
  assert.equal(testUri('mongodb://127.0.0.1:27017/movie-booking'), 'mongodb://127.0.0.1:27017/movie-booking_test')
  assert.equal(testUri('mongodb+srv://u:p@host.net/?w=majority'), 'mongodb+srv://u:p@host.net/movie-booking_test?w=majority')
  assert.equal(testUri('mongodb+srv://u:p@host.net'), 'mongodb+srv://u:p@host.net/movie-booking_test')
  assert.equal(testUri('mongodb://h/abc_test'), 'mongodb://h/abc_test')
})

test('testUri từ chối chuỗi không phải MongoDB', () => {
  for (const bad of ['', undefined, 'http://host/db']) assert.throws(() => testUri(bad), /MONGO_URI/)
})
