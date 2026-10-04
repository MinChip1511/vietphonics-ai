# Triển khai VietPhonics AI: Vercel (frontend) + Render (backend)

```
Trình duyệt ──https──> Vercel (React tĩnh)
                          │  /api/*  (rewrite trong frontend/vercel.json)
                          └──────────> Render (Docker: FastAPI + PyTorch)
                                         ├─ /var/data/vietphonics.db   (ổ đĩa bền, SQLite)
                                         └─ /var/data/uploads          (ảnh phần thưởng)
```

Trình duyệt chỉ nói chuyện với Vercel, nên không cần cấu hình CORS và micro hoạt động (cần https).

## Giới hạn cần biết trước
- **Render phải là gói trả phí** vì cần ổ đĩa bền cho SQLite (gói miễn phí còn tự ngủ sau 15 phút). Đo trên CPU: model chiếm ~340 MB sau khi nạp và đỉnh ~430 MB sau một lượt chấm clip 2 giây (chủ yếu là wav2vec2, file PAPL chỉ 12 MB). Gói Starter 512 MB có thể chạy nhưng rất sát giới hạn (chưa tính Linux, FastAPI, clip dài hơn hay 2 request cùng lúc); blueprint dùng `standard` 2 GB cho an toàn. Có thể thử hạ xuống `starter` rồi theo dõi bộ nhớ trên Render. Lần chấm đầu trên CPU mất ~4 giây, các lần sau nhanh hơn.
- **SQLite chỉ chạy được trên 1 instance** (không scale ngang). Khi cần nhiều instance hoặc backup tự động, chuyển sang PostgreSQL (Render có sẵn); phần truy cập dữ liệu đều đi qua `backend/app/database.py`.
- **Đăng nhập bằng OTP và "Quên mật khẩu" bị tắt trong production** vì chưa có dịch vụ SMS/email (một mã cố định sẽ cho phép chiếm tài khoản). Phụ huynh đăng nhập bằng email + mật khẩu; admin cấp lại mật khẩu tạm khi cần. Muốn bật lại cần nối nhà cung cấp SMS/email.
- Thanh toán vẫn là mô phỏng. Hotline trong `frontend/src/constants.js` vẫn là số mẫu, cần thay số thật.
- Backend khởi động trong vài giây và tải model ở nền: `/api/health` trả `model_loaded: false` rồi chuyển `true` sau ~20–60 giây; trong lúc đó chấm điểm trả 503.

## 1. Đưa mã lên GitHub
```bash
git init && git add . && git commit -m "VietPhonics AI"
git remote add origin <repo-của-bạn> && git push -u origin main
```
`.gitignore` đã loại `venv`, `node_modules`, cơ sở dữ liệu, ảnh upload và mọi file `.env`. File model `papl_nccf_vietmdd.pt` chỉ 12 MB nên commit thẳng.

## 2. Backend trên Render
1. Render → **New → Blueprint** → chọn repo (dùng `render.yaml` ở thư mục gốc).
2. Khi được hỏi, nhập `VIETPHONICS_ADMIN_EMAIL` và `VIETPHONICS_ADMIN_PASSWORD` (mật khẩu dài, duy nhất). Đây là tài khoản admin đầu tiên, chỉ được tạo khi cơ sở dữ liệu trống.
3. Build lần đầu mất vài phút (tải PyTorch CPU và model wav2vec2 vào image).
4. Kiểm tra: `https://<tên-service>.onrender.com/api/health` → `{"status":"healthy", ...}`.

Biến môi trường (xem `backend/.env.example`): `VIETPHONICS_ENV=production`, `VIETPHONICS_DB`, `VIETPHONICS_UPLOADS` (đã đặt trong blueprint), `VIETPHONICS_CORS` (chỉ cần khi trình duyệt gọi thẳng API), `VIETPHONICS_DEMO_OTP` (để trống).

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
- Sao lưu ổ đĩa Render (snapshot) hoặc chuyển sang PostgreSQL.
- Cân nhắc tên miền riêng (Vercel và Render đều hỗ trợ), rồi cập nhật rewrite/`VIETPHONICS_CORS` nếu đổi.

## Kiểm thử cục bộ trước khi đẩy
```bash
scripts/run_checks.sh           # pyflakes, 5 bộ test Python, lint + build frontend, kiểm tra vercel.json/render.yaml
node scripts/smoke_ui.js        # mở mọi màn hình (cần chạy backend + frontend)
docker build -f backend/Dockerfile -t vietphonics-api .   # thử build image (cần Docker Desktop đang chạy)
```
