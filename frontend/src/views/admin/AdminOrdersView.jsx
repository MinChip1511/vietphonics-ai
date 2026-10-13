import React, { useState } from "react";
import { Card, Modal, Button } from "../../components/ui";
import { useStore } from "../../services/store";
import { ORDER_STATUS, formatVnd } from "../../data/adminLabels";
import { AdminHeader, AdminLoading, StatusBadge, Toast, TABLE_WRAP, TABLE, THEAD, TH, TR, TD, CHIP_SELECT, PANEL_TITLE } from "./adminUi";
import { useToast, runAdmin } from "./adminUtils";

// Figma: 07 Admin / 07 / admin-orders-payments (20:1148)
const fmtTime = (iso) => {
  const d = new Date(String(iso).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return iso || "—";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function AdminOrdersView() {
  const { admin } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [confirmRefund, setConfirmRefund] = useState(false);
  if (!admin.data) return <AdminLoading />;

  const orders = admin.data.orders;
  const rows = orders.filter((o) => filter === "all" || o.status === filter);
  const selected = orders.find((o) => o.id === selectedId) || orders[0];

  const setStatus = (status, message) => runAdmin(admin, toast, `/orders/${selected.id}`, { method: "PATCH", body: { status } }, message);
  const refund = async () => {
    setConfirmRefund(false);
    await setStatus("refunded", `Đã hoàn tiền đơn ${selected.id}`);
  };
  const markPaid = () => setStatus("paid", `Đã xác nhận thanh toán ${selected.id}`);

  return (
    <div className="max-w-[1200px]">
      <AdminHeader />
      <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[1fr_420px] items-start">
        <Card flat className="p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={PANEL_TITLE}>Danh sách giao dịch</p>
            <div className="flex flex-wrap gap-2">
              <select data-testid="order-filter" aria-label="Lọc trạng thái" className={CHIP_SELECT} value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">Tất cả trạng thái</option>
                {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className={TABLE_WRAP}>
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr><th className={TH}>Mã Đơn</th><th className={TH}>Khách hàng</th><th className={TH}>Gói Học</th><th className={`${TH} text-right`}>Số Tiền</th><th className={TH}>Trạng Thái</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-vp-muted">Không có giao dịch phù hợp.</td></tr>}
                {rows.map((o) => (
                  <tr key={o.id} data-testid={`order-row-${o.id}`} onClick={() => setSelectedId(o.id)} className={`cursor-pointer ${TR} ${o.id === selected?.id ? "bg-vp-sky/40" : "hover:bg-vp-canvas/60"}`}>
                    <td className={`${TD} font-bold text-[#1978DC] whitespace-nowrap`}>{o.id}</td>
                    <td className={`${TD} font-semibold text-[#0F172A]`}>{o.customer}</td>
                    <td className={`${TD} text-[#475569] whitespace-nowrap`}>{o.plan}</td>
                    <td className={`${TD} text-right font-bold text-[#0F172A] whitespace-nowrap`}>{formatVnd(o.amount)}</td>
                    <td className={TD}><StatusBadge map={ORDER_STATUS} status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {selected && (
          <Card flat className="p-6 flex flex-col gap-5" data-testid="order-detail">
            <div className="flex items-center justify-between">
              <p className={PANEL_TITLE}>Chi tiết đơn hàng</p>
              {selected.status === "paid"
                ? <span className="inline-flex whitespace-nowrap rounded-[20px] bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-semibold text-[#16A34A]">Thành công</span>
                : <StatusBadge map={ORDER_STATUS} status={selected.status} />}
            </div>
            <div className="rounded-xl bg-[#F8FAFC] p-4 flex flex-col gap-2 text-xs">
              <div className="flex justify-between"><span className="text-vp-muted">Mã giao dịch</span><span className="font-bold text-vp-ink">{selected.id}</span></div>
              <div className="flex justify-between"><span className="text-vp-muted">Thời gian tạo</span><span className="text-vp-ink">{fmtTime(selected.created_at)}</span></div>
              <div className="flex justify-between"><span className="text-vp-muted">Kênh đối soát</span><span className="text-vp-ink">{selected.method}</span></div>
              <div className="flex justify-between border-t border-vp-border pt-2"><span className="font-bold text-vp-ink">Tổng thanh toán</span><span className="font-heading text-base font-extrabold text-vp-blue">{formatVnd(selected.amount)}</span></div>
            </div>
            <div className="flex flex-col gap-1.5 text-sm">
              <p className="font-bold text-vp-ink">Thông tin khách hàng</p>
              <p className="text-vp-muted">Họ & tên: <b className="text-vp-ink">{selected.customer}</b></p>
              <p className="text-vp-muted">Email: <span className="text-vp-ink">{selected.email || "—"}</span></p>
              <p className="text-vp-muted">SĐT liên hệ: <span className="text-vp-ink">{selected.phone || "—"}</span></p>
            </div>
            {selected.status === "pending" && <button onClick={markPaid} className="h-11 rounded-full border border-emerald-500 text-sm font-bold text-emerald-600">Xác nhận đã thanh toán</button>}
            <button data-testid="order-refund" onClick={() => setConfirmRefund(true)} disabled={selected.status !== "paid" || selected.amount === 0} className="h-11 rounded-full border border-vp-border text-sm font-semibold text-vp-ink disabled:opacity-40">Yêu cầu hoàn tiền đơn hàng</button>
          </Card>
        )}
      </div>
      <Modal open={confirmRefund} onClose={() => setConfirmRefund(false)} title={`Hoàn tiền đơn ${selected?.id}?`}
        footer={<><Button variant="ghost" onClick={() => setConfirmRefund(false)}>Hủy</Button><Button variant="danger" data-testid="confirm-refund" onClick={refund}>Hoàn {formatVnd(selected?.amount)}</Button></>}
      >
        <p className="text-sm text-vp-muted">Số tiền sẽ được hoàn về {selected?.method} của khách hàng (môi trường thử nghiệm, chưa có giao dịch thật).</p>
      </Modal>
      <Toast message={toast.message} tone={toast.tone} onDone={toast.clear} />
    </div>
  );
}
