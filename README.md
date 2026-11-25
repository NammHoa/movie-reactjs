# Movie Booking

Website đặt vé xem phim (MERN + Tailwind), có phân quyền user và admin.

## Chạy dự án

Server:
```bash
cd server
cp .env.example .env   # rồi sửa MONGO_URI, JWT_SECRET
npm run dev
```

Client:
```bash
cd client
npm run dev
```

Client: http://localhost:5173 — Server: http://localhost:5000


## Deploy (Atlas + Render + Vercel)

Làm theo thứ tự: database -> server -> giao diện -> nối lại CORS.

### 1. MongoDB Atlas
- Network Access: thêm `0.0.0.0/0` (Render bản miễn phí không có IP cố định).
- Lấy chuỗi kết nối (`mongodb+srv://...`) cho `MONGO_URI`.

### 2. Server trên Render
- New -> Blueprint, chọn repo này (file `render.yaml` ở thư mục gốc đã có sẵn cấu hình), hoặc tạo Web Service thủ công: Root Directory `server`, Build `npm install`, Start `npm start`, Health Check `/api/health`.
- Biến môi trường:

| Biến | Giá trị |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | chuỗi kết nối Atlas |
| `JWT_SECRET` | chuỗi ngẫu nhiên mới (Blueprint tự sinh), không dùng lại khóa ở máy |
| `CLIENT_URL` | địa chỉ Vercel, ví dụ `https://ten-app.vercel.app` (không có `/` ở cuối) |
| `TRUST_PROXY` | `1` |
| `PAYMENT_GATEWAY` | `vnpay` (cổng sandbox VNPay). Chỉ cho bản demo không thu tiền mới dùng thanh toán giả lập: bỏ biến này và đặt `ALLOW_MOCK_PAYMENT=true` |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | do VNPay cấp |
| `SERVER_URL` | địa chỉ công khai của server Render, VNPay dùng để đưa khách quay về |

- Tạo tài khoản admin: dùng tab Shell của Render hoặc chạy ở máy với `MONGO_URI` của Atlas: `npm run make-admin -- email@cua-ban.com`.
- Bản miễn phí "ngủ" sau ~15 phút không có người dùng, request đầu tiên sẽ chậm.

### 3. Giao diện trên Vercel
- Import repo, Root Directory `client` (Vite được nhận diện tự động).
- Biến môi trường: `VITE_API_URL` = địa chỉ server Render (không có `/api`, không có `/` ở cuối).
- `client/vercel.json` đã có rewrite để mở thẳng các đường dẫn như `/ticket/...` không bị 404.

### 4. Nối lại
- Sau khi có địa chỉ Vercel, đặt nó vào `CLIENT_URL` trên Render (server tự khởi động lại).
- Đổi `VITE_API_URL` thì phải Redeploy giao diện, vì biến này được ghi vào bản build.

### 5. Gửi vé qua email (tùy chọn)
Sau khi thanh toán thành công, khách nhận email có mã vé và ảnh QR đính kèm; trang vé có nút gửi lại.
- Render bản miễn phí **chặn cổng SMTP** (25/465/587), nên dùng dịch vụ gửi qua HTTP. Dự án dùng [Brevo](https://www.brevo.com) (gói miễn phí 300 email/ngày).
- Trong Brevo: *Settings → Senders* thêm và xác minh email người gửi, rồi *SMTP & API → API Keys* tạo khóa.
- Biến môi trường trên Render: `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `MAIL_FROM_EMAIL` (đúng email vừa xác minh), tùy chọn `MAIL_FROM_NAME`.
- Không đặt `EMAIL_PROVIDER` thì tính năng tắt, nút gửi lại không hiện. Khi dev có thể đặt `EMAIL_PROVIDER=console` để chỉ ghi log, không gửi thật.

### 6. Hủy vé và hoàn tiền
- Khách tự hủy vé đã thanh toán được đến trước giờ chiếu `REFUND_CUTOFF_HOURS` giờ (mặc định 2), chưa quét vé, và được hoàn đúng số tiền đã trả. Admin hủy và hoàn được cho mọi vé chưa quét (mục *Đơn đặt vé*).
- Mục **Hoàn tiền** của admin liệt kê các khoản chưa xong, cho thử lại hoặc đánh dấu "đã hoàn thủ công".
- API hoàn tiền của VNPay cần VNPay bật cho tài khoản và thường đòi đăng ký IP của server (Render bản miễn phí không có IP cố định). Khi chưa dùng được, đặt `VNPAY_REFUND_API=off`: hệ thống không gọi VNPay mà đưa khoản hoàn sang "cần hoàn thủ công" (admin hoàn trên cổng VNPay rồi đánh dấu). Đặt `on` (mặc định) khi VNPay đã bật API.

### 7. Nhắc giờ chiếu qua email
- Trước giờ chiếu `REMINDER_HOURS` giờ (mặc định 3), khách có vé đã thanh toán (chưa quét, chưa hủy) nhận email nhắc kèm mã QR. Mỗi vé chỉ nhắc một lần; khách tắt được trong trang Hồ sơ. Cần đã bật gửi email (mục 5).
- Render bản miễn phí "ngủ" nên không tự chạy việc định kỳ. Workflow `.github/workflows/reminders.yml` gọi `POST /api/internal/reminders` mỗi 15 phút (lời gọi cũng đánh thức server). Cách bật:
  1. Trên Render đặt biến `CRON_SECRET` = một chuỗi ngẫu nhiên dài từ 24 ký tự.
  2. Trên GitHub: *Settings → Secrets and variables → Actions → New repository secret*, tạo `CRON_SECRET` (cùng giá trị trên) và `API_URL` (địa chỉ server Render, không có `/api`, không có `/` ở cuối).
  3. Vào tab *Actions → Showtime reminders → Run workflow* để chạy thử một lần.
- Chưa đặt `CRON_SECRET` thì địa chỉ gọi từ ngoài bị tắt (trả 404), server chỉ còn bộ quét nội bộ chạy mỗi 5 phút khi đang thức.
