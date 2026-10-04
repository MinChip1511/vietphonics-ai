import React, { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { PublicTopBar } from "../../components/shell/TopBar";

// Shared page frame for the Figma auth screens (69:1529, 69:1742, 127:5768, 70:2245, 70:2623, 70:2902).
export default function AuthLayout({ onGoHome, onLogin, onSignup, children }) {
  return (
    <div className="min-h-screen bg-[#F7F8FD] font-vp text-vp-ink">
      <PublicTopBar onGoHome={onGoHome} onLogin={onLogin} onSignup={onSignup} />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-10">{children}</main>
    </div>
  );
}

export const authInput =
  "h-12 w-full rounded-full bg-[#EEF1FA] pl-11 pr-4 text-[15px] font-semibold text-vp-ink placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-vp-blue/40";

export function AuthField({ label, hint, error, icon: Icon, right, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase text-vp-ink">{label}</span>
        {hint && <span className="text-[11px] text-vp-muted normal-case">{hint}</span>}
      </span>
      <span className="relative flex items-center gap-2">
        <span className="relative flex-1">
          {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-vp-muted pointer-events-none" />}
          {children}
        </span>
        {right}
      </span>
      {error && <span className="text-xs font-semibold text-red-500">{error}</span>}
    </label>
  );
}

export function PasswordInput({ value, onChange, placeholder, testId }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <input
        data-testid={testId}
        type={show ? "text" : "password"}
        className={`${authInput} pr-11`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="current-password"
      />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="absolute right-4 top-1/2 -translate-y-1/2 text-vp-muted">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </>
  );
}

const STEPS = ["Tài khoản phụ huynh", "Hồ sơ của bé", "Bảo mật giọng nói", "Kiểm tra micro"];

export function Stepper({ step }) {
  return (
    <div className="flex items-start" data-testid="signup-stepper">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1 w-20 sm:w-32 text-center shrink-0">
              <span className={`w-10 h-10 rounded-full grid place-items-center font-bold ${active ? "bg-vp-blue text-white" : done ? "bg-vp-sky text-vp-blue" : "bg-[#EEF1FA] text-vp-muted"}`}>
                {done ? <Check className="w-4 h-4" /> : n}
              </span>
              <span className={`text-[10px] font-bold uppercase ${active || done ? "text-vp-blue" : "text-vp-muted"}`}>Bước {n}</span>
              <span className={`text-xs sm:text-sm ${active ? "font-bold text-vp-ink" : done ? "font-semibold text-vp-ink" : "text-vp-muted"}`}>{label}</span>
            </div>
            {n < STEPS.length && <span className={`mt-5 h-1 flex-1 rounded ${n < step ? "bg-vp-blue" : "bg-vp-border"}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
