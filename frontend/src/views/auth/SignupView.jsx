import React, { useState } from "react";
import {
  User, Phone, Mail, Lock, ArrowRight, ArrowLeft, ShieldCheck, Heart, Sparkles, Volume2, Mic, Cpu, Star,
  FileText, Check, Lightbulb
} from "lucide-react";
import { useStore } from "../../services/store";
import { speakVietnamese } from "../../services/audioService";
import { MASCOTS } from "../../data/mascots";
import ChildAvatar from "../../components/ChildAvatar";
import { Modal, Button } from "../../components/ui";
import { nameError, sanitizePhone, isValidPhone, isValidPassword, PHONE_ERROR, PASSWORD_HINT } from "../../services/validators";
import MicCheckStep from "./MicCheckStep";
import AuthLayout, { AuthField, PasswordInput, Stepper, authInput } from "./AuthLayout";

// Figma: Đăng ký bước 1 (69:1529), bước 2 Hồ sơ của bé (70:2245), bước 3 Bảo mật giọng nói (70:2623).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AGES = [
  { age: 4, label: "tuổi (Mầm)" },
  { age: 5, label: "tuổi (Chồi)" },
  { age: 6, label: "tuổi (Lá)" },
  { age: 7, label: "tuổi (Lớp 1)" }
];
const AGE_NOTES = {
  4: "Giai đoạn bé bắt chước âm thanh rất nhanh. Bé sẽ nghe nhiều và luyện nguyên âm đơn cùng Cá Xanh.",
  5: "Giai đoạn vàng phát triển thính giác âm vị. Bé sẽ học nhận diện 11 nguyên âm cơ bản, rèn cơ vòm miệng với trò chơi thổi bóng cùng Cá Xanh.",
  6: "Bé chuẩn bị vào lớp 1: luyện phụ âm ghép, thanh điệu và đọc vần liền mạch.",
  7: "Bé đã đi học: tập trung sửa ngọng dấu hỏi/ngã, âm cuối và đọc câu lưu loát."
};
const REGIONS = [
  { id: "north", title: "Giọng Miền Bắc", desc: "Chuẩn âm Hà Nội: Phân biệt rõ tr/ch, r/d/gi, 6 thanh điệu sắc bén.", sample: "Trời trong xanh" },
  { id: "south", title: "Giọng Miền Nam", desc: "Chuẩn Sài Gòn tự nhiên: Âm điệu mềm mại, thân quen, rõ ràng vần điệu.", sample: "Bé đi học" },
  { id: "mixed", title: "Đa vùng miền", desc: "Rèn luyện phản xạ nghe hiểu đa dạng cả Bắc và Nam cho bé song ngữ.", sample: "Xin chào bạn" }
];
const LEVELS = [
  { id: "new", title: "Bé mới bắt đầu làm quen chữ cái", desc: "Chưa thuộc bảng chữ cái, cần học qua bài hát, hoạt hình và hình ảnh trực quan." },
  { id: "mid", title: "Đã biết mặt chữ, hơi ngọng dấu hỏi/ngã hoặc âm cong lưỡi (l/n, s/x)", desc: "Cần AI phát hiện khẩu hình sai và uốn nắn âm điệu với các bài tập cơ môi nhẹ nhàng." },
  { id: "ready", title: "Chuẩn bị vào lớp 1: Cần ghép vần và đọc câu lưu loát", desc: "Luyện phản xạ đánh vần tốc độ, đọc ngắt nghỉ chuẩn ngữ điệu theo SGK mới." }
];

function StepOne({ data, setData, onNext, auth }) {
  const [errors, setErrors] = useState({});
  const next = async (e) => {
    e.preventDefault();
    const err = {};
    const nameProblem = nameError(data.name, "họ tên phụ huynh");
    if (nameProblem) err.name = nameProblem;
    if (!isValidPhone(data.phone)) err.phone = PHONE_ERROR;
    if (!EMAIL_RE.test(data.email)) err.email = "Email chưa đúng định dạng.";
    if (!isValidPassword(data.password)) err.password = `Mật khẩu chưa đủ mạnh. ${PASSWORD_HINT}`;
    if (!err.phone || !err.email) {
      const taken = await auth.availability({ email: err.email ? "" : data.email, phone: err.phone ? "" : data.phone });
      if (taken.phoneTaken) err.phone = "Số điện thoại này đã có tài khoản.";
      if (taken.emailTaken) err.email = "Email này đã được đăng ký.";
    }
    setErrors(err);
    if (Object.keys(err).length === 0) onNext();
  };
  // Editing a field clears its error right away (the error comes back on the next submit if still wrong).
  const set = (k, clean = (v) => v) => (e) => {
    setData({ ...data, [k]: clean(typeof e === "string" ? e : e.target.value) });
    setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
  };

  return (
    <form onSubmit={next} className="flex flex-col gap-5" data-testid="signup-step-1">
      <div>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-vp-blue"><ShieldCheck className="w-4 h-4" /> Khởi tạo tài khoản gia đình</p>
        <h1 className="font-heading text-3xl font-extrabold text-vp-ink">Thông tin phụ huynh</h1>
        <p className="text-sm text-vp-muted">Quản lý lộ trình học tập, giám sát phát âm và nhận thông báo cá nhân hoá hàng ngày.</p>
      </div>
      <div className="rounded-3xl bg-white p-5 sm:p-6 flex flex-col gap-5 shadow-[0_12px_32px_rgba(30,27,75,0.05)]">
        <AuthField label="Họ và tên phụ huynh" hint="Người đồng hành chính" icon={User} error={errors.name}>
          <input data-testid="su-name" className={authInput} value={data.name} onChange={set("name")} placeholder="Nguyễn Hoàng Nam" />
        </AuthField>
        <div className="grid gap-5 sm:grid-cols-2">
          <AuthField label="Số điện thoại" icon={Phone} error={errors.phone}>
            <input data-testid="su-phone" className={authInput} inputMode="numeric" autoComplete="tel" maxLength={10} value={data.phone} onChange={set("phone", sanitizePhone)} placeholder="0988123456" />
          </AuthField>
          <AuthField label="Email nhận báo cáo tuần" icon={Mail} error={errors.email}>
            <input data-testid="su-email" className={authInput} type="email" value={data.email} onChange={set("email")} placeholder="hoangnam.parent@gmail.com" />
          </AuthField>
        </div>
        <AuthField label="Mật khẩu bảo vệ tài khoản" hint={PASSWORD_HINT} icon={Lock} error={errors.password}>
          <PasswordInput testId="su-password" value={data.password} onChange={set("password")} placeholder="••••••••" />
        </AuthField>
        <div className="flex justify-end">
          <button data-testid="su-next-1" type="submit" className="h-12 rounded-full bg-vp-blue px-6 text-sm font-bold text-white flex items-center gap-2 hover:brightness-110">
            Tiếp tục: Thiết lập hồ sơ bé <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
}

function StepTwo({ data, setData, onBack, onNext }) {
  const [error, setError] = useState(null);
  const set = (patch) => setData({ ...data, ...patch });
  const next = () => {
    const problem = nameError(data.childName, "tên gọi của bé");
    if (problem) return setError(problem);
    setError(null);
    onNext();
  };
  const card = "rounded-3xl bg-white p-5 sm:p-6 flex flex-col gap-6 shadow-[0_12px_32px_rgba(30,27,75,0.05)]";

  return (
    <div className="flex flex-col gap-5" data-testid="signup-step-2">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-700"><Sparkles className="w-3 h-3" /> Cá nhân hóa AI</span>
          <span className="text-[11px] text-vp-muted">Thời gian hoàn thiện: ~1 phút</span>
        </div>
        <h1 className="font-heading text-3xl font-extrabold uppercase text-vp-ink mt-1">Thiết lập hồ sơ bé yêu</h1>
        <p className="text-sm text-vp-muted">Bé sẽ đồng hành cùng người bạn <b className="text-vp-blue">Cá Xanh</b> trong hành trình khám phá ngữ âm vui nhộn và tự tin bước vào lớp 1!</p>
      </div>
      <div className={card}>
        <div>
          <p className="font-bold text-vp-ink">Chọn người bạn hoạt hình đại diện cho bé:</p>
          <p className="text-xs text-vp-muted mb-3">Bé có thể đổi lại bất cứ lúc nào</p>
          <div className="flex flex-wrap gap-4">
            {MASCOTS.map((m) => (
              <button key={m.id} type="button" onClick={() => set({ avatar: m.id })} className="flex flex-col items-center gap-1">
                <span className={`rounded-full p-0.5 border-2 ${data.avatar === m.id ? "border-vp-blue" : "border-transparent"}`}>
                  <ChildAvatar avatar={m.id} className="w-16 h-16" />
                </span>
                <span className={`text-xs ${data.avatar === m.id ? "font-bold text-vp-blue" : "text-vp-ink"}`}>{m.name}</span>
              </button>
            ))}
          </div>
        </div>
        <AuthField label="Tên gọi thân mật ở nhà của bé *" icon={Heart} error={error}>
          <input data-testid="su-child-name" className={authInput} value={data.childName} onChange={(e) => { set({ childName: e.target.value }); setError(null); }} maxLength={30} placeholder="Bé Bắp" />
        </AuthField>
        <p className="-mt-4 text-xs text-vp-muted">Cá Xanh sẽ gọi đúng tên này khi trò chuyện và khen ngợi bé trong các bài phát âm.</p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-vp-ink">Độ tuổi hiện tại của bé:</p>
            <span className="rounded-full bg-vp-sky px-2.5 py-1 text-[10px] font-bold text-vp-blue">Phù hợp nhất: 4 - 7 tuổi</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AGES.map((a) => (
              <button key={a.age} type="button" onClick={() => set({ age: a.age })} className={`rounded-3xl py-3 ${data.age === a.age ? "bg-vp-blue text-white" : "bg-[#EEF1FA] text-vp-ink"}`}>
                <span className="block font-heading text-2xl font-extrabold">{a.age}</span>
                <span className="block text-xs">{a.label}</span>
              </button>
            ))}
          </div>
          <p className="flex items-start gap-2 rounded-xl bg-vp-sky/60 px-3 py-2 text-xs text-vp-ink"><Lightbulb className="w-4 h-4 text-vp-blue shrink-0" /><span><b>Đặc trưng lứa tuổi {data.age}:</b> {AGE_NOTES[data.age]}</span></p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-bold text-vp-ink">Chất giọng mục tiêu ba mẹ muốn bé rèn luyện:</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {REGIONS.map((r) => (
              <div key={r.id} role="button" tabIndex={0} onClick={() => set({ region: r.id })} onKeyDown={(e) => e.key === "Enter" && set({ region: r.id })}
                className={`cursor-pointer rounded-2xl border-2 p-4 text-left ${data.region === r.id ? "border-vp-blue bg-white shadow-vp-card" : "border-transparent bg-[#EEF1FA]"}`}
              >
                <p className={`flex items-center justify-between font-bold ${data.region === r.id ? "text-vp-blue" : "text-vp-ink"}`}>{r.title} {data.region === r.id && <Check className="w-4 h-4" />}</p>
                <p className="mt-1 text-xs text-vp-muted">{r.desc}</p>
                <button type="button" onClick={(e) => { e.stopPropagation(); speakVietnamese(r.sample); }} className="mt-2 flex items-center gap-1 text-[11px] font-bold text-vp-blue"><Volume2 className="w-3 h-3" /> Nghe thử mẫu</button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-bold text-vp-ink">Khảo sát nhanh trình độ hiện tại của bé:</p>
          {LEVELS.map((l) => (
            <label key={l.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl p-3 ${data.level === l.id ? "bg-vp-sky/70" : "bg-[#EEF1FA]"}`}>
              <input type="radio" name="level" checked={data.level === l.id} onChange={() => set({ level: l.id })} className="mt-1 w-4 h-4 accent-[#1978dc]" />
              <span><span className="block text-sm font-bold text-vp-ink">{l.title}</span><span className="block text-xs text-vp-muted">{l.desc}</span></span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" onClick={onBack} className="h-12 rounded-full bg-[#EEF1FA] px-5 text-sm font-bold text-vp-ink flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Quay lại Bước 1</button>
          <button data-testid="su-next-2" type="button" onClick={next} className="h-12 rounded-full bg-vp-blue px-6 text-sm font-bold text-white flex items-center gap-2">Tiếp tục: Thiết lập bảo mật giọng nói <ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

const TIERS = [
  { icon: Mic, title: "Tầng 1: Thu âm", body: "Giọng nói của bé được thu qua micro của thiết bị rồi gửi tới máy chủ VietPhonics chỉ để chấm điểm." },
  { icon: Cpu, title: "Tầng 2: AI chấm điểm", body: "Mô hình AI nghe và so khớp âm tiếng Việt của bé với từ cần đọc. File ghi âm không được lưu lại trên máy chủ sau khi chấm.", active: true },
  { icon: Star, title: "Tầng 3: Khích lệ & sửa âm", body: "Bé nhận điểm, lời khen và hướng dẫn nhẹ nhàng để đọc tốt hơn ở lần sau." }
];

function StepThree({ data, setData, onBack, onNext }) {
  const [showPolicy, setShowPolicy] = useState(false);
  const set = (patch) => setData({ ...data, ...patch });
  const consent = (key, title, tag, tone, body) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[#EEF1FA] p-4">
      <input data-testid={`consent-${key}`} type="checkbox" checked={data[key]} onChange={(e) => set({ [key]: e.target.checked })} className="mt-1 w-5 h-5 shrink-0 accent-[#1978dc]" />
      <span>
        <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-vp-ink">{title} <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>{tag}</span></span>
        <span className="block mt-1 text-xs text-vp-muted">{body}</span>
      </span>
    </label>
  );

  return (
    <div className="flex flex-col gap-5" data-testid="signup-step-3">
      <div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#EEF1FA] px-2.5 py-1 text-[10px] font-bold uppercase text-vp-ink">Không lưu file ghi âm trên máy chủ</span>
        </div>
        <h1 className="font-heading text-3xl font-extrabold uppercase text-vp-ink mt-1">Cam kết bảo mật giọng nói của bé</h1>
        <p className="text-sm text-vp-muted max-w-2xl">Quyền riêng tư và an toàn âm thanh của trẻ em là nguyên tắc tối thượng tại VietPhonics AI. Mọi dữ liệu thu âm đều được kiểm soát bởi phụ huynh.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-start">
        <div className="rounded-3xl bg-white p-5 sm:p-6 flex flex-col gap-4 shadow-[0_12px_32px_rgba(30,27,75,0.05)]">
          <div className="flex items-start gap-3 rounded-2xl bg-vp-sky/60 p-4">
            <ShieldCheck className="w-6 h-6 text-vp-blue shrink-0" />
            <span><b className="text-sm text-vp-ink">Chính sách không kinh doanh dữ liệu</b><span className="block text-xs text-vp-muted">VietPhonics AI tuyệt đối không chia sẻ, bán hoặc sử dụng âm thanh giọng nói của bé cho bất kỳ bên thứ ba hay mạng quảng cáo thương mại nào.</span></span>
          </div>
          {consent("consentAnalysis", "Đồng ý cấp quyền xử lý âm ngữ tức thời", "BẮT BUỘC", "bg-red-100 text-red-600",
            "Tôi xác nhận là phụ huynh/người giám hộ hợp pháp của bé và đồng ý cấp quyền xử lý âm thanh thu âm tức thời để thuật toán AI phân tích âm vị, phát hiện ngữ điệu và hướng dẫn phát âm chính xác cho con.")}
          {consent("consentStorage", "Chính sách lưu trữ tạm thời có kiểm soát", "Khuyến nghị", "bg-amber-100 text-amber-700",
            "Đoạn ghi âm bài đọc của bé chỉ được giữ tạm trên thiết bị trong phiên học để bé nghe lại. Máy chủ không lưu bản ghi sau khi chấm điểm.")}
          {consent("consentTraining", "Đóng góp dữ liệu âm vị ẩn danh phục vụ cộng đồng", "Tùy chọn", "bg-slate-200 text-slate-600",
            "Cho phép dùng mẫu âm đã ẩn danh để cải thiện thuật toán sau này. Hiện tại tùy chọn này chưa được áp dụng: VietPhonics chưa thu thập dữ liệu giọng nói để huấn luyện.")}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-vp-sky/60 p-4">
            <span className="flex items-center gap-2"><FileText className="w-6 h-6 text-vp-blue" /><span><b className="text-sm text-vp-ink">Thỏa Thuận Bảo Mật Phụ Huynh</b><span className="block text-xs text-vp-muted">Bản đầy đủ chi tiết cam kết pháp lý</span></span></span>
            <button type="button" onClick={() => setShowPolicy(true)} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-vp-blue">Xem toàn văn</button>
          </div>
          <p className="text-xs text-vp-muted">Phụ huynh có toàn quyền yêu cầu xóa vĩnh viễn toàn bộ nhật ký ghi âm của con bất cứ lúc nào trong Cổng Phụ Huynh.</p>
          <div className="flex flex-wrap justify-between gap-3">
            <button type="button" onClick={onBack} className="h-12 rounded-full bg-[#EEF1FA] px-5 text-sm font-bold text-vp-ink flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Quay lại sửa hồ sơ bé</button>
            <button data-testid="su-next-mic" type="button" disabled={!data.consentAnalysis} onClick={onNext}
              title={data.consentAnalysis ? undefined : "Cần đồng ý mục bắt buộc để tiếp tục"}
              className="h-12 rounded-full bg-vp-blue px-6 text-sm font-bold text-white disabled:bg-slate-300 disabled:text-slate-500"
            >
              Tiếp tục: kiểm tra micro
            </button>
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 sm:p-6 flex flex-col gap-3 shadow-[0_12px_32px_rgba(30,27,75,0.05)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase text-vp-ink">Quy trình xử lý âm thanh 3 tầng</p>
            
          </div>
          {TIERS.map((t, i) => (
            <React.Fragment key={t.title}>
              <div className={`flex items-start gap-3 rounded-2xl p-4 ${t.active ? "bg-vp-blue text-white" : "bg-[#EEF1FA]"}`}>
                <span className={`w-10 h-10 shrink-0 rounded-full grid place-items-center ${t.active ? "bg-white text-vp-blue" : "bg-vp-blue text-white"}`}><t.icon className="w-5 h-5" /></span>
                <span><b className="text-sm">{t.title}</b><span className={`block text-xs ${t.active ? "text-white/85" : "text-vp-muted"}`}>{t.body}</span></span>
              </div>
              {i < TIERS.length - 1 && <span className="self-center text-vp-blue">↓</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
      <Modal open={showPolicy} onClose={() => setShowPolicy(false)} title="Thỏa thuận bảo mật phụ huynh" footer={<Button onClick={() => setShowPolicy(false)}>Đã hiểu</Button>}>
        <div className="flex flex-col gap-2 text-sm text-vp-muted">
          <p>1. VietPhonics AI chỉ xử lý giọng nói của trẻ để chấm điểm phát âm và hướng dẫn luyện tập.</p>
          <p>2. Dữ liệu không được bán hay chia sẻ cho bên thứ ba vì mục đích quảng cáo.</p>
          <p>3. Phụ huynh có quyền xem, xuất và xóa toàn bộ dữ liệu của con trong mục Hồ sơ của bé.</p>
          <p>4. Việc dùng dữ liệu ẩn danh để cải thiện mô hình chỉ diễn ra khi phụ huynh chủ động đồng ý và có thể rút lại bất cứ lúc nào.</p>
          <p className="text-xs">(Văn bản demo, không có giá trị pháp lý.)</p>
        </div>
      </Modal>
    </div>
  );
}

export default function SignupView({ nav, onRegistered }) {
  const { auth } = useStore();
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    name: "", phone: "", email: "", password: "",
    avatar: MASCOTS[0].id, childName: "", age: 5, region: "north", level: "mid",
    consentAnalysis: false, consentStorage: true, consentTraining: false
  });

  const finish = async () => {
    setError(null);
    const res = await auth.register({ name: data.name, phone: data.phone, email: data.email, password: data.password });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const levelNeeds = { new: ["Nguyên âm đơn", "Thanh điệu"], mid: ["Thanh Hỏi - Ngã", "Âm L - N"], ready: ["Âm TR - CH", "Âm cuối N - NG"] }[data.level];
    const child = await onRegistered({
      name: data.childName.trim(),
      age: data.age,
      avatar: data.avatar,
      initial_needs: levelNeeds,
      settings: {
        region: data.region,
        consentAnalysis: data.consentAnalysis,
        consentTraining: data.consentTraining,
        retention: data.consentStorage ? "1" : "30"
      }
    });
    if (child && !child.ok) setError(child.error);
  };

  return (
    <AuthLayout onGoHome={nav.home} onLogin={nav.login} onSignup={nav.signup}>
      <div className="max-w-[1100px] mx-auto flex flex-col gap-8">
        <Stepper step={step} />
        {step === 1 && <StepOne data={data} setData={setData} auth={auth} onNext={() => setStep(2)} />}
        {step === 2 && <StepTwo data={data} setData={setData} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && <StepThree data={data} setData={setData} onBack={() => setStep(2)} onNext={() => setStep(4)} />}
        {step === 4 && <MicCheckStep error={error} onBack={() => setStep(3)} onFinish={finish} />}
        <p className="text-center text-sm text-vp-muted">Đã có tài khoản? <button onClick={nav.login} className="font-bold text-vp-blue">Đăng nhập</button></p>
      </div>
    </AuthLayout>
  );
}
