import React, { useState } from "react";
import { Card, Modal, Button } from "../../components/ui";
import { useStore } from "../../services/store";
import { ORDER_STATUS, formatVnd } from "../../data/adminLabels";
import { AdminHeader, AdminLoading, StatusBadge, Toast } from "./adminUi";
import { useToast, runAdmin, selectClass } from "./adminUtils";

// Figma: 07 Admin / 07 / admin-orders-payments (20:1148)
export default function AdminOrdersView() {
  const { admin } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [confirmRefund, setConfirmRefund] = useState(false);
  if (!admin.data) return <AdminLoading />;

  const orders = admin.data.orders;
  const rows = orders.filter((o) =>
    (filter === "all" || o.status === filter) &&
    `${o.id} ${o.customer} ${o.plan}`.toLowerCase().includes(query.toLowerCase())
  );
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
      <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-[1.5fr_1fr] items-start">
        <Card className="p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-vp-ink">Danh sách giao dịch</p>
            <div className="flex flex-wrap gap-2">
              <input aria-label="Tìm đơn hàng" className={`${selectClass} w-40`} placeholder="Tìm mã / tên..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <select data-testid="order-filter" aria-label="Lọc trạng thái" className={selectClass} value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">Tất cả trạng thái</option>
                {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-vp-border">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-vp-canvas/70 text-left text-xs text-vp-muted">
                <tr><th className="px-4 py-3">Mã Đơn</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Gói Học</th><th className="px-4 py-3 text-right">Số Tiền</th><th className="px-4 py-3">Trạng Thái</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-vp-muted">Không có giao dịch phù hợp.</td></tr>}
                {rows.map((o) => (
                  <tr key={o.id} data-testid={`order-row-${o.id}`} onClick={() => setSelectedId(o.id)} className={`cursor-pointer border-t border-vp-border ${o.id === selected?.id ? "bg-vp-sky/40" : "hover:bg-vp-canvas/60"}`}>
                    <td className="px-4 py-3 font-bold text-vp-blue">{o.id}</td>
                    <td className="px-4 py-3 font-semibold text-vp-ink">{o.customer}</td>
                    <td className="px-4 py-3 text-vp-muted">{o.plan}</td>
                    <td className="px-4 py-3 text-right font-bold text-vp-ink whitespace-nowrap">{formatVnd(o.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge map={ORDER_STATUS} status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {selected && (
          <Card className="p-5 flex flex-col gap-4" data-testid="order-detail">
            <div className="flex items-center justify-between">
              <p className="font-bold text-vp-ink">Chi tiết đơn hàng</p>
              <StatusBadge map={ORDER_STATUS} status={selected.status} />
            </div>
            <div className="rounded-xl bg-vp-canvas/70 p-4 flex flex-col gap-2 text-xs">
              <div className="flex justify-between"><span className="text-vp-muted">Mã giao dịch</span><span className="font-bold text-vp-ink">{selected.id}</span></div>
              <div className="flex justify-between"><span className="text-vp-muted">Thời gian tạo</span><span className="text-vp-ink">{selected.created_at?.slice(0, 16).replace("T", " ")}</span></div>
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
