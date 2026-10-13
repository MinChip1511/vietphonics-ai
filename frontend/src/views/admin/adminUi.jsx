import React, { useEffect } from "react";
import { todayLabel } from "./adminUtils";
import { CalendarDays, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge, Card } from "../../components/ui";
import { useStore } from "../../services/store";

// Shared table tokens (Figma admin tables): no outer border, soft header, 13px rows.
export const TABLE_WRAP = "overflow-x-auto";
export const TABLE = "w-full text-[13px]";
export const THEAD = "bg-[#F8FAFC] text-left text-xs font-semibold text-[#475569]";
export const TH = "px-3 py-2.5 whitespace-nowrap";
export const TR = "border-b border-[#F1F5F9] last:border-b-0";
export const TD = "px-3 py-3.5";
export const CHIP_SELECT = "h-8 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[13px] text-[#475569] outline-none focus:border-vp-blue";
export const PANEL_TITLE = "text-sm font-semibold text-[#0F172A]";

// Header row used by the Figma admin screens. With a title or primary action it is the full header
// (title, date chip, action, bottom rule); without either it is just a slim right-aligned chip row.
export function AdminHeader({ title, subtitle, actionLabel, onAction, extra, full: forceFull = false }) {
  const { admin } = useStore();
  const hasDemo = Boolean(admin.data?.accounts.some((a) => a.isDemo));
  const full = forceFull || Boolean(title || actionLabel);
  const chips = (
    <div className="flex flex-wrap items-center gap-2">
      {extra}
      {hasDemo && <span data-testid="demo-chip" title="Hệ thống đang chứa tài khoản và dữ liệu mẫu để thử nghiệm" className="rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-bold uppercase text-amber-700">Có dữ liệu Demo</span>}
      <span className="flex items-center gap-2 rounded-lg border border-vp-border bg-white px-4 py-2 text-sm font-normal text-[#475569]">
        <CalendarDays className="w-4 h-4" /> Hôm nay: {todayLabel()}
      </span>
      {actionLabel && (
        <button data-testid="admin-primary-action" onClick={onAction} className="flex items-center gap-1.5 rounded-lg bg-vp-blue px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
          <Plus className="w-4 h-4" /> {actionLabel}
        </button>
      )}
    </div>
  );
  if (!full) return <div className="flex justify-end mb-3">{chips}</div>;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 mb-6 border-b border-vp-border">
      <div>
        {title && <h2 className="font-heading text-2xl font-extrabold text-vp-ink">{title}</h2>}
        {subtitle && <p className="text-sm text-vp-muted">{subtitle}</p>}
      </div>
      {chips}
    </div>
  );
}

export function StatusBadge({ map, status }) {
  const s = map[status] || { label: status, tone: "gray" };
  return <Badge soft tone={s.tone}>{s.label}</Badge>;
}

export function Toast({ message, tone = "ok", onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(onDone, tone === "error" ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [message, tone, onDone]);
  if (!message) return null;
  return (
    <div role="status" data-testid="toast" className={`fixed bottom-6 right-6 z-[70] flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${tone === "error" ? "bg-red-600" : "bg-vp-ink"}`}>
      {tone === "error" ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />} {message}
    </div>
  );
}

export function KpiCard({ label, value, delta, up, hint }) {
  return (
    <Card flat className="p-5 flex flex-col gap-3">
      <p className="text-[13px] font-semibold uppercase text-[#94A3B8]">{label}</p>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-heading text-[28px] leading-tight font-bold text-[#0F172A]">{value}</p>
        {delta && <span className={`text-xs font-bold ${up ? "text-emerald-500" : "text-red-500"}`}>{up ? "↑" : "↓"} {delta.replace(/^[+-]/, "")}</span>}
      </div>
      {hint && <p className="text-xs text-[#475569]">{hint}</p>}
    </Card>
  );
}

// Shown until the admin data has been fetched (or says why it could not be).
export function AdminLoading() {
  const { admin } = useStore();
  return (
    <p data-testid="admin-loading" className={admin.error ? "text-red-500" : "text-vp-muted"}>
      {admin.error || "Đang tải dữ liệu quản trị…"}
    </p>
  );
}
