import React, { useState } from "react";
import { Download, Lock } from "lucide-react";
import { Card, Modal, Button } from "../../components/ui";
import { useStore } from "../../services/store";
import { formatVnd } from "../../data/adminLabels";
import { AdminHeader, AdminLoading } from "./adminUi";

// Figma: 07 Admin / 08 / admin-revenue (20:1296). Everything is summed from the orders table.
const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "short" });

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
  const maxDay = Math.max(1, ...metrics.revenueDaily.map((d) => d.amount));

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
        title="Báo cáo Doanh thu & Đối soát"
        extra={<button data-testid="export-csv" onClick={exportCsv} className="flex items-center gap-1.5 rounded-full bg-vp-blue px-4 py-2 text-xs font-bold text-white"><Download className="w-4 h-4" /> Xuất file đối soát (.CSV)</button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5 rounded-2xl flex flex-col gap-2">
            <p className="text-xs text-vp-muted">{k.label}</p>
            <p data-testid={`rev-${k.label}`} className="font-heading text-2xl font-extrabold text-vp-ink">{k.value}</p>
            <p className="text-[11px] text-vp-muted">{k.note}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-[1.4fr_1fr] mb-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="font-bold text-vp-ink">Doanh thu 7 ngày qua (nghìn đồng)</p>
          </div>
          <div className="flex items-end gap-3 sm:gap-6 h-44 px-2">
            {metrics.revenueDaily.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1 h-full" title={`${d.day}: ${formatVnd(d.amount)}`}>
                <span className="text-[10px] font-bold text-vp-muted">{Math.round(d.amount / 1000)}</span>
                <div className="w-full max-w-9 rounded-t-md bg-vp-blue" style={{ height: `${(d.amount / maxDay) * 100}%`, minHeight: d.amount ? 4 : 0 }} />
                <span className="text-xs text-vp-muted">{dayLabel(d.day)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 flex flex-col gap-4">
          <p className="font-bold text-vp-ink">Doanh thu theo gói học</p>
          {metrics.revenueByPlan.length === 0 && <p className="text-sm text-vp-muted">Chưa có đơn nào được thanh toán.</p>}
          {metrics.revenueByPlan.map((p) => (
            <div key={p.plan}>
              <div className="flex justify-between text-sm"><span className="font-bold text-vp-ink">{p.plan}</span><span className="text-xs text-vp-muted">{p.orders} đơn</span></div>
              <p className="font-bold text-vp-ink">{formatVnd(p.amount)}</p>
            </div>
          ))}
        </Card>
      </div>
      <Card className="p-5 flex items-start gap-3">
        <Lock className="w-5 h-5 text-orange-500 shrink-0" />
        <div>
          <p className="font-bold text-vp-ink">Đối soát ngân hàng tự động <span className="ml-1 rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-500">PHASE 2</span></p>
          <p className="text-xs text-vp-muted">Thanh toán hiện được mô phỏng, chưa kết nối cổng thanh toán hay API ngân hàng nên số liệu trên chỉ là đơn thử nghiệm.</p>
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
