import React, { useEffect } from "react";
import { todayLabel } from "./adminUtils";
import { CalendarDays, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "../../components/ui";
import { useStore } from "../../services/store";

// Header row used by every Figma admin screen: optional title, "Hôm nay" chip and a primary action.
export function AdminHeader({ title, subtitle, actionLabel, onAction, extra }) {
  const { admin } = useStore();
  const hasDemo = Boolean(admin.data?.accounts.some((a) => a.isDemo));
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-5 mb-6 border-b border-vp-border">
      <div>
        {title && <h2 className="font-heading text-2xl font-extrabold text-vp-ink">{title}</h2>}
        {subtitle && <p className="text-sm text-vp-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {extra}
        {hasDemo && <span data-testid="demo-chip" title="Hệ thống đang chứa tài khoản và dữ liệu mẫu để thử nghiệm" className="rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-bold uppercase text-amber-700">Có dữ liệu Demo</span>}
        <span className="flex items-center gap-2 rounded-xl border border-vp-border bg-white px-3 py-2 text-xs font-semibold text-vp-ink">
          <CalendarDays className="w-4 h-4" /> Hôm nay: {todayLabel()}
        </span>
        {actionLabel && (
          <button data-testid="admin-primary-action" onClick={onAction} className="flex items-center gap-1.5 rounded-full bg-vp-blue px-4 py-2 text-xs font-bold text-white hover:brightness-110">
            <Plus className="w-4 h-4" /> {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ map, status }) {
  const s = map[status] || { label: status, tone: "gray" };
  return <Badge tone={s.tone} className="normal-case text-xs rounded-lg">{s.label}</Badge>;
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
    <div className="rounded-2xl border border-vp-border bg-white p-5 flex flex-col gap-2">
      <p className="text-[11px] font-bold uppercase text-vp-muted">{label}</p>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-heading text-2xl font-extrabold text-vp-ink">{value}</p>
        {delta && <span className={`text-xs font-bold ${up ? "text-emerald-500" : "text-red-500"}`}>{up ? "↑" : "↓"} {delta.replace(/^[+-]/, "")}</span>}
      </div>
      {hint && <p className="text-xs text-vp-muted">{hint}</p>}
    </div>
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
