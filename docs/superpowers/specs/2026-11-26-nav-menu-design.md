# Menu 7 mục (máy tính và điện thoại): thiết kế

Ngày: 2026-11-26. Trạng thái: đã duyệt.

**[Bạn chốt]** là điều bạn đã quyết định. **[Đề xuất]** là phần mình điền thêm, bạn sửa được.

## 1. Mục đích

**[Bạn chốt]** Thanh menu giống ảnh mẫu bạn gửi, để làm dần nhiều chức năng. Có thiết kế riêng cho điện thoại.

## 2. Không làm trong đợt này

- Nội dung của 5 tính năng mới. Mỗi tính năng sẽ bàn và làm riêng, bắt đầu từ **Tin mới & Ưu đãi** (**[Đề xuất]**).
- Sửa server, database, trang quản trị.
- Thêm thư viện mới.
- Dùng logo, hình, nội dung hay tên riêng của Lotte. Chỉ mượn bố cục.

## 3. Các cách đã cân nhắc

| Câu hỏi | Các cách | Chọn |
|---|---|---|
| Hiện menu thế nào | Thêm mục khi làm xong; hiện đủ 7 mục ngay | **[Bạn chốt]** Đủ 7 mục ngay. Đổi lại, web có mục chưa dùng được |
| Menu điện thoại | A: nút ba gạch; B: dòng menu vuốt ngang; C: thanh ở đáy màn hình | **[Bạn chốt]** A. Thấy đủ 7 mục, đầu trang chỉ một dòng; đổi lại phải bấm một lần mới thấy menu |
| Trang chưa làm | Một trang dùng chung; 5 trang riêng | **[Đề xuất]** Dùng chung, vì trang nào sau này cũng viết lại |

## 4. Bảy mục

Theo thứ tự này. Tên hiện in hoa.

| Mục | Đường dẫn | Tình trạng |
|---|---|---|
| Mua vé | `/#movie-list` | Đã có |
| Movie Talk | `/movie-talk` | Đang phát triển |
| Rạp chiếu phim | `/cinemas` | Đã có |
| Tin mới & Ưu đãi | `/news` | Đang phát triển |
| Shop | `/shop` | Đang phát triển |
| De Coin | `/de-coin` | Đang phát triển |
| Quảng cáo & Thuê rạp | `/rent` | Đang phát triển |

**[Bạn chốt]** "De Coin" thay cho "L-Corn" trong ảnh mẫu (L-Corn là tên riêng của Lotte). Chức năng của mục này bàn sau.

## 5. Máy tính (từ 1024px)

- **[Đề xuất]** Dòng 1: logo bên trái, phần tài khoản bên phải (giữ nội dung như hiện nay).
- **[Đề xuất]** Một vạch màu cát (`#ddd3b5`), rồi dòng 2: 7 mục canh giữa, in hoa, có vạch mảnh ngăn cách.
- **[Đề xuất]** 7 mục phải nằm trên một dòng ở 1024px. Thiếu chỗ thì giảm khoảng đệm hoặc cỡ chữ, không cho xuống dòng.

## 6. Điện thoại và máy tính bảng (dưới 1024px)

- **[Bạn chốt]** Đầu trang một dòng: logo bên trái, nút ba gạch bên phải. Bấm nút mở danh sách đủ 7 mục.
- **[Đề xuất]** Danh sách mở ngay dưới đầu trang và phủ lên nội dung. Mỗi mục một dòng, cao ít nhất 44px, có mũi tên bên phải. Danh sách dài hơn màn hình thì cuộn được. Khi menu mở, trang phía sau không cuộn.
- **[Đề xuất]** Cuối danh sách là phần tài khoản:
  - Khách: nút Đăng nhập, Đăng ký.
  - Đã đăng nhập: "Xin chào, tên" (tên dài thì cắt bằng "..."), Vé của tôi, Hồ sơ, Đăng xuất.
  - Admin: thêm Quản trị.
- **[Đề xuất]** Menu đóng khi: bấm một mục (kể cả mục của trang đang xem), bấm Đăng xuất, bấm nút ✕, bấm phím Esc, bấm nút Quay lại của trình duyệt, hoặc kéo màn hình rộng từ 1024px.
- **[Đề xuất]** Hỗ trợ bàn phím và trình đọc màn hình: nút có nhãn "Mở menu" / "Đóng menu" và cho biết menu đang mở hay đóng; menu đóng thì các mục bên trong không chọn được; đóng bằng Esc thì con trỏ bàn phím về lại nút.

## 7. Trang đang xem

**[Đề xuất]** Mục của trang đang xem được tô đỏ, cả trên máy tính lẫn trong danh sách điện thoại. "Mua vé" được tô khi đang ở trang chủ. Ở trang không thuộc mục nào (chi tiết phim, đặt vé, tài khoản, quản trị) thì không tô mục nào, trừ trang con của rạp (`/cinemas/...`) vẫn tô "Rạp chiếu phim".

## 8. Trang "Đang phát triển"

**[Đề xuất]** Tiêu đề là tên mục, dòng "Tính năng đang được phát triển.", hai nút **Mua vé** và **Về trang chủ**.

## 9. Để người làm tự quyết

Cách chia component, có hiệu ứng mở menu hay không (nếu có thì ngắn), cách vẽ biểu tượng ba gạch và ✕ (không thêm thư viện).

## 10. Cách kiểm tra và bàn giao

- Test tự động cho các quy tắc không cần giao diện (danh sách mục, mục nào được tô). Phần giao diện kiểm trên trình duyệt bằng database test.
- Kiểm ở 320, 375, 1024 và 1280px với khách, người dùng tên rất dài và admin: không tràn ngang, mọi mục bấm được.
- Giao diện tiếng Việt (trừ tên riêng), commit tiếng Anh, bạn là người commit. Một PR trên nhánh `feature/nav-menu`.
