# Quản lý rạp theo chi nhánh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trụ sở tạo tài khoản chi nhánh đăng nhập bằng tên đăng nhập; mỗi quản lý chỉ làm việc được với dữ liệu của rạp mình.

**Architecture:** Thêm vai trò `manager` và trường `User.cinema`. Mọi route đang dùng `isAdmin` giữ nguyên nên mặc định chặn quản lý; chỉ vài route chuyển sang `isStaff`, và mỗi controller đó tự lọc theo rạp qua một service dùng chung. Giao diện chỉ ẩn bớt cho dễ dùng, server mới là nơi chặn.

**Tech Stack:** Express 5, Mongoose 9, React 19, React Router 7, Tailwind CSS 4, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-28-branch-manager-design.md`

## Global Constraints

- Không thêm thư viện. Không làm bắp nước, khung giá sàn/trần.
- Vai trò: `user`, `manager`, `admin`. Quản lý không có rạp bị từ chối hết, không bao giờ được hiểu là mọi rạp.
- Tên đăng nhập: `^(?=.*[a-z])[a-z0-9.]{4,30}$`, so sánh sau khi bỏ khoảng trắng hai đầu và đổi thành chữ thường.
- Mật khẩu theo `passwordError` hiện có. Không ghi mật khẩu thật vào code, dữ liệu mẫu, tài liệu; mật khẩu trong test là giá trị chỉ dùng cho test.
- Đối tượng của rạp khác: trả 404 như không tồn tại. Chọn phòng của rạp khác khi tạo hoặc chuyển suất: 403.
- Test và kiểm trình duyệt chỉ dùng database `_test`; `MONGO_URI` trong `server/.env` trỏ tới dữ liệu thật. Kiểm giao diện ở 375, 800, 1280px.
- Giao diện tiếng Việt, commit tiếng Anh, người dùng là người commit. Một PR trên nhánh `feature/branch-manager`; dừng sau mỗi task. Chỉ ghi chú code ở chỗ logic khó.

## Review Focus

1. Tài khoản `manager` mất trường rạp (dữ liệu lỗi): mọi chức năng nhân viên trả 403, không thấy dữ liệu rạp nào (Task 1, test).
2. Trụ sở đổi rạp hoặc gỡ quyền trong lúc quản lý đang đăng nhập: lần gọi API tiếp theo theo quyền mới, không cần đăng nhập lại (Task 2, test).
3. Quản lý gõ tên đăng nhập có chữ hoa hoặc thừa khoảng trắng (bàn phím điện thoại tự viết hoa): vẫn đăng nhập được (Task 2, test).
4. Quản lý gõ thẳng địa chỉ trang của trụ sở hoặc tải lại trang đó: về Tổng quan (Task 3, kiểm trình duyệt).
5. Tài khoản chi nhánh không có số điện thoại sửa họ tên ở Hồ sơ: lưu được (Task 3, kiểm trình duyệt).

---

### Task 1: Phân quyền và chặn theo rạp (server)

**Files:**
- Create: `server/src/services/cinemaScope.js`, `server/test/branch-scope.test.js`
- Modify: `server/src/models/User.js`, `server/src/middleware/auth.js`, `server/src/routes/adminRoutes.js`, `server/src/routes/showtimeRoutes.js`, `server/src/controllers/showtimeController.js`, `adminController.js`, `adminBookingController.js`, `adminTicketController.js`, `cinemaController.js`, `server/test/helpers/testApp.js`

**Interfaces:**
- Produces:
  - `User.role: 'user' | 'manager' | 'admin'`, `User.cinema: ObjectId (ref Cinema)`
  - `req.user = { id, role, cinema: string | null }`; middleware `isStaff` (admin, hoặc manager có rạp), xuất cạnh `verifyToken`, `isAdmin`
  - `cinemaScope.js`: `scopeOf(user): string | null` (`null` **chỉ** khi `role === 'admin'`; còn lại trả `user.cinema`, thiếu thì ném lỗi), `roomIdsOf(cinemaId): Promise<ObjectId[]>`, `showtimeIdsOf(cinemaId): Promise<ObjectId[]>`, `roomInCinema(roomId, cinemaId): Promise<boolean>`, `showtimeInCinema(showtimeId, cinemaId): Promise<boolean>`
  - `testApp.makeUser(role = 'user', extra = {})`

- [ ] **Step 1: Viết test** `branch-scope.test.js`

Cho `makeUser` nhận thêm `extra` (trộn vào `User.create`). Mỗi test dựng lại dữ liệu (`beforeEach`): hai chi nhánh `a`, `b` bằng `makeBranch(name, prefix)`, mỗi chi nhánh có rạp, một phòng, một suất bắt đầu sau 1 giờ (kết thúc sau 3 giờ) của phim chung `movie` (`now_showing`), một đơn `paid` (`paidAt` bây giờ, ghế `A1`,`A2`, 180000) và một đơn `pending` (ghế `B1`, `expiresAt` sau 1 giờ, 90000); suất có `bookedSeats: ['A1','A2','B1']`. Người dùng: `hq = makeUser('admin')`, `manager = makeUser('manager', { cinema: a.cinema._id })`, `customer = makeUser()` là chủ các đơn.

```js
const status = async (who, method, url, body) => (await app.call(method, url, body, who.token)).status
const showBody = (room, hours) => ({ movie: movie._id, room: room._id, startTime: new Date(Date.now() + hours * HOUR).toISOString(), price: 80000 })
const staffCalls = () => [
  ['GET', '/admin/stats'], ['GET', '/admin/bookings'], ['GET', `/admin/bookings/${a.paid._id}`],
  ['POST', `/admin/bookings/${a.pending._id}/cancel`, {}], ['GET', `/admin/tickets/${a.paid.code}`],
  ['POST', `/admin/tickets/${a.paid.code}/check-in`, {}], ['POST', '/showtimes', showBody(a.room, 24)],
  ['PUT', `/showtimes/${a.showtime._id}`, { price: 70000 }], ['DELETE', `/showtimes/${a.showtime._id}`],
]

test('khách và quản lý chưa có rạp không vào được chức năng nhân viên nào', async () => {
  const noCinema = await app.makeUser('manager')
  for (const who of [customer, noCinema]) {
    for (const [method, url, body] of staffCalls()) assert.equal(await status(who, method, url, body), 403, `${method} ${url}`)
  }
})

test('quản lý rạp bị chặn ở mọi chức năng của trụ sở', async () => {
  for (const [method, url] of [
    ['GET', '/admin/users'], ['PATCH', `/admin/users/${customer.user._id}/role`], ['GET', '/admin/coupons'],
    ['GET', '/admin/banners'], ['GET', '/admin/refunds'], ['POST', `/admin/bookings/${a.paid._id}/refund`],
    ['POST', '/movies'], ['PUT', `/movies/${movie._id}`], ['POST', '/cinemas'], ['POST', '/rooms'],
    ['PUT', `/rooms/${a.room._id}`], ['DELETE', `/cinemas/${a.cinema._id}`],
  ]) assert.equal(await status(manager, method, url, method === 'GET' ? undefined : {}), 403, `${method} ${url}`)
})

test('suất chiếu: chỉ trong phòng của rạp mình', async () => {
  const created = await app.call('POST', '/showtimes', showBody(a.room, 24), manager.token)
  assert.equal(created.status, 201)
  assert.equal(await status(manager, 'POST', '/showtimes', showBody(b.room, 24)), 403)
  assert.equal(await status(manager, 'PUT', `/showtimes/${b.showtime._id}`, { price: 1000 }), 404)
  assert.equal(await status(manager, 'PUT', `/showtimes/${b.showtime._id}`, { room: a.room._id }), 404)
  assert.equal(await status(manager, 'PUT', `/showtimes/${created.json._id}`, { room: b.room._id }), 403)
  assert.equal(await status(manager, 'PUT', `/showtimes/${created.json._id}`, { price: 75000 }), 200)
  assert.equal(await status(manager, 'DELETE', `/showtimes/${b.showtime._id}`), 404)
  assert.ok(await Showtime.exists({ _id: b.showtime._id, price: 90000 }))
  assert.equal(await status(manager, 'DELETE', `/showtimes/${created.json._id}`), 200)
  assert.equal(await status(hq, 'POST', '/showtimes', showBody(b.room, 48)), 201)
})

test('đơn đặt vé: chỉ của rạp mình', async () => {
  const codesOf = (res) => res.json.items.map((i) => i.code).sort()
  assert.deepEqual(codesOf(await app.call('GET', '/admin/bookings', undefined, manager.token)), [a.paid.code, a.pending.code].sort())
  assert.equal((await app.call('GET', `/admin/bookings?q=${b.paid.code}`, undefined, manager.token)).json.total, 0)
  assert.equal(await status(manager, 'GET', `/admin/bookings/${b.paid._id}`), 404)
  assert.equal(await status(manager, 'POST', `/admin/bookings/${b.pending._id}/cancel`, {}), 404)
  assert.ok((await Showtime.findById(b.showtime._id)).bookedSeats.includes('B1'))
  assert.equal(await status(manager, 'GET', `/bookings/${a.paid._id}`), 404) // trang vé của khách không mở cho nhân viên rạp
  const cancelled = await app.call('POST', `/admin/bookings/${a.pending._id}/cancel`, {}, manager.token)
  assert.equal(cancelled.json.paymentStatus, 'cancelled')
  assert.equal((await app.call('GET', '/admin/bookings', undefined, hq.token)).json.total, 4)
})

test('hoàn tiền: quản lý chỉ thấy bản tóm tắt', async () => {
  const payment = await Payment.create({ booking: a.paid._id, user: customer.user._id, amount: 180000, txnRef: 'REF-A', status: 'success' })
  await Refund.create({ booking: a.paid._id, payment: payment._id, user: customer.user._id, amount: 180000, provider: 'mock', requestedBy: customer.user._id, status: 'failed', failReason: 'vnpay_99' })
  await Booking.updateOne({ _id: a.paid._id }, { paymentStatus: 'refunding' })
  const mine = await app.call('GET', `/admin/bookings/${a.paid._id}`, undefined, manager.token)
  assert.deepEqual(Object.keys(mine.json.refund).sort(), ['amount', 'completedAt', 'requestedAt', 'status'])
  assert.equal(mine.json.refund.status, 'processing')
  assert.deepEqual(Object.keys(mine.json.payments[0]).sort(), ['_id', 'amount', 'createdAt', 'provider', 'status', 'txnRef'])
  assert.equal((await app.call('GET', `/admin/bookings/${a.paid._id}`, undefined, hq.token)).json.refund.failReason, 'vnpay_99')
})

test('tổng quan: chỉ số liệu rạp mình', async () => {
  const { json } = await app.call('GET', '/admin/stats?days=7', undefined, manager.token)
  assert.deepEqual(json.summary, { revenue: 180000, tickets: 2, paidBookings: 1 })
  assert.equal(json.status.paid, 1)
  assert.equal(json.status.pending, 1)
  assert.deepEqual(json.topMovies.map((m) => [m.tickets, m.revenue]), [[2, 180000]])
  assert.deepEqual(json.counts, { nowShowing: 1, upcomingShowtimes: 1 })
  const all = (await app.call('GET', '/admin/stats?days=7', undefined, hq.token)).json
  assert.equal(all.summary.revenue, 360000)
  assert.equal(typeof all.counts.users, 'number')
})

test('soát vé: vé rạp khác không lộ thông tin và không đổi gì', async () => {
  for (const [method, url, code] of [['GET', `/admin/tickets/${b.paid.code}`, 200], ['POST', `/admin/tickets/${b.paid.code}/check-in`, 409]]) {
    const res = await app.call(method, url, method === 'GET' ? undefined : {}, manager.token)
    assert.equal(res.status, code)
    assert.equal(res.json.result.status, 'other_cinema')
    assert.ok(res.json.result.message.includes(b.cinema.name))
    assert.equal(res.json.booking, null)
    assert.ok(!JSON.stringify(res.json).includes(customer.user.email))
  }
  assert.equal((await Booking.findById(b.paid._id)).checkedInAt, undefined)
  const own = await app.call('POST', `/admin/tickets/${a.paid.code}/check-in`, {}, manager.token)
  assert.equal(own.json.result.status, 'checked_in')
})

test('rạp còn quản lý thì không xóa được', async () => {
  const empty = await Cinema.create({ name: 'Rạp trống' })
  const other = await app.makeUser('manager', { cinema: empty._id })
  assert.equal(await status(hq, 'DELETE', `/cinemas/${empty._id}`), 409)
  await User.updateOne({ _id: other.user._id }, { role: 'user', $unset: { cinema: 1 } })
  assert.equal(await status(hq, 'DELETE', `/cinemas/${empty._id}`), 200)
})
```

Thêm test `quản lý rạp không xóa được đánh giá của người khác`: tạo một `Review` của `customer` cho `movie` (đọc `models/Review.js` lấy trường bắt buộc), quản lý gọi `DELETE /reviews/:id` nhận mã 4xx và `Review.exists` vẫn đúng. Test này đạt sẵn với code hiện tại; nó chốt hành vi để không bị mở nhầm.

- [ ] **Step 2:** `npm --prefix server test`. Expected: FAIL (`manager` chưa phải vai trò hợp lệ).
- [ ] **Step 3: Model, middleware, service.** `isStaff` trả 403 "Bạn không có quyền quản trị", riêng quản lý thiếu rạp: "Tài khoản quản lý chưa được gán rạp". `req.user.cinema = account.cinema ? String(account.cinema) : null`.
- [ ] **Step 4: Routes.** `adminRoutes.js`: `router.use(verifyToken)`; khai báo trước, mỗi dòng kèm `isStaff`: `GET /stats`, `GET /bookings`, `GET /bookings/:id`, `POST /bookings/:id/cancel`, `GET /tickets/:code`, `POST /tickets/:code/check-in`; sau đó `router.use(isAdmin)` rồi mới đến mọi route còn lại (route mới thêm ở dưới mặc định chỉ cho trụ sở; ghi chú một dòng nói điều này). `showtimeRoutes.js`: ba route ghi dùng `isStaff`.
- [ ] **Step 5: Lọc theo rạp** trong từng controller bằng `scopeOf(req.user)` (`null` thì giữ nguyên hành vi cũ):
  - Suất chiếu: `update`, `remove` trả 404 nếu suất hiện tại ngoài rạp; `create` và phòng mới của `update` ngoài rạp: 403 "Bạn chỉ quản lý được suất chiếu của rạp mình".
  - Danh sách đơn: `filter.showtime = { $in: await showtimeIdsOf(scope) }`. `getOne`, `cancel`: đơn ngoài rạp trả 404 trước mọi kiểm tra khác. `getOne` cho quản lý: `payments` chỉ chọn `amount status provider txnRef createdAt`, `refund` là `refunds.summary(doc)` hoặc `null`.
  - `stats`: thêm `showtime: { $in: ids }` vào cả ba phép gộp đơn; quản lý nhận `counts = { nowShowing, upcomingShowtimes }`, trong đó `nowShowing` đếm phim `now_showing` có suất sắp tới trong phòng của rạp.
  - Soát vé: sau khi tìm thấy vé và **trước** `judge`, vé ngoài rạp trả `{ result: { status: 'other_cinema', message }, booking: null }` (lookup 200, check-in 409). `message`: "Vé này thuộc rạp {tên}, không soát được ở đây"; không rõ rạp: "Vé này không thuộc rạp của bạn".
  - Xóa rạp: sau kiểm tra phòng, còn `User` `manager` của rạp thì 409 "Rạp còn quản lý, hãy chuyển rạp hoặc gỡ quyền quản lý trước".
- [ ] **Step 6:** `npm --prefix server test`. Expected: tất cả PASS (26 test cũ và các test mới).
- [ ] **Step 7: Dừng, bàn giao commit** `feat(api): scope staff endpoints to the manager's cinema` (chưa mở PR).

### Task 2: Tài khoản chi nhánh và đăng nhập bằng tên đăng nhập (server)

**Files:**
- Create: `server/src/controllers/staffController.js`, `server/test/staff-accounts.test.js`
- Modify: `server/src/models/User.js`, `server/src/utils/validators.js`, `server/src/controllers/authController.js`, `adminUserController.js`, `server/src/routes/adminRoutes.js`

**Interfaces:**
- Consumes: vai trò, `User.cinema`, `router.use(isAdmin)` của Task 1.
- Produces:
  - `User.username: { type: String, unique: true, sparse: true, trim: true, lowercase: true }`; tài khoản khách không có trường này (không lưu chuỗi rỗng; tài khoản chi nhánh cũng không lưu `phone`)
  - `parseIdentifier(raw)` trả thêm `{ type: 'username', value }`, chỉ sau khi không khớp email và số điện thoại
  - `POST /api/auth/login | refresh | register`, `GET /api/auth/me`: `user = { id, name, email, phone, role, cinema: { _id, name } | null }` (`cinema` chỉ khác `null` với quản lý)
  - Chỉ trụ sở: `POST /api/admin/users/managers { username, name, email, cinema, password }` → 201; `PATCH /api/admin/users/:id/manager { cinema }` → 200; cả hai trả `{ _id, name, email, username, role, cinema: { _id, name }, createdAt }`. `POST /api/admin/users/:id/password { password }` → 200 `{ message }`
  - `GET /api/admin/users`: item có thêm `username`, `cinema: { _id, name }`; `counts = { all, admin, manager, user }`; `role=manager` hợp lệ; `q` tìm cả tên đăng nhập

- [ ] **Step 1: Viết test** `staff-accounts.test.js`. `PASS = 'Chi-Test-01'`, `NEXT = 'Chi-Test-02'` (chỉ dùng cho test). `beforeEach`: xóa user, rạp; hai rạp `a`, `b`, phòng `roomA`, một phim; `hq = makeUser('admin')`. `create(extra)` gọi `POST /admin/users/managers` bằng `hq` với `{ username: 'svh.test', name: 'Quản lý A', email: 'svh@example.test', cinema: a._id, password: PASS, ...extra }`. `login(identifier, password)` gọi `POST /auth/login`.

```js
test('phân biệt email, số điện thoại và tên đăng nhập', () => {
  assert.deepEqual(parseIdentifier('  SVH.Test '), { type: 'username', value: 'svh.test' })
  assert.deepEqual(parseIdentifier('0988.123.456'), { type: 'phone', value: '0988123456' })
  assert.equal(parseIdentifier('A@B.vn').type, 'email')
  for (const bad of ['abc', '12345', '....', 'ten co cach', 'ten_gach', 'a'.repeat(31), 'a@b']) assert.equal(parseIdentifier(bad), null, bad)
})

test('trụ sở tạo tài khoản và quản lý đăng nhập được', async () => {
  const made = await create({ username: 'SVH.Test' })
  assert.equal(made.status, 201)
  assert.deepEqual([made.json.username, made.json.role, made.json.cinema.name], ['svh.test', 'manager', a.name])
  assert.equal(made.json.password, undefined)
  const res = await login(' Svh.TEST ', PASS)
  assert.equal(res.status, 200)
  assert.deepEqual(res.json.user.cinema, { _id: String(a._id), name: a.name })
  assert.deepEqual((await app.call('GET', '/auth/me', undefined, res.json.token)).json.user.cinema, res.json.user.cinema)
  const check = await app.call('POST', '/auth/check', { identifier: 'SVH.Test' })
  assert.deepEqual(check.json, { exists: true, type: 'username', value: 'svh.test' })
})

test('từ chối dữ liệu sai hoặc trùng', async () => {
  assert.equal((await create()).status, 201)
  for (const [extra, code] of [
    [{ email: 'khac@example.test' }, 409], [{ username: 'khac.test' }, 409], [{ username: '0988123456' }, 400],
    [{ username: 'a b c d' }, 400], [{ username: 'moi.test', email: 'sai' }, 400], [{ username: 'moi.test', email: 'm@example.test', name: '  ' }, 400],
    [{ username: 'moi.test', email: 'm@example.test', password: 'yeu' }, 400], [{ username: 'moi.test', email: 'm@example.test', cinema: 'khong-co' }, 400],
  ]) assert.equal((await create(extra)).status, code, JSON.stringify(extra))
  assert.equal(await User.countDocuments({ role: 'manager' }), 1)
})

test('chỉ trụ sở quản lý tài khoản chi nhánh', async () => {
  const { json } = await create()
  const { token } = (await login('svh.test', PASS)).json
  for (const [method, url] of [['POST', '/admin/users/managers'], ['PATCH', `/admin/users/${json._id}/manager`], ['POST', `/admin/users/${json._id}/password`]]) {
    assert.equal((await app.call(method, url, {}, token)).status, 403, url)
  }
})

test('đăng ký thường không đặt được tên đăng nhập hay vai trò', async () => {
  const res = await app.call('POST', '/auth/register', { name: 'Khách', email: 'k@example.test', phone: '0900000001', password: PASS, dob: '2000-01-01', gender: 'other', username: 'svh.gia', role: 'manager', cinema: a._id })
  assert.equal(res.status, 201)
  const saved = await User.findOne({ email: 'k@example.test' }).lean()
  assert.deepEqual([saved.role, saved.username, saved.cinema], ['user', undefined, undefined])
})

test('đổi rạp, gỡ quyền và cấp lại có hiệu lực ngay với phiên đang đăng nhập', async () => {
  const { json } = await create()
  const { token } = (await login('svh.test', PASS)).json
  const showInA = () => app.call('POST', '/showtimes', { movie: movie._id, room: roomA._id, startTime: new Date(Date.now() + 86400e3).toISOString(), price: 80000 }, token)
  const me = async () => (await app.call('GET', '/auth/me', undefined, token)).json.user
  const assign = (cinema) => app.call('PATCH', `/admin/users/${json._id}/manager`, { cinema }, hq.token)

  assert.equal((await assign(b._id)).json.cinema.name, b.name)
  assert.equal((await me()).cinema.name, b.name)
  assert.equal((await showInA()).status, 403)

  assert.equal((await app.call('PATCH', `/admin/users/${json._id}/role`, { role: 'user' }, hq.token)).status, 200)
  assert.equal((await app.call('GET', '/admin/stats', undefined, token)).status, 403)
  assert.equal((await User.findById(json._id).lean()).cinema, undefined)

  assert.equal((await assign(a._id)).status, 200)
  assert.equal((await showInA()).status, 201)
})

test('không có đường biến admin hay khách thành quản lý, hay tài khoản chi nhánh thành admin', async () => {
  const { json } = await create()
  const customer = await app.makeUser()
  const boss = await app.makeUser('admin')
  for (const target of [customer, boss]) {
    assert.equal((await app.call('PATCH', `/admin/users/${target.user._id}/manager`, { cinema: a._id }, hq.token)).status, 409)
    assert.equal((await app.call('POST', `/admin/users/${target.user._id}/password`, { password: NEXT }, hq.token)).status, 409)
  }
  const role = (id, value) => app.call('PATCH', `/admin/users/${id}/role`, { role: value }, hq.token)
  assert.equal((await role(json._id, 'admin')).status, 409)
  assert.equal((await role(customer.user._id, 'manager')).status, 400)
  assert.equal((await role(json._id, 'user')).status, 200)
  assert.equal((await role(json._id, 'admin')).status, 409)
})

test('đặt lại mật khẩu: mật khẩu cũ và phiên cũ hết hiệu lực', async () => {
  const { json } = await create()
  const old = (await login('svh.test', PASS)).json
  const reset = (password) => app.call('POST', `/admin/users/${json._id}/password`, { password }, hq.token)
  assert.equal((await reset('yeu')).status, 400)
  assert.equal((await reset(NEXT)).status, 200)
  assert.equal((await login('svh.test', PASS)).status, 401)
  assert.equal((await login('svh.test', NEXT)).status, 200)
  assert.equal((await app.call('POST', '/auth/refresh', { refreshToken: old.refreshToken })).status, 401)
})

test('danh sách người dùng có tab quản lý rạp', async () => {
  await create()
  const { json } = await app.call('GET', '/admin/users?role=manager', undefined, hq.token)
  assert.deepEqual(json.items.map((u) => [u.username, u.cinema.name]), [['svh.test', a.name]])
  assert.deepEqual([json.counts.manager, json.counts.all], [1, 2])
  assert.equal((await app.call('GET', '/admin/users?q=svh.te', undefined, hq.token)).json.total, 1)
})
```

- [ ] **Step 2:** `npm --prefix server test`. Expected: FAIL ở file mới.
- [ ] **Step 3: Model, validators, auth.** `USERNAME_RE` theo Global Constraints. `findByIdentifier` tra theo đúng trường `id.type`. `publicUser(u)` thành hàm async lấy tên rạp cho quản lý; `me`, `register`, `login`, `refresh` đều `await`.
- [ ] **Step 4: `staffController.js`** (`createManager`, `assignCinema`, `resetPassword`), đăng ký route **dưới** `router.use(isAdmin)`.
  - Tạo: băm bằng `bcrypt.hash(password, 10)`; trùng báo "Tên đăng nhập đã được sử dụng" hoặc "Email đã được sử dụng" (409, kể cả khi hai yêu cầu cùng lúc làm lỗi `11000`); sai định dạng tên: "Tên đăng nhập gồm 4–30 ký tự: chữ thường, số, dấu chấm, có ít nhất một chữ"; rạp: "Rạp không tồn tại"; họ tên tối đa 100 ký tự.
  - `assignCinema` chỉ nhận tài khoản có `username` và `role !== 'admin'`, nếu không: 409 "Chỉ tài khoản chi nhánh mới làm quản lý rạp được". `resetPassword` cùng điều kiện, 409 "Chỉ đặt lại được mật khẩu cho tài khoản chi nhánh"; ghi `password`, `passwordChangedAt`, rồi `refreshTokens.revokeAllForUser`.
- [ ] **Step 5: `adminUserController.js`.** Danh sách theo Interfaces. `setRole` vẫn chỉ nhận `admin` | `user`; tài khoản có `username` đòi lên `admin`: 409 "Tài khoản chi nhánh không cấp quyền admin được"; xuống `user` thì `$unset` `cinema`. Chốt "còn ít nhất một admin" giữ nguyên.
- [ ] **Step 6:** `npm --prefix server test`. Expected: tất cả PASS.
- [ ] **Step 7: Dừng, bàn giao commit** `feat(api): branch manager accounts with username login`.

### Task 3: Giao diện

**Files:**
- Create: `client/src/lib/roles.js`, `client/src/pages/admin/StaffForms.jsx`, `client/test/roles.test.js`, `client/test/validators.test.js`
- Modify: `client/src/lib/validators.js`, `client/src/routes/ProtectedRoute.jsx`, `client/src/App.jsx`, `client/src/components/Navbar.jsx`, `MobileMenu.jsx`, `client/src/pages/user/Auth.jsx`, `Profile.jsx`, `client/src/pages/admin/AdminLayout.jsx`, `Users.jsx`, `Showtimes.jsx`, `Dashboard.jsx`, `Bookings.jsx`, `Checkin.jsx`, `README.md`

**Interfaces:**
- Consumes: mọi API của Task 1 và 2.
- Produces: `isStaff(user): boolean`; `adminLinks(role): Array<{ to, label, end? }>`; `homePathFor(user): '/admin' | '/'`; `<HqRoute>` (không phải `admin` thì `Navigate` về `/admin`); `parseIdentifier` phía client trả thêm `username`.

- [ ] **Step 1: Viết test**

```js
// roles.test.js
assert.deepEqual([{ role: 'admin' }, { role: 'manager' }, { role: 'user' }, null].map(isStaff), [true, true, false, false])
assert.deepEqual(adminLinks('manager').map((l) => l.to), ['/admin', '/admin/bookings', '/admin/checkin', '/admin/showtimes'])
assert.equal(adminLinks('admin').length, 10)
assert.deepEqual(adminLinks('user'), [])
assert.deepEqual([homePathFor({ role: 'manager' }), homePathFor({ role: 'admin' }), homePathFor({ role: 'user' })], ['/admin', '/admin', '/'])

// validators.test.js
assert.deepEqual(parseIdentifier(' SVH.Test '), { type: 'username', value: 'svh.test' })
assert.deepEqual(parseIdentifier('0988.123.456'), { type: 'phone', value: '0988123456' })
assert.equal(parseIdentifier('a@b.vn').type, 'email')
for (const bad of ['abc', '12345', 'ten co cach', 'a'.repeat(31), 'a@b']) assert.equal(parseIdentifier(bad), null, bad)
```

- [ ] **Step 2:** `npm --prefix client test`. Expected: FAIL vì chưa có `roles.js` và loại `username`.
- [ ] **Step 3:** Viết `roles.js` (chuyển danh sách link từ `AdminLayout` sang) và sửa `validators.js`. Chạy lại, Expected: PASS.
- [ ] **Step 4: Đăng nhập và điều hướng.** `Auth`: nhãn "Số điện thoại / Email / Tên đăng nhập"; sai định dạng: "Vui lòng nhập số điện thoại, email hoặc tên đăng nhập hợp lệ"; loại `username` mà chưa tồn tại thì hiện lỗi tại ô "Không tìm thấy tài khoản này. Khách hàng đăng nhập bằng số điện thoại hoặc email.", không sang đăng ký; đăng nhập xong đi tới `from ?? homePathFor(user)`. `AdminRoute`, `Navbar`, `MobileMenu` dùng `isStaff`. `App`: bọc `HqRoute` quanh `users`, `movies`, `cinemas`, `coupons`, `refunds`, `banners`. `AdminLayout`: link theo `adminLinks(user.role)`, quản lý thấy "Quản lý rạp · {user.cinema?.name}". `Profile`: chỉ bắt lỗi số điện thoại khi ô có chữ hoặc trước đó đã có số.
- [ ] **Step 5: Trang của quản lý.**
  - `Showtimes`: quản lý tải `/showtimes?cinema=<rạp mình>`; form đặt sẵn và khóa ô rạp.
  - `Dashboard`: `counts.users` vắng thì bỏ ô "Người dùng" (còn 2 cột).
  - `Bookings`: không phải trụ sở thì ẩn nút "Hủy vé & hoàn tiền"; khối hoàn tiền là một dòng "Đã hoàn" hoặc "Đang xử lý" kèm số tiền, thay cho `RefundPanel`.
  - `Checkin`: thêm kết luận `other_cinema`, nền đỏ, "VÉ CỦA RẠP KHÁC".
- [ ] **Step 6: Trang Người dùng.** Tab và nhãn "Quản lý rạp"; dòng tài khoản chi nhánh hiện tên đăng nhập và tên rạp. `StaffForms.jsx` (dùng `FormModal`, `Row`): tạo tài khoản (tên đăng nhập, họ tên, email, rạp, mật khẩu tạm có `PasswordRules`, `autoComplete="new-password"`), đổi rạp / cấp lại quyền, đặt lại mật khẩu. Tài khoản chi nhánh có ba thao tác: đang là quản lý thì "Đổi rạp", "Đặt lại mật khẩu", "Gỡ quyền" (hỏi xác nhận); đã gỡ thì "Cấp lại quyền", "Đặt lại mật khẩu"; không có "Cấp quyền admin". Tài khoản khác giữ như cũ.
- [ ] **Step 7:** README: thêm vai trò quản lý rạp và đăng nhập bằng tên đăng nhập. `npm --prefix client test`, `npm --prefix client run lint`, `npm --prefix client run build`, `npm --prefix server test`. Expected: đạt, lint không cảnh báo.
- [ ] **Step 8: Kiểm trình duyệt** bằng database test có hai rạp, mỗi rạp có phòng, suất và đơn:
  - Trụ sở tạo tài khoản (cả lỗi trùng tên), đổi rạp, đặt lại mật khẩu, gỡ và cấp lại quyền.
  - Đăng nhập bằng tên đăng nhập gõ chữ hoa vào thẳng khu quản trị; tên không tồn tại không sang đăng ký.
  - Quản lý: đúng 4 mục menu; số liệu, đơn, suất chỉ của rạp mình; thêm suất; hủy đơn chờ; soát vé rạp mình và rạp khác; đơn đang hoàn tiền chỉ có một dòng trạng thái.
  - Gõ thẳng và tải lại `/admin/users`, `/admin/refunds`: về Tổng quan. Sửa họ tên khi chưa có số điện thoại: lưu được.
  - Trụ sở và khách thường vẫn dùng như cũ. 375, 800, 1280px không tràn ngang; console không lỗi.
- [ ] **Step 9: Dừng, bàn giao commit** `feat(ui): branch manager admin area and account management`, rồi một PR `feat: branch managers with per-cinema access`.
