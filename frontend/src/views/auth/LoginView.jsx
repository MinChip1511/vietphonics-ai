import React, { useEffect, useState } from "react";
import { Phone, Mail, Lock, KeyRound, Send, ArrowRight, Smartphone, ShieldCheck, Gift } from "lucide-react";
import { useStore } from "../../services/store";
import { HOTLINE } from "../../constants";
import { sanitizePhone, isValidPhone, PHONE_ERROR } from "../../services/validators";
import AuthLayout, { AuthField, PasswordInput, authInput } from "./AuthLayout";

// Figma: Login/OTP (69:1742) and Login/Email (127:5768).
export default function LoginView({ nav, onLoggedIn, notice }) {
  const { auth } = useStore();
  const [tab, setTab] = useState("otp");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async () => {
    setError(null);
    if (!isValidPhone(phone)) return setError(PHONE_ERROR);
    const res = await auth.sendOtp(phone);
    if (!res.ok) return setError(res.error);
    setOtpSent(true);
    setCooldown(60);
    // Demo build: no SMS is sent, and the demo code is deliberately not printed on this public page.
    setInfo("Chức năng demo: hệ thống chưa gửi tin nhắn SMS thật. Mã xác thực demo do nhóm phát triển cung cấp riêng.");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (tab === "otp" && !isValidPhone(phone)) return setError(PHONE_ERROR);
    setBusy(true);
    const res = tab === "otp" ? await auth.loginWithOtp(phone, otp, remember) : await auth.loginWithPassword(email, password, remember);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onLoggedIn(res.user);
  };

  const switchTab = (t) => { setTab(t); setError(null); setInfo(null); };
  const edit = (setter, clean = (v) => v) => (e) => { setter(clean(e.target.value)); setError(null); };

  return (
    <AuthLayout onGoHome={nav.home} onLogin={nav.login} onSignup={nav.signup}>
      <div className="max-w-[860px] mx-auto rounded-[28px] bg-white p-6 sm:p-10 shadow-[0_12px_32px_rgba(30,27,75,0.06)] flex flex-col gap-6" data-testid="login-view">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-amber-700"><ShieldCheck className="w-4 h-4" /> Cổng điều khiển phụ huynh</p>
          <h1 className="font-heading text-3xl font-extrabold text-vp-ink mt-1">Chào mừng Ba Mẹ trở lại!</h1>
          <p className="text-sm text-vp-muted max-w-sm">Đăng nhập để theo dõi bảng điều khiển học tập và thành tích ngữ âm của con.</p>
        </div>
        {notice && <p className="rounded-xl bg-vp-sky px-4 py-3 text-sm font-semibold text-vp-blue">{notice}</p>}

        <div className="grid grid-cols-2 rounded-full bg-[#EEF1FA] p-1">
          {[{ id: "otp", label: "Số điện thoại / OTP", icon: Smartphone }, { id: "email", label: "Email & Mật khẩu", icon: Mail }].map(({ id, label, icon: Icon }) => (
            <button key={id} data-testid={`tab-${id}`} onClick={() => switchTab(id)} className={`flex items-center justify-center gap-2 h-9 rounded-full text-xs sm:text-sm font-bold ${tab === id ? "bg-vp-blue text-white" : "text-vp-ink"}`}>
              <Icon className="w-4 h-4" /> <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5">
          {tab === "otp" ? (
            <>
              <AuthField label="Số điện thoại phụ huynh" icon={Phone}>
                <input data-testid="login-phone" className={authInput} inputMode="numeric" autoComplete="tel" value={phone} onChange={edit(setPhone, sanitizePhone)} maxLength={10} placeholder="0912345678" />
              </AuthField>
              <AuthField
                label="Mã xác thực OTP"
                icon={KeyRound}
                right={
                  <button type="button" data-testid="send-otp" onClick={sendOtp} disabled={cooldown > 0} className="h-12 shrink-0 rounded-full bg-vp-sky px-4 text-sm font-bold text-vp-blue disabled:opacity-60 flex items-center gap-1.5">
                    <Send className="w-4 h-4" /> {cooldown > 0 ? `${cooldown}s` : otpSent ? "Gửi lại" : "Gửi mã OTP"}
                  </button>
                }
              >
                <input data-testid="login-otp" className={authInput} inputMode="numeric" maxLength={6} value={otp} onChange={edit(setOtp, (v) => v.replace(/\D/g, ""))} placeholder="6 chữ số OTP" />
              </AuthField>
            </>
          ) : (
            <>
              <AuthField label="Địa chỉ email phụ huynh" icon={Mail}>
                <input data-testid="login-email" className={authInput} type="email" value={email} onChange={edit(setEmail)} placeholder="phuhuynh@vietphonics.vn" autoComplete="username" />
              </AuthField>
              <AuthField label="Mật khẩu" icon={Lock} hint={<button type="button" onClick={nav.forgot} className="font-bold text-vp-blue">Quên mật khẩu?</button>}>
                <PasswordInput testId="login-password" value={password} onChange={(v) => { setPassword(v); setError(null); }} placeholder="••••••••" />
              </AuthField>
            </>
          )}

          <label className="flex items-center gap-2 text-sm text-vp-ink">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 accent-[#1978dc]" /> Ghi nhớ đăng nhập an toàn
          </label>
          {info && tab === "otp" && <p data-testid="otp-demo-note" className="rounded-xl bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">{info}</p>}
          {error && <p data-testid="login-error" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-500">{error}</p>}

          <button data-testid="login-submit" type="submit" disabled={busy} className="h-14 rounded-full bg-vp-blue text-base font-bold text-white hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2">
            Đăng Nhập Vào Bảng Phụ Huynh <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-[#EEF1FA] p-4">
          <p className="flex items-start gap-2 text-sm">
            <Gift className="w-5 h-5 text-vp-blue shrink-0" />
            <span><b className="text-vp-ink">Ba Mẹ chưa có tài khoản VietPhonics AI?</b><span className="block text-xs text-vp-muted">Đăng ký mới để nhận ngay 3 buổi đánh giá phát âm AI miễn phí.</span></span>
          </p>
          <button onClick={nav.signup} className="self-start sm:self-auto rounded-full bg-vp-blue px-4 py-2 text-xs font-bold text-white">Tạo tài khoản ngay</button>
        </div>

        <p className="text-[11px] text-vp-muted">Cần hỗ trợ? Gọi tổng đài VietPhonics: <b className="text-vp-blue">{HOTLINE}</b></p>
      </div>
    </AuthLayout>
  );
}
