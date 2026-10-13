import React, { useState } from "react";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { Modal, Button, Field, inputClass } from "../../components/ui";
import { useStore } from "../../services/store";
import { formatVnd } from "../../data/adminLabels";
import { AdminHeader, AdminLoading, Toast } from "./adminUi";
import { useToast, runAdmin } from "./adminUtils";

// Figma: 07 Admin / 04 / admin-pricing-plans (20:606)
function PlanModal({ plan, error: serverError, onClose, onSave }) {
  const [form, setForm] = useState({ ...plan, yearly: plan.yearly ?? "" });
  const [error, setError] = useState(null);
  const save = () => {
    const yearlyGiven = String(form.yearly ?? "").trim() !== "";
    if (!(Number(form.monthly) >= 0)) return setError("Giá tháng không hợp lệ.");
    if (yearlyGiven && !(Number(form.yearly) > 0)) return setError("Giá năm phải lớn hơn 0 (để trống nếu gói không bán theo năm).");
    onSave({ id: form.id, name: form.name, monthly: Number(form.monthly), yearly: yearlyGiven ? Number(form.yearly) : null, active: form.active });
  };
  return (
    <Modal open onClose={onClose} title={`Chỉnh sửa gói ${plan.name}`}
      footer={<><Button variant="ghost" onClick={onClose}>Hủy</Button><Button data-testid="plan-save" onClick={save}>Lưu gói</Button></>}
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-vp-muted">Danh sách gói (Free, Basic, Premium, Family) và quyền lợi đã được chốt với khách hàng; ở đây chỉ chỉnh giá và bật/tắt bán.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Giá tháng (VNĐ)"><input data-testid="plan-monthly" className={inputClass} type="number" min={0} value={form.monthly} onChange={(e) => setForm({ ...form, monthly: e.target.value })} /></Field>
          <Field label="Giá năm (VNĐ, để trống nếu không bán theo năm)"><input data-testid="plan-yearly" className={inputClass} type="number" min={0} value={form.yearly} onChange={(e) => setForm({ ...form, yearly: e.target.value })} /></Field>
        </div>
        {(error || serverError) && <p className="text-sm font-semibold text-red-500">{error || serverError}</p>}
      </div>
    </Modal>
  );
}

export default function AdminPricingView() {
  const { admin } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);
  if (!admin.data) return <AdminLoading />;

  const save = async (plan) => {
    const result = await admin.request(`/plans/${plan.id}`, { method: "PUT", body: { monthly: plan.monthly, yearly: plan.yearly, active: plan.active } });
    if (!result.ok) return setError(result.error);
    toast.show(`Đã lưu gói ${plan.name}`);
    setEditing(null);
  };
  const toggle = (plan) =>
    runAdmin(admin, toast, `/plans/${plan.id}`, { method: "PUT", body: { active: !plan.active } }, `${plan.active ? "Đã tạm ngưng" : "Đã kích hoạt"} ${plan.name}`);

  return (
    <div className="max-w-[1200px]">
      <AdminHeader full />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 items-start">
        {admin.data.plans.map((p) => (
          <div key={p.id} data-testid={`admin-plan-${p.id}`} className={`rounded-2xl bg-white p-6 flex flex-col gap-5 ${p.active ? "border-2 border-[#1978DC]" : "border border-[#E2E8F0]"}`}>
            <div className="flex items-center justify-between">
              <span className={`rounded-[20px] px-2.5 py-1 text-[11px] font-semibold ${p.active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>{p.active ? "Đang hoạt động" : "Tạm ngưng"}</span>
              <CreditCard className={`w-5 h-5 ${p.active ? "text-vp-blue" : "text-vp-muted"}`} />
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-[#0F172A]">{p.name}</p>
              <p className="text-xs text-vp-muted">Kế hoạch đăng ký phân tích AI chuẩn.</p>
            </div>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between"><span className="text-vp-muted">Tháng (Monthly):</span><span className="font-bold text-vp-ink">{formatVnd(p.monthly)}</span></div>
              <div className="flex justify-between"><span className="text-vp-muted">Năm (Yearly):</span><span className="font-bold text-orange-500">{p.yearly ? formatVnd(p.yearly) : "Không bán theo năm"}</span></div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-vp-ink">Quyền lợi cốt lõi:</p>
              {p.perks.map((perk) => <p key={perk} className="flex items-center gap-2 text-[13px] text-[#475569]"><CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" /> {perk}</p>)}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setError(null); setEditing(p); }} className="flex-1 h-10 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[13px] font-semibold text-[#475569]">Chỉnh sửa</button>
              <button data-testid={`toggle-plan-${p.id}`} onClick={() => toggle(p)} className={`h-10 rounded-lg border px-4 text-[13px] font-semibold ${p.active ? "border-[#DC2626] text-[#DC2626]" : "border-[#16A34A] text-[#16A34A]"}`}>{p.active ? "Tắt" : "Bật"}</button>
            </div>
          </div>
        ))}
      </div>
      {editing && <PlanModal plan={editing} error={error} onClose={() => { setEditing(null); setError(null); }} onSave={save} />}
      <Toast message={toast.message} tone={toast.tone} onDone={toast.clear} />
    </div>
  );
}
