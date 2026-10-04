# GIÁO ÁN VIETPHONICS AI

## 1. Mục tiêu chương trình

VietPhonics AI là chương trình luyện phát âm tiếng Việt dành cho trẻ 6–12 tuổi, sử dụng bài học ngắn kết hợp nghe mẫu, bắt chước, ghi âm và phản hồi tự động.

Sau khi hoàn thành chương trình cơ bản, trẻ cần có khả năng:

- Nhận biết và phát âm rõ các âm đầu tiếng Việt.
- Phân biệt các cặp âm đầu dễ nhầm.
- Phát âm đúng các âm cuối.
- Phân biệt các nguyên âm/vần gần nhau.
- Nhận biết và thể hiện đúng sáu thanh tiếng Việt.
- Nhận ra mình sai ở thành phần nào của âm tiết.
- Đọc chính xác từ đơn, cụm từ và câu ngắn.
- Tự sửa phát âm sau khi nhận phản hồi.
- Theo dõi được những nhóm âm còn yếu.

Chương trình không coi mọi khác biệt vùng miền là “phát âm sai”. Trong phiên bản MVP, hệ thống đánh giá theo một **chuẩn phát âm tham chiếu** và cần sử dụng các cách diễn đạt như “khác mẫu tham chiếu” trong những trường hợp có thể là biến thể vùng miền.

---

# 2. Nguyên tắc sư phạm

Mỗi bài học đi theo một vòng lặp cố định:

**Nghe → Phân biệt → Quan sát → Bắt chước → Ghi âm → AI phân tích → Sửa lỗi → Luyện lại → Củng cố.**

Không bắt đầu bằng câu dài.

Thứ tự độ khó:

**Âm → Âm tiết → Từ → Cụm từ → Câu.**

Một bài chỉ nên tập trung vào **một mục tiêu phát âm chính**.

Ví dụ:

- bài S/X chỉ tập trung S/X;
- bài N/NG cuối chỉ tập trung âm cuối;
- bài thanh hỏi chỉ tập trung contour thanh hỏi.

Trẻ không nên nhận quá nhiều lỗi cùng lúc. Nếu một từ có ba lỗi, giao diện ưu tiên lỗi quan trọng nhất trước.

---

# 3. Cấu trúc một phiên học

Thời lượng mục tiêu: **8–12 phút**.

### Bước 1 – Khởi động: 30–60 giây

Trẻ nghe 2–3 âm hoặc từ mẫu.

Ví dụ:

“sa – xa”

“sôi – xôi”

“sáng – xáng”

Không chấm điểm.

Mục tiêu: đưa trẻ vào đúng nhóm âm.

---

## Bước 2 – Nghe và phân biệt: 1–2 phút

Hệ thống phát audio.

Trẻ chọn âm/từ đã nghe.

Ví dụ:

Audio: “sông”

Màn hình:

- Sông
- Xông

Mục tiêu là kiểm tra trẻ **nghe được sự khác biệt trước khi yêu cầu phát âm**.

---

# Bước 3 – Học cách tạo âm: 1 phút

Hiển thị:

- hình miệng;
- vị trí lưỡi;
- cách luồng hơi đi;
- audio mẫu chậm;
- audio tốc độ bình thường.

Ví dụ S:

> Đặt đầu lưỡi gần lợi trên. Giữ một khe nhỏ để hơi đi qua. Không rung dây thanh.

Phần này cần ngắn, dùng hình ảnh nhiều hơn chữ.

---

# Bước 4 – Luyện âm/âm tiết: 1–2 phút

Ví dụ bài S/X:

**S**

sa  
se  
si  
so  
su  

**X**

xa  
xe  
xi  
xo  
xu  

AI chỉ cần xác định âm mục tiêu có đạt hay không.

---

# Bước 5 – Luyện từ: 3 phút

Khoảng 8–12 từ.

Mỗi từ có:

1. hình minh họa;
2. chữ;
3. audio chuẩn;
4. nút ghi âm;
5. phản hồi AI;
6. nút nghe lại;
7. nút thử lại.

Ví dụ:

**S**

sông  
sáng  
sữa  
sách  
sen  

**X**

xe  
xanh  
xôi  
xoài  
xuân  

---

# Bước 6 – Minimal pair: 1–2 phút

Đây là phần rất quan trọng.

Ví dụ:

sáo – xáo  
sôi – xôi  
sương – xương  

Không nhất thiết tất cả đều phải là từ có tần suất sử dụng cao. Với trẻ nhỏ, ưu tiên từ quen thuộc và hình ảnh hóa được.

---

# Bước 7 – Câu ngắn: 1–2 phút

Ví dụ:

> Bé xem sách.

> Xe màu xanh.

> Sáng nay trời đẹp.

AI phân tích từng âm tiết.

Không chỉ cho một score tổng.

---

# Bước 8 – Tổng kết

Ví dụ:

**Hôm nay con luyện S và X**

S: ★★★  
X: ★★☆

Con cần luyện thêm:

**X**

Nút:

**Luyện lại X**

---

# 4. Cấu trúc phản hồi AI

Đây là phần phải map trực tiếp với model MDD.

Một âm tiết được biểu diễn:

**Âm đầu + Vần + Thanh**

Trong backend có thể chi tiết hơn:

**Initial + Medial + Nucleus + Ending + Tone**

Ví dụ người học đọc từ:

**“sáng”**

Canonical:

S + A + NG + SẮC

Model dự đoán:

X + A + NG + SẮC

Hệ thống không nên chỉ trả:

> 72 điểm.

Mà phải trả:

**Âm đầu**

S → X ❌

**Vần**

A ✓  
NG ✓

**Thanh sắc**

✓

### Feedback cho trẻ

> Âm đầu chưa đúng. Con đang đọc gần giống “x”. Hãy nghe âm “s” và thử lại nhé.

---

# 5. Các loại lỗi hệ thống phải hỗ trợ

## Correct

Expected:

S

Observed:

S

→ Đúng.

---

## Substitution

Expected:

S

Observed:

X

→ Thay âm.

Feedback:

> Con đang đọc X thay cho S.

---

## Deletion

Expected:

NG

Observed:

∅

→ Bỏ âm.

Feedback:

> Con chưa đọc rõ âm NG ở cuối.

---

## Insertion

Expected:

∅

Observed:

N

→ Thêm âm.

Feedback:

> Có thêm một âm không cần thiết.

---

## Tone substitution

Expected:

SẮC

Observed:

NGANG

Feedback:

> Phần âm đúng rồi. Con cần đưa giọng lên ở thanh sắc.

---

# 6. Chương trình tổng thể

Chương trình MVP gồm:

**6 cấp độ – 30 bài cốt lõi**

Mỗi bài 8–12 phút.

Tổng thời gian học:

khoảng **5–6 giờ nội dung luyện trực tiếp**, nhưng được thiết kế để trẻ có thể luyện lại nhiều lần.

---

# LEVEL 0 – KHẢO SÁT BAN ĐẦU

## Bài 0.1 – Làm quen với ứng dụng

Mục tiêu:

- biết nghe mẫu;
- biết sử dụng microphone;
- biết ghi âm;
- hiểu biểu tượng đúng/cần luyện.

Các từ rất đơn giản:

ba  
mẹ  
bé  
cá  
hoa  
nhà

Không dùng để đánh giá chính thức.

---

## Bài 0.2 – Kiểm tra phát âm ban đầu

Khoảng 15–20 từ được chọn để bao phủ:

- âm đầu;
- nguyên âm;
- âm cuối;
- thanh.

Không hướng dẫn trước.

Kết quả tạo:

**Pronunciation Profile**

Ví dụ:

| Nhóm | Mức |
|---|---|
| S/X | Cần luyện |
| TR/CH | Tốt |
| L/N | Cần luyện |
| Âm cuối N/NG | Tốt |
| Thanh hỏi | Cần luyện |
| Thanh ngã | Cần luyện |

Profile này quyết định bài được đề xuất.

---

# LEVEL 1 – ÂM ĐẦU CƠ BẢN

## Bài 1 – S và X

Mục tiêu:

phân biệt và phát âm S/X.

Từ luyện:

sách  
sen  
sáng  
sữa  
sông  
sao  

xe  
xanh  
xôi  
xoài  
xuân  
xinh  

Minimal pairs:

sôi – xôi  
sương – xương

Câu:

> Bé xem sách.

> Xe màu xanh.

---

# Bài 2 – TR và CH

Từ luyện:

trăng  
trâu  
trứng  
trường  
trời  
tranh  

cha  
chó  
chim  
chuối  
chân  
chơi  

Câu:

> Chim chơi trên cành.

> Trăng sáng trên trời.

---

# Bài 3 – L và N

Từ luyện:

lá  
lê  
lúa  
lớp  
lạnh  
lăn  

na  
nắng  
nồi  
nón  
nước  
nằm  

Câu:

> Lá nằm trên nền.

> Lan đội nón.

---

# Bài 4 – R / D / GI

Mục tiêu:

nhận biết sự khác nhau theo chuẩn tham chiếu.

Từ:

rau  
rổ  
rừng  
rồng  

da  
dê  
dừa  
dây  

gia đình  
gió  
giấy  
giường  

Với nhóm này, hệ thống phải cẩn thận với biến thể vùng miền.

---

# Bài 5 – T và TH

Từ:

tay  
tôm  
táo  
tóc  
tủ  

tha  
thỏ  
thuyền  
thơ  
thịt

---

# Bài 6 – C/K và KH

Từ:

cá  
cơm  
kẹo  
kính  
kéo  

khỉ  
kho  
khăn  
khói  
khế

---

# Bài 7 – B và P

Tập trung kiểm soát luồng hơi.

Từ:

ba  
bé  
bàn  
bóng  

pin  
piano  
pa-nô

Do /p/ đầu âm tiết không phổ biến trong từ thuần Việt, phần này chỉ là bài bổ sung.

---

# Bài 8 – Ôn tập âm đầu

Không dạy âm mới.

AI chọn 12–15 từ từ các bài 1–7.

Tỷ lệ từ được chọn ưu tiên nhóm trẻ thường phát âm sai.

---

# LEVEL 2 – ÂM CUỐI

## Bài 9 – N và NG cuối

Ví dụ:

bàn  
bạn  
con  
sen  

bằng  
sáng  
sông  
trăng  

Phản hồi cần nói rõ:

> Âm đầu đúng. Thanh đúng. Âm cuối cần luyện.

---

# Bài 10 – T và C cuối

Ví dụ:

mát  
một  
hát  
thịt  

mặc  
học  
đọc  
bác

---

# Bài 11 – M và P cuối

Ví dụ:

cam  
cơm  
nằm  
tôm  

đẹp  
hộp  
bếp  
lớp

---

# Bài 12 – N và NH cuối

Ví dụ:

bên  
con  
đen  

xanh  
bánh  
nhanh

---

# Bài 13 – NG và NH cuối

Ví dụ:

sáng  
rừng  
trăng  

bánh  
xanh  
nhanh

---

# Bài 14 – Tổng hợp âm cuối

AI lựa chọn từ dựa trên lỗi của bài 9–13.

---

# LEVEL 3 – NGUYÊN ÂM VÀ VẦN

## Bài 15 – A / Ă / Â

Ví dụ:

ba  
cá  

ăn  
mắt  

cân  
sân

Mục tiêu:

nhận biết độ mở và chất lượng nguyên âm.

---

# Bài 16 – O / Ô / Ơ

Ví dụ:

bò  
to  

bố  
cô  

bờ  
mơ

---

# Bài 17 – E / Ê

Ví dụ:

bé  
xe  

bê  
mê

---

# Bài 18 – U / Ư

Ví dụ:

thu  
tủ  

thư  
từ

---

# Bài 19 – Vần đôi

Tập trung:

iê / ia  
uô / ua  
ươ / ưa

Ví dụ:

biển  
tiền  
mía  

muốn  
cuốn  
mua  

vườn  
sườn  
mưa

---

# LEVEL 4 – THANH ĐIỆU

Pitch/F0 là tín hiệu đặc biệt quan trọng ở level này.

## Bài 20 – Thanh ngang

Ví dụ:

ma  
ba  
hoa  
con

Mục tiêu:

giữ đường giọng tương đối ổn định.

---

# Bài 21 – Thanh sắc

Ví dụ:

má  
cá  
bé  
nắng

Feedback chính:

> Đưa giọng lên rõ hơn ở cuối âm.

---

# Bài 22 – Thanh huyền

Ví dụ:

mà  
bà  
nhà  
gà

Feedback:

> Hạ giọng dần.

---

# Bài 23 – Thanh hỏi

Ví dụ:

mả  
cỏ  
quả  
mũ? 

Các từ phải được kiểm tra kỹ trong bộ content cuối cùng để tránh nhập sai tone.

Feedback không nên dựa chỉ vào “cao/thấp” mà sử dụng contour F0 của cả âm tiết.

---

# Bài 24 – Thanh ngã

Ví dụ:

mã  
ngã  
sữa  
mũ

Thanh ngã có thể khó với trẻ và có biến thể theo vùng.

Không trừng phạt accent một cách máy móc.

---

# Bài 25 – Thanh nặng

Ví dụ:

mạ  
bạn  
học  
mặt

Feedback:

> Hạ và kết thúc giọng ngắn, rõ.

---

# Bài 26 – Sáu thanh với cùng một âm tiết

Bộ mẫu chính:

ma  
má  
mà  
mả  
mã  
mạ

### Game 1 – Nghe và chọn

AI phát:

“má”

Trẻ chọn một trong sáu từ.

### Game 2 – Đọc theo mẫu

Màn hình hiển thị:

“mả”

Trẻ ghi âm.

### Game 3 – Tone challenge

Đọc lần lượt:

ma → má → mà → mả → mã → mạ

Đây là một trong các bài quan trọng nhất của toàn ứng dụng.

---

# LEVEL 5 – KẾT HỢP ÂM

## Bài 27 – Âm đầu + Thanh

Ví dụ:

sa  
sá  
sà  
sả  
sã  
sạ

xa  
xá  
xà  
xả  
xã  
xạ

Mục tiêu:

AI phải phân biệt:

- lỗi âm đầu;
- lỗi tone;

thay vì coi toàn bộ âm tiết là sai.

---

# Bài 28 – Âm cuối + Thanh

Ví dụ chọn từ có:

N  
NG  
T  
C

với các tone khác nhau.

Mục tiêu:

phân biệt lỗi coda và lỗi tone.

---

# Bài 29 – Từ khó

Tập trung các từ chứa nhiều thành phần dễ sai.

Ví dụ:

trường  
sáng  
xanh  
rừng  
chuyện  
nghiêng  
thuyền

---

# LEVEL 6 – PHÁT ÂM TRONG CÂU

## Bài 30 – Câu 2–3 từ

Ví dụ:

> Bé đọc sách.

> Mẹ nấu cơm.

> Trời rất sáng.

---

## Bài 31 – Câu 4–6 từ

Ví dụ:

> Con mèo đang nằm ngủ.

> Bé Lan đang đọc sách.

> Trăng sáng trên bầu trời.

---

# Bài 32 – Đoạn ngắn

Ví dụ:

> Buổi sáng, Lan đi học.  
> Trên đường, Lan nhìn thấy một chú mèo nhỏ.

AI không cần đánh giá ngữ điệu câu ở MVP.

Chỉ phân tích pronunciation ở mức âm tiết/phoneme.

---

# Bài 33 – Bài kiểm tra cuối chương trình

Sử dụng:

- từ đã học;
- từ mới có cùng phoneme;
- câu ngắn.

Không sử dụng toàn bộ item đã luyện để tránh đánh giá khả năng ghi nhớ thay vì phát âm.

---

# 7. Logic thích ứng

Sau mỗi attempt:

### Nếu đúng

Hiển thị:

> Rất tốt!

Sau 3 lần đúng liên tiếp:

→ tăng độ khó.

Ví dụ:

âm → từ → câu.

---

### Nếu sai lần 1

> Gần đúng rồi. Nghe lại nhé.

Phát audio mẫu.

---

### Nếu sai lần 2 cùng một lỗi

Ví dụ:

S → X.

Hiển thị:

> Con đang đọc gần giống X. Hãy đặt lưỡi như hình và thử âm S.

---

### Nếu sai lần 3

Không bắt trẻ lặp vô hạn.

Chuyển sang item dễ hơn:

`s`

↓

`sa`

↓

`sao`

sau đó quay lại từ khó.

---

# 8. Mastery

Không nên coi một lần đúng là đã học xong.

Một target được coi là **Mastered** khi:

- đạt ≥80% trong bài luyện;
- xuất hiện ít nhất trong hai phiên học khác nhau;
- không có cùng lỗi lặp lại quá 20%;
- làm được ít nhất một từ chưa xuất hiện trong bài luyện ban đầu.

Trạng thái:

**Chưa học → Đang luyện → Gần đạt → Thành thạo**

---

# 9. Pronunciation Profile

Profile của mỗi trẻ lưu theo component.

Ví dụ:

```text
Initial
S/X           65%
TR/CH         90%
L/N           55%

Ending
N/NG          80%
T/C           72%

Tone
Ngang         95%
Sắc           90%
Huyền         88%
Hỏi           55%
Ngã           48%
Nặng          84%
```

Dashboard không cần hiển thị toàn bộ số kỹ thuật này cho trẻ.

Giao diện trẻ:

**Con làm tốt**

⭐ TR/CH  
⭐ Thanh sắc  

**Con nên luyện thêm**

🎯 L/N  
🎯 Thanh hỏi  
🎯 Thanh ngã

---

# 10. Cách chuyển output model thành feedback

Model:

```text
canonical
s a N _5

predicted
x a N _5
```

Backend:

```text
error_type = substitution
component = initial
expected = s
observed = x
```

Frontend:

> Âm đầu cần luyện.

Không cần cho trẻ 6 tuổi thấy ký hiệu phoneme.

---

Model:

```text
canonical
m a _6

predicted
m a _2
```

Backend:

```text
component = tone
```

Frontend:

> Phần âm của con đúng rồi. Hãy thử lại thanh ngã.

---

# 11. Ba tầng feedback

## Tầng 1 – Trẻ nhỏ

> Thử lại âm S nhé!

## Tầng 2 – Trẻ lớn hơn

> Con đang đọc S hơi giống X.

## Tầng 3 – Debug/giáo viên/phụ huynh

```text
Expected: /s/
Predicted: /x/
Confidence: 0.82
Error: substitution
```

Không đưa tầng 3 ra giao diện trẻ.

---

# 12. Scoring

Không nên sử dụng trực tiếp probability của neural network làm điểm.

Điểm lesson được tạo từ tỷ lệ target đạt yêu cầu.

Ví dụ bài có 10 từ:

8 đúng:

**8/10**

UI có thể chuyển thành:

★★★

### Suggested presentation

90–100% → ★★★  
70–89% → ★★☆  
<70% → ★☆☆  

Nhưng backend vẫn lưu:

- số item;
- số đúng;
- loại lỗi;
- target phoneme;
- số attempt.

---

# 13. Dữ liệu cần lưu cho mỗi attempt

```text
user_id
lesson_id
exercise_id
audio_path

prompt_text

canonical_phonemes
predicted_phonemes

alignment

errors:
- expected
- observed
- error_type
- component
- position
- confidence

attempt_number
timestamp
```

Ví dụ:

```json
{
  "word": "sáng",
  "canonical": ["s", "a", "N", "_5a"],
  "predicted": ["x", "a", "N", "_5a"],
  "errors": [
    {
      "expected": "s",
      "observed": "x",
      "type": "substitution",
      "component": "initial"
    }
  ]
}
```

---

# 14. Cấu trúc dữ liệu một exercise

```json
{
  "id": "s_x_001",
  "lesson": "s_x",
  "level": 1,
  "type": "word",
  "text": "sáng",

  "target_component": "initial",
  "target_phoneme": "s",

  "canonical_phonemes": [],

  "reference_audio": "sang.wav",
  "image": "sang.png",

  "difficulty": 1,

  "feedback": {
    "correct": "Rất tốt!",
    "substitution_x": "Con đang đọc gần giống âm X. Hãy thử âm S lại nhé."
  }
}
```

`canonical_phonemes` không nên nhập thủ công nếu đã có dictionary VietMDD.

Backend nên tạo nó từ:

**text → VietMDD syllable-to-phoneme dictionary**.

---

# 15. Cách sử dụng PAPL trong từng lesson

PAPL nhận:

**audio + canonical phonemes**

và trả:

**predicted phonemes**.

Ví dụ bài:

“Luyện S/X”

User cần đọc:

**sáng**

Backend:

```text
sáng
 ↓
G2P
 ↓
canonical phonemes
```

Audio:

```text
microphone
 ↓
PAPL
 ↓
observed phonemes
```

Sau đó:

```text
canonical
       ↓
Needleman–Wunsch
       ↑
predicted
```

Kết quả quyết định feedback.

Do đó **giáo án và model dùng cùng một phoneme representation**.

Đây là điều quan trọng để hệ thống không bị tách thành “phần AI” và “phần bài học” độc lập.

---

# 16. Phân chia MVP

Không cần triển khai toàn bộ 33 bài ngay để demo môn học.

### MVP bắt buộc

Triển khai hoàn chỉnh:

**S/X**

**TR/CH**

**L/N**

**N/NG cuối**

**T/C cuối**

**6 thanh**

và:

**1 bài câu tổng hợp**

Khoảng:

**8–10 lesson hoàn chỉnh**

là đủ chứng minh toàn bộ concept.

Nhưng database/schema vẫn dùng cấu trúc của giáo án 33 bài để sau này mở rộng mà không cần sửa kiến trúc.

---

# 17. Demo scenario

Một kịch bản demo hoàn chỉnh:

### Dashboard

AI đề xuất:

> Hôm nay luyện S và X.

---

### Learn

Hiển thị cách phát âm S/X.

Trẻ nghe audio.

---

### Listen

Audio phát:

“sông”

Trẻ chọn:

Sông / Xông.

---

### Speak

Màn hình:

**SÁNG**

Trẻ ghi âm.

---

### AI

PAPL:

```text
expected: s
observed: x
```

---

### Feedback

Màn hình highlight:

**S**ÁNG

> Âm đầu chưa đúng. Con đang đọc gần giống X.

Button:

**Nghe mẫu**

**Thử lại**

---

### Attempt 2

PAPL:

```text
expected: s
observed: s
```

UI:

> Tuyệt vời! Con đã sửa được rồi 🎉

---

### Progress

```text
S/X

Lần đầu: 60%
Hiện tại: 85%

↑ +25%
```

Đây chính là vòng lặp giá trị cốt lõi của VietPhonics.

---

# 18. Thứ tự triển khai nội dung

### Phase 1

S/X  
TR/CH  
L/N  
N/NG  
T/C  
Tone

### Phase 2

Nguyên âm  
các âm cuối còn lại  
các cặp phụ âm khác

### Phase 3

Từ phức tạp  
câu  
adaptive learning

### Phase 4

Speech fluency  
rhythm  
sentence intonation

Phase 4 không thuộc MVP hiện tại.

---

# 19. Tiêu chí hoàn thành một bài

Một bài học được coi là hoàn thành khi trẻ:

1. nghe phân biệt được target;
2. đọc được âm/âm tiết;
3. đọc đúng ít nhất 70% từ;
4. sửa được ít nhất một lỗi sau feedback;
5. hoàn thành câu củng cố.

Điểm quan trọng nhất không phải “đúng ngay lần đầu”.

Một metric rất đáng lưu là:

**Correction Rate**

\[
CorrectionRate =
\frac{\text{số lỗi được sửa sau feedback}}
{\text{số lỗi có cơ hội sửa}}
\]

Metric này phản ánh giá trị giáo dục của sản phẩm tốt hơn chỉ nhìn accuracy.

---

# 20. KPI cho prototype

Prototype nên chứng minh được năm việc:

### 1. AI phát hiện được lỗi

Ví dụ:

S → X.

### 2. AI xác định được vị trí lỗi

Initial / Ending / Tone.

### 3. User nhận feedback dễ hiểu

Không hiển thị thuật ngữ kỹ thuật không cần thiết.

### 4. User có thể sửa lỗi

Attempt 1 sai.

Attempt 2 đúng.

### 5. Hệ thống ghi nhận tiến bộ

Dashboard cập nhật.

Nếu năm việc này chạy end-to-end, VietPhonics AI đã chứng minh được giá trị cốt lõi của sản phẩm.

---

# 21. Giáo án MVP chính thức đề xuất

Để hoàn thành project môn học, nội dung nên đóng scope ở:

**Lesson 0 – Kiểm tra đầu vào**

**Lesson 1 – S/X**

**Lesson 2 – TR/CH**

**Lesson 3 – L/N**

**Lesson 4 – N/NG cuối**

**Lesson 5 – T/C cuối**

**Lesson 6 – Thanh ngang & sắc**

**Lesson 7 – Thanh huyền & nặng**

**Lesson 8 – Thanh hỏi & ngã**

**Lesson 9 – Sáu thanh**

**Lesson 10 – Thử thách tổng hợp**

Như vậy chỉ cần khoảng **100–150 exercise chất lượng**, thay vì cố tạo hàng nghìn bài tập.

Mỗi exercise đã gắn được:

**text → canonical phoneme → audio → PAPL → predicted phoneme → alignment → feedback → progress**.

Đây là scope đủ hoàn chỉnh để VietPhonics AI trở thành một ứng dụng học phát âm thực sự, thay vì chỉ là giao diện gọi một speech model.