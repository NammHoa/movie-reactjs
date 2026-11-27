# Hàng poster trang chủ và trang Movie Talk: thiết kế

Ngày: 2026-11-27. Trạng thái: đã duyệt.

**[Bạn chốt]** là điều bạn đã quyết định. **[Đề xuất]** là phần mình điền thêm và bạn đã duyệt cùng bản thiết kế.

## 1. Mục đích

**[Bạn chốt]** Trang chủ trông như ảnh mẫu bạn gửi. Phần chia "Đang chiếu / Sắp chiếu" chuyển sang Movie Talk.

## 2. Không làm

- Sửa server, database, trang quản trị; thêm thư viện.
- Các tính năng cộng đồng khác của Movie Talk (bài viết, bình luận chung).
- Dùng hình, logo, nội dung của Lotte. Chỉ mượn bố cục.

## 3. Cách làm

Dùng lại hàng poster hiện có (đã trượt và có mũi tên), đổi giao diện. **[Đề xuất]** Không dùng thư viện carousel vì phần trượt đã có và đã được thử.

## 4. Hàng poster ở trang chủ

- **[Bạn chốt]** Chỉ phim đang chiếu. Chỉ có poster, không hiện tên, thời lượng, điểm hay nhãn.
- **[Bạn chốt]** Rê chuột vào poster: poster tối đi, hiện **Đặt vé** và **Chi tiết**.
- **[Đề xuất]** Mỗi khung: 2 poster (điện thoại), 3 (từ 640px), 4 (từ 768px), 5 (từ 1024px). Poster tỉ lệ 2:3. Poster lỗi hoặc không có thì hiện ô có tên phim.
- **[Đề xuất]** Mũi tên lớn, nét mảnh, nằm ngoài hàng poster, từ 768px. Khóa ở đầu và cuối, ẩn khi đủ chỗ. Điện thoại vuốt. Ít phim thì hàng canh giữa.
- **[Đề xuất]** Nút có viền mảnh, chữ màu kem. Dùng bàn phím đến nút thì lớp phủ cũng hiện. Trình đọc màn hình nghe được nút thuộc phim nào.
- **[Đề xuất]** Màn hình cảm ứng: chạm poster thì hiện hai nút (lần chạm đầu không chuyển trang), chạm poster khác thì chuyển sang nó, chạm ra ngoài thì ẩn. Vuốt không làm hiện nút.
- **[Đề xuất]** **Đặt vé** mở trang phim và cuộn tới Lịch chiếu sau khi trang tải xong. **Chi tiết** mở đầu trang phim.
- **[Đề xuất]** Banner và Box Office giữ nguyên phía trên. "Mua vé" trên menu và "Mua vé ngay" ở Box Office vẫn cuộn tới hàng poster. Đang tải, lỗi, không có phim: vẫn có dòng thông báo.

## 5. Movie Talk (`/movie-talk`)

- **[Bạn chốt]** Chứa phần phim đang chiếu và sắp chiếu.
- **[Đề xuất]** Hai tab Đang chiếu (mặc định), Sắp chiếu. Mỗi tab là lưới thẻ phim như trước (poster, tên, thời lượng, thể loại, điểm, nhãn trạng thái): 2 cột điện thoại, 3 từ 640px, 4 từ 768px, 5 từ 1024px.
- **[Đề xuất]** Tab đang xem nằm trên đường dẫn (`/movie-talk` hoặc `/movie-talk?tab=coming`), nên bấm Quay lại về đúng tab. Đổi tab không thêm mục vào lịch sử trình duyệt. Giá trị lạ thì coi như Đang chiếu.
- **[Đề xuất]** Đang tải, lỗi, danh sách trống: có dòng thông báo; không hiện danh sách của tab trước dưới tên tab mới.

## 6. Cách kiểm tra và bàn giao

- Test tự động cho quy tắc không cần giao diện. Giao diện kiểm trên trình duyệt bằng database test, ở 375, 800 và 1280px, gồm cả chạm trên màn hình cảm ứng giả lập.
- Giao diện tiếng Việt, commit tiếng Anh, bạn là người commit. Một PR trên nhánh `feature/home-posters`.
