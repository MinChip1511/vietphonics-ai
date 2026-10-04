import React from "react";

// Shared primitives matching the Figma VietPhonics AI components (Button / Primary 20:1960,
// cards, badges). Colors come from the vp-* tokens in index.css.

export function Card({ as: Tag = "div", className = "", children, ...props }) {
  return (
    <Tag className={`bg-white border border-vp-border rounded-[20px] ${className}`} {...props}>
      {children}
    </Tag>
  );
}

const BUTTON_VARIANTS = {
  primary: "bg-vp-blue text-white hover:brightness-110 shadow-vp-drop",
  secondary: "bg-white text-vp-blue border border-vp-blue hover:bg-vp-sky",
  soft: "bg-vp-sky text-vp-blue hover:brightness-95",
  ghost: "text-vp-ink hover:bg-vp-sky",
  danger: "bg-red-500 text-white hover:bg-red-600"
};

const BUTTON_SIZES = {
  sm: "h-8 px-3 text-xs rounded-full",
  md: "h-11 px-5 text-sm rounded-full",
  lg: "h-14 px-8 text-base rounded-3xl"
};

export function Button({ variant = "primary", size = "md", className = "", children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const BADGE_TONES = {
  blue: "bg-vp-blue text-white",
  sky: "bg-vp-sky text-vp-blue",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-600",
  red: "bg-red-100 text-red-600",
  gray: "bg-slate-100 text-slate-600"
};

export function Badge({ tone = "sky", className = "", children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold uppercase whitespace-nowrap ${BADGE_TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 mb-6 border-b border-vp-border">
      <div className="min-w-0">
        {title && <h2 className="font-heading text-2xl sm:text-[32px] font-extrabold text-vp-ink leading-tight">{title}</h2>}
        {subtitle && <p className={`${title ? "mt-1" : ""} text-sm text-vp-muted`}>{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className="font-heading text-xl sm:text-2xl font-bold text-vp-ink">{children}</h3>
      {action}
    </div>
  );
}

export function ProgressBar({ value, className = "", barClass = "bg-vp-blue" }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`h-2 w-full rounded-full bg-slate-100 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-semibold text-vp-ink">{label}</span>}
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : hint && <span className="text-xs text-vp-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-12 w-full rounded-xl border border-vp-border bg-white px-4 text-base text-vp-ink placeholder:text-slate-400 outline-none focus:border-vp-blue focus:ring-2 focus:ring-vp-sky";

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="inline-flex rounded-full bg-vp-pill p-1 gap-1 max-w-full overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`h-8 px-4 rounded-full text-xs font-semibold whitespace-nowrap ${value === t.id ? "bg-vp-blue text-white shadow-vp-drop" : "text-vp-ink"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-vp-blue" : "bg-slate-300"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function Modal({ open, onClose, title, children, footer, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-vp-ink/40 p-4" onClick={onClose}>
      <div className={`w-full ${width} max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        {title && <h3 className="font-heading text-xl font-bold text-vp-ink mb-4">{title}</h3>}
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
