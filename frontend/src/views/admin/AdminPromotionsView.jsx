import React, { useState } from "react";
import { Card, Field, inputClass } from "../../components/ui";
import { useStore } from "../../services/store";
import { formatVnd } from "../../data/adminLabels";
import { AdminHeader, AdminLoading, Toast, TABLE_WRAP, TABLE, THEAD, TH, TR, TD, PANEL_TITLE } from "./adminUi";
import { useToast, runAdmin } from "./adminUtils";

// Figma: 07 Admin / 05 / admin-promotions-coupons (20:823)
function couponState(c) {
  if (c.status !== "active") return { label: "Đã dừng", cls: "bg-red-50 text-red-500" };
  if (new Date(c.expires) < new Date()) return { label: "Hết hạn", cls: "bg-slate-100 text-slate-500" };
  return { label: "Đang áp dụng", cls: "bg-emerald-50 text-emerald-600" };
}

export default function AdminPromotionsView() {
  const { admin } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({ code: "", campaign: "", type: "percent", value: 30, expires: "" });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  if (!admin.data) return <AdminLoading />;
  const coupons = admin.data.coupons;

  const create = async (e) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    if (!/^[A-Z0-9]{4,20}$/.test(code)) return setError("Mã gồm 4-20 ký tự chữ in hoa hoặc số, không dấu.");
    if (coupons.some((c) => c.id === code)) return setError("Mã này đã tồn tại.");
    if (form.type === "percent" && (value <= 0 || value > 90)) return setError("Tỷ lệ giảm phải từ 1% đến 90%.");
    if (form.type === "amount" && value <= 0) return setError("Số tiền giảm phải lớn hơn 0.");
    if (!form.expires || new Date(form.expires) < new Date(new Date().toDateString())) return setError("Hạn hiệu lực phải từ hôm nay trở đi.");
    setError(null);
    const result = await admin.request("/coupons", { method: "POST", body: { id: code, campaign: form.campaign.trim() || "Chiến dịch mới", type: form.type, value, scope: "", expires: form.expires, status: "active" } });
    if (!result.ok) return setError(result.error);
    toast.show(`Đã kích hoạt mã ${code}`);
    setForm({ code: "", campaign: "", type: "percent", value: 30, expires: "" });
  };

  const toggle = (c) => runAdmin(admin, toast, `/coupons/${c.id}`, { method: "PUT", body: { status: c.status === "active" ? "stopped" : "active" } });
  const remove = (c) => runAdmin(admin, toast, `/coupons/${c.id}`, { method: "DELETE" }, `Đã xóa mã ${c.id}`);

  return (
    <div className="max-w-[1200px]">
      <AdminHeader actionLabel="Tạo mã giảm giá mới" onAction={() => document.getElementById("coupon-code")?.focus()} />
      <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[1fr_300px] items-start">
        <Card flat className="p-6 flex flex-col gap-4">
          <p className={PANEL_TITLE}>Mã ưu đãi đang áp dụng</p>
          <div className={TABLE_WRAP}>
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr><th className={TH}>Mã (Code)</th><th className={TH}>Chiến dịch / Nội dung</th><th className={TH}>Mức giảm giá</th><th className={TH}>Thời hạn hiệu lực</th><th className={TH}>Trạng thái</th></tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const st = couponState(c);
                  const expired = new Date(c.expires) < new Date();
                  return (
                    <tr key={c.id} className={TR}>
                      <td className={`${TD} font-bold text-[#1978DC]`}>{c.id}</td>
                      <td className={`${TD} font-semibold text-[#0F172A]`}>{c.campaign}</td>
                      <td className={`${TD} font-bold text-orange-500`}>Giảm {c.type === "percent" ? `${c.value}%` : formatVnd(c.value)} {c.scope}</td>
                      <td className={`${TD} text-[#475569] whitespace-nowrap`}>{expired ? "Đã hết hạn" : `Đến ${new Date(c.expires).toLocaleDateString("vi-VN")}`}</td>
                      <td className={`${TD} whitespace-nowrap`}>
                        <button data-testid={`coupon-toggle-${c.id}`} onClick={() => toggle(c)} title="Bấm để dừng / mở lại" className={`whitespace-nowrap rounded-[20px] px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>{st.label}</button>
                        <button data-testid={`coupon-delete-${c.id}`} onClick={() => remove(c)} className="ml-2 text-xs font-semibold text-red-500">Xóa</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card flat as="form" onSubmit={create} className="p-6 flex flex-col gap-5">
          <p className={PANEL_TITLE}>Tạo nhanh mã giảm giá</p>
          <Field label="Ký tự Mã giảm giá (Coupon Code)"><input id="coupon-code" data-testid="coupon-code" className={inputClass} value={form.code} onChange={set("code")} placeholder="HOCPHATAM30" /></Field>
          <Field label="Chiến dịch"><input className={inputClass} value={form.campaign} onChange={set("campaign")} placeholder="Ưu đãi mùa hè" /></Field>
          <Field label="Dạng ưu đãi">
            <select className={inputClass} value={form.type} onChange={set("type")}>
              <option value="percent">Theo tỷ lệ phần trăm (%)</option>
              <option value="amount">Theo số tiền (VNĐ)</option>
            </select>
          </Field>
          <Field label={form.type === "percent" ? "Tỷ lệ giảm (%)" : "Số tiền giảm (VNĐ)"}><input data-testid="coupon-value" className={inputClass} type="number" value={form.value} onChange={set("value")} /></Field>
          <Field label="Thời hạn hiệu lực"><input data-testid="coupon-expires" className={inputClass} type="date" value={form.expires} onChange={set("expires")} /></Field>
          {error && <p data-testid="coupon-error" className="text-sm font-semibold text-red-500">{error}</p>}
          <button data-testid="coupon-create" type="submit" className="h-11 rounded-lg bg-vp-blue text-sm font-semibold text-white">Kích hoạt mã</button>
        </Card>
      </div>
      <Toast message={toast.message} tone={toast.tone} onDone={toast.clear} />
    </div>
  );
}
