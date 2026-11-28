# Quản lý rạp theo chi nhánh, thiết kế

Ngày: 2026-11-28. Trạng thái: đã duyệt.

**[Bạn chốt]** là điều bạn đã quyết định. **[Đề xuất]** là phần mình điền thêm và bạn đã duyệt cùng bản thiết kế. **[Mình quyết]** là chi tiết nhỏ mình thêm khi viết tài liệu này, bạn xem và sửa nếu không đúng.

## 1. Mục đích

**[Bạn chốt]** Chuỗi có nhiều chi nhánh. Mỗi chi nhánh có tài khoản riêng để tự quản lý rạp của mình (ví dụ rạp Sư Vạn Hạnh với tên đăng nhập kiểu `svh.denim`), thay vì một admin làm hết cho mọi rạp.

## 2. Không làm trong đợt này

- Bắp nước (đợt sau; đã chốt: trụ sở thêm món và đặt giá chung, quản lý rạp chỉ đánh dấu còn / hết).
- Khung giá vé sàn và trần: quản lý rạp đặt giá trong giới hạn hiện có (số nguyên 1–5.000.000đ).
- Bảng phân quyền tùy chỉnh; một quản lý nhiều rạp; quên mật khẩu qua email; bắt đổi mật khẩu ở lần đăng nhập đầu.
- Thêm thư viện.

## 3. Các cách đã cân nhắc

| Cách | Được | Mất |
|---|---|---|
| A. Một admin làm hết (hiện tại) | Đơn giản | Nhiều rạp thì nghẽn |
| B. Mỗi rạp quản lý riêng, kể cả phim | Rạp chủ động | Phim bị nhập trùng; đánh giá, Box Office bị chia nhỏ |
| **C. Kho phim chung, quản lý theo rạp** | Rạp chủ động, phim không trùng | Phải làm phân quyền |

**[Bạn chốt]** Cách C. Dữ liệu hiện có đã hợp với cách này: phim không gắn rạp, suất chiếu gắn phòng, phòng gắn rạp.

## 4. Vai trò

- **[Đề xuất]** Ba vai trò: `user` (khách), `manager` (quản lý rạp, gắn đúng một rạp), `admin` (trụ sở). Một rạp có thể có nhiều quản lý. Tài khoản admin hiện có vẫn là trụ sở, không phải chuyển dữ liệu.
- **[Đề xuất]** Server là nơi chặn. Mọi chức năng đang chỉ cho `admin` giữ nguyên; chỉ mở cho quản lý những dòng trong bảng dưới. Quản lý mà không có rạp thì bị từ chối hết, không bao giờ được hiểu là "mọi rạp".
- Đổi quyền hay đổi rạp có hiệu lực ngay ở lần gọi API tiếp theo.

| Chức năng | Quản lý rạp |
|---|---|
| Suất chiếu | Thêm, sửa, xóa suất trong phòng của rạp mình, theo các quy tắc hiện có. Không chuyển suất sang phòng rạp khác |
| Tổng quan | Doanh thu, vé, đơn, phim bán chạy, tình trạng đơn của rạp mình. "Phim đang chiếu" là số phim đang chiếu còn suất sắp tới ở rạp. Không có tổng số người dùng |
| Đơn đặt vé | Xem danh sách, tìm và xem chi tiết đơn của rạp mình; hủy đơn **chưa thanh toán** |
| Hoàn tiền | Trong chi tiết đơn chỉ thấy đang hoàn hay đã hoàn và số tiền. Không hoàn, không thử lại, không đánh dấu thủ công |
| Soát vé | Chỉ vé của rạp mình. Vé rạp khác: báo vé thuộc rạp nào, **không** trả thông tin khách, ghế hay trạng thái vé |

- **[Đề xuất]** Mở đơn hoặc suất của rạp khác (kể cả gọi thẳng API) thì trả "không tìm thấy".
- **[Đề xuất]** Phim, banner, mã giảm giá, rạp, phòng, người dùng, hoàn tiền và xóa đánh giá của người khác chỉ dành cho trụ sở. Khi đặt vé cho chính mình, quản lý theo đúng quy tắc của khách.
- **[Đề xuất]** Rạp còn quản lý thì không xóa được.

## 5. Tài khoản chi nhánh

- **[Bạn chốt]** Chi nhánh đăng nhập bằng tên đăng nhập kiểu `svh.denim`.
- **[Đề xuất]** Chỉ trụ sở tạo, ở trang Người dùng: tên đăng nhập, họ tên, email liên hệ (bắt buộc, không trùng tài khoản khác), rạp, mật khẩu tạm.
- **[Đề xuất]** Tên đăng nhập: 4–30 ký tự gồm chữ thường a–z, số, dấu chấm, có ít nhất một chữ cái (nên không bao giờ nhầm với số điện thoại hay email). Gõ hoa hay thường như nhau. Không đổi được. Khách đăng ký không đặt được.
- **[Đề xuất]** Mật khẩu theo đúng quy tắc hiện có (8–16 ký tự, chữ hoa, chữ thường, số hoặc ký tự đặc biệt). Không ghi mật khẩu thật vào code, dữ liệu mẫu hay tài liệu.
- **[Đề xuất]** Ô đăng nhập nhận thêm tên đăng nhập. Tên không tồn tại thì báo không tìm thấy, không chuyển sang đăng ký.
- **[Đề xuất]** Trụ sở đổi rạp, gỡ quyền quản lý, đặt lại mật khẩu (các phiên đăng nhập cũ hết hiệu lực). Quản lý tự đổi mật khẩu ở trang Hồ sơ.
- **[Đề xuất]** Cách này **thay** cho việc cấp quyền quản lý cho tài khoản khách có sẵn.
- **[Mình quyết]** Tài khoản đã gỡ quyền thành khách thường và cấp lại quyền được; nếu không, tên đăng nhập đó sẽ bị kẹt.
- **[Mình quyết]** Không có đường nào biến admin trụ sở thành quản lý, hay biến tài khoản chi nhánh thành admin. Nhờ vậy không có thêm cách nào làm hệ thống hết admin.
- **[Mình quyết]** Tài khoản chi nhánh không có số điện thoại vẫn lưu được họ tên ở trang Hồ sơ.

## 6. Giao diện

- **[Đề xuất]** Quản lý rạp có link "Quản trị"; khu quản trị ghi "Quản lý rạp · tên rạp" và chỉ có Tổng quan, Đơn đặt vé, Soát vé, Suất chiếu. Vào thẳng địa chỉ trang khác thì về Tổng quan. Đăng nhập xong vào thẳng khu quản trị.
- **[Đề xuất]** Form suất chiếu của quản lý: rạp cố định, chỉ chọn được phòng của rạp mình; danh sách chỉ có suất của rạp mình.
- **[Đề xuất]** Trang Người dùng thêm tab "Quản lý rạp", hiện tên đăng nhập và tên rạp.
- Dùng được trên điện thoại (kiểm ở 375, 800, 1280px). Chữ tiếng Việt.

## 7. Cách kiểm tra và bàn giao

- Test server cho từng dòng quyền ở mục 4 và 5, gồm cả các lần thử đụng vào rạp khác. Test và kiểm trên trình duyệt chỉ dùng database `_test`.
- Test client cho quy tắc tên đăng nhập và quy tắc trang nào dành cho vai trò nào.
- Một PR trên nhánh `feature/branch-manager`, ba commit tiếng Anh: phân quyền theo rạp; tài khoản chi nhánh; giao diện. Bạn là người commit.
- Database thật không phải chuyển dữ liệu. Khi server mới khởi động, MongoDB tự thêm chỉ mục cho tên đăng nhập; chưa tài khoản nào có trường này nên không bị trùng.
- Sau khi deploy, bạn tự tạo tài khoản chi nhánh thật ở trang quản trị.
