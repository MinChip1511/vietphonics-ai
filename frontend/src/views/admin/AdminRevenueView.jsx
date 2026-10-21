import React, { useState } from "react";
import { Download, Lock } from "lucide-react";
import { Card, Modal, Button } from "../../components/ui";
import { useStore } from "../../services/store";
import { formatVnd } from "../../data/adminLabels";
import { AdminHeader, AdminLoading, PANEL_TITLE } from "./adminUi";

// Figma: 07 Admin / 08 / admin-revenue (20:1296). Everything is summed from the orders table.
const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dayLabel = (iso) => WEEKDAY[new Date(`${iso}T00:00:00`).getDay()];
const shortDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const PLAN_COLORS = ["#1978DC", "#F97316", "#F59E0B", "#64748B"];

export default function AdminRevenueView() {
  const { admin } = useStore();
  const [csv, setCsv] = useState(null);
  if (!admin.data) return <AdminLoading />;

  const { orders, metrics } = admin.data;
  const paid = orders.filter((o) => o.status === "paid");
  const refunded = orders.filter((o) => o.status === "refunded");
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const sum = (list) => list.reduce((s, o) => s + o.amount, 0);
  const todayTotal = sum(paid.filter((o) => o.created_at.startsWith(today)));
  const monthTotal = sum(paid.filter((o) => o.created_at.startsWith(month)));
  const avg = paid.length ? Math.round(sum(paid) / paid.length) : 0;
  const days = metrics.revenueDaily;
  const maxDay = Math.max(1, ...days.map((d) => d.amount));

  const exportCsv = () => {
    const lines = ["ma_don,khach_hang,goi,so_tien,kenh,trang_thai,thoi_gian", ...orders.map((o) => [o.id, `"${o.customer}"`, `"${o.plan}"`, o.amount, o.method, o.status, o.created_at].join(","))];
    setCsv(lines.join("\n"));
  };

  const kpis = [
    { label: "Doanh thu hôm nay", value: formatVnd(todayTotal), note: `${paid.filter((o) => o.created_at.startsWith(today)).length} đơn đã thanh toán` },
    { label: "Doanh thu tháng này", value: formatVnd(monthTotal), note: `${paid.filter((o) => o.created_at.startsWith(month)).length} đơn trong tháng` },
    { label: "Tổng đơn đã thanh toán", value: `${paid.length.toLocaleString("vi-VN")} đơn`, note: `${refunded.length} đơn đã hoàn tiền` },
    { label: "Giá trị đơn trung bình", value: formatVnd(avg), note: "Trên các đơn đã thanh toán" }
  ];

  return (
    <div className="max-w-[1200px]">
      <AdminHeader
        extra={<button data-testid="export-csv" onClick={exportCsv} className="flex items-center gap-1.5 rounded-lg bg-vp-blue px-4 py-2.5 text-xs font-semibold text-white hover:brightness-110"><Download className="w-4 h-4" /> Xuất file đối soát (.CSV)</button>}
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 mb-5">
        {kpis.map((k) => (
          <Card flat key={k.label} className="p-5 flex flex-col gap-3">
            <p className="text-xs font-semibold text-[#94A3B8]">{k.label}</p>
            <p data-testid={`rev-${k.label}`} className="font-heading text-[28px] leading-tight font-bold text-[#0F172A]">{k.value}</p>
            <p className="text-xs text-[#475569]">{k.note}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[1fr_420px] mb-5">
        <Card flat className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className={PANEL_TITLE}>Biểu đồ doanh thu 7 ngày qua{days.length ? ` (${shortDate(days[0].day)} - ${shortDate(days[days.length - 1].day)})` : ""}</p>
            <span className="text-xs text-[#94A3B8]">Khoảng thời gian: 7 ngày qua</span>
          </div>
          <div className="flex items-end gap-3 sm:gap-6 h-44 px-2">
            {days.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1 h-full" title={`${d.day}: ${formatVnd(d.amount)}`}>
                <span className="text-[10px] font-bold text-vp-muted">{Math.round(d.amount / 1000)}</span>
                <div className="w-6 rounded-t-md bg-vp-blue" style={{ height: `${(d.amount / maxDay) * 100}%`, minHeight: d.amount ? 4 : 0 }} />
                <span className="text-xs text-vp-muted">{dayLabel(d.day)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card flat className="p-6 flex flex-col gap-4">
          <p className={PANEL_TITLE}>Doanh thu theo gói học</p>
          {metrics.revenueByPlan.length === 0 && <p className="text-sm text-vp-muted">Chưa có đơn nào được thanh toán.</p>}
          {metrics.revenueByPlan.map((p, i) => (
            <div key={p.plan}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#0F172A]"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: PLAN_COLORS[i % PLAN_COLORS.length] }} />{p.plan}</span>
                <span className="text-xs text-[#94A3B8]">{p.orders} đơn</span>
              </div>
              <p className="pl-[18px] font-bold text-[#0F172A]">{formatVnd(p.amount)}</p>
            </div>
          ))}
        </Card>
      </div>
      <Card flat className="p-5 flex items-start gap-3">
        <Lock className="w-5 h-5 text-orange-500 shrink-0" />
        <div>
          <p className="font-bold text-vp-ink">Đối soát ngân hàng tự động <span className="ml-1 rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-500">PHASE 2</span></p>
          <p className="text-xs text-vp-muted">Khách thanh toán bằng cách quét mã QR VNPay/MoMo rồi chuyển khoản; một đơn chỉ tính vào doanh thu sau khi bạn xác nhận đã nhận tiền ở mục Đơn hàng.</p>
        </div>
      </Card>
      <Modal open={csv !== null} onClose={() => setCsv(null)} title="File đối soát (.CSV)" width="max-w-3xl"
        footer={<Button onClick={() => { navigator.clipboard?.writeText(csv || ""); setCsv(null); }}>Sao chép & đóng</Button>}
      >
        <pre data-testid="csv-output" className="max-h-80 overflow-auto rounded-xl bg-vp-canvas p-4 text-xs text-vp-ink">{csv}</pre>
      </Modal>
    </div>
  );
}
