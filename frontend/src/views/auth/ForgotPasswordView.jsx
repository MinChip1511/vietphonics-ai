import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Smartphone, Mail, Send, Lock, RotateCcw, CheckCircle2, ShieldCheck } from "lucide-react";
import { useStore, passwordStrength } from "../../services/store";
import { sanitizePhone, isValidPhone, isValidPassword, PHONE_ERROR, PASSWORD_HINT } from "../../services/validators";
import AuthLayout, { AuthField, PasswordInput, authInput } from "./AuthLayout";

// Figma: Quên Mật Khẩu (70:2902)
const STRENGTH = [
  { label: "Rất yếu", color: "text-red-500", bar: "bg-red-500" },
  { label: "Yếu", color: "text-red-500", bar: "bg-red-500" },
  { label: "Trung bình", color: "text-amber-500", bar: "bg-amber-400" },
  { label: "Mạnh", color: "text-emerald-500", bar: "bg-emerald-500" },
  { label: "Rất mạnh (Khuyến dùng)", color: "text-emerald-600", bar: "bg-emerald-600" }
];

function OtpBoxes({ value, onChange }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);
  const setAt = (i, ch) => {
    const next = digits.map((d, j) => (j === i ? ch || " " : d)).join("").replace(/\s+$/, "");
    onChange(next.replace(/ /g, ""));
    if (ch && i < 5) refs.current[i + 1]?.focus();
  };
  return (
    <div className="flex justify-center gap-2 sm:gap-3" data-testid="otp-boxes">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          aria-label={`Chữ số OTP ${i + 1}`}
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={(e) => setAt(i, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(e) => { if (e.key === "Backspace" && !d.trim() && i > 0) refs.current[i - 1]?.focus(); }}
          onPaste={(e) => { e.preventDefault(); onChange(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)); }}
          className="w-11 h-12 sm:w-12 sm:h-14 rounded-xl bg-white text-center font-heading text-2xl font-extrabold text-vp-blue outline-none focus:ring-2 focus:ring-vp-blue"
        />
      ))}
    </div>
  );
}

export default function ForgotPasswordView({ nav, onLoggedIn }) {
  const { auth } = useStore();
  const [tab, setTab] = useState("otp");
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [expires, setExpires] = useState(0);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (expires <= 0) return undefined;
    const t = setTimeout(() => setExpires(expires - 1), 1000);
    return () => clearTimeout(t);
  }, [expires]);

  const strength = passwordStrength(pw);
  const mm = String(Math.floor(expires / 60)).padStart(2, "0");
  const ss = String(expires % 60).padStart(2, "0");

  const send = async () => {
    setError(null);
    if (tab === "otp") {
      if (!isValidPhone(identifier)) return setError(PHONE_ERROR);
    } else if (!identifier.includes("@")) {
      return setError("Email chưa đúng định dạng.");
    }
    // The code is tied to the account's phone: for the email tab the user still enters the phone's code.
    const res = tab === "otp" ? await auth.sendOtp(identifier) : { ok: true };
    if (!res.ok) return setError(res.error);
    setSent(true);
    setExpires(300);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!sent) return setError("Vui lòng gửi và nhập mã OTP trước.");
    if (expires <= 0) return setError("Mã OTP đã hết hạn, vui lòng gửi lại.");
    if (!isValidPassword(pw)) return setError(`Mật khẩu chưa đủ mạnh. ${PASSWORD_HINT}`);
    if (pw !== pw2) return setError("Hai mật khẩu chưa khớp nhau.");
    const res = await auth.resetPassword(identifier, code, pw);
    if (!res.ok) return setError(res.error);
    onLoggedIn(res.user);
  };

  return (
    <AuthLayout onGoHome={nav.home} onLogin={nav.login} onSignup={nav.signup}>
      <form onSubmit={submit} className="max-w-[860px] mx-auto rounded-[28px] bg-white p-6 sm:p-10 shadow-[0_12px_32px_rgba(30,27,75,0.06)] flex flex-col gap-5" data-testid="forgot-view">
        <button type="button" onClick={nav.login} className="self-start flex items-center gap-1 rounded-full bg-[#EEF1FA] px-3 py-1 text-xs font-semibold text-vp-ink"><ArrowLeft className="w-3.5 h-3.5" /> Quay lại Đăng nhập</button>
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-vp-ink">Quên mật khẩu?</h1>
          <p className="text-sm text-vp-muted">Nhập thông tin tài khoản ba mẹ đã dùng để đăng ký VietPhonics AI để nhận mã bảo mật.</p>
        </div>
        <div className="grid grid-cols-2 rounded-full bg-[#EEF1FA] p-1">
          {[{ id: "otp", label: "Số điện thoại / OTP", icon: Smartphone }, { id: "email", label: "Email", icon: Mail }].map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} onClick={() => { setTab(id); setSent(false); setIdentifier(""); setCode(""); }} className={`flex items-center justify-center gap-2 h-9 rounded-full text-xs sm:text-sm font-bold ${tab === id ? "bg-vp-blue text-white" : "text-vp-ink"}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
        <AuthField
          label={tab === "otp" ? "Số điện thoại đã đăng ký *" : "Email đã đăng ký *"}
          icon={tab === "otp" ? Smartphone : Mail}
          right={
            <button type="button" data-testid="forgot-send" onClick={send} disabled={sent && expires > 240} className="h-12 shrink-0 rounded-full bg-vp-sky px-4 text-sm font-bold text-vp-blue disabled:opacity-60 flex items-center gap-1.5">
              <Send className="w-4 h-4" /> {sent ? "Gửi lại" : "Gửi mã xác thực OTP"}
            </button>
          }
        >
          <input data-testid="forgot-identifier" className={authInput} value={identifier} onChange={(e) => { setIdentifier(tab === "otp" ? sanitizePhone(e.target.value) : e.target.value); setError(null); }} maxLength={tab === "otp" ? 10 : 100} inputMode={tab === "otp" ? "numeric" : "email"} placeholder={tab === "otp" ? "0912458921" : "phuhuynh@vietphonics.vn"} />
        </AuthField>

        {sent && (
          <div className="rounded-2xl bg-[#EEF1FA] p-4 flex flex-col gap-3">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-vp-ink">Nhập mã bảo mật OTP 6 chữ số  (demo: mã do nhóm phát triển cung cấp riêng)</span>
              <span className="text-vp-muted">Hiệu lực: <b className="text-amber-600">{mm}:{ss}</b></span>
            </div>
            <OtpBoxes value={code} onChange={setCode} />
            {code.length === 6 && <p className="flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Đã nhập đủ mã. Đặt mật khẩu mới bên dưới, hệ thống sẽ kiểm tra mã khi xác nhận.</p>}
          </div>
        )}

        <AuthField label="Mật khẩu mới của phụ huynh" icon={Lock}>
          <PasswordInput testId="forgot-pw" value={pw} onChange={(v) => { setPw(v); setError(null); }} placeholder="Tối thiểu 8 ký tự" />
        </AuthField>
        {pw && (
          <div className="flex flex-col gap-1.5 -mt-2">
            <div className="flex justify-between text-xs"><span className="text-vp-muted">Độ mạnh mật khẩu:</span><span className={`font-bold ${STRENGTH[strength].color}`}>{STRENGTH[strength].label}</span></div>
            <div className="grid grid-cols-4 gap-2">{[1, 2, 3, 4].map((i) => <span key={i} className={`h-1.5 rounded-full ${i <= strength ? STRENGTH[strength].bar : "bg-vp-border"}`} />)}</div>
            {!isValidPassword(pw) && <p className="text-xs text-red-500">{PASSWORD_HINT}</p>}
          </div>
        )}
        <AuthField label="Xác nhận lại mật khẩu mới" icon={RotateCcw} error={pw2 && pw !== pw2 ? "Hai mật khẩu chưa khớp." : null}>
          <PasswordInput testId="forgot-pw2" value={pw2} onChange={(v) => { setPw2(v); setError(null); }} placeholder="Nhập lại mật khẩu" />
        </AuthField>
        {error && <p data-testid="forgot-error" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-500">{error}</p>}
        <button data-testid="forgot-submit" type="submit" className="h-14 rounded-full bg-[#0A5BB5] text-base font-bold text-white hover:brightness-110 flex items-center justify-center gap-2">
          <ShieldCheck className="w-5 h-5" /> Đặt Lại Mật Khẩu & Đăng Nhập Ngay
        </button>
      </form>
    </AuthLayout>
  );
}
