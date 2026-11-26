# Home Banner, Box Office và Trang Chi Tiết Phim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang chủ có menu mới, banner do admin quản lý, bảng Box Office, hàng poster; trang chi tiết phim có bố cục mới.

**Architecture:** Banner là một tài liệu duy nhất chứa mảng id phim theo thứ tự, nên giới hạn 8, chống trùng và đổi thứ tự đều là một lệnh nguyên tử. Box Office tính trực tiếp từ vé đã thanh toán, nhớ tạm 60 giây. Phần trượt ảnh tự viết bằng CSS scroll-snap.

**Tech Stack:** React 19, Tailwind CSS 4, React Router 7, Express 5, Mongoose 9. Test bằng `node:test` có sẵn trong Node.

**Spec:** `docs/superpowers/specs/2026-11-26-home-banner-movie-detail-design.md` (đọc cùng kế hoạch này)

## Global Constraints
- Không thêm thư viện nào (kể cả thư viện test).
- Ưu tiên điện thoại: mọi trang thay đổi phải không tràn ngang ở 375px, và được xem thêm ở 1280px.
- Không dùng logo, tên, hình ảnh hay nội dung của Lotte.
- Chỉ ghi chú trong code ở chỗ logic khó. Chữ trên giao diện bằng tiếng Việt, commit bằng tiếng Anh.
- **Người dùng tự commit, push, merge.** Mỗi PR kết thúc bằng bước "bàn giao": đưa lệnh và mô tả PR, rồi chờ người dùng báo đã merge. Không bắt đầu PR sau khi PR trước chưa vào `main`.
- PowerShell nối lệnh bằng `;`.
- Không bao giờ chạy test trên database thật: test chỉ dùng database có tên kết thúc bằng `_test`.
- Số cố định từ spec: banner tối đa 8; độ tuổi `P, K, T13, T16, T18`; quốc gia tối đa 60 ký tự; Box Office tối đa 7 phim, cửa sổ 168 giờ theo `paidAt`, nhớ tạm 60 giây; banner 16:9.

## Review Focus
1. Link trailer đủ kiểu (`youtu.be/ID?si=…`, `watch?x=1&v=ID`, `m.youtube.com`) phải phát được; link giả như `youtube.com.evil.com` không được nhúng (Task 2).
2. Hai lần thêm banner cùng lúc khi đang có 7 phim, hoặc bấm đúp một phim: không bao giờ thành 9 hay trùng (Task 4).
3. Banner trỏ tới phim đã bị xóa khỏi database bằng đường khác: API không lỗi, và mục đó không chiếm một trong 8 chỗ (Task 4).
4. Đơn thanh toán đúng ngay mốc 168 giờ được tính, quá mốc 1 giây thì không (Task 6).
5. Phim cũ thiếu mọi trường mới, tên rất dài: trang chi tiết và Box Office không hiện nhãn rỗng, không tràn ở 375px (Task 3, Task 7).

---

## Bản đồ file

| File | Việc |
|---|---|
| `server/test/helpers/testApp.js` | Mở app trên database `_test`, tạo user và token |
| `server/src/models/Movie.js`, `controllers/movieController.js` | 4 trường mới; gỡ phim khỏi banner khi xóa; route Box Office |
| `server/src/models/BannerList.js`, `services/banners.js`, `controllers/bannerController.js`, `routes/bannerRoutes.js` | Banner |
| `server/src/services/boxOffice.js` | Xếp hạng |
| `client/src/lib/{video,ageRating,slider}.js` | Hàm thuần, có test |
| `client/src/components/{AgeBadge,TrailerHero,MovieInfo,BannerSlider,BoxOffice,PosterRow}.jsx` | Giao diện |
| `client/src/pages/admin/{MovieForm,Banners}.jsx` | Admin |
| `client/src/pages/user/{MovieDetail,Home}.jsx`, `components/Navbar.jsx` | Trang khách |

---

# PR 1: thông tin phim và trang chi tiết (nhánh `feature/movie-detail`)

### Task 1: Bốn trường mới của phim, và bộ khung test

**Files:** Create `server/test/helpers/testApp.js`, `server/test/movie-fields.test.js`. Modify `server/src/models/Movie.js`, `server/src/controllers/movieController.js`, `server/package.json`.

**Interfaces — Produces:**
- Movie: `backdrop: String ''`, `ageRating: '' | 'P' | 'K' | 'T13' | 'T16' | 'T18'`, `country: String ''`, `formats: [String]`. `Movie.AGE_RATINGS` là mảng 5 mã.
- `testUri(uri: string): string` (xuất cùng helper, dùng khi chạy server trên database test để xem giao diện).
- `startTestApp(): Promise<{ call(method, path, body?, token?) -> {status, json}, makeUser(role='user') -> {user, token}, stop() }>`

- [ ] **Step 1: Viết helper.** Phần chọn database phải đúng như sau (đây là chốt an toàn):

```js
// server/test/helpers/testApp.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), quiet: true })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

// Đổi tên database trong chuỗi kết nối thành "<tên>_test"; không bao giờ cho test chạm database thật
function testUri(uri) {
  const m = /^(mongodb(?:\+srv)?:\/\/[^/]+)\/?([^?]*)(\?.*)?$/.exec(uri || '')
  if (!m) throw new Error('MONGO_URI không hợp lệ')
  const base = m[2] || 'movie-booking'
  return `${m[1]}/${base.endsWith('_test') ? base : `${base}_test`}${m[3] || ''}`
}
process.env.MONGO_URI = testUri(process.env.MONGO_URI)
process.env.RATE_LIMIT_OFF = 'true'
process.env.EMAIL_PROVIDER = ''
```

  Sau đó: kết nối mongoose, `assert(mongoose.connection.name.endsWith('_test'))`, `dropDatabase()`, `await` `init()` của mọi model đã đăng ký (để có chỉ mục unique), `require('../../src/app').listen(0)`. `makeUser` tạo `User` thẳng bằng model và ký token bằng `utils/token.signToken`. `stop()` xóa database test, đóng server và kết nối.
- [ ] **Step 2:** `server/package.json`: `"test": "node --test --test-concurrency=1 \"test/*.test.js\""` (ghi rõ mẫu file, nếu không Node chạy cả file trong `test/helpers`; cần Node 22 trở lên để chạy test).
- [ ] **Step 3: Viết test** `movie-fields.test.js` (admin gọi `POST/PUT /api/movies`):

```js
test('lưu và trả đủ 4 trường mới', ...) // backdrop 'https://img.example/b.jpg', ageRating 'T16', country 'Việt Nam', formats '2D, Phụ đề tiếng Anh' -> ['2D','Phụ đề tiếng Anh']
test('phim không gửi trường mới vẫn tạo được, mặc định rỗng', ...) // backdrop '', ageRating '', country '', formats []
test('từ chối giá trị sai', ...) // backdrop 'javascript:alert(1)' -> 400; ageRating 'T15' -> 400; country 'x'.repeat(61) -> 400; 60 ký tự -> 201
test('cập nhật một phần không xóa trường khác; gửi chuỗi rỗng thì xóa được', ...)
```
- [ ] **Step 4:** `cd server; npm test` → FAIL (trường chưa được lưu).
- [ ] **Step 5:** Thêm trường vào schema (`ageRating` có `enum` gồm cả `''`). Trong `clean()`: thêm `backdrop` vào vòng kiểm tra URL cùng `poster`, `trailer`; thông báo `Độ tuổi không hợp lệ`, `Quốc gia tối đa 60 ký tự`; `formats` xử lý giống `genres`.
- [ ] **Step 6:** `npm test` → PASS.

### Task 2: Link YouTube, nhãn độ tuổi, form phim

**Files:** Create `client/src/lib/video.js`, `client/src/lib/ageRating.js`, `client/src/components/AgeBadge.jsx`, `client/test/video.test.js`. Modify `client/src/pages/admin/MovieForm.jsx`, `client/package.json` (`"test": "node --test \"test/*.test.js\""`).

**Interfaces — Produces:**
- `youtubeId(url: string): string | null`, `embedUrl(id: string): string` → `https://www.youtube-nocookie.com/embed/<id>?autoplay=1&rel=0`
- `AGE_INFO: Record<code, {label, cls}>`; `<AgeBadge code className />` trả `null` nếu mã rỗng hoặc lạ.
- `video.js` và `ageRating.js` không import gì (để Node chạy được).

- [ ] **Step 1: Viết test** `video.test.js`:

```js
const ID = 'dQw4w9WgXcQ'
for (const u of [`https://www.youtube.com/watch?v=${ID}`, `https://youtube.com/watch?x=1&v=${ID}&t=3`, `https://m.youtube.com/watch?v=${ID}`,
  `https://youtu.be/${ID}?si=abc`, `https://www.youtube.com/shorts/${ID}`, `https://www.youtube.com/embed/${ID}`]) assert.equal(youtubeId(u), ID, u)
for (const u of ['', null, 'abc', `https://youtube.com.evil.com/watch?v=${ID}`, `https://evil.com/youtu.be/${ID}`, `javascript:alert(1)`,
  'https://vimeo.com/123', 'https://youtube.com/watch?v="><script>', 'https://youtube.com/watch']) assert.equal(youtubeId(u), null, String(u))
assert.equal(embedUrl(ID), `https://www.youtube-nocookie.com/embed/${ID}?autoplay=1&rel=0`)
```
- [ ] **Step 2:** `cd client; npm test` → FAIL.
- [ ] **Step 3:** Viết `youtubeId` bằng `new URL`, so `hostname` chính xác với `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`; chỉ nhận giao thức http/https; id phải khớp `^[A-Za-z0-9_-]{11}$`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** `AGE_INFO`: P "Mọi lứa tuổi" xanh lá; K "Dưới 13 tuổi xem cùng người giám hộ" vàng; T13 "Từ 13 tuổi" xanh dương; T16 "Từ 16 tuổi" hồng đậm; T18 "Từ 18 tuổi" đỏ.
- [ ] **Step 6:** `MovieForm`: thêm "Đường dẫn ảnh ngang (16:9, dùng cho banner và trang phim)", "Độ tuổi" (select, mục đầu "Không ghi"), "Quốc gia" (`maxLength` 60), "Loại chiếu (cách nhau bằng dấu phẩy)"; `toForm` điền sẵn 4 trường.

### Task 3: Bố cục trang chi tiết

**Files:** Create `client/src/components/TrailerHero.jsx`, `client/src/components/MovieInfo.jsx`. Modify `client/src/pages/user/MovieDetail.jsx`.

**Interfaces — Consumes:** `youtubeId`, `embedUrl`, `AgeBadge`, `AGE_INFO`. **Produces:** `<TrailerHero movie />` (trả `null` nếu không có `backdrop`); `<MovieInfo movie rating={{average,count}} canBook={boolean} onBook={() => void} />`; mục lịch chiếu có `id="showtimes"`.

- [ ] **Step 1:** `TrailerHero`: dải tiêu đề màu cát theo `status` (`now_showing` "PHIM HOT TẠI RẠP", `coming_soon` "PHIM SẮP CHIẾU", `ended` không có), nền `#231f20`, khung `aspect-video`. ▶ (nút, `aria-label="Phát trailer"`) chỉ khi có `trailer`; là YouTube thì bấm mới gắn `iframe` (`title`, `allow="autoplay; encrypted-media; fullscreen"`, `allowFullScreen`); khác thì link mở tab mới `rel="noopener noreferrer"`. Ảnh lỗi thì khung xám có tên phim.
- [ ] **Step 2:** `MovieInfo` theo mục 7 của spec: poster, nút "Đặt vé" (khóa, ghi "Chưa có suất chiếu" khi `!canBook`), `Stars` hoặc "Chưa có đánh giá", các dòng "Xếp hạng", "Ngày phát hành", "Thông tin cơ bản" (`thể loại, quốc gia (N phút)`), "Loại" (nối bằng ` | `); dòng trống thì ẩn. "Sao chép link" → "Đã sao chép" hoặc "Không sao chép được, hãy chép từ thanh địa chỉ". Không có `backdrop` mà có `trailer` thì hiện link "Xem trailer". Điện thoại: poster nhỏ cạnh tên, nút rộng hết chiều ngang.
- [ ] **Step 3:** `MovieDetail`: `TrailerHero`, `MovieInfo`, "Tóm tắt" (ẩn nếu không có mô tả), rồi giữ nguyên lịch chiếu và đánh giá. `canBook = showtimes.length > 0`. Đặt `key={movie._id}` cho `TrailerHero` để chuyển phim thì trailer dừng.
- [ ] **Step 4:** `cd client; npm run lint; npm run build; npm test` → không lỗi.
- [ ] **Step 5: Xem trên trình duyệt** ở 375px và 1280px với: phim đủ trường; phim cũ chỉ có tên và thời lượng (không nhãn, không dòng trống, không dải đen); tên 120 ký tự; phim không suất (nút khóa); bấm ▶ thấy `iframe` có `src` bắt đầu `https://www.youtube-nocookie.com/embed/`; trước khi bấm không có `iframe`. Dữ liệu mẫu xóa sau khi xem.
- [ ] **Step 6: Bàn giao PR 1.** Commit gợi ý `feat: new movie detail layout with trailer, age rating and extra movie info`. Nhắc admin nhập ảnh ngang cho phim sau khi deploy.

---

# PR 2: banner (nhánh `feature/home-banner`)

### Task 4: API banner

**Files:** Create `server/src/models/BannerList.js`, `server/src/services/banners.js`, `server/src/controllers/bannerController.js`, `server/src/routes/bannerRoutes.js`, `server/test/banners.test.js`. Modify `server/src/app.js` (`/api/banners`), `routes/adminRoutes.js`, `controllers/movieController.js` (`remove` gọi `removeMovie`).

**Interfaces — Produces:**
- Model `BannerList { key: String unique, movies: [ObjectId ref 'Movie'] }`, chỉ một tài liệu `key: 'home'`.
- `services/banners.js`: `MAX_BANNERS = 8`; `hiddenReason(movie): null | 'not_showing' | 'no_backdrop'`; `removeMovie(id): Promise<void>`.
- `GET /api/banners` → `[{ _id, title, backdrop }]` (chỉ mục đang hiện, đúng thứ tự).
- `GET /api/admin/banners` → `{ max: 8, items: [{ _id, title, backdrop, status, hiddenReason }], candidates: [{ _id, title, backdrop, eligible }] }`; `candidates` là phim đang chiếu chưa có trên banner.
- `POST /api/admin/banners { movieId }` → 201; `DELETE /api/admin/banners/:movieId` → 200; `PUT /api/admin/banners/order { ids }` → 200. Ba lệnh này trả cùng dạng với GET admin.

Thông báo lỗi: 404 `Không tìm thấy phim`; 400 `Chỉ thêm được phim đang chiếu có ảnh ngang`; 409 `Phim này đã có trên banner`; 409 `Banner đã đủ 8 phim`; xóa mục không có → 404 `Phim này không có trên banner`; 409 `Danh sách banner vừa thay đổi, vui lòng tải lại` khi `ids` không đúng là cùng tập với danh sách hiện tại (thiếu, thừa, trùng).

- [ ] **Step 1: Viết test** `banners.test.js`: quyền (401 không token, 403 user thường cho cả 4 lệnh admin; GET công khai 200); thêm đúng và các lỗi ở trên; phim `coming_soon` hoặc thiếu `backdrop` → 400; đổi phim sang `ended` thì biến khỏi `/api/banners`, admin thấy `hiddenReason: 'not_showing'`, đổi lại thì hiện; xóa `backdrop` → `'no_backdrop'`; mục ẩn vẫn tính vào 8; đổi thứ tự được và sai tập → 409; xóa phim qua `DELETE /api/movies/:id` gỡ khỏi banner; phản hồi công khai chỉ có đúng 3 khóa. Và hai test Review Focus:

```js
test('đồng thời không vượt 8 và không trùng', ...) // sẵn 7 mục; Promise.all thêm 4 phim khác nhau -> đúng một 201, ba 409, độ dài 8. Sau đó bỏ bớt, Promise.all 5 lần cùng một movieId -> đúng một 201, mảng không trùng
test('mục trỏ tới phim đã mất không làm lỗi và không chiếm chỗ', ...) // Movie.deleteOne trực tiếp -> GET công khai và admin 200, không còn mục đó, thêm được cho đủ 8
```
- [ ] **Step 2:** `cd server; npm test` → FAIL (404).
- [ ] **Step 3:** Cài đặt. Thêm là một lệnh nguyên tử (đảm bảo tài liệu `home` đã có bằng upsert `$setOnInsert`, bỏ qua lỗi 11000, rồi):

```js
BannerList.findOneAndUpdate(
  { key: 'home', movies: { $ne: id }, [`movies.${MAX_BANNERS - 1}`]: { $exists: false } },
  { $push: { movies: id } }, { returnDocument: 'after' })
// null -> đọc lại: đã chứa id thì 409 "đã có", còn lại 409 "đủ 8"
```
  Đổi thứ tự: `findOneAndUpdate({ key: 'home', movies: { $size: n, $all: ids } }, { movies: ids })` sau khi đã kiểm tra `ids` không trùng (mảng rỗng xử lý riêng). Trước mọi lần đọc cho admin hoặc thêm: `$pull` các id không còn phim tương ứng.
- [ ] **Step 4:** `npm test` → PASS.

### Task 5: Slider, trang admin Banner, banner ở trang chủ

**Files:** Create `client/src/lib/slider.js`, `client/test/slider.test.js`, `client/src/components/BannerSlider.jsx`, `client/src/pages/admin/Banners.jsx`. Modify `App.jsx` (`/admin/banners`), `pages/admin/AdminLayout.jsx` (mục "Banner"), `pages/user/Home.jsx`.

**Interfaces — Consumes:** API của Task 4. **Produces:** `wrapIndex(i, count): number`; `nearestIndex(scrollLeft, offsets: number[]): number`; `<BannerSlider items={[{_id,title,backdrop}]} />` (trả `null` khi rỗng).

- [ ] **Step 1: Test**:

```js
assert.equal(wrapIndex(3, 3), 0); assert.equal(wrapIndex(-1, 3), 2); assert.equal(wrapIndex(1, 3), 1); assert.equal(wrapIndex(0, 0), 0)
assert.equal(nearestIndex(0, [0, 800, 1600]), 0); assert.equal(nearestIndex(500, [0, 800, 1600]), 1); assert.equal(nearestIndex(9999, [0, 800, 1600]), 2); assert.equal(nearestIndex(10, []), 0)
```
- [ ] **Step 2:** `cd client; npm test` → FAIL, viết `slider.js`, chạy lại → PASS.
- [ ] **Step 3:** `BannerSlider`: khung cuộn ngang `snap-x snap-mandatory`, ẩn thanh cuộn; slide rộng 100% (điện thoại), 80% từ `lg` với `snap-center` và khoảng đệm hai đầu 10% (ảnh đầu và cuối vẫn ở giữa, phía ngoài để trống). Không có bộ hẹn giờ. Mũi tên `aria-label` "Banner trước", "Banner sau" (từ `lg`); chấm "Banner N" có `aria-current`; chấm cập nhật theo `onScroll`. Một phim: ẩn mũi tên và chấm. Mỗi slide là `Link` tới `/movies/:id`, ảnh `aspect-video object-cover`, `alt` là tên phim, ảnh lỗi thì khung xám có tên.
- [ ] **Step 4:** `Banners.jsx` theo mẫu `Coupons.jsx`: danh sách có ảnh nhỏ, nút ↑ ↓ (`aria-label` "Đưa lên", "Đưa xuống"; khóa ở đầu/cuối), "Xóa" có `window.confirm` nói rõ phim không bị xóa; nhãn "Đang ẩn: phim không còn đang chiếu" hoặc "Đang ẩn: chưa có ảnh ngang". Select chọn phim: mục không đủ điều kiện bị khóa kèm "chưa có ảnh ngang"; đủ 8 thì khóa nút Thêm và ghi "Banner đã đủ 8 phim". Lỗi 409 thì hiện thông báo và tải lại.
- [ ] **Step 5:** `Home.jsx`: tải `/banners`, hiện `BannerSlider` trên hai tab; lỗi tải banner thì chỉ ẩn banner, phim vẫn hiện.
- [ ] **Step 6:** lint, build, test; xem ở 375px và 1280px: mũi tên vòng cuối→đầu, chấm đổi theo vuốt/cuộn, bấm ảnh ra đúng phim, xoay/đổi cỡ màn hình vẫn đúng ảnh đang chọn, không tự trượt sau 10 giây, thêm/xóa/đổi thứ tự ở admin phản ánh ra trang chủ. **Xem bằng database test** (chạy server với `MONGO_URI` của `testUri`) để không đổi banner thật.
- [ ] **Step 7: Bàn giao PR 2.** Commit `feat: admin-managed home banner`.

---

# PR 3: Box Office (nhánh `feature/box-office`)

### Task 6: API xếp hạng

**Files:** Create `server/src/services/boxOffice.js`, `server/test/box-office.test.js`. Modify `server/src/routes/movieRoutes.js` (`/box-office` đặt **trước** `/:id`), `controllers/movieController.js`.

**Interfaces — Produces:** `BOX_OFFICE_SIZE = 7`, `WINDOW_MS = 168 * 3600e3`, `CACHE_MS = 60e3`; `rankMovies(movies, sold: Map<string, number>, limit): Movie[]`; `getBoxOffice(now = new Date()): Promise<Array>`; `clearBoxOfficeCache()`. `GET /api/movies/box-office` công khai → `[{ _id, title, ageRating, duration, releaseDate }]`.

- [ ] **Step 1: Test** (gọi `clearBoxOfficeCache()` trước mỗi kiểm tra):

```js
test('đếm ghế, không đếm đơn') // A: một đơn 4 ghế; B: ba đơn mỗi đơn 1 ghế -> [A, B]
test('chỉ đơn paid') // pending, cancelled, expired, refunding, refunded của B không đổi thứ hạng
test('mốc 168 giờ theo paidAt') // getBoxOffice(now): paidAt = now - WINDOW_MS được tính; now - WINDOW_MS - 1000 không; createdAt cũ nhưng paidAt mới thì tính
test('bằng vé: releaseDate mới hơn đứng trên, thiếu ngày xếp sau, rồi theo tên; phim 0 vé ở cuối')
test('chỉ now_showing, tối đa 7')
test('phản hồi chỉ có _id,title,ageRating,duration,releaseDate') // không có khóa nào chứa số vé
test('nhớ tạm 60 giây') // gọi, thêm đơn, gọi lại -> không đổi; getBoxOffice(new Date(now + CACHE_MS + 1)) -> đổi
```
- [ ] **Step 2:** FAIL. **Step 3:** Cài đặt: aggregate `Booking` (`paid`, `paidAt >= now - WINDOW_MS`) → `$lookup` showtimes → `$group` theo `showtime.movie`, `$sum: { $size: '$seats' }`; xếp bằng `rankMovies` trên danh sách phim đang chiếu. Nhớ tạm trong biến, so với `now`.
- [ ] **Step 4:** PASS.

### Task 7: Bảng Box Office ở trang chủ

**Files:** Create `client/src/components/BoxOffice.jsx`. Modify `pages/user/Home.jsx`.

**Interfaces — Consumes:** API Task 6, `AgeBadge`, `BannerSlider`. **Produces:** `<BoxOffice items onBuy={() => void} />` (trả `null` khi rỗng); danh sách phim ở trang chủ có `id="movie-list"`.

- [ ] **Step 1:** Theo mục 6.4: đầu bảng chữ "BOX OFFICE" nền tối chữ kem, mỗi dòng là `Link` (hạng, `AgeBadge`, tên `truncate` có `title`, "N phút | ngày"; không có ngày thì bỏ cả dấu `|`), nút đỏ "Mua vé ngay".
- [ ] **Step 2:** Bố cục: có cả hai thì `lg:grid-cols-[minmax(0,1fr)_320px]`, dưới `lg` bảng nằm dưới banner; không banner thì bảng ở giữa (`mx-auto max-w-md`); không có bảng thì banner hết chiều ngang. Lỗi tải thì ẩn bảng. `onBuy`: chuyển tab Đang chiếu rồi cuộn tới `#movie-list`.
- [ ] **Step 3:** lint, build, test; xem (database test) ở 375px, 1024px, 1280px với tên 120 ký tự, phim thiếu độ tuổi và ngày, 7 dòng; ba trường hợp bố cục.
- [ ] **Step 4: Bàn giao PR 3.** Commit `feat: box office ranking by tickets sold in the last 7 days`.

---

# PR 4: menu và hàng poster (nhánh `feature/home-layout`)

### Task 8: Hàng poster

**Files:** Create `client/src/components/PosterRow.jsx`. Modify `pages/user/Home.jsx`.

**Interfaces — Produces:** `<PosterRow movies />`.

- [ ] **Step 1:** Cuộn ngang snap dùng `MovieCard`; mỗi thẻ rộng: 2 trên một khung (điện thoại), 3 (`sm`), 4 (`md`), 5 (`lg`). Mũi tên "Phim trước", "Phim sau" từ `md`, cuộn đúng một khung; khóa ở đầu và cuối; ẩn khi đủ chỗ. Hàng poster không xoay vòng.
- [ ] **Step 2:** `Home`: thay lưới bằng `PosterRow key={tab}` (đổi tab về đầu hàng); giữ trạng thái đang tải, trống, lỗi; canh giữa hai tab; bỏ link "Rạp chiếu →".
- [ ] **Step 3:** lint, build; xem với 0, 3, 5, 12 phim ở 375px và 1280px.

### Task 9: Menu

**Files:** Modify `client/src/components/Navbar.jsx`, `pages/user/Home.jsx`, `README.md` (mục Tính năng: banner, Box Office, trang chi tiết).

- [ ] **Step 1:** Logo "DENIM CINEMA". Mục chữ in hoa, vạch mảnh ngăn cách: "Mua vé" (`/#movie-list`), "Rạp chiếu phim" (`/cinemas`). Khách: Đăng nhập, Đăng ký. Đã đăng nhập: Vé của tôi, Hồ sơ, Đăng xuất (từ `sm` có lời chào như hiện nay). Admin thêm Quản trị. Điện thoại: dòng 1 logo và tài khoản, dòng 2 hai mục menu.
- [ ] **Step 2:** `Home`: khi `location.hash === '#movie-list'` (kể cả bấm lại lúc đang ở trang chủ, theo `location.key`), chuyển tab Đang chiếu và cuộn tới danh sách sau khi phim, banner và Box Office đã tải xong.
- [ ] **Step 3:** lint, build; đo ở 375px cho khách, user, admin: đúng 2 dòng (admin được phép xuống thêm dòng ở phần tài khoản nhưng không tràn ngang), mọi mục bấm được; "Mua vé" từ trang khác về đúng danh sách.
- [ ] **Step 4:** Chạy lại toàn bộ: `cd server; npm test` và `cd client; npm test; npm run lint; npm run build`.
- [ ] **Step 5: Bàn giao PR 4.** Commit `feat: new navigation bar and home movie row`.
