# Hàng poster trang chủ và Movie Talk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển hai tab Đang chiếu / Sắp chiếu sang Movie Talk, và đổi trang chủ thành hàng poster có nút Đặt vé / Chi tiết.

**Architecture:** Làm Movie Talk trước để hai tab không lúc nào biến mất khỏi web. Sau đó trang chủ chỉ còn tải phim đang chiếu, `PosterRow` giữ phần trượt cũ và dùng thẻ mới `PosterTile`. "Đặt vé" là đường dẫn `/movies/:id#showtimes`, trang phim tự cuộn khi tải xong.

**Tech Stack:** React 19, React Router 7, Tailwind CSS 4, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-27-home-posters-movie-talk-design.md`

## Global Constraints

- Không thêm thư viện. Không sửa server, database, trang quản trị.
- Chỉ mượn bố cục: không dùng hình, logo, nội dung của Lotte trong code.
- Số poster mỗi khung: 2 (điện thoại), 3 (`sm`), 4 (`md`), 5 (`lg`). Mũi tên từ `md`. Lưới Movie Talk cùng số cột.
- Chữ trên nút lớp phủ màu kem `#e3d9a5`. Giao diện tiếng Việt, commit tiếng Anh, người dùng là người commit.
- Kiểm trên trình duyệt chỉ dùng database `_test`, ở 375, 800, 1280px.

## Review Focus

1. Màn hình cảm ứng: lần chạm đầu vào đúng chỗ nút "Đặt vé" còn ẩn không được chuyển trang (Task 2, kiểm a).
2. Vuốt hàng poster không làm hiện nút và không chuyển trang (Task 2, kiểm b).
3. "Đặt vé" khi mạng chậm và khi phim chưa có suất: trang phim vẫn dừng ở Lịch chiếu sau khi tải xong (Task 2, kiểm c).
4. 1–2 phim thì canh giữa; 12 phim thì poster đầu không bị cắt và cuộn tới được poster cuối (Task 2, kiểm d).
5. Movie Talk: đổi tab nhanh khi mạng chậm không hiện danh sách của tab kia; Quay lại từ phim sắp chiếu về đúng tab (Task 1, kiểm trên trình duyệt).

---

### Task 1: Trang Movie Talk

**Files:**
- Create: `client/src/lib/movieTalk.js`, `client/src/pages/user/MovieTalk.jsx`
- Modify: `client/src/lib/menu.js`, `client/src/App.jsx`, `client/test/menu.test.js`
- Test: `client/test/movieTalk.test.js`

**Interfaces:**
- Consumes: `MovieCard` (mặc định, `components/MovieCard`), `GET /movies?status=`.
- Produces: `TALK_TABS: Array<{ status: 'now_showing'|'coming_soon', label: string, search: string }>`; `statusFromSearch(search: string): 'now_showing'|'coming_soon'`.

- [ ] **Step 1: Viết test**

```js
// movieTalk.test.js
assert.deepEqual(TALK_TABS.map((t) => [t.status, t.label, t.search]), [
  ['now_showing', 'Đang chiếu', ''],
  ['coming_soon', 'Sắp chiếu', '?tab=coming'],
])
assert.equal(statusFromSearch(''), 'now_showing')
assert.equal(statusFromSearch('?tab=coming'), 'coming_soon')
assert.equal(statusFromSearch('?tab=xyz'), 'now_showing')
assert.equal(statusFromSearch('?tab=coming&x=1'), 'coming_soon')
```

Trong `menu.test.js`, đổi test "5 mục chưa làm" thành 4 mục: `['/news', '/shop', '/de-coin', '/rent']`.

- [ ] **Step 2:** `npm --prefix client test`. Expected: FAIL ở cả hai file (chưa có module; menu còn 5 mục).
- [ ] **Step 3:** Viết `movieTalk.js`; bỏ `comingSoon` của Movie Talk; thêm route `/movie-talk`. Chạy lại, Expected: PASS.
- [ ] **Step 4:** `MovieTalk.jsx`: tiêu đề "Movie Talk", hai tab là `Link` tới `/movie-talk` + `search` với `replace`, tab đang xem có `aria-current="page"`. Phần danh sách là component con có `key={status}` (đổi tab thì state mới, nên không lẫn danh sách cũ), tự tải và bỏ kết quả đến trễ. Có "Đang tải...", "Không thể tải danh sách phim", "Chưa có phim nào trong mục này.".
- [ ] **Step 5:** lint, build. Kiểm trình duyệt: hai tab đúng phim; làm chậm API 3 giây, bấm qua lại nhanh thì không lẫn; mở phim sắp chiếu rồi Quay lại về tab Sắp chiếu; 375/800/1280 không tràn.
- [ ] **Step 6: Dừng, bàn giao commit** `feat(ui): add Movie Talk page with now showing and coming soon` (chưa mở PR). Lúc này trang chủ vẫn còn hai tab.

### Task 2: Hàng poster trang chủ và "Đặt vé"

**Files:**
- Create: `client/src/components/PosterTile.jsx`
- Modify: `client/src/components/PosterRow.jsx`, `client/src/pages/user/Home.jsx`, `client/src/pages/user/MovieDetail.jsx`, `README.md` (mục Tính năng)

**Interfaces:**
- Produces: `<PosterTile movie active onActivate onDeactivate />`; `<PosterRow movies />` (chữ ký không đổi).

- [ ] **Step 1:** `PosterTile`: ảnh 2:3, lỗi hoặc thiếu ảnh thì ô có tên phim. Lớp phủ tối có hai `Link`: "Đặt vé" (`/movies/:id#showtimes`, `aria-label="Đặt vé phim <tên>"`) và "Chi tiết" (`/movies/:id`, `aria-label="Chi tiết phim <tên>"`). Mặc định trong suốt và `pointer-events-none`; hiện và bấm được khi `group-hover`, `group-focus-within` hoặc `active`. Bấm vào thẻ gọi `onActivate`, chuột rời thẻ gọi `onDeactivate`.
- [ ] **Step 2:** `PosterRow`: giữ `rowState` và cuộn từng khung; giữ id thẻ đang mở, `pointerdown` bên ngoài thẻ đó thì đóng. Mũi tên là nét chữ V lớn, mảnh, nằm trong phần đệm hai bên (`md:px-12`). Canh giữa bằng lề tự động ở thẻ đầu và cuối (không dùng `justify-center`, vì sẽ cắt thẻ đầu khi tràn).
- [ ] **Step 3:** `Home`: bỏ hai tab, chỉ tải `status=now_showing`; phần danh sách giữ `id="movie-list"` có tiêu đề ẩn "Phim đang chiếu"; trống thì "Chưa có phim đang chiếu."; "Mua vé" và "Mua vé ngay" vẫn đợi đủ dữ liệu rồi cuộn.
- [ ] **Step 4:** `MovieDetail`: khi `location.hash === '#showtimes'` và `status === 'ok'` thì cuộn tới `#showtimes`.
- [ ] **Step 5:** README: sửa dòng Trang chủ và dòng Menu (Movie Talk đã có, còn 4 mục đang phát triển). `npm --prefix client test`, lint, build; `npm --prefix server test`. Expected: đạt, lint không cảnh báo.
- [ ] **Step 6:** Kiểm trình duyệt:
  - a. Giả lập cảm ứng 375px: chạm đúng vị trí nút "Đặt vé" đang ẩn thì chỉ hiện lớp phủ, đường dẫn không đổi; chạm lần nữa mới đi; chạm ra ngoài thì ẩn.
  - b. Vuốt hàng: không thẻ nào mở, đường dẫn không đổi.
  - c. Làm chậm API 3 giây, bấm "Đặt vé" (phim có suất và không có suất): sau khi tải, `#showtimes` nằm gần mép trên.
  - d. 1, 2, 12 phim ở 375/800/1280: canh giữa khi ít; khi nhiều, poster đầu nằm trọn trong khung và mũi tên đi tới được poster cuối.
  - e. 1280px: rê chuột hiện nút, rời đi ẩn; dùng Tab tới nút thì hiện.
  - f. "Mua vé" trên menu và "Mua vé ngay" vẫn cuộn tới hàng poster.
- [ ] **Step 7: Bàn giao PR.** Commit `feat(ui): poster-only home row with book and detail actions`; PR `feat: poster home row and Movie Talk page` gồm hai commit.
