# Triển khai VietPhonics AI: Vercel (frontend) + Render (backend)

```
Trình duyệt ──https──> Vercel (React tĩnh)
                          │  /api/*  (rewrite trong frontend/vercel.json)
                          └──────────> Render (Docker: FastAPI + PyTorch)
                                         └──> MongoDB Atlas (toàn bộ dữ liệu, kể cả ảnh phần thưởng)
```

Trình duyệt chỉ nói chuyện với Vercel, nên không cần cấu hình CORS và micro hoạt động (cần https).

## Giới hạn cần biết trước
- **Dữ liệu nằm trong MongoDB Atlas**, không cần ổ đĩa trên Render, nên deploy lại không mất dữ liệu. Gói Atlas M0 miễn phí đủ để chạy thử.
- **RAM của Render:** model chiếm ~430 MB khi chấm; blueprint dùng `standard` (2 GB).
- **Mã xác thực gửi qua email** (đăng nhập bằng mã, quên mật khẩu): cần cấu hình gửi email (mục 2b). Chưa cấu hình thì tính năng này tắt và phụ huynh đăng nhập bằng email + mật khẩu.
- Thanh toán vẫn là mô phỏng. Hotline trong `frontend/src/constants.js` vẫn là số mẫu, cần thay số thật.
- Backend khởi động trong vài giây và tải model ở nền: `/api/health` trả `model_loaded: false` rồi chuyển `true` sau ~20–60 giây; trong lúc đó chấm điểm trả 503.

## 1. Đưa mã lên GitHub
```bash
git init && git add . && git commit -m "VietPhonics AI"
git remote add origin <repo-của-bạn> && git push -u origin main
```
`.gitignore` đã loại `venv`, `node_modules`, cơ sở dữ liệu, ảnh upload và mọi file `.env`. File model `papl_nccf_vietmdd.pt` chỉ 12 MB nên commit thẳng.

## 2a. MongoDB Atlas
1. Tạo cluster **M0 (free)** tại cloud.mongodb.com, chọn vùng gần Render (Singapore).
2. **Database Access** → thêm một user (tên + mật khẩu).
3. **Network Access** → thêm `0.0.0.0/0` (Render không có IP cố định).
4. **Connect → Drivers** → sao chép chuỗi kết nối `mongodb+srv://<user>:<mật-khẩu>@<cluster>.mongodb.net/...`, thay `<mật-khẩu>`. Mật khẩu có ký tự đặc biệt phải mã hóa URL.
5. Đây là giá trị của biến `MONGODB_URI`. Ứng dụng tự tạo chỉ mục và dữ liệu mẫu (bài học, gói, phần thưởng) ở lần chạy đầu.

## 2b. Gửi email (Gmail)
1. Tài khoản Google → **Bảo mật** → bật **Xác minh 2 bước**.
2. **Mật khẩu ứng dụng** → tạo một mật khẩu (16 ký tự).
3. Trên Render → **Environment** thêm: `EMAIL_PROVIDER=smtp`, `SMTP_USER=<gmail của bạn>`, `SMTP_PASSWORD=<mật khẩu ứng dụng>`. Tùy chọn: `EMAIL_FROM_NAME`.
4. Gmail gửi tối đa ~500 thư mỗi ngày. Thay bằng Brevo: `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `EMAIL_FROM` (địa chỉ đã xác minh trong Brevo).

## 2. Backend trên Render
1. Render → **New → Blueprint** → chọn repo (dùng `render.yaml` ở thư mục gốc).
2. Khi được hỏi, nhập `MONGODB_URI` (bước 2a), `VIETPHONICS_ADMIN_EMAIL` và `VIETPHONICS_ADMIN_PASSWORD` (mật khẩu dài, duy nhất). Đây là tài khoản admin đầu tiên, chỉ được tạo khi cơ sở dữ liệu trống.
3. Build lần đầu mất vài phút (tải PyTorch CPU và model wav2vec2 vào image).
4. Kiểm tra: `https://<tên-service>.onrender.com/api/health` → `{"status":"healthy", ...}`.

Biến môi trường (xem `backend/.env.example`): `VIETPHONICS_ENV=production`, `MONGODB_URI`, `MONGODB_DB` (mặc định `vietphonics`), `VIETPHONICS_CORS` (chỉ cần khi trình duyệt gọi thẳng API), `VIETPHONICS_DEMO_OTP` (để trống).

Production **không** tạo tài khoản demo và tắt trang `/docs`.

## 3. Frontend trên Vercel
1. Vercel → **Add New Project** → chọn repo, đặt **Root Directory = `frontend`**. Framework tự nhận Vite.
2. Mở `frontend/vercel.json`, sửa `destination` của rewrite `/api/...` thành địa chỉ Render thật (mặc định `https://vietphonics-api.onrender.com`). Commit và deploy.
3. Cách khác (gọi thẳng API, không qua rewrite): đặt biến `VITE_API_BASE=https://<tên>.onrender.com/api` trên Vercel và `VIETPHONICS_CORS=https://<app>.vercel.app` trên Render.

## 4. Kiểm tra sau khi lên
```bash
VP_URL=https://<app>.vercel.app \
VP_PARENT_EMAIL=... VP_PARENT_PASSWORD=... VP_ADMIN_EMAIL=... VP_ADMIN_PASSWORD=... \
node scripts/smoke_ui.js
```
(cần một tài khoản phụ huynh có ít nhất một hồ sơ bé; tạo bằng giao diện đăng ký). Sau đó thử một lần thu âm bằng micro thật.

## 5. Việc nên làm ngay khi go-live
- Đổi hotline thật trong `frontend/src/constants.js`.
- Bật sao lưu trên Atlas (gói trả phí) hoặc xuất dữ liệu định kỳ bằng `mongodump`.
- Cân nhắc tên miền riêng (Vercel và Render đều hỗ trợ), rồi cập nhật rewrite/`VIETPHONICS_CORS` nếu đổi.

## Kiểm thử cục bộ trước khi đẩy
```bash
scripts/run_checks.sh           # pyflakes, 5 bộ test Python (dùng MongoDB giả lập trong bộ nhớ), lint + build frontend, kiểm tra vercel.json/render.yaml
TEST_MONGODB_URI=<uri> backend/venv/bin/python scripts/test_api.py   # cùng bộ test trên MongoDB thật (DB tạm, tự xóa)
node scripts/smoke_ui.js        # mở mọi màn hình (cần chạy backend + frontend)
docker build -f backend/Dockerfile -t vietphonics-api .   # thử build image (cần Docker Desktop đang chạy)
```
