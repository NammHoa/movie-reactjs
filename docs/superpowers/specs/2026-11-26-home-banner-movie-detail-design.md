# Thiết kế: trang chủ mới (menu, banner, Box Office, hàng phim) và trang chi tiết phim

Ngày: 2026-11-26. Trạng thái: **đã duyệt** (2026-11-26).

Ký hiệu: **[Bạn chốt]** là điều bạn đã yêu cầu hoặc chọn. **[Đề xuất]** là phần mình tự quyết, bạn có thể đổi.

## 1. Mục đích

**[Bạn chốt]** Trang chủ giới thiệu các phim đang chiếu theo kiểu trang rạp lớn (mẫu: Lotte Cinema, bạn đã gửi ảnh): banner phim do admin quản lý, bảng Box Office, hàng poster phim. Bấm banner phim thì sang trang chi tiết có bố cục giống ảnh mẫu.

Chỉ làm theo **bố cục** của ảnh mẫu. Không dùng logo, tên, hình ảnh hay nội dung của Lotte.

## 2. Mục tiêu và ngoài phạm vi

**Mục tiêu**
- Admin thêm, xóa phim trên banner mà không sửa code.
- Khách bấm banner hoặc một dòng Box Office là tới trang chi tiết phim.
- Box Office xếp đúng theo số vé bán được.

**Ngoài phạm vi:** mục Event; các mục menu chưa có chức năng (Shop, Movie Talk, Tin mới...); thanh nổi bên phải; nút lưu và Facebook; dải ảnh nhỏ dưới trailer; điểm thang 10; banner tự trượt; banner quảng cáo không gắn với phim; tải ảnh từ máy tính; chặn đặt vé theo độ tuổi.

**Coi là thất bại nếu:** banner hiện phim không còn đang chiếu; menu có mục bấm vào không ra gì; trang bị tràn ngang ở 375px; khách đọc được số vé đã bán.

## 3. Ràng buộc
- Giữ React 19 + Tailwind CSS 4 + Express + MongoDB, **không thêm thư viện**.
- Ưu tiên điện thoại, kiểm tra ở 375px và màn hình lớn.
- Chia PR nhỏ. Bạn tự commit, push, merge.
- Render bản miễn phí: ngủ khi không dùng, file lưu trên server không bền.

## 4. Các cách đã cân nhắc

**Phần trượt ảnh (banner, hàng poster)**

| Cách | Được | Mất |
|---|---|---|
| **1. Tự viết bằng CSS scroll-snap (đã chọn)** | Không thêm thư viện, vuốt mượt sẵn trên điện thoại | Không xoay vòng liền mạch; tự viết và tự kiểm thử |
| 2. Thư viện Swiper | Xoay vòng liền mạch, ló hai bên có sẵn | Thêm một thư viện, web nặng hơn, phải cập nhật theo thư viện |

**[Bạn chốt]** Cách 1.

**Cách tính Box Office** [Đề xuất]: tính trực tiếp từ vé đã thanh toán, giữ tạm khoảng 1 phút. Không lưu sẵn bộ đếm trên phim (không biết vé nào đã quá 7 ngày, dễ lệch khi hoàn tiền). Không tính theo lịch (server hay ngủ, dữ liệu còn ít).

**Nguồn ảnh** [Đề xuất, bạn chưa chọn]: admin **dán đường dẫn ảnh**, giống ô poster hiện tại. Tải từ máy cần dịch vụ lưu ảnh ngoài (ví dụ Cloudinary); làm sau vẫn được vì dữ liệu vẫn chỉ là đường dẫn.

## 5. Thông tin phim bổ sung [Đề xuất]

Thêm vào phim và form phim của admin. Tất cả đều không bắt buộc, phim cũ vẫn chạy.

| Trường | Nội dung | Quy tắc |
|---|---|---|
| Ảnh ngang | URL ảnh, nên tỉ lệ 16:9 | Chỉ nhận http/https. Dùng cho cả banner và đầu trang chi tiết |
| Độ tuổi | P, K, T13, T16, T18 | Chọn từ danh sách |
| Quốc gia | Chữ | Tối đa 60 ký tự |
| Loại chiếu | Danh sách, cách nhau bằng dấu phẩy (2D, Phụ đề tiếng Anh) | Giống ô thể loại |

Dữ liệu cũ đang ghi "2D | Normal..." trong ô thể loại thì admin sửa tay, không tự chuyển.

Nhãn độ tuổi: P xanh lá, K vàng, T13 xanh dương, T16 hồng đậm, T18 đỏ. Chưa có độ tuổi thì không hiện nhãn.

## 6. Trang chủ

```
┌─────────────────────────────────────────────────────────────┐
│ DENIM CINEMA │ MUA VÉ │ RẠP CHIẾU PHIM          [Tài khoản] │
├──────────────────────────────────────────┬──────────────────┤
│  ‹        [ banner phim ]             ›  │    BOX OFFICE    │
│               ● ○ ○                      │ 1. (T16) Phim A  │
│                                          │ 2. (T13) Phim B  │
│                                          │ [ Mua vé ngay ]  │
├──────────────────────────────────────────┴──────────────────┤
│                 Đang chiếu  |  Sắp chiếu                    │
│  ‹  [poster] [poster] [poster] [poster] [poster]  ›         │
└─────────────────────────────────────────────────────────────┘
Điện thoại, từ trên xuống: menu, banner, Box Office, hàng poster.
```

**[Đề xuất]** Box Office nằm cạnh banner từ màn hình rộng 1024px trở lên, hẹp hơn thì xếp dưới. Nếu Box Office bị ẩn thì banner chiếm cả chiều ngang.

### 6.1 Menu
- **[Bạn chốt]** Có thanh menu ở trên cùng.
- **[Đề xuất]** Chữ in hoa, vạch mảnh ngăn cách. Logo đổi thành **Denim Cinema**.
- **[Đề xuất]** Chỉ gồm: Mua vé (về trang chủ, tới danh sách phim), Rạp chiếu phim. Khách: Đăng nhập, Đăng ký. Đã đăng nhập: Vé của tôi, Hồ sơ, Đăng xuất. Admin thêm: Quản trị.
- **[Đề xuất]** Điện thoại dùng 2 dòng có chủ đích: dòng 1 logo và tài khoản, dòng 2 Mua vé và Rạp chiếu phim. Link "Rạp chiếu →" ở hàng tab trang chủ được bỏ.

### 6.2 Banner
- **[Bạn chốt]** Chỉ gồm phim đang chiếu do admin chọn. Bấm ảnh sang trang chi tiết. Không tự trượt, khách bấm tay.
- **[Đề xuất]** Máy tính: mũi tên và chấm tròn. Điện thoại: vuốt. Ở ảnh cuối bấm › thì trượt ngược về ảnh đầu, ở ảnh đầu bấm ‹ thì tới ảnh cuối.
- **[Đề xuất]** Máy tính ló một phần ảnh bên cạnh. Vì không xoay vòng, **ảnh đầu không có gì ló bên trái, ảnh cuối không có gì ló bên phải** (phần đó để trống, ảnh đang xem vẫn ở giữa).
- **[Đề xuất]** Chỉ hiện ảnh (không chèn chữ), tỉ lệ 16:9, cắt cho vừa khung. Ảnh lỗi thì hiện khung xám có tên phim. Có 1 phim thì ẩn mũi tên và chấm.
- **[Đề xuất]** Chưa có phim nào đủ điều kiện thì ẩn banner; Box Office nằm giữa trang, phía trên hàng phim.

### 6.3 Quản trị → Banner
- **[Bạn chốt]** Admin thêm và xóa phim trên banner; chọn trong số phim đang chiếu.
- **[Đề xuất]** Có nút lên, xuống để đổi thứ tự. Tối đa 8 phim (tính cả mục đang ẩn); đủ 8 thì khóa nút Thêm và server từ chối. Mỗi phim một lần.
- **[Đề xuất]** Chỉ thêm được phim đang chiếu **và có ảnh ngang**. Phim đang chiếu nhưng thiếu ảnh ngang vẫn hiện trong danh sách chọn, bị khóa, kèm chữ "chưa có ảnh ngang".
- **[Đề xuất]** Phim đổi trạng thái hoặc bị xóa ảnh ngang: tự ẩn khỏi trang chủ, trang admin ghi "Đang ẩn" kèm lý do. Đủ điều kiện lại thì tự hiện. Xóa phim thì mục banner bị xóa theo.
- Xóa khỏi banner không xóa phim. Chỉ admin được sửa; khách chỉ đọc được danh sách đang hiển thị.

### 6.4 Box Office
- **[Bạn chốt]** Xếp theo **số vé** (ghế) bán trong **7 ngày gần nhất**, không đếm số người mua. Hạng 1 là phim bán nhiều vé nhất.
- **[Đề xuất]** "7 ngày" tính lùi 168 giờ theo thời điểm thanh toán (`paidAt`). Chỉ tính đơn đang ở trạng thái đã thanh toán; đơn chờ, hủy, hết hạn, đang hoàn hoặc đã hoàn tiền không tính.
- **[Đề xuất]** Chỉ phim đang chiếu, tối đa 7. Bằng vé thì phim khởi chiếu mới hơn đứng trên (thiếu ngày khởi chiếu xếp sau). Phim 0 vé nằm cuối theo cùng quy tắc. Không có phim đang chiếu thì ẩn bảng.
- **[Đề xuất]** Mỗi dòng: hạng, nhãn độ tuổi, tên (dài thì cắt bằng "..."), thời lượng, ngày khởi chiếu. Bấm dòng sang chi tiết phim. "Mua vé ngay" cuộn tới hàng poster, chọn tab Đang chiếu.
- **[Đề xuất]** API công khai **không trả số vé**, chỉ trả thứ tự. Kết quả giữ tạm khoảng 60 giây, nên vé mới, hoàn tiền hay đổi trạng thái phim có thể trễ chừng đó mới thấy trên bảng.

### 6.5 Hàng poster
- **[Bạn chốt]** Có danh sách phim dưới banner.
- **[Đề xuất]** Giữ hai tab Đang chiếu, Sắp chiếu. Một hàng ngang: máy tính 5 poster, máy tính bảng 3–4, mũi tên chuyển từng nhóm; điện thoại khoảng 2 poster, vuốt. Thẻ phim giữ tên, thời lượng, điểm đánh giá. Đổi tab thì về đầu hàng. Trạng thái trống, đang tải, lỗi giữ như hiện nay.

## 7. Trang chi tiết phim

**[Bạn chốt]** Bố cục giống ảnh mẫu. Phần cụ thể dưới đây là **[Đề xuất]**.

```
┌──────────────── PHIM HOT TẠI RẠP ────────────────┐
│ nền đen        [ ảnh ngang  ▶ ]                  │
└──────────────────────────────────────────────────┘
 [Poster]   TÊN PHIM                    [Sao chép link]
 [      ]   ★★★★☆ 4.7 (12 đánh giá)
 [      ]   Xếp hạng  T16 (từ 16 tuổi)   Ngày phát hành  20/11/2026
 [Đặt vé]   Thông tin cơ bản  Chính kịch, Việt Nam (127 phút)
            Loại  2D | Phụ đề tiếng Anh
 Tóm tắt
 Lịch chiếu  (giữ như hiện tại)
 Đánh giá    (giữ như hiện tại)
```

- Dải tiêu đề: phim đang chiếu ghi "PHIM HOT TẠI RẠP", sắp chiếu ghi "PHIM SẮP CHIẾU", ngừng chiếu không có dải chữ.
- Bấm ▶: link YouTube (`youtube.com/watch`, `youtu.be`, `shorts`, `embed`) phát ngay trong khung bằng `youtube-nocookie.com`; chỉ tải trình phát sau khi bấm. Link khác mở tab mới. Không có trailer thì không có ▶.
- Không có ảnh ngang: bỏ khối nền đen; nếu có trailer thì hiện nút "Xem trailer" cạnh thông tin phim.
- "Đặt vé" cuộn tới Lịch chiếu. Không có suất nào thì nút bị khóa, ghi "Chưa có suất chiếu".
- Điểm giữ thang 5 sao; chưa có đánh giá thì ghi "Chưa có đánh giá".
- Trường trống thì ẩn cả dòng. "Sao chép link" xong hiện "Đã sao chép"; trình duyệt không cho chép thì báo lỗi.
- Điện thoại: xếp dọc, poster nhỏ cạnh tên phim, nút Đặt vé rộng hết chiều ngang.
- Màu: nền tối `#231f20`, chữ kem `#e3d9a5` (đang dùng ở vé điện tử), dải tiêu đề màu cát.

## 8. Chia việc: 4 PR

1. Thông tin phim bổ sung + trang chi tiết mới.
2. Banner: API, trang admin, hiển thị ở trang chủ (kèm phần trượt dùng chung).
3. Box Office: API và bảng cạnh banner.
4. Menu mới và hàng poster.

Thứ tự này để mỗi PR đều thấy được trên web, và banner dùng lại ảnh ngang có từ PR 1. Sau PR 1, admin cần nhập ảnh ngang cho phim thì PR 2 mới có gì để chọn.

## 9. Cách biết là đúng
- API: quyền admin, quy tắc thêm banner, giới hạn 8, ẩn/hiện theo trạng thái.
- Box Office: đếm ghế chứ không đếm đơn; vé quá 7 ngày, đơn hoàn tiền hoặc hủy không được tính; thứ tự khi bằng vé; phản hồi không có số vé.
- Giao diện: không tràn ngang ở 375px; mũi tên, chấm, vuốt; bấm banner và dòng Box Office ra đúng phim; phim cũ thiếu trường mới vẫn hiển thị ổn.

## 10. Để người viết code quyết định
Cách lưu thứ tự banner (bộ sưu tập riêng hay trường trên phim), tên API, cách chia component, miễn đúng các quy tắc trên.
