import React from "react";
import { Card, Badge } from "../../components/ui";
import { useStore } from "../../services/store";
import { formatVnd } from "../../data/adminLabels";
import { timeAgo } from "../parent/parentUtils";
import { AdminHeader, AdminLoading, KpiCard } from "./adminUi";

// Figma: 07 Admin / 01 / admin-dashboard (20:2). Every number is counted from the database.
const scoreTone = (score) => (score >= 85 ? ["green", "Tốt"] : score >= 70 ? ["amber", "Đạt"] : ["red", "Cần luyện"]);

export default function AdminDashboardView() {
  const { admin } = useStore();
  if (!admin.data) return <AdminLoading />;
  const m = admin.data.metrics;
  const conversion = m.parents ? ((m.paidParents / m.parents) * 100).toFixed(1) : "0";

  return (
    <div className="max-w-[1200px]">
      <AdminHeader title="Hệ thống giám sát VietPhonics AI" subtitle="Số liệu được tổng hợp trực tiếp từ cơ sở dữ liệu của ứng dụng." />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5 mb-6">
        <KpiCard label="Tài khoản phụ huynh" value={m.parents.toLocaleString("vi-VN")} hint="Đã đăng ký" />
        <KpiCard label="Hồ sơ bé" value={m.children.toLocaleString("vi-VN")} hint="Đang được quản lý" />
        <KpiCard label="Lượt luyện phát âm" value={m.attempts.toLocaleString("vi-VN")} hint="Lượt đã chấm và lưu" />
        <KpiCard label="Chuyển đổi free-paid" value={`${conversion}%`} hint={`${m.paidParents}/${m.parents} phụ huynh dùng gói trả phí`} />
        <KpiCard label="Doanh thu đã thu" value={formatVnd(m.revenue)} hint={`${m.paidOrders} đơn đã thanh toán`} />
      </div>

      {m.pendingOrders > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          <Badge soft tone="amber">{m.pendingOrders} đơn hàng chờ thanh toán</Badge>
        </div>
      )}

      <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[1fr_450px] items-start">
        <Card flat className="p-6 flex flex-col gap-4">
          <p className="text-sm font-semibold text-[#0F172A]">Doanh thu theo gói học</p>
          {m.revenueByPlan.length === 0 && <p className="text-sm text-vp-muted">Chưa có đơn hàng nào được thanh toán.</p>}
          {m.revenueByPlan.map((p) => (
            <div key={p.plan} className="flex justify-between text-sm">
              <span className="font-bold text-vp-ink">{p.plan} <span className="font-normal text-vp-muted">({p.orders} đơn)</span></span>
              <b className="text-vp-ink">{formatVnd(p.amount)}</b>
            </div>
          ))}
        </Card>
        <Card flat className="p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-[#0F172A]">Lượt luyện phát âm gần đây</p><span className="inline-flex items-center rounded-[20px] bg-[#FEE2E2] px-2.5 py-1 text-[11px] font-semibold text-[#DC2626]">Trực tiếp</span></div>
          {m.recentSubmissions.length === 0 && <p className="text-sm text-vp-muted">Chưa có lượt luyện nào.</p>}
          {m.recentSubmissions.map((s, i) => {
            const [tone, label] = scoreTone(s.score);
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-[#F8FAFC] p-3">
                <span className="w-9 h-9 shrink-0 rounded-full bg-[#EFF6FF] grid place-items-center text-xs font-bold text-[#1978DC]">{s.score}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#0F172A] truncate">{s.child}</p>
                  <p className="text-xs text-vp-muted">Phát âm: <span className="font-bold text-orange-500">"{s.word}"</span></p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge soft tone={tone}>{label}</Badge>
                  <span className="text-[10px] text-[#94A3B8]">{timeAgo(s.created_at)}</span>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
