# Movie Talk: banner tự trượt và lưới phim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Movie Talk có banner tự trượt, hai tab dạng nút và lưới phim có thứ hạng, nút "Thêm".

**Architecture:** Mọi quy tắc tính được (thứ tự phim, số phim đang mở, khi nào banner được tự trượt) là hàm thuần có test. `BannerSlider` hiện có nhận thêm tùy chọn, mặc định giữ nguyên nên trang chủ không đổi. Dữ liệu lấy từ ba API đã có.

**Tech Stack:** React 19, React Router 7, Tailwind CSS 4, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-28-movie-talk-redesign-design.md`

## Global Constraints

- Không thêm thư viện. Không sửa server, database, trang quản trị.
- Banner trang chủ giữ nguyên: bấm tay, không tự trượt.
- Tự trượt mỗi 5000ms. Mỗi lần hiện 8 phim, "Thêm" cộng 8. Lưới 2 / 3 (`md`) / 4 (`lg`) cột.
- Màu: dải chữ `#ddd3b5`, nền tối `#231f20`, chữ kem `#e3d9a5`.
- Chỉ mượn bố cục: không dùng hình, logo, nội dung của Lotte. Giao diện tiếng Việt, commit tiếng Anh, người dùng là người commit.
- Kiểm trên trình duyệt chỉ dùng database `_test`, ở 375, 800, 1280px.

## Review Focus

1. Dùng chuột bấm mũi tên hay chấm rồi đưa chuột ra: banner phải tự trượt tiếp, không đứng vì nút còn giữ focus (Task 2, kiểm a).
2. Trên điện thoại, sau khi chạm hoặc vuốt banner: nó phải chạy tiếp, không bị coi là "đang rê chuột" mãi (Task 2, kiểm b).
3. Cuộn xuống xem lưới phim trong lúc banner đang chạy: trang không bị kéo ngược lên (Task 2, kiểm c).
4. Box Office còn nhớ tạm một phim đã ngừng chiếu: số thứ hạng vẫn liền nhau 1, 2, 3, không nhảy số (Task 1, test).
5. Bấm "Thêm" rồi mở phim thứ 12 và Quay lại: vẫn thấy ít nhất 12 phim; đổi tab thì về 8 (Task 1, kiểm trên trình duyệt).

---

### Task 1: Hai tab dạng nút và lưới phim

**Files:**
- Create: `client/src/components/TalkCard.jsx`
- Modify: `client/src/lib/movieTalk.js`, `client/src/pages/user/MovieTalk.jsx`, `client/src/components/AgeBadge.jsx`, `client/src/components/MovieCard.jsx` (bỏ thẻ mặc định không còn dùng, giữ `Poster`)
- Test: `client/test/movieTalk.test.js`

**Interfaces:**
- Consumes: `GET /movies?status=`, `GET /movies/box-office` (`[{ _id }]` theo thứ hạng), `rankMeta(movie)` (`lib/movie.js`).
- Produces: `PAGE_SIZE = 8`; `orderTalkMovies(status, movies, ranking): Array<{ movie, rank: number | null }>`; `shownFromState(state): number`; `<AgeBadge code round />`; `<TalkCard movie rank />`.

- [ ] **Step 1: Viết test** (thêm vào `movieTalk.test.js`; `m(id, extra)` tạo `{ _id: id, title: id, ...extra }`, `view = (rows) => rows.map((r) => [r.movie._id, r.rank])`)

```js
// đang chiếu: theo Box Office, phần còn lại giữ thứ tự cũ, không số
assert.deepEqual(view(orderTalkMovies('now_showing', [m('a'), m('b'), m('c'), m('d')], [m('c'), m('a')])),
  [['c', 1], ['a', 2], ['b', null], ['d', null]])
// Box Office còn nhớ phim không còn trong danh sách: số vẫn liền nhau
assert.deepEqual(view(orderTalkMovies('now_showing', [m('a'), m('b')], [m('gone'), m('b'), m('a')])),
  [['b', 1], ['a', 2]])
// không có Box Office: đủ phim, không số
assert.deepEqual(view(orderTalkMovies('now_showing', [m('a'), m('b')], [])), [['a', null], ['b', null]])
// sắp chiếu: ngày sớm trước, thiếu ngày cuối, trùng thì theo tên; bỏ qua Box Office
assert.deepEqual(view(orderTalkMovies('coming_soon', [m('x'), m('late', { releaseDate: '2026-12-20' }), m('b', { releaseDate: '2026-12-01' }), m('a', { releaseDate: '2026-12-01' })], [m('late')])),
  [['a', null], ['b', null], ['late', null], ['x', null]])
// số phim đang mở
assert.equal(PAGE_SIZE, 8)
for (const [state, shown] of [[null, 8], [undefined, 8], [{}, 8], [{ shown: 16 }, 16], [{ shown: 3 }, 8], [{ shown: '24' }, 8], [{ shown: 8.5 }, 8]]) {
  assert.equal(shownFromState(state), shown, JSON.stringify(state))
}
```

Test thêm: `orderTalkMovies` không làm đổi mảng đầu vào.

- [ ] **Step 2:** `npm --prefix client test`. Expected: FAIL vì chưa có các hàm.
- [ ] **Step 3:** Viết các hàm trong `movieTalk.js`; đổi `label` của `TALK_TABS` thành "Phim đang chiếu", "Phim sắp chiếu" (sửa test tên tab). Chạy lại, Expected: PASS.
- [ ] **Step 4:** `AgeBadge` nhận `round`: hình tròn, chữ bỏ chữ "T" đầu (`T16` thành `16`), mặc định giữ như cũ. `TalkCard`: cả thẻ là link; poster 2:3 (`Poster`); `rank` thì số trắng nghiêng ở góc dưới trái trên nền mờ, có chữ ẩn "Hạng N"; hàng tên: `AgeBadge round` và tên `truncate` in hoa có `title`; hàng dưới: `rankMeta`.
- [ ] **Step 5:** `MovieTalk`: tiêu đề `h1` ẩn "Movie Talk"; tab là hai nút liền nhau (vẫn là `Link` với `replace`, `aria-current`). Lưới tải phim; tab đang chiếu tải thêm Box Office cùng lúc (`Promise.allSettled`: lỗi phim thì báo lỗi, lỗi Box Office thì không số). Số phim đang mở đọc từ `location.state` bằng `shownFromState`; "Thêm" gọi `navigate` tới cùng đường dẫn với `replace: true, state: { shown: shown + PAGE_SIZE }`.
- [ ] **Step 6:** lint, build. Kiểm trình duyệt với 12 phim đang chiếu có vé và 3 phim sắp chiếu: thứ tự và số khớp Box Office ở trang chủ; "Thêm" rồi mở phim thứ 12 và Quay lại vẫn thấy 12; đổi tab về 8; trang không nhảy khi bấm "Thêm"; 2 / 3 / 4 cột, không tràn; tên rất dài và phim thiếu nhãn tuổi, ngày.
- [ ] **Step 7: Dừng, bàn giao commit** `feat(ui): ranked movie grid on Movie Talk` (chưa mở PR).

### Task 2: Banner tự trượt

**Files:**
- Create: `client/src/components/HotBanner.jsx`
- Modify: `client/src/components/BannerSlider.jsx`, `client/src/lib/slider.js`, `client/src/pages/user/MovieTalk.jsx`, `README.md`
- Test: `client/test/slider.test.js`

**Interfaces:**
- Consumes: `GET /banners`; `<BannerSlider items />`.
- Produces: `AUTOPLAY_MS = 5000`; `canAutoPlay({ count, paused, hovering, touching, keyboard, hidden }): boolean`; `<BannerSlider items hero autoPlay />` (cả hai mặc định `false`); `<HotBanner />` (tự tải, trả `null` khi chưa có hoặc lỗi).

- [ ] **Step 1: Viết test:** `AUTOPLAY_MS === 5000`; `canAutoPlay` đúng với `{ count: 2 }` mọi cờ tắt; sai khi `count` là 1 hoặc 0, hoặc bất kỳ cờ nào trong `paused, hovering, touching, keyboard, hidden` bật.
- [ ] **Step 2:** FAIL, viết hàm, PASS.
- [ ] **Step 3:** `BannerSlider`: `hero` thì mỗi ảnh rộng hết khung, không ló ảnh bên cạnh, không bo góc, mũi tên ở hai mép trong, chấm trắng/xám cho nền tối. `autoPlay` thì hẹn giờ `setTimeout` phụ thuộc `active` (đổi ảnh là đếm lại), cuộn bằng `scrollTo` của khung (không dùng `scrollIntoView`). Cờ: `hovering` chỉ từ `pointerenter`/`pointerleave` có `pointerType === 'mouse'`; `touching` từ `touchstart`/`touchend`/`touchcancel`; `keyboard` chỉ khi phần tử nhận focus khớp `:focus-visible`, tắt khi focus rời banner; `hidden` từ `visibilitychange`; `paused` ban đầu bằng `prefers-reduced-motion`. Nút "Tạm dừng banner" / "Chạy banner" cạnh các chấm, chỉ khi có từ 2 ảnh.
- [ ] **Step 4:** `HotBanner`: dải "PHIM HOT TẠI RẠP", nền tối, khung `max-w-5xl`. Đặt trên cùng `MovieTalk` (ngoài phần có `key={status}`, đổi tab không tải lại). README: sửa dòng Movie Talk.
- [ ] **Step 5:** `npm --prefix client test`, lint, build; `npm --prefix server test`. Expected: đạt, lint không cảnh báo.
- [ ] **Step 6:** Kiểm trình duyệt: tự chuyển sau khoảng 5 giây và quay vòng; nút tạm dừng/chạy; 1 ảnh và 0 ảnh; đổi tab không làm banner về ảnh đầu; trang chủ vẫn đứng yên sau 12 giây.
  - a. Bấm chuột vào mũi tên, đưa chuột ra: sau 5 giây ảnh vẫn chuyển.
  - b. Giả lập cảm ứng: chạm banner (ngoài ảnh) hoặc vuốt xong, ảnh vẫn tự chuyển.
  - c. Cuộn xuống cuối lưới, đợi 2 lần chuyển: `scrollY` không đổi.
  - d. Tab đến mũi tên bằng bàn phím: dừng; Tab ra ngoài: chạy.
- [ ] **Step 7: Bàn giao PR.** Commit `feat(ui): auto-sliding hot movie banner on Movie Talk`; PR `feat: redesign Movie Talk with auto banner and ranked grid` gồm hai commit.
