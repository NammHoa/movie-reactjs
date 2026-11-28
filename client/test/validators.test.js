import test from 'node:test'
import assert from 'node:assert/strict'
import { parseIdentifier } from '../src/lib/validators.js'

test('phân biệt email, số điện thoại và tên đăng nhập', () => {
  assert.deepEqual(parseIdentifier(' SVH.Test '), { type: 'username', value: 'svh.test' })
  assert.deepEqual(parseIdentifier('0988.123.456'), { type: 'phone', value: '0988123456' })
  assert.equal(parseIdentifier('a@b.vn').type, 'email')
})

test('từ chối chuỗi không phải cả ba loại', () => {
  for (const bad of ['abc', '12345', '....', 'ten co cach', 'ten_gach', 'a'.repeat(31), 'a@b']) {
    assert.equal(parseIdentifier(bad), null, bad)
  }
})
