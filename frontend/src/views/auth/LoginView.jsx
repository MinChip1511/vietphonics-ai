import React, { useEffect, useState } from "react";
import { Mail, Lock, KeyRound, Send, ArrowRight, Hand, Gift, Headset } from "lucide-react";
import { useStore } from "../../services/store";
import { HOTLINE } from "../../constants";
import AuthLayout, { AuthField, PasswordInput, authInput, authCard, authTitle } from "./AuthLayout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Figma: Login/OTP (69:1742) and Login/Email (127:5768). The "OTP" tab signs in with a code emailed to the parent.
export default function LoginView({ nav, onLoggedIn, notice }) {
  const { auth } = useStore();
  const [tab, setTab] = useState("otp");
  const [codeEmail, setCodeEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async () => {
    setError(null);
    if (!EMAIL_RE.test(codeEmail.trim())) return setError("Email chưa đúng định dạng.");
    const res = await auth.sendCode(codeEmail.trim(), "login");
    if (!res.ok) return setError(res.error);
    setOtpSent(true);
    setCooldown(60);
    setInfo("Nếu email này có tài khoản, mã 6 số đã được gửi. Mã có hiệu lực 5 phút, hãy kiểm tra cả mục thư rác.");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (tab === "otp" && !EMAIL_RE.test(codeEmail.trim())) return setError("Email chưa đúng định dạng.");
    setBusy(true);
    const res = tab === "otp" ? await auth.loginWithCode(codeEmail.trim(), otp, remember) : await auth.loginWithPassword(email, password, remember);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onLoggedIn(res.user);
  };

  const switchTab = (t) => { setTab(t); setError(null); setInfo(null); };
  const edit = (setter, clean = (v) => v) => (e) => { setter(clean(e.target.value)); setError(null); };

  return (
    <AuthLayout onGoHome={nav.home} onLogin={nav.login} onSignup={nav.signup}>
      <div className={`${authCard} max-w-[860px] p-6 sm:p-10 flex flex-col gap-6`} data-testid="login-view">
        <div>
          <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-[0.6px] text-[#765700]"><Hand className="w-[18px] h-[18px]" /> Cổng điều khiển phụ huynh</p>
          <h1 className={`${authTitle} mt-1`}>Chào mừng Ba Mẹ trở lại!</h1>
          <p className="text-sm text-[#414753] max-w-sm">Đăng nhập để theo dõi bảng điều khiển học tập và thành tích ngữ âm của con.</p>
        </div>
        {notice && <p className="rounded-xl bg-vp-sky px-4 py-3 text-sm font-semibold text-vp-blue">{notice}</p>}

        <div className="grid grid-cols-2 rounded-full bg-[#EBEDF7] p-1">
          {[{ id: "otp", label: "Email + mã xác thực", icon: KeyRound }, { id: "email", label: "Email & Mật khẩu", icon: Mail }].map(({ id, label, icon: Icon }) => (
            <button key={id} data-testid={`tab-${id}`} onClick={() => switchTab(id)} className={`flex items-center justify-center gap-2 h-9 rounded-full text-xs sm:text-sm font-bold ${tab === id ? "bg-vp-blue text-white shadow-sm" : "text-[#414753]"}`}>
              <Icon className="w-4 h-4" /> <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5">
          {tab === "otp" ? (
            <>
              <AuthField label="Email phụ huynh" icon={Mail}>
                <input data-testid="login-code-email" className={authInput} type="email" autoComplete="username" value={codeEmail} onChange={edit(setCodeEmail)} placeholder="phuhuynh@gmail.com" />
              </AuthField>
              <AuthField
                label="Mã xác thực 6 số"
                icon={KeyRound}
                right={
                  <button type="button" data-testid="send-otp" onClick={sendCode} disabled={cooldown > 0} className="h-12 shrink-0 rounded-full bg-vp-sky px-4 text-sm font-bold text-vp-blue disabled:opacity-60 flex items-center gap-1.5">
                    <Send className="w-4 h-4" /> {cooldown > 0 ? `${cooldown}s` : otpSent ? "Gửi lại" : "Gửi mã"}
                  </button>
                }
              >
                <input data-testid="login-otp" className={authInput} inputMode="numeric" maxLength={6} value={otp} onChange={edit(setOtp, (v) => v.replace(/\D/g, ""))} placeholder="Nhập mã trong email" />
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

          <label className="flex items-center gap-2 pt-1 text-sm text-[#414753]">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-5 h-5 rounded-[2.5px] border border-[#767676] accent-[#1978dc]" /> Ghi nhớ đăng nhập an toàn
          </label>
          {info && tab === "otp" && <p data-testid="otp-info" className="rounded-xl bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">{info}</p>}
          {error && <p data-testid="login-error" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-500">{error}</p>}

          <button data-testid="login-submit" type="submit" disabled={busy} className="h-16 rounded-full bg-vp-blue text-lg font-bold text-white shadow-md hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2">
            Đăng Nhập Vào Bảng Phụ Huynh <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[32px] bg-[#D5E3FF]/30 p-4">
          <p className="flex items-start gap-2 text-sm">
            <Gift className="w-5 h-5 text-vp-blue shrink-0" />
            <span><b className="text-vp-ink">Ba Mẹ chưa có tài khoản VietPhonics AI?</b><span className="block text-xs text-[#414753]">Đăng ký mới để nhận ngay 3 buổi đánh giá phát âm AI miễn phí.</span></span>
          </p>
          <button onClick={nav.signup} className="self-start sm:self-auto rounded-full bg-vp-blue px-4 py-1 text-xs font-bold text-white shadow-sm">Tạo tài khoản ngay</button>
        </div>

        <p className="flex items-center justify-end gap-1 pt-2 text-[11px] font-semibold text-[#1978DC]"><Headset className="w-3 h-3" /> Tổng đài chuyên viên sư phạm: {HOTLINE} (24/7)</p>
      </div>
    </AuthLayout>
  );
}
