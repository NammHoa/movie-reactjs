import test from 'node:test'
import assert from 'node:assert/strict'
import { adminLinks, homePathFor, isStaff } from '../src/lib/roles.js'

test('nhân viên là trụ sở và quản lý rạp', () => {
  assert.deepEqual([{ role: 'admin' }, { role: 'manager' }, { role: 'user' }, null].map(isStaff), [true, true, false, false])
})

test('quản lý rạp chỉ thấy 4 mục, trụ sở thấy đủ 10', () => {
  assert.deepEqual(adminLinks('manager').map((l) => l.to), ['/admin', '/admin/bookings', '/admin/checkin', '/admin/showtimes'])
  assert.equal(adminLinks('admin').length, 10)
  assert.deepEqual(adminLinks('user'), [])
})

test('đăng nhập xong nhân viên vào thẳng khu quản trị', () => {
  assert.deepEqual([homePathFor({ role: 'manager' }), homePathFor({ role: 'admin' }), homePathFor({ role: 'user' })], ['/admin', '/admin', '/'])
})
