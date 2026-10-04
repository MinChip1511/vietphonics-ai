import React, { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { useStore, passwordStrength } from "../../services/store";
import { isValidPassword, PASSWORD_HINT } from "../../services/validators";
import AuthLayout, { AuthField, PasswordInput } from "./AuthLayout";

// Shown right after signing in with a temporary password (given by an admin): the account cannot be
// used until the owner chooses their own password.
export default function ChangePasswordView({ nav, onDone }) {
  const { auth, user } = useStore();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!isValidPassword(next)) return setError(`Mật khẩu mới chưa đủ mạnh. ${PASSWORD_HINT}`);
    if (next !== again) return setError("Hai mật khẩu mới chưa khớp nhau.");
    setBusy(true);
    const res = await auth.changePassword(current, next);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onDone();
  };

  return (
    <AuthLayout onGoHome={nav.home} onLogin={nav.login} onSignup={nav.signup}>
      <form onSubmit={submit} className="max-w-[560px] mx-auto rounded-[28px] bg-white p-6 sm:p-10 shadow-[0_12px_32px_rgba(30,27,75,0.06)] flex flex-col gap-5" data-testid="change-password-view">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-amber-700"><ShieldCheck className="w-4 h-4" /> Bảo mật tài khoản</p>
          <h1 className="font-heading text-3xl font-extrabold text-vp-ink mt-1">Đặt mật khẩu mới</h1>
          <p className="text-sm text-vp-muted">Xin chào {user?.name}. Mật khẩu hiện tại là mật khẩu tạm do quản trị viên cấp, vui lòng đổi trước khi tiếp tục.</p>
        </div>
        <AuthField label="Mật khẩu tạm hiện tại" icon={Lock}>
          <PasswordInput testId="cp-current" value={current} onChange={(v) => { setCurrent(v); setError(null); }} placeholder="Mật khẩu tạm" />
        </AuthField>
        <AuthField label="Mật khẩu mới" hint={PASSWORD_HINT} icon={Lock}>
          <PasswordInput testId="cp-new" value={next} onChange={(v) => { setNext(v); setError(null); }} placeholder="Mật khẩu mới" />
        </AuthField>
        {next && <p className="-mt-3 text-xs text-vp-muted">Độ mạnh: {["Rất yếu", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"][passwordStrength(next)]}</p>}
        <AuthField label="Nhập lại mật khẩu mới" icon={Lock} error={again && next !== again ? "Hai mật khẩu chưa khớp." : null}>
          <PasswordInput testId="cp-again" value={again} onChange={(v) => { setAgain(v); setError(null); }} placeholder="Nhập lại mật khẩu" />
        </AuthField>
        {error && <p data-testid="cp-error" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-500">{error}</p>}
        <button data-testid="cp-submit" type="submit" disabled={busy} className="h-14 rounded-full bg-vp-blue text-base font-bold text-white hover:brightness-110 disabled:opacity-60">Lưu mật khẩu mới</button>
      </form>
    </AuthLayout>
  );
}
