# Movie Talk: banner tự trượt và lưới phim, thiết kế

Ngày: 2026-11-28. Trạng thái: đã duyệt.

**[Bạn chốt]** là điều bạn đã quyết định. **[Đề xuất]** là phần mình điền thêm và bạn đã duyệt cùng bản thiết kế.

## 1. Mục đích

**[Bạn chốt]** Movie Talk giống ảnh mẫu bạn gửi: banner tự trượt ở trên, bên dưới là phim đang chiếu và sắp chiếu.

## 2. Không làm

- Sửa server, database, trang quản trị; thêm thư viện.
- Tab "L-LIVE ON", quảng cáo lớn, thanh nút nổi bên phải.
- Đổi banner trang chủ: vẫn bấm tay, không tự trượt.
- Dùng hình, logo, nội dung hay tên riêng của Lotte. Chỉ mượn bố cục.

## 3. Cách làm

**[Đề xuất]** Dùng lại danh sách banner, slider và API Box Office đã có, nên không phải sửa server.

## 4. Banner

- **[Bạn chốt]** Tự trượt. Dùng chung danh sách phim với banner trang chủ.
- **[Đề xuất]** Dải màu cát `#ddd3b5` ghi "PHIM HOT TẠI RẠP", ảnh 16:9 trên nền tối `#231f20`, một ảnh mỗi khung. Bấm ảnh sang trang phim.
- **[Đề xuất]** 5 giây chuyển một ảnh, hết ảnh cuối quay về đầu. Bấm mũi tên, bấm chấm hoặc vuốt thì đếm lại từ đầu. Việc tự trượt không được làm cả trang cuộn.
- **[Đề xuất]** Có nút tạm dừng / chạy tiếp. Cũng tạm dừng khi: rê chuột trên banner, đang chạm giữ, dùng bàn phím trên banner, tab trình duyệt bị ẩn. Hết lý do tạm dừng thì chạy tiếp; bấm chuột hay chạm không được làm banner đứng luôn.
- **[Đề xuất]** Máy bật "giảm chuyển động" thì banner đứng yên cho đến khi bấm chạy.
- **[Đề xuất]** Một ảnh: không trượt, không mũi tên, chấm hay nút. Không có ảnh hoặc tải lỗi: ẩn cả dải chữ và banner.

## 5. Tab và lưới phim

- **[Bạn chốt]** Hiện tất cả phim đang chiếu và sắp chiếu như ảnh mẫu.
- **[Đề xuất]** Hai tab dạng nút "Phim đang chiếu", "Phim sắp chiếu": đang chọn nền `#231f20` chữ `#e3d9a5`, còn lại nền kem. Tab vẫn nằm trên đường dẫn như hiện nay.
- **[Đề xuất]** Lưới 2 cột (điện thoại), 3 (từ 768px), 4 (từ 1024px).
- **[Đề xuất]** Thẻ: poster 2:3; nhãn tuổi hình tròn (P, K, 13, 16, 18); tên in hoa, dài thì "..."; dòng "N phút | ngày". Thiếu nhãn tuổi hay ngày thì bỏ phần đó. Bấm thẻ sang trang phim. Bỏ điểm sao, thể loại, nhãn trạng thái.
- **[Đề xuất]** Tab đang chiếu: phim có trong Box Office đứng đầu theo đúng thứ tự đó, có số 1–7 ở góc dưới trái poster; phim khác xếp sau như danh sách hiện nay, không số. Tab sắp chiếu: không số, ngày chiếu sớm đứng trước, thiếu ngày xếp cuối. Không tải được Box Office thì vẫn hiện đủ phim, không số.
- **[Đề xuất]** Hiện 8 phim, nút "Thêm" mở thêm 8, hết thì ẩn nút. Mở một phim rồi Quay lại thì số phim đã mở được giữ nguyên. Đổi tab thì về 8.
- **[Đề xuất]** Đang tải, lỗi, trống: có dòng thông báo như hiện nay.

## 6. Cách kiểm tra và bàn giao

- Test tự động cho thứ tự phim, số phim đang mở, và quy tắc khi nào banner được tự trượt. Giao diện kiểm trên trình duyệt bằng database test ở 375, 800, 1280px.
- Giao diện tiếng Việt, commit tiếng Anh, bạn là người commit. Một PR trên nhánh `feature/movie-talk-redesign`.
