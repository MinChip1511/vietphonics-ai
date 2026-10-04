# VietPhonics AI 🌟

> **Nền tảng học phát âm tiếng Việt thông minh ứng dụng Trí tuệ Nhân tạo (AI)**  
> Dành cho trẻ em Việt Nam (4–7 tuổi) & Phụ huynh  
> Tích hợp mô hình nghiên cứu **PAPL-NCCF** (*Interspeech 2023*) đạt độ chính xác **96.21%** trên bộ dữ liệu **VietMDD**.

---

## 1. Tổng quan Dự án

VietPhonics AI giải quyết triệt để vấn đề phát âm sai lệch ở trẻ em (lỗi âm đầu, âm cuối, 6 thanh điệu tiếng Việt, và lỗi phương ngữ) bằng cách khép kín vòng lặp trải nghiệm:

$$\text{Học} \longrightarrow \text{Nghe mẫu} \longrightarrow \text{Thu âm giọng} \longrightarrow \text{AI chẩn đoán} \longrightarrow \text{Nhận phản hồi} \longrightarrow \text{Cải thiện} \longrightarrow \text{Theo dõi tiến độ}$$

---

## 2. Kiến trúc Hệ thống

```
VietPhonics AI
├── frontend/                     # Web App Responsive (Vite + React 19 + Tailwind CSS)
│   ├── src/
│   │   ├── components/           # Navbar, AudioWaveform (sóng âm thực), ConfettiCelebration
│   │   ├── views/                # Đầy đủ 10 màn hình theo tài liệu Brief
│   │   ├── services/             # Audio recording (MediaRecorder), Web Speech TTS, API service
│   │   └── data/                 # Bộ dữ liệu bài học ngữ âm chuẩn hóa
├── backend/                      # Dịch vụ suy luận AI (FastAPI + PyTorch MPS Apple Silicon)
│   ├── app/
│   │   ├── model.py              # Mạng nơ-ron PAPL_NCCF (FeatureEncoder, BiLSTM, Attention, CTC)
│   │   ├── features.py           # Kaldi 80 Fbank + NCCF Pitch F0 (<=500Hz) cho giọng trẻ em
│   │   ├── alignment.py          # Thuật toán Needleman-Wunsch bóc tách SUB, DEL, INS, TONE
│   │   └── main.py               # REST API endpoints
├── papl_nccf_vietmdd.pt          # Trọng số AI đang dùng (checkpoint cuối của quá trình train)
├── vocab.json                    # Bộ từ điển 53 âm vị & thanh điệu tiếng Việt
└── start_vietphonics.sh          # Script 1-click khởi động toàn bộ hệ thống
```

---

## 3. Hướng dẫn Khởi động Nhanh (1-Click)

Chỉ cần chạy lệnh sau từ thư mục gốc của dự án:

```bash
./start_vietphonics.sh
```

- **Giao diện Web:** Mở trình duyệt tại [http://127.0.0.1:5173/](http://127.0.0.1:5173/)
- **API Backend:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## 4. Kịch bản Trình diễn Demo 11 Bước (Chuẩn Brief)

Khi thuyết trình trước giảng viên / mentor, bạn có thể thực hiện tuần tự:

1. **Trang chủ (Landing Page):** Giới thiệu thông điệp, nghe thử phát âm mẫu tương tác trên thẻ demo.
2. **Nút "Bắt đầu học ngay":** Chuyển sang màn hình chọn hồ sơ.
3. **Chọn hồ sơ bé:** Chọn **Bé Minh (8 tuổi)** hoặc chuyển đổi sang **Bé An (6 tuổi)**.
4. **Learning Dashboard của trẻ:** Giới thiệu chuỗi Streak 🔥 5 ngày, 240 ⭐, và bài học gợi ý hôm nay *"Phân biệt âm S và X"*.
5. **Vào phòng luyện phát âm:** Nhấn *"Luyện bài này ngay"*.
6. **Nghe mẫu chuẩn:** Bấm *"Bấm nghe giọng mẫu chuẩn"* (có thể chỉnh tốc độ 0.75x để nghe rõ khẩu hình).
7. **Ghi âm trực tiếp:** Bấm micro đỏ *"Bấm vào đây để thu âm"*, quan sát sóng âm thanh dao động theo thời gian thực. Bấm nghe lại hoặc dừng.
8. **AI Chấm điểm:** Bấm *"Gửi AI Chấm Điểm Ngay 🚀"*.
9. **Màn hình kết quả AI:** Quan sát vòng tròn điểm (VD: 93/100), hiệu ứng pháo hoa, bảng bóc tách từng âm vị VietMDD (xanh lá: Chuẩn, cam: Cần uốn/Chỉnh dấu), và lời khuyên khẩu hình của cô giáo AI.
10. **Xem tiến độ của trẻ:** Bấm tab *"Tiến độ của Bé"* xem danh sách âm đã thuần thục (+12% tuần này) và bộ sưu tập huy hiệu.
11. **Góc Phụ Huynh (Parent Dashboard):** Bấm tab *"Góc Phụ Huynh"* xem báo cáo 5 giây: tổng giờ học, biểu đồ năng lực theo nhóm âm (Thanh điệu 84%, Âm đầu 86%, Âm cuối 68%) và khuyến nghị từ AI.


## Triển khai
Frontend trên Vercel, backend (Docker) trên Render: xem [docs/DEPLOY.md](docs/DEPLOY.md). Kiểm tra trước khi đẩy: `scripts/run_checks.sh`.
