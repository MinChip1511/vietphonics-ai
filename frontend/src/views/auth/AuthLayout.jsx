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
  "h-[52px] w-full rounded-full bg-[#F1F3FC] pl-12 pr-4 text-base font-semibold text-vp-ink placeholder:font-normal placeholder:text-[#717784] outline-none focus:ring-2 focus:ring-vp-blue/40";

// Figma auth cards: rounded-[48px] with a soft shadow (the real card is capped so fields stay readable).
export const authCard = "mx-auto rounded-[48px] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]";
export const authTitle = "font-heading text-[32px] leading-10 font-extrabold tracking-[-0.32px] text-[#181C22]";
export const authPrimary = "h-14 rounded-full bg-vp-blue px-10 text-base font-bold text-white shadow-md hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-60";
export const authSecondary = "h-14 rounded-full bg-[#EBEDF7] px-8 text-base font-bold text-[#181C22] flex items-center justify-center gap-2";

export function AuthField({ label, hint, error, icon: Icon, right, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.6px] text-[#414753]">{label}</span>
        {hint && <span className="text-xs text-[#414753] normal-case tracking-normal">{hint}</span>}
      </span>
      <span className="relative flex items-center gap-2">
        <span className="relative flex-1">
          {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717784] pointer-events-none" />}
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
        className={`${authInput} pr-14`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="current-password"
      />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="absolute right-[29px] top-1/2 -translate-y-1/2 text-vp-muted">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </>
  );
}

const STEPS = ["Tài khoản phụ huynh", "Hồ sơ của bé", "Bảo mật giọng nói", "Kiểm tra micro"];

export function Stepper({ step }) {
  return (
    <div className="flex items-start justify-center" data-testid="signup-stepper">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-2 w-24 sm:w-40 text-center shrink-0">
              <span className="w-[46px] h-[46px] grid place-items-center">
                <span
                  className={`grid place-items-center rounded-full font-bold transition-transform ${
                    active ? "w-[46px] h-[46px] text-lg bg-vp-blue text-white shadow-lg ring-4 ring-vp-blue/20"
                    : done ? "w-8 h-8 border-2 border-vp-blue bg-white text-vp-blue"
                    : "w-8 h-8 bg-[#EBEDF7] text-[#717784]"
                  }`}
                >
                  {done ? <Check className="w-4 h-4" strokeWidth={3} /> : n}
                </span>
              </span>
              <span className={`text-xs sm:text-base leading-5 ${active ? "font-bold text-vp-blue" : done ? "font-semibold text-[#181C22]" : "font-medium text-[#717784]"}`}>{label}</span>
            </div>
            {n < STEPS.length && <span className={`mt-[22px] h-1 w-6 sm:flex-1 max-w-24 rounded ${n < step ? "bg-vp-blue" : "bg-[#E0E2EB]"}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
